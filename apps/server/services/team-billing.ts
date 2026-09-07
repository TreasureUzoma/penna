import { db } from "@workspace/db";
import { teamMembers, teamSubscriptions } from "@workspace/db/schema";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import type { ServiceResponse } from "@workspace/types";
import { paddle, PLAN_PRICE_IDS, cancelSubscription as cancelLegacyUserSubscription } from "./paddle";

/**
 * Team-scoped billing — checkout, seat-quantity sync, and cancel for a
 * team's Paddle subscription. Deliberately separate from services/paddle.ts
 * (which owns the Paddle SDK instance + webhook handling) to keep the
 * "initiate a billing action" surface distinct from "receive Paddle's
 * events" — this file only ever calls out to Paddle, never gets called
 * from the webhook route.
 */

const currentTeamMemberCount = async (teamId: string): Promise<number> => {
  const [row] = await db
    .select({ value: count() })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));
  return row?.value ?? 0;
};

const getLiveTeamSubscription = async (teamId: string) => {
  const [sub] = await db
    .select()
    .from(teamSubscriptions)
    .where(
      and(
        eq(teamSubscriptions.teamId, teamId),
        inArray(teamSubscriptions.status, ["active", "trialing"]),
      ),
    )
    .orderBy(desc(teamSubscriptions.updatedAt))
    .limit(1);
  return sub ?? null;
};

/** Backs the Settings > Billing page — the team's current live subscription, if any. */
export const getTeamSubscription = async (teamId: string): Promise<ServiceResponse> => {
  const sub = await getLiveTeamSubscription(teamId);
  return {
    success: true,
    message: sub ? "Fetched team subscription successfully" : "No active subscription",
    data: sub,
  };
};

export interface CreateTeamCheckoutOptions {
  teamId: string;
  planSlug: string;
  successUrl: string;
  initiatedByUserId: string;
}

/**
 * Real per-seat checkout — quantity is the team's *current* member count,
 * not hardcoded to 1 like the old personal checkout. `customData.teamId`
 * is what the webhook reads back to know this is a team subscription (see
 * upsertTeamSubscription in services/paddle.ts) — no separate customer
 * mapping table needed, see the Phase 2 plan doc for why.
 */
export const createTeamCheckoutSession = async (
  options: CreateTeamCheckoutOptions
): Promise<ServiceResponse> => {
  try {
    const { teamId, planSlug, successUrl, initiatedByUserId } = options;

    const priceId = PLAN_PRICE_IDS[planSlug];
    if (!priceId) {
      return {
        success: false,
        message: `No Paddle price configured for plan "${planSlug}". Set PADDLE_PRICE_ID_${planSlug.toUpperCase()} in your environment.`,
        data: null,
      };
    }

    const quantity = Math.max(1, await currentTeamMemberCount(teamId));

    const transaction = await paddle.transactions.create({
      items: [{ priceId, quantity }],
      customData: { teamId, planSlug, initiatedByUserId },
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
    console.error("Paddle team checkout error:", errorMessage);
    return { success: false, message: errorMessage, data: null };
  }
};

/**
 * Recomputes the team's member count and, if it has a live Paddle
 * subscription, pushes the new quantity — upgrade-shaped changes (more
 * seats) bill the prorated difference now; downgrade-shaped changes
 * (fewer seats) apply at the next renewal with no mid-period refund. See
 * the subscription-update skill for why these two proration modes match
 * "add a seat" vs "remove a seat" semantics.
 *
 * A no-op (not an error) if the team has no live subscription yet — most
 * teams are still on the Phase-1 fallback plan and have nothing to sync.
 * Callers (acceptTeamInvite, removeTeamMember) treat failures here as
 * non-fatal to the membership change itself.
 */
export const syncTeamSeatQuantity = async (teamId: string): Promise<void> => {
  const sub = await getLiveTeamSubscription(teamId);
  if (!sub) return;

  const newQuantity = await currentTeamMemberCount(teamId);
  if (newQuantity === sub.quantity) return;

  await paddle.subscriptions.update(sub.paddleSubscriptionId, {
    items: [{ priceId: sub.priceId, quantity: newQuantity }],
    prorationBillingMode:
      newQuantity > sub.quantity
        ? "prorated_immediately"
        : "prorated_next_billing_period",
  });
  // Deliberately not writing `newQuantity` to the row here — the
  // subsequent `subscription.updated` webhook is what actually confirms
  // Paddle applied it, and writing it synchronously risked the row
  // disagreeing with Paddle if that call's response and the webhook raced.
};

/**
 * Real Paddle cancel — schedules for the end of the current billing
 * period (a generic Cancel button shouldn't cut a team off from what it
 * already paid for; see the subscription-cancel skill). Does not flip
 * `teamSubscriptions.status` synchronously — that only happens for real
 * once the corresponding webhook lands at period end.
 *
 * A team with no live `teamSubscriptions` row is still on the Phase-1
 * fallback (the owner's individual `users.plan` — see getTeamPlan). For
 * those teams "cancel" has no Paddle subscription to call, so it falls
 * back to exactly what cancelling did before teams existed: flip the
 * owner's own plan back to hobby. This keeps existing pre-teams customers'
 * cancel button working unchanged.
 */
export const cancelTeamSubscription = async (teamId: string): Promise<ServiceResponse> => {
  try {
    const sub = await getLiveTeamSubscription(teamId);
    if (!sub) {
      const [owner] = await db
        .select({ userId: teamMembers.userId })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.role, "owner")));

      if (!owner) {
        return {
          success: false,
          message: "This team has no active subscription to cancel.",
          data: null,
        };
      }

      return cancelLegacyUserSubscription(owner.userId);
    }

    const subscription = await paddle.subscriptions.cancel(sub.paddleSubscriptionId, {
      effectiveFrom: "next_billing_period",
    });

    return {
      success: true,
      message: "Subscription scheduled to cancel at the end of the current billing period",
      data: {
        status: subscription.status,
        scheduledChange: subscription.scheduledChange?.effectiveAt ?? null,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to cancel subscription";
    console.error("Paddle team cancel error:", errorMessage);
    return { success: false, message: errorMessage, data: null };
  }
};
