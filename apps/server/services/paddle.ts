import { Paddle, Environment, EventName } from "@paddle/paddle-node-sdk";
import type {
  SubscriptionNotification,
  TransactionNotification,
} from "@paddle/paddle-node-sdk";
import { envConfig } from "@/config";
import { db } from "@workspace/db";
import { payments, users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { ServiceResponse } from "@workspace/types";
import { plans, type PlanSlug } from "@workspace/constants/plans";

const isPlanSlug = (slug: string | undefined): slug is PlanSlug =>
  !!slug && plans.some((plan) => plan.slug === slug);

const paddle = new Paddle(envConfig.PADDLE_API_KEY, {
  environment:
    envConfig.PADDLE_ENVIRONMENT === "production"
      ? Environment.production
      : Environment.sandbox,
});

/**
 * Paddle price IDs, keyed by the plan slugs used in the checkout API.
 * Configure these from your Paddle Dashboard > Catalog > Prices.
 */
const PLAN_PRICE_IDS: Partial<Record<string, string>> = {
  professional: envConfig.PADDLE_PRICE_ID_PROFESSIONAL,
  business: envConfig.PADDLE_PRICE_ID_BUSINESS,
};

/**
 * Maps billing plan slugs (as used in checkout / Paddle price catalog) to
 * the `users.subscriptionType` enum ("free" | "pro" | "enterprise"), which
 * gates coarse features (e.g. `canRemoveBranding` in `services/newsletters.ts`).
 * These aren't the same vocabulary — "hobby" and "enterprise" line up, but
 * "professional" and "business" both collapse to "pro" since that's all the
 * enum distinguishes. The exact slug is preserved separately in
 * `users.plan` (see `packages/db/schema.ts`), which is what subscriber-cap
 * enforcement (`services/limits.ts`) actually reads.
 */
const PLAN_SLUG_TO_SUBSCRIPTION_TYPE: Record<
  string,
  "free" | "pro" | "enterprise"
> = {
  hobby: "free",
  professional: "pro",
  business: "pro",
  enterprise: "enterprise",
};

export interface CreateCheckoutSessionOptions {
  userId: string;
  planSlug: string;
  /** Where Paddle sends the customer after a successful payment. */
  successUrl: string;
}

/**
 * Creates a real Paddle-hosted checkout transaction and returns its URL to
 * redirect the customer to.
 */
export const createCheckoutSession = async (
  options: CreateCheckoutSessionOptions
): Promise<ServiceResponse> => {
  try {
    const { userId, planSlug, successUrl } = options;

    const priceId = PLAN_PRICE_IDS[planSlug];
    if (!priceId) {
      return {
        success: false,
        message: `No Paddle price configured for plan "${planSlug}". Set PADDLE_PRICE_ID_${planSlug.toUpperCase()} in your environment.`,
        data: null,
      };
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return {
        success: false,
        message: "User not found",
        data: null,
      };
    }

    const transaction = await paddle.transactions.create({
      items: [{ priceId, quantity: 1 }],
      customData: { userId, planSlug },
      checkout: { url: successUrl },
    });

    if (!transaction.checkout?.url) {
      return {
        success: false,
        message: "Paddle did not return a checkout URL",
        data: null,
      };
    }

    return {
      success: true,
      message: "Checkout session created",
      data: {
        transactionId: transaction.id,
        url: transaction.checkout.url,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create checkout";
    console.error("Paddle checkout error:", errorMessage);

    return {
      success: false,
      message: errorMessage,
      data: null,
    };
  }
};

/**
 * Verifies and processes a Paddle webhook. `rawBody` must be the exact,
 * unparsed request body text — signature verification is computed over the
 * raw bytes, so anything that re-serializes JSON (even losslessly) will
 * fail verification.
 */
export const handlePaddleWebhook = async (
  rawBody: string,
  signature: string | undefined
): Promise<ServiceResponse> => {
  if (!envConfig.PADDLE_WEBHOOK_SECRET) {
    console.error(
      "PADDLE_WEBHOOK_SECRET is not set — refusing to process webhook."
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
      signature
    );
  } catch (error) {
    console.warn(
      "Rejected Paddle webhook with invalid signature:",
      error instanceof Error ? error.message : error
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

      case EventName.SubscriptionCreated:
      case EventName.SubscriptionActivated:
        return await handleSubscriptionActivated(event.data);

      case EventName.SubscriptionUpdated:
        return await handleSubscriptionUpdated(event.data);

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
  customData: Record<string, any> | null
): string | undefined => customData?.planSlug;

const userIdFromCustomData = (
  customData: Record<string, any> | null
): string | undefined => customData?.userId;

const handleTransactionCompleted = async (
  data: TransactionNotification
): Promise<ServiceResponse> => {
  const userId = userIdFromCustomData(data.customData);
  if (!userId) {
    return {
      success: false,
      message: "Missing userId in custom data",
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

  const planSlug = planSlugFromCustomData(data.customData);
  if (isPlanSlug(planSlug)) {
    const subscriptionType = PLAN_SLUG_TO_SUBSCRIPTION_TYPE[planSlug];
    await db
      .update(users)
      .set({ subscriptionType, plan: planSlug })
      .where(eq(users.id, userId));
  }

  return {
    success: true,
    message: "Transaction processed",
    data: { transactionId: data.id },
  };
};

const handleTransactionUpdated = async (
  data: TransactionNotification
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

const handleSubscriptionActivated = async (
  data: SubscriptionNotification
): Promise<ServiceResponse> => {
  const userId = userIdFromCustomData(data.customData);
  if (!userId) {
    return {
      success: false,
      message: "Missing userId in custom data",
      data: null,
    };
  }

  const rawPlanSlug = planSlugFromCustomData(data.customData);
  const planSlug: PlanSlug = isPlanSlug(rawPlanSlug) ? rawPlanSlug : "professional";
  const subscriptionType = PLAN_SLUG_TO_SUBSCRIPTION_TYPE[planSlug];

  await db
    .update(users)
    .set({ subscriptionType, plan: planSlug })
    .where(eq(users.id, userId));

  return {
    success: true,
    message: "Subscription activated",
    data: { subscriptionId: data.id },
  };
};

const handleSubscriptionUpdated = async (
  data: SubscriptionNotification
): Promise<ServiceResponse> => {
  const userId = userIdFromCustomData(data.customData);
  if (!userId) {
    return {
      success: false,
      message: "Missing userId in custom data",
      data: null,
    };
  }

  const planSlug = planSlugFromCustomData(data.customData);
  if (data.status === "active" && isPlanSlug(planSlug)) {
    const subscriptionType = PLAN_SLUG_TO_SUBSCRIPTION_TYPE[planSlug];
    await db
      .update(users)
      .set({ subscriptionType, plan: planSlug })
      .where(eq(users.id, userId));
  }

  return {
    success: true,
    message: "Subscription updated",
    data: { subscriptionId: data.id },
  };
};

const handleSubscriptionCanceled = async (
  data: SubscriptionNotification
): Promise<ServiceResponse> => {
  const userId = userIdFromCustomData(data.customData);
  if (!userId) {
    return {
      success: false,
      message: "Missing userId in custom data",
      data: null,
    };
  }

  await db
    .update(users)
    .set({ subscriptionType: "free", plan: "hobby" })
    .where(eq(users.id, userId));

  return {
    success: true,
    message: "Subscription canceled",
    data: { subscriptionId: data.id },
  };
};

/**
 * Get invoice from Paddle
 */
export const getInvoice = async (
  transactionId: string
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
  userId: string
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

/**
 * Cancel subscription
 */
export const cancelSubscription = async (
  userId: string
): Promise<ServiceResponse> => {
  try {
    await db
      .update(users)
      .set({ subscriptionType: "free", plan: "hobby" })
      .where(eq(users.id, userId));

    return {
      success: true,
      message: "Subscription canceled",
      data: null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to cancel subscription";
    console.error("Subscription cancellation error:", errorMessage);

    return {
      success: false,
      message: errorMessage,
      data: null,
    };
  }
};
