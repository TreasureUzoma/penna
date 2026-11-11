import { Paddle, Environment, EventName } from "@paddle/paddle-node-sdk";
import type {
  SubscriptionNotification,
  TransactionNotification,
} from "@paddle/paddle-node-sdk";
import { envConfig } from "@/config";
import { db } from "@workspace/db";
import { payments, teamSubscriptions } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { ServiceResponse } from "@workspace/types";
import type { PlanSlug } from "@workspace/constants/plans";

// Exported — team-billing.ts's team-scoped checkout/cancel/seat-sync
// functions call the same Paddle SDK instance rather than constructing
// their own (one client, one place that reads the API key/environment).
export const paddle = new Paddle(envConfig.PADDLE_API_KEY, {
  environment:
    envConfig.PADDLE_ENVIRONMENT === "production"
      ? Environment.production
      : Environment.sandbox,
});

/**
 * Paddle price IDs, keyed by the plan slugs used in the checkout API.
 * Configure these from your Paddle Dashboard > Catalog > Prices.
 */
export const PLAN_PRICE_IDS: Partial<Record<string, string>> = {
  professional: envConfig.PADDLE_PRICE_ID_PROFESSIONAL,
  business: envConfig.PADDLE_PRICE_ID_BUSINESS,
};

/**
 * The reverse of `PLAN_PRICE_IDS` — subscription-level webhook events
 * carry a Paddle `price_id`/`product_id`, not our own plan slug, so this
 * is the authoritative way back to "professional" | "business" for a
 * `teamSubscriptions` row. `customData.planSlug` is a useful cross-check
 * at checkout time but isn't guaranteed to be echoed on every subsequent
 * event for a subscription's whole lifetime — price ID is what Paddle
 * itself actually tracks.
 */
export const PRICE_ID_TO_PLAN_SLUG: Record<string, PlanSlug> =
  Object.fromEntries(
    Object.entries(PLAN_PRICE_IDS)
      .filter((entry): entry is [string, string] => !!entry[1])
      .map(([slug, priceId]) => [priceId, slug as PlanSlug]),
  );

/**
 * Verifies and processes a Paddle webhook. `rawBody` must be the exact,
 * unparsed request body text — signature verification is computed over the
 * raw bytes, so anything that re-serializes JSON (even losslessly) will
 * fail verification.
 */
export const handlePaddleWebhook = async (
  rawBody: string,
  signature: string | undefined,
): Promise<ServiceResponse> => {
  if (!envConfig.PADDLE_WEBHOOK_SECRET) {
    console.error(
      "PADDLE_WEBHOOK_SECRET is not set — refusing to process webhook.",
    );
    return {
      success: false,
      message: "Webhook verification is not configured",
      data: null,
    };
  }

  if (!signature) {
    return {
      success: false,
      message: "Missing Paddle-Signature header",
      data: null,
    };
  }

  let event;
  try {
    event = await paddle.webhooks.unmarshal(
      rawBody,
      envConfig.PADDLE_WEBHOOK_SECRET,
      signature,
    );
  } catch (error) {
    console.warn(
      "Rejected Paddle webhook with invalid signature:",
      error instanceof Error ? error.message : error,
    );
    return {
      success: false,
      message: "Invalid webhook signature",
      data: null,
    };
  }

  try {
    switch (event.eventType) {
      case EventName.TransactionCompleted:
        return await handleTransactionCompleted(event.data);

      case EventName.TransactionUpdated:
        return await handleTransactionUpdated(event.data);

      // Paddle can report a failed renewal transaction before (or without
      // this endpoint being subscribed to) the separate subscription.past_due
      // notification. Use the transaction's subscription ID to update the
      // entitlement row directly.
      case "transaction.payment_failed" as EventName:
        return await handleTransactionPaymentFailed(
          event.data as TransactionNotification,
        );

      case EventName.SubscriptionCreated:
      case EventName.SubscriptionActivated:
        return await handleSubscriptionActivated(event.data);

      case EventName.SubscriptionUpdated:
        return await handleSubscriptionUpdated(event.data);

      // Paddle emits these lifecycle events separately from
      // subscription.updated. Persist their status too, so team plan lookup
      // can remove access while the subscription is delinquent or paused.
      case "subscription.past_due" as EventName:
      case "subscription.paused" as EventName:
        return await handleSubscriptionUpdated(
          event.data as SubscriptionNotification,
        );

      case EventName.SubscriptionCanceled:
        return await handleSubscriptionCanceled(event.data);

      default:
        return {
          success: true,
          message: `Event ${event.eventType} received but not processed`,
          data: null,
        };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Webhook processing failed";
    console.error("Paddle webhook error:", errorMessage);

    return {
      success: false,
      message: errorMessage,
      data: null,
    };
  }
};

const planSlugFromCustomData = (
  customData: Record<string, any> | null,
): string | undefined => customData?.planSlug;

// `initiatedByUserId` is set by workspace checkout and attributes the
// payments-table audit row to the user who initiated it.
const userIdFromCustomData = (
  customData: Record<string, any> | null,
): string | undefined => customData?.initiatedByUserId;

const teamIdFromCustomData = (
  customData: Record<string, any> | null,
): string | undefined => customData?.teamId;

/**
 * Upserts a `teamSubscriptions` row from any subscription-level webhook
 * event (created/activated/updated/canceled all funnel through here).
 * Keyed on `paddleSubscriptionId`, not `teamId` — see the schema comment
 * on why that column isn't unique.
 */
const upsertTeamSubscription = async (
  teamId: string,
  data: SubscriptionNotification,
): Promise<void> => {
  const item = data.items[0];
  const priceId = item?.price?.id;
  const planSlug = priceId ? PRICE_ID_TO_PLAN_SLUG[priceId] : undefined;

  if (!priceId || !planSlug) {
    console.error(
      `Paddle subscription ${data.id} for team ${teamId} has no recognized price ID (got "${priceId}") — skipping teamSubscriptions upsert.`,
    );
    return;
  }

  const values = {
    teamId,
    paddleSubscriptionId: data.id,
    paddleCustomerId: data.customerId,
    planSlug,
    priceId,
    status: data.status,
    quantity: item?.quantity ?? 1,
    scheduledChange: data.scheduledChange
      ? {
          action: data.scheduledChange.action,
          effectiveAt: data.scheduledChange.effectiveAt,
        }
      : null,
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select({ id: teamSubscriptions.id })
    .from(teamSubscriptions)
    .where(eq(teamSubscriptions.paddleSubscriptionId, data.id));

  if (existing) {
    await db
      .update(teamSubscriptions)
      .set(values)
      .where(eq(teamSubscriptions.id, existing.id));
  } else {
    await db.insert(teamSubscriptions).values(values);
  }
};

const handleTransactionCompleted = async (
  data: TransactionNotification,
): Promise<ServiceResponse> => {
  const userId = userIdFromCustomData(data.customData);
  if (!userId) {
    return {
      success: true,
      message: "Transaction received without workspace initiator; ignored",
      data: null,
    };
  }

  const totalMinorUnits = data.details?.totals?.total;

  await db.insert(payments).values({
    userId,
    provider: "paddle",
    // Paddle amounts are already in the currency's smallest unit (e.g.
    // cents), as a string — no ×100 conversion needed.
    amount: totalMinorUnits ? parseInt(totalMinorUnits, 10) : 0,
    currency: data.currencyCode || "USD",
    reference: data.id,
    status: data.status === "completed" ? "completed" : "pending",
    metadata: {
      customerId: data.customerId,
      planSlug: planSlugFromCustomData(data.customData),
    },
  });

  return {
    success: true,
    message: "Transaction processed",
    data: { transactionId: data.id },
  };
};

const handleTransactionUpdated = async (
  data: TransactionNotification,
): Promise<ServiceResponse> => {
  const [existingPayment] = await db
    .select()
    .from(payments)
    .where(eq(payments.reference, data.id));

  if (existingPayment) {
    await db
      .update(payments)
      .set({ status: data.status === "completed" ? "completed" : "pending" })
      .where(eq(payments.reference, data.id));
  }

  return {
    success: true,
    message: "Transaction updated",
    data: { transactionId: data.id },
  };
};

const handleTransactionPaymentFailed = async (
  data: TransactionNotification,
): Promise<ServiceResponse> => {
  if (data.subscriptionId) {
    await db
      .update(teamSubscriptions)
      .set({ status: "past_due", updatedAt: new Date() })
      .where(eq(teamSubscriptions.paddleSubscriptionId, data.subscriptionId));
  }

  return {
    success: true,
    message: "Failed payment processed",
    data: { transactionId: data.id, subscriptionId: data.subscriptionId },
  };
};

const handleSubscriptionActivated = async (
  data: SubscriptionNotification,
): Promise<ServiceResponse> => {
  const teamId = teamIdFromCustomData(data.customData);
  if (teamId) {
    await upsertTeamSubscription(teamId, data);
    return {
      success: true,
      message: "Team subscription activated",
      data: { subscriptionId: data.id, teamId },
    };
  }

  return {
    success: true,
    message: "Personal subscription event ignored; workspaceId missing",
    data: { subscriptionId: data.id },
  };
};

const handleSubscriptionUpdated = async (
  data: SubscriptionNotification,
): Promise<ServiceResponse> => {
  const teamId = teamIdFromCustomData(data.customData);
  if (teamId) {
    await upsertTeamSubscription(teamId, data);
    return {
      success: true,
      message: "Team subscription updated",
      data: { subscriptionId: data.id, teamId },
    };
  }

  return {
    success: true,
    message: "Subscription event ignored; workspaceId missing",
    data: { subscriptionId: data.id },
  };
};

const handleSubscriptionCanceled = async (
  data: SubscriptionNotification,
): Promise<ServiceResponse> => {
  const teamId = teamIdFromCustomData(data.customData);
  if (teamId) {
    // "canceled" is the terminal state (see the subscription-sync skill) —
    // upsertTeamSubscription just writes data.status through as-is, which
    // is already "canceled" on this event. No special-casing needed.
    await upsertTeamSubscription(teamId, data);
    return {
      success: true,
      message: "Team subscription canceled",
      data: { subscriptionId: data.id, teamId },
    };
  }

  return {
    success: true,
    message: "Subscription event ignored; workspaceId missing",
    data: { subscriptionId: data.id },
  };
};

/**
 * Get invoice from Paddle
 */
export const getInvoice = async (
  transactionId: string,
): Promise<ServiceResponse> => {
  try {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.reference, transactionId));

    if (!payment) {
      return {
        success: false,
        message: "Transaction not found",
        data: null,
      };
    }

    return {
      success: true,
      message: "Invoice retrieved",
      data: {
        id: payment.serial,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        createdAt: payment.createdAt,
        reference: payment.reference,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to retrieve invoice";
    console.error("Invoice retrieval error:", errorMessage);

    return {
      success: false,
      message: errorMessage,
      data: null,
    };
  }
};

/**
 * List user invoices/transactions
 */
export const getUserInvoices = async (
  userId: string,
): Promise<ServiceResponse> => {
  try {
    const userPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId));

    return {
      success: true,
      message: "Invoices retrieved",
      data: userPayments,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to retrieve invoices";
    console.error("Invoices retrieval error:", errorMessage);

    return {
      success: false,
      message: errorMessage,
      data: null,
    };
  }
};
