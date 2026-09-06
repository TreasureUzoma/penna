import { db } from "@workspace/db";
import { newsletterMembers, newsletters, subscribers, users } from "@workspace/db/schema";
import { and, count, eq } from "drizzle-orm";
import { getPlanBySlug, type Plan } from "@workspace/constants/plans";
import { envConfig } from "@/config";
import { sendSubscriberLimitWarningEmail } from "./mail/internal";
import { getRedis } from "@/lib/redis";

export interface SubscriberUsage {
  newsletterId: string;
  newsletterName: string;
  plan: Plan;
  count: number;
  /** Included subscriber cap for the owner's plan. `null` = unlimited. */
  cap: number | null;
  ownerEmail: string;
  ownerName: string;
}

/**
 * Thrown by `assertSubscriberCapacity` when adding subscribers would push a
 * newsletter past its plan's included cap. Routes should catch this and
 * surface `.message` to the caller as a 402/403-style "upgrade to
 * continue" error rather than a generic 500.
 */
export class SubscriberLimitError extends Error {
  usage: SubscriberUsage;

  constructor(usage: SubscriberUsage) {
    super(
      `${usage.newsletterName} is at its ${usage.plan.name} plan limit of ${usage.cap?.toLocaleString()} subscribers. Upgrade to add more.`
    );
    this.name = "SubscriberLimitError";
    this.usage = usage;
  }
}

type NewsletterOwnerPlan = {
  newsletterName: string;
  plan: Plan;
  ownerEmail: string;
  ownerName: string;
};

/**
 * Looks up a newsletter's owner and their exact plan (`users.plan`, not the
 * coarser `subscriptionType`). Returns `null` if the newsletter has no owner
 * on record, which shouldn't happen for a real newsletter but is handled
 * defensively rather than thrown, since this sits on hot paths (public
 * subscribe forms, external-API sends).
 */
const getNewsletterOwnerPlan = async (
  newsletterId: string
): Promise<NewsletterOwnerPlan | null> => {
  const [row] = await db
    .select({
      newsletterName: newsletters.name,
      ownerId: users.id,
      ownerName: users.name,
      ownerEmail: users.email,
      ownerPlan: users.plan,
    })
    .from(newsletterMembers)
    .innerJoin(users, eq(newsletterMembers.userId, users.id))
    .innerJoin(newsletters, eq(newsletterMembers.newsletterId, newsletters.id))
    .where(
      and(
        eq(newsletterMembers.newsletterId, newsletterId),
        eq(newsletterMembers.role, "owner")
      )
    );

  if (!row) return null;

  return {
    newsletterName: row.newsletterName,
    plan: getPlanBySlug(row.ownerPlan),
    ownerEmail: row.ownerEmail,
    ownerName: row.ownerName,
  };
};

/**
 * Looks up the newsletter's owner/plan plus the newsletter's current subscriber
 * count. Returns `null` if the newsletter has no owner on record.
 */
export const getNewsletterSubscriberUsage = async (
  newsletterId: string
): Promise<SubscriberUsage | null> => {
  const ownerPlan = await getNewsletterOwnerPlan(newsletterId);
  if (!ownerPlan) return null;

  const [subscriberStats] = await db
    .select({ value: count() })
    .from(subscribers)
    .where(eq(subscribers.newsletterId, newsletterId));
  const subscriberCount = subscriberStats?.value ?? 0;

  return {
    newsletterId,
    newsletterName: ownerPlan.newsletterName,
    plan: ownerPlan.plan,
    count: subscriberCount,
    cap: ownerPlan.plan.subscribers,
    ownerEmail: ownerPlan.ownerEmail,
    ownerName: ownerPlan.ownerName,
  };
};

const WARNING_THRESHOLD = 0.8;

type LimitWarningState = {
  cap: number;
  warned80: boolean;
  warned100: boolean;
};

const getWarningState = (
  config: Record<string, unknown> | null
): LimitWarningState | null => {
  const state = (config as any)?.subscriberLimitWarnings;
  return state && typeof state.cap === "number" ? state : null;
};

/**
 * Emails the newsletter owner once when usage first crosses 80% of their
 * plan's cap, and once more when it reaches/exceeds the cap. Dedupe state
 * lives in `newsletters.config.subscriberLimitWarnings` — keyed by the cap
 * itself, so upgrading (which changes the cap) naturally resets it and the
 * owner gets warned again as they approach the *new* limit.
 *
 * Fire-and-forget from the caller's perspective: failures are logged, not
 * thrown, so a flaky email send never blocks a subscriber signup.
 */
export const syncSubscriberLimitWarnings = async (
  usage: SubscriberUsage
): Promise<void> => {
  if (usage.cap === null) return; // unlimited plan, nothing to warn about

  try {
    const [existing] = await db
      .select({ config: newsletters.config })
      .from(newsletters)
      .where(eq(newsletters.id, usage.newsletterId));

    const config = (existing?.config as Record<string, unknown>) || {};
    const prevState = getWarningState(config);
    const state: LimitWarningState =
      prevState && prevState.cap === usage.cap
        ? prevState
        : { cap: usage.cap, warned80: false, warned100: false };

    const atCap = usage.count >= usage.cap;
    const nearCap = usage.count >= usage.cap * WARNING_THRESHOLD;

    let shouldSend: "reached" | "approaching" | null = null;
    if (atCap && !state.warned100) {
      shouldSend = "reached";
      state.warned100 = true;
      state.warned80 = true; // reaching 100% implies 80% was crossed too
    } else if (nearCap && !state.warned80) {
      shouldSend = "approaching";
      state.warned80 = true;
    }

    if (shouldSend) {
      await db
        .update(newsletters)
        .set({ config: { ...config, subscriberLimitWarnings: state } })
        .where(eq(newsletters.id, usage.newsletterId));

      await sendSubscriberLimitWarningEmail({
        ownerEmail: usage.ownerEmail,
        ownerName: usage.ownerName,
        newsletterName: usage.newsletterName,
        planName: usage.plan.name,
        subscriberCount: usage.count,
        subscriberCap: usage.cap,
        upgradeUrl: `${envConfig.DASHBOARD_SITE}/settings/billing`,
        status: shouldSend,
      });
    }
  } catch (error) {
    console.error(
      `Failed to sync subscriber limit warnings for newsletter ${usage.newsletterId}:`,
      error
    );
  }
};

/**
 * Throws `SubscriberLimitError` if adding `additionalCount` subscribers
 * would push the newsletter past its owner's plan cap. Callers should run
 * this *before* inserting new subscribers (manual add, CSV import, public
 * subscribe form).
 */
export const assertSubscriberCapacity = async (
  newsletterId: string,
  additionalCount = 1
): Promise<SubscriberUsage> => {
  const usage = await getNewsletterSubscriberUsage(newsletterId);

  if (!usage) {
    // Fails closed: a newsletter with no resolvable owner/plan shouldn't be
    // able to silently accept unlimited subscribers.
    console.error(
      `assertSubscriberCapacity: no owner found for newsletter ${newsletterId}.`
    );
    throw new Error("Could not determine this newsletter's subscriber limit.");
  }

  if (usage.cap !== null && usage.count + additionalCount > usage.cap) {
    // Already-blocked signups still deserve a fresh nudge to the owner.
    void syncSubscriberLimitWarnings(usage);
    throw new SubscriberLimitError(usage);
  }

  return usage;
};

export interface NewsletterSendUsage {
  newsletterId: string;
  newsletterName: string;
  plan: Plan;
  /** Sends already made in today's window, including the one that tipped it over. */
  count: number;
  /** Included daily send cap for the owner's plan. `null` = unlimited. */
  cap: number | null;
}

/**
 * Thrown by `assertNewsletterSendCapacity` when a newsletter has hit its
 * plan's daily external-API newsletter-send cap. Routes should catch this
 * and surface `.message` to the caller as a 429.
 */
export class NewsletterSendLimitError extends Error {
  usage: NewsletterSendUsage;

  constructor(usage: NewsletterSendUsage) {
    super(
      `${usage.newsletterName} has reached its ${usage.plan.name} plan limit of ${usage.cap} newsletter ${usage.cap === 1 ? "send" : "sends"} per day. Try again tomorrow or upgrade to send more.`
    );
    this.name = "NewsletterSendLimitError";
    this.usage = usage;
  }
}

/** Redis key for a newsletter's newsletter-send counter for "today" (UTC). */
const newsletterSendCounterKey = (newsletterId: string) =>
  `newsletter-sends:${newsletterId}:${new Date().toISOString().slice(0, 10)}`;

/**
 * Throws `NewsletterSendLimitError` if this send would push the newsletter
 * past its owner's plan's daily newsletter-send cap. Callers should run
 * this *before* resolving recipients / calling the mail provider, so a
 * newsletter that's already over its cap doesn't pay the cost of a real send
 * attempt (or, later, a moderation check) just to be rejected anyway.
 *
 * Uses an atomic Redis `INCR` (24h-ish TTL set on first increment) rather
 * than a DB row, since this is a high-frequency, best-effort counter, not
 * data that needs to survive a Redis flush.
 */
export const assertNewsletterSendCapacity = async (
  newsletterId: string
): Promise<NewsletterSendUsage> => {
  const ownerPlan = await getNewsletterOwnerPlan(newsletterId);

  if (!ownerPlan) {
    // Fails closed, same reasoning as assertSubscriberCapacity.
    console.error(
      `assertNewsletterSendCapacity: no owner found for newsletter ${newsletterId}.`
    );
    throw new Error("Could not determine this newsletter's send limit.");
  }

  const { plan, newsletterName } = ownerPlan;

  if (plan.newslettersPerDay === null) {
    return { newsletterId, newsletterName, plan, count: 0, cap: null };
  }

  const redis = await getRedis();
  const key = newsletterSendCounterKey(newsletterId);

  const count = await redis.incr(key);
  if (count === 1) {
    // Only the first increment of the window needs to set the expiry.
    // ~26h so a request right at the UTC day boundary still gets a full
    // window rather than expiring a couple hours early.
    await redis.expire(key, 26 * 60 * 60);
  }

  const usage: NewsletterSendUsage = {
    newsletterId,
    newsletterName,
    plan,
    count,
    cap: plan.newslettersPerDay,
  };

  if (count > plan.newslettersPerDay) {
    throw new NewsletterSendLimitError(usage);
  }

  return usage;
};
