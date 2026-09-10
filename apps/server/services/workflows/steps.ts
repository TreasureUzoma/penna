import { and, eq } from "drizzle-orm";
import { decryptDataSubtle } from "@/lib/encrypt";
import { renderNewsletterMarkdown } from "@/lib/markdown";
import { envConfig } from "@/config";
import { moderateNewsletterContent } from "../moderation";
import { dbLite, schema } from "./db-lite";
import {
  canWorkflowRemoveBranding,
  sendWorkflowEmailChunk,
} from "./workflow-delivery";

export type PrepareEmailSendResult =
  | { status: "cancelled" | "skipped" | "failed"; reason: string }
  | {
      status: "ready";
      newsletter: { id: string; slug: string };
      emailId?: string;
      subject: string;
      html: string;
      recipientEmails: string[];
      removeBranding: boolean;
    };

/**
 * Reads everything needed to send a campaign — the email row, newsletter,
 * subscriber list, and branding eligibility — and hands back a fully
 * resolved, serializable payload. Kept separate from the actual sending
 * (`sendEmailChunk`) so the workflow can fan the send out across many
 * small, parallel step calls instead of one big sequential one — see
 * `../workflows/email-campaign.ts` for why that matters on Vercel.
 *
 * Marked `"use step"` so it gets full Node.js/DB access when called from
 * inside a `"use workflow"` function; calling it directly outside a
 * workflow just runs it as a normal function.
 *
 * Deliberately uses `./db-lite` (a local, duplicated schema) instead of
 * `@workspace/db` — see `./local-schema.ts` for why.
 */
export async function prepareEmailSend(
  emailId: string,
): Promise<PrepareEmailSendResult> {
  "use step";

  console.log("[workflow] prepareEmailSend start", { emailId });

  const [email] = await dbLite
    .select()
    .from(schema.emails)
    .where(eq(schema.emails.id, emailId));

  if (!email || email.status !== "published") {
    console.warn("[workflow] prepareEmailSend cancelled", {
      emailId,
      status: email?.status ?? "not found",
    });
    return {
      status: "cancelled",
      reason: `Email is no longer eligible for sending (status: ${email?.status ?? "not found"})`,
    };
  }

  const [newsletter] = await dbLite
    .select()
    .from(schema.newsletters)
    .where(eq(schema.newsletters.id, email.newsletterId));

  if (!newsletter) {
    console.error("[workflow] prepareEmailSend failed: newsletter not found", {
      emailId,
      newsletterId: email.newsletterId,
    });
    return { status: "failed", reason: "Newsletter not found" };
  }

  const subscriberRows = await dbLite
    .select({ email: schema.subscribers.email })
    .from(schema.subscribers)
    .where(
      and(
        eq(schema.subscribers.newsletterId, email.newsletterId),
        eq(schema.subscribers.status, "subscribed"),
      ),
    );
  const recipientEmails = subscriberRows.map((r) => r.email);

  console.log("[workflow] prepareEmailSend subscribers loaded", {
    emailId,
    newsletterId: newsletter.id,
    recipientCount: recipientEmails.length,
  });

  if (recipientEmails.length === 0) {
    console.warn("[workflow] prepareEmailSend skipped: no recipients", {
      emailId,
      newsletterId: newsletter.id,
    });
    return { status: "skipped", reason: "No subscribed subscribers" };
  }

  const rawBody = await decryptDataSubtle(
    email.body,
    envConfig.ENCRYPTION_KEY || "",
  );

  const moderation = await moderateNewsletterContent({
    subject: email.subject,
    content: rawBody,
    newsletterName: newsletter.name,
  });

  console.log("[workflow] prepareEmailSend moderation result", {
    emailId,
    verdict: moderation.verdict,
    category: moderation.category,
  });

  if (moderation.verdict === "block") {
    await dbLite
      .update(schema.emails)
      .set({
        status: "draft",
        moderationBlockedAt: new Date(),
        moderationBlockedReason: moderation.reason,
        moderationBlockedCategory: moderation.category,
      })
      .where(eq(schema.emails.id, emailId));
    console.warn(
      `Email ${emailId} blocked by content moderation (${moderation.category}): ${moderation.reason}`,
    );
    return {
      status: "cancelled",
      reason: `Blocked by content moderation: ${moderation.reason}`,
    };
  }

  const html = renderNewsletterMarkdown(rawBody);

  const removeBranding =
    (await canWorkflowRemoveBranding(newsletter.teamId)) &&
    (newsletter.config as { removeBranding?: boolean } | null)
      ?.removeBranding === true;

  console.log("[workflow] prepareEmailSend ready", {
    emailId,
    newsletterId: newsletter.id,
    recipientCount: recipientEmails.length,
    removeBranding,
  });

  return {
    status: "ready",
    newsletter: { id: newsletter.id, slug: newsletter.slug },
    emailId: (newsletter.config as { emailTracking?: boolean } | null)
      ?.emailTracking
      ? email.id
      : undefined,
    subject: email.subject,
    html,
    recipientEmails,
    removeBranding,
  };
}

export interface SendEmailChunkResult {
  sent: number;
  failed: number;
}

/**
 * Sends to one small, bounded batch of recipients. Never throws on
 * send failures (individual or total) — only on something that would make
 * retrying safe (nothing sent yet). This keeps it safe to call in parallel
 * across many chunks and safe to retry: a retry never risks double-sending
 * to recipients this same chunk already reached.
 */
export async function sendEmailChunk(
  newsletter: { id: string; slug: string },
  subject: string,
  html: string,
  recipientEmails: string[],
  removeBranding: boolean,
  emailId?: string,
): Promise<SendEmailChunkResult> {
  "use step";

  console.log("[workflow] sendEmailChunk start", {
    emailId,
    newsletterId: newsletter.id,
    recipientCount: recipientEmails.length,
  });

  try {
    const result = await sendWorkflowEmailChunk(
      newsletter,
      recipientEmails,
      subject,
      html,
      removeBranding,
      emailId,
    );

    console.log("[workflow] sendEmailChunk result", {
      emailId,
      sent: result.sent,
      failed: result.failed,
    });

    return result;
  } catch (error) {
    console.error("[workflow] sendEmailChunk caught error", {
      emailId,
      error,
    });
    return { sent: 0, failed: recipientEmails.length };
  }
}
