import { db } from "@workspace/db";
import { newsletters } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";

export const NEWSLETTER_WEBHOOK_EVENTS = [
  "subscriber.created",
  "subscriber.confirmed",
  "subscriber.unsubscribed",
] as const;

export type NewsletterWebhookEvent = (typeof NEWSLETTER_WEBHOOK_EVENTS)[number];

export type NewsletterWebhookPayload = {
  event: NewsletterWebhookEvent;
  timestamp: string;
  newsletterId: string;
  newsletterName?: string | null;
  subscriber?: {
    id?: string | null;
    email: string;
    name?: string | null;
    status?: string | null;
    createdAt?: string | null;
  };
};

const getNewsletterWebhookConfig = async (newsletterId: string) => {
  const [newsletter] = await db
    .select({
      config: newsletters.config,
      name: newsletters.name,
      slug: newsletters.slug,
    })
    .from(newsletters)
    .where(eq(newsletters.id, newsletterId));

  const config = (newsletter?.config as Record<string, unknown> | null) ?? {};
  const webhooks =
    (config.webhooks as Record<string, unknown> | undefined) ?? {};

  return {
    newsletterName: newsletter?.name ?? null,
    newsletterSlug: newsletter?.slug ?? null,
    url:
      typeof webhooks.url === "string" && webhooks.url.trim().length > 0
        ? webhooks.url.trim()
        : null,
    secret:
      typeof webhooks.secret === "string" && webhooks.secret.trim().length > 0
        ? webhooks.secret.trim()
        : null,
    events: Array.isArray(webhooks.events)
      ? webhooks.events.filter(
          (event): event is NewsletterWebhookEvent =>
            typeof event === "string" &&
            NEWSLETTER_WEBHOOK_EVENTS.includes(event as NewsletterWebhookEvent),
        )
      : [],
  };
};

export const sendNewsletterWebhookEvent = async (
  newsletterId: string,
  event: NewsletterWebhookEvent,
  subscriber?: NewsletterWebhookPayload["subscriber"],
) => {
  try {
    const webhookConfig = await getNewsletterWebhookConfig(newsletterId);
    if (!webhookConfig.url || !webhookConfig.events.includes(event)) {
      return;
    }

    const body: NewsletterWebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      newsletterId,
      newsletterName: webhookConfig.newsletterName,
      subscriber,
    };

    const response = await fetch(webhookConfig.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "penna-webhook/1.0",
        "X-Penna-Webhook-Event": event,
        ...(webhookConfig.secret
          ? { "X-Penna-Webhook-Secret": webhookConfig.secret }
          : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.warn(
        `Newsletter webhook failed for ${event} (${newsletterId}): ${response.status} ${response.statusText}`,
      );
    }
  } catch (error) {
    console.warn(
      `Newsletter webhook dispatch error for ${event} (${newsletterId}):`,
      error,
    );
  }
};
