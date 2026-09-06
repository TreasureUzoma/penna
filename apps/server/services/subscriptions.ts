import { db } from "@workspace/db";
import { newsletters, subscribers } from "@workspace/db/schema";
import { eq, count, and, desc } from "drizzle-orm";
import { paginate } from "../utils/pagination";
import type {
  CreateSubscriber,
  UnsubscribeRequest,
} from "@workspace/validations";
import type { ServiceResponse, SubscriberStatus } from "@workspace/types";
import {
  assertSubscriberCapacity,
  syncSubscriberLimitWarnings,
  SubscriberLimitError,
} from "./limits";

export const getNewsletterSubscribers = (
  newsletterId: string,
  page = 1,
  limit = 10,
  status: SubscriberStatus = "subscribed"
) => {
  const offset = (page - 1) * limit;

  const subscribersData = db
    .select()
    .from(subscribers)
    .where(
      and(eq(subscribers.newsletterId, newsletterId), eq(subscribers.status, status))
    )
    .limit(limit)
    .offset(offset);

  const countResult = db
    .select({ count: count() })
    .from(subscribers)
    .where(eq(subscribers.newsletterId, newsletterId));

  return paginate(subscribersData, countResult, page, limit);
};

export const createNewsletterSubscriber = async (body: CreateSubscriber) => {
  try {
    const usage = await assertSubscriberCapacity(body.newsletterId);

    const subscriber = await db
      .insert(subscribers)
      .values({
        name: body?.name ?? null,
        email: body.email,
        newsletterId: body.newsletterId,
      })
      .returning();

    void syncSubscriberLimitWarnings({ ...usage, count: usage.count + 1 });

    return {
      success: true,
      data: subscriber,
      message: "Created subscriber successfully.",
    };
  } catch (err) {
    if (err instanceof SubscriberLimitError) {
      return { success: false, data: null, message: err.message };
    }
    return {
      success: false,
      data: null,
      message:
        err instanceof Error ? err.message : "Failed to create subscriber.",
    };
  }
};

export const removeNewsletterSubscriber = async (
  newsletterId: string,
  email: string
) => {
  try {
    await db
      .delete(subscribers)
      .where(
        and(eq(subscribers.newsletterId, newsletterId), eq(subscribers.email, email))
      );

    return {
      data: null,
      message: `Removed subscriber (${email}).`,
      success: true,
    };
  } catch (err) {
    return {
      data: null,
      message: "Failed to remove subscriber",
      success: true,
    };
  }
};

export const getNewsletterSubscriberExistence = async (
  body: UnsubscribeRequest
): Promise<ServiceResponse> => {
  const { newsletterId, email } = body;
  const [subscriber] = await db
    .select()
    .from(subscribers)
    .where(
      and(eq(subscribers.newsletterId, newsletterId), eq(subscribers.email, email))
    );

  if (!subscriber)
    return {
      message: "Subscriber not found",
      success: true,
      data: null,
    };

  const [newsletter] = await db
    .select({ name: newsletters.name })
    .from(newsletters)
    .where(eq(newsletters.id, newsletterId));

  return {
    message: "Subscriber found",
    success: true,
    data: {
      newsletterName: newsletter?.name ?? null,
    },
  };
};

export const confirmUnsubscribe = async (body: UnsubscribeRequest) => {
  try {
    const unsubscribe = await db
      .update(subscribers)
      .set({ status: "unsubscribed" })
      .where(
        and(
          eq(subscribers.newsletterId, body.newsletterId),
          eq(subscribers.email, body.email)
        )
      );

    const [newsletter] = await db
      .select({ name: newsletters.name })
      .from(newsletters)
      .where(eq(newsletters.id, body.newsletterId));

    return {
      success: true,
      data: {
        newsletterName: newsletter?.name ?? null,
      },
      message: "Subscribed sucessfully",
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      message:
        err instanceof Error
          ? err.message
          : "Failed to unsubscribe from newsletter.",
    };
  }
};

export const getRecentSubscribers = async (newsletterId: string, limit = 5) => {
  try {
    const recentSubscribers = await db
      .select({
        id: subscribers.id,
        email: subscribers.email,
        name: subscribers.name,
        status: subscribers.status,
        createdAt: subscribers.createdAt,
      })
      .from(subscribers)
      .where(eq(subscribers.newsletterId, newsletterId))
      .orderBy(desc(subscribers.createdAt))
      .limit(limit);

    return {
      success: true,
      data: recentSubscribers,
      message: "Fetched recent subscribers successfully",
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong fetching recent subscribers",
    };
  }
};
