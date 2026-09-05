import { and, eq } from "drizzle-orm";
import { sendEmailNewsletter } from "../mail/external";
import { decryptDataSubtle } from "@/lib/encrypt";
import { renderNewsletterMarkdown } from "@/lib/markdown";
import { envConfig } from "@/config";
import { dbLite, schema } from "./db-lite";

export type PrepareEmailSendResult =
  | { status: "cancelled" | "skipped" | "failed"; reason: string }
  | {
      status: "ready";
      project: { id: string; slug: string };
      subject: string;
      html: string;
      recipientEmails: string[];
      removeBranding: boolean;
    };

/**
 * Reads everything needed to send a campaign — the email row, project,
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
  emailId: string
): Promise<PrepareEmailSendResult> {
  "use step";

  const [email] = await dbLite
    .select()
    .from(schema.emails)
    .where(eq(schema.emails.id, emailId));

  if (!email || email.status !== "published") {
    return {
      status: "cancelled",
      reason: `Email is no longer eligible for sending (status: ${email?.status ?? "not found"})`,
    };
  }

  const [project] = await dbLite
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, email.projectId));

  if (!project) {
    return { status: "failed", reason: "Project not found" };
  }

  const subscriberRows = await dbLite
    .select({ email: schema.subscribers.email })
    .from(schema.subscribers)
    .where(
      and(
        eq(schema.subscribers.projectId, email.projectId),
        eq(schema.subscribers.status, "subscribed")
      )
    );
  const recipientEmails = subscriberRows.map((r) => r.email);

  if (recipientEmails.length === 0) {
    return { status: "skipped", reason: "No subscribed subscribers" };
  }

  // The dashboard's post editor stores the raw Markdown a user typed, not
  // HTML — render it the same way the external API send path does
  // (`routes/api/v1/external/projects.ts`), otherwise subscribers get
  // literal "**bold**"/"# heading" markdown syntax in their inbox instead
  // of formatted email.
  const rawBody = await decryptDataSubtle(
    email.body,
    envConfig.ENCRYPTION_KEY || ""
  );
  const html = renderNewsletterMarkdown(rawBody);

  const [owner] = await dbLite
    .select({ subscriptionType: schema.users.subscriptionType })
    .from(schema.projectMembers)
    .innerJoin(schema.users, eq(schema.projectMembers.userId, schema.users.id))
    .where(
      and(
        eq(schema.projectMembers.projectId, email.projectId),
        eq(schema.projectMembers.role, "owner")
      )
    );
  const removeBranding = !!owner && owner.subscriptionType !== "free";

  return {
    status: "ready",
    project: { id: project.id, slug: project.slug },
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
  project: { id: string; slug: string },
  subject: string,
  html: string,
  recipientEmails: string[],
  removeBranding: boolean
): Promise<SendEmailChunkResult> {
  "use step";

  try {
    const result = await sendEmailNewsletter(
      project,
      recipientEmails,
      subject,
      html,
      undefined,
      removeBranding
    );

    if ("sent" in result) {
      return { sent: result.sent, failed: result.failed };
    }
    // Single-recipient path returns {success, messageId} instead of counts.
    return result.success
      ? { sent: 1, failed: 0 }
      : { sent: 0, failed: 1 };
  } catch {
    // sendEmailNewsletter only throws when EVERY recipient in this chunk
    // failed (nothing succeeded), so nothing here needs a retry-safety
    // rollback — just report the whole chunk as failed.
    return { sent: 0, failed: recipientEmails.length };
  }
}
