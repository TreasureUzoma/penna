import { envConfig } from "@/config";
import { getProjectBySlug } from "@/services/projects";
import { db } from "@workspace/db";
import { subscribers } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { verifySnsMessage, type SnsMessage } from "./sns-verify";

interface SesRecipient {
  emailAddress: string;
}

interface SesBounceEvent {
  bounceType: "Undetermined" | "Permanent" | "Transient";
  bouncedRecipients: SesRecipient[];
}

interface SesComplaintEvent {
  complainedRecipients: SesRecipient[];
}

interface SesNotification {
  notificationType: "Bounce" | "Complaint" | "Delivery";
  mail: { source: string };
  bounce?: SesBounceEvent;
  complaint?: SesComplaintEvent;
}

/**
 * Pulls the project slug back out of a newsletter Source address built by
 * `sendNewsletterEmail` (`newsletter@{slug}.{NEWSLETTER_DOMAIN}`). Returns
 * null for system/transactional sends (`SYSTEM_EMAIL_FROM`), which aren't
 * tied to any project's subscriber list.
 */
const projectSlugFromSource = (source: string): string | null => {
  const suffix = `.${envConfig.NEWSLETTER_DOMAIN}`;
  if (!source.startsWith("newsletter@") || !source.endsWith(suffix)) {
    return null;
  }
  const slug = source.slice("newsletter@".length, source.length - suffix.length);
  return slug || null;
};

const suppressRecipients = async (
  source: string,
  emails: string[],
  status: "bounced" | "unsubscribed"
): Promise<void> => {
  if (emails.length === 0) return;

  const slug = projectSlugFromSource(source);
  if (!slug) {
    console.warn(
      `SES ${status} notification for non-project source "${source}" — no subscriber list to update.`
    );
    return;
  }

  const project = await getProjectBySlug(slug);
  if (!project.success || !project.data) {
    console.warn(
      `SES ${status} notification for unknown project slug "${slug}".`
    );
    return;
  }

  for (const email of emails) {
    await db
      .update(subscribers)
      .set({ status })
      .where(
        and(
          eq(subscribers.projectId, project.data.id),
          eq(subscribers.email, email)
        )
      );
  }
};

/**
 * Handles one SES event delivered via SNS. Permanent bounces and
 * complaints suppress the subscriber going forward — this is both what
 * AWS expects for production-access approval ("a process in place for
 * handling bounce and complaint notifications") and what keeps bounce/
 * complaint rates low enough that SES doesn't throttle or suspend sending.
 *
 * Transient/undetermined bounces are left alone — they're often temporary
 * (mailbox full, greylisting) and don't warrant permanently suppressing
 * the address. Delivery notifications aren't acted on.
 */
export const handleSesEvent = async (
  notification: SesNotification
): Promise<void> => {
  if (notification.notificationType === "Bounce" && notification.bounce) {
    if (notification.bounce.bounceType !== "Permanent") return;
    const emails = notification.bounce.bouncedRecipients.map(
      (r) => r.emailAddress
    );
    await suppressRecipients(notification.mail.source, emails, "bounced");
    return;
  }

  if (notification.notificationType === "Complaint" && notification.complaint) {
    const emails = notification.complaint.complainedRecipients.map(
      (r) => r.emailAddress
    );
    // A complaint is a stronger signal than a bounce — the recipient
    // actively flagged the mail as spam, so treat it like an unsubscribe
    // rather than just marking it "bounced".
    await suppressRecipients(notification.mail.source, emails, "unsubscribed");
    return;
  }

  // Delivery notifications: nothing to do.
};

export interface HandleSnsPayloadResult {
  success: boolean;
  message: string;
}

/**
 * Entry point for the `/webhooks/ses` route. Verifies the message is
 * genuinely from AWS SNS *and* from our own topic, auto-confirms new
 * (un)subscriptions, and routes Notification messages to `handleSesEvent`.
 *
 * Fails closed if `SES_NOTIFICATIONS_TOPIC_ARN` isn't configured, same as
 * `handlePaddleWebhook` does for `PADDLE_WEBHOOK_SECRET` — see
 * apps/server/services/mail/README.md for the one-time SNS/SES setup.
 */
export const handleSnsPayload = async (
  rawBody: string
): Promise<HandleSnsPayloadResult> => {
  if (!envConfig.SES_NOTIFICATIONS_TOPIC_ARN) {
    return {
      success: false,
      message: "SES bounce/complaint notifications are not configured.",
    };
  }

  let message: SnsMessage;
  try {
    message = JSON.parse(rawBody);
  } catch {
    return { success: false, message: "Invalid JSON payload." };
  }

  // Signature verification alone only proves "some AWS SNS topic sent
  // this" — anyone can create their own topic and subscribe our endpoint.
  // Pinning to our configured topic ARN is what scopes trust to *our* SES
  // account's events.
  if (message.TopicArn !== envConfig.SES_NOTIFICATIONS_TOPIC_ARN) {
    return { success: false, message: "Unrecognized topic." };
  }

  const isAuthentic = await verifySnsMessage(message);
  if (!isAuthentic) {
    return { success: false, message: "Invalid message signature." };
  }

  if (
    message.Type === "SubscriptionConfirmation" ||
    message.Type === "UnsubscribeConfirmation"
  ) {
    if (message.SubscribeURL) {
      // This GET is how SNS expects an HTTP(S) endpoint to confirm it
      // controls the URL — visiting it is the confirmation.
      await fetch(message.SubscribeURL);
    }
    return { success: true, message: `${message.Type} handled.` };
  }

  if (message.Type === "Notification") {
    let notification: SesNotification;
    try {
      notification = JSON.parse(message.Message);
    } catch {
      return { success: false, message: "Invalid SES notification payload." };
    }
    await handleSesEvent(notification);
    return { success: true, message: "Notification handled." };
  }

  return {
    success: false,
    message: `Unhandled SNS message type: ${message.Type}`,
  };
};
