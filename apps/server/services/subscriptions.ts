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
import { sendSubscriberVerificationEmail } from "./mail/internal";
import { envConfig } from "@/config";
import { sign } from "hono/jwt";

const getSubscriberFirstName = (name?: string | null) => {
  const trimmed = name?.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
};

const sendVerificationLink = async (
  newsletterId: string,
  email: string,
  name?: string | null,
) => {
  const [newsletter] = await db
    .select({ name: newsletters.name })
    .from(newsletters)
    .where(eq(newsletters.id, newsletterId));

  const token = await sign(
    {
      newsletterId,
      email,
      type: "subscriber-confirmation",
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    },
    envConfig.UNSUBSCRIBE_SECRET || "",
  );

  const confirmUrl = `${envConfig.APP_URL}/subscribe/confirm?token=${encodeURIComponent(token)}`;

  await sendSubscriberVerificationEmail({
    email,
    firstName: getSubscriberFirstName(name),
    newsletterName: newsletter?.name || "this newsletter",
    verifyUrl: confirmUrl,
  });
};

export const confirmNewsletterSubscriber = async (
  newsletterId: string,
  email: string,
): Promise<ServiceResponse> => {
  const [subscriber] = await db
    .select()
    .from(subscribers)
    .where(
      and(
        eq(subscribers.newsletterId, newsletterId),
        eq(subscribers.email, email),
      ),
    );

  if (!subscriber) {
    return {
      success: false,
      message: "Subscriber not found.",
      data: null,
    };
  }

  if (subscriber.status === "subscribed") {
    return {
      success: true,
      message: "This email is already subscribed.",
      data: subscriber,
    };
  }

  if (subscriber.status === "unsubscribed") {
    return {
      success: false,
      message:
        "This email has been unsubscribed. Re-subscribe to verify again.",
      data: null,
    };
  }

  const [confirmed] = await db
    .update(subscribers)
    .set({ status: "subscribed", updatedAt: new Date() })
    .where(eq(subscribers.id, subscriber.id))
    .returning();

  return {
    success: true,
    message: "Subscription confirmed successfully.",
    data: confirmed,
  };
};

export const getRecentSubscribers = async (newsletterId: string) => {
  const recent = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.newsletterId, newsletterId))
    .orderBy(desc(subscribers.createdAt))
    .limit(5);

  return {
    success: true,
    message: "Fetched recent subscribers successfully",
    data: recent,
  };
};

export const getNewsletterSubscribers = (
  newsletterId: string,
  page = 1,
  limit = 10,
  status: SubscriberStatus = "subscribed",
) => {
  const offset = (page - 1) * limit;

  const subscribersData = db
    .select()
    .from(subscribers)
    .where(
      and(
        eq(subscribers.newsletterId, newsletterId),
        eq(subscribers.status, status),
      ),
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
    const [existingSubscriber] = await db
      .select()
      .from(subscribers)
      .where(
        and(
          eq(subscribers.newsletterId, body.newsletterId),
          eq(subscribers.email, body.email),
        ),
      );

    if (existingSubscriber) {
      if (existingSubscriber.status === "subscribed") {
        return {
          success: false,
          data: null,
          message: "This email is already subscribed to this newsletter.",
        };
      }

      if (existingSubscriber.status === "pending") {
        await sendVerificationLink(
          body.newsletterId,
          body.email,
          body.name ?? existingSubscriber.name,
        );

        return {
          success: true,
          data: existingSubscriber,
          message:
            "Verification email sent again. Check your inbox to confirm.",
        };
      }

      if (existingSubscriber.status !== "unsubscribed") {
        return {
          success: false,
          data: null,
          message:
            "This email cannot be re-subscribed because delivery to it has been suppressed.",
        };
      }

      const [resubscribed] = await db
        .update(subscribers)
        .set({
          status: "pending",
          name: body.name ?? existingSubscriber.name,
          updatedAt: new Date(),
        })
        .where(eq(subscribers.id, existingSubscriber.id))
        .returning();

      await sendVerificationLink(
        body.newsletterId,
        body.email,
        body.name ?? existingSubscriber.name,
      );

      return {
        success: true,
        data: resubscribed,
        message: "Verification email sent. Check your inbox to confirm.",
      };
    }

    const usage = await assertSubscriberCapacity(body.newsletterId);

    const [subscriber] = await db
      .insert(subscribers)
      .values({
        name: body?.name ?? null,
        email: body.email,
        newsletterId: body.newsletterId,
        status: "pending",
      })
      .returning();

    void syncSubscriberLimitWarnings({ ...usage, count: usage.count });

    await sendVerificationLink(
      body.newsletterId,
      body.email,
      body.name ?? null,
    );

    return {
      success: true,
      data: subscriber,
      message:
        "Verification email sent. Check your inbox to confirm your subscription.",
    };
  } catch (err) {
    if (err instanceof SubscriberLimitError) {
      return { success: false, data: null, message: err.message };
    }

    const cause = (err as { cause?: { code?: string; message?: string } })
      ?.cause;
    const isDuplicate =
      cause?.code === "23505" ||
      cause?.message?.includes("duplicate key") ||
      (err instanceof Error && err.message.includes("duplicate key"));

    if (isDuplicate) {
      return {
        success: false,
        data: null,
        message: "This email is already subscribed to this newsletter.",
      };
    }

    return {
      success: false,
      data: null,
      message: "Failed to create subscriber.",
    };
  }
};

export const removeNewsletterSubscriber = async (
  newsletterId: string,
  email: string,
) => {
  try {
    await db
      .delete(subscribers)
      .where(
        and(
          eq(subscribers.newsletterId, newsletterId),
          eq(subscribers.email, email),
        ),
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
  body: UnsubscribeRequest,
): Promise<ServiceResponse> => {
  const { newsletterId, email } = body;
  const [subscriber] = await db
    .select()
    .from(subscribers)
    .where(
      and(
        eq(subscribers.newsletterId, newsletterId),
        eq(subscribers.email, email),
      ),
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
          eq(subscribers.email, body.email),
        ),
      );

    const [newsletter] = await db
      .select({ name: newsletters.name })
      .from(newsletters)
      .where(eq(newsletters.id, body.newsletterId));

    return {
      success: true,
      data: { newsletterName: newsletter?.name ?? null },
      message: "Unsubscribed successfully",
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      message: "Failed to unsubscribe",
    };
  }
};
