import { db } from "@workspace/db";
import { newsletterSendLogs } from "@workspace/db/schema";

type NewsletterSendStatus =
  (typeof newsletterSendLogs.$inferInsert)["status"];
type ModerationVerdict =
  (typeof newsletterSendLogs.$inferInsert)["moderationVerdict"];

interface LogNewsletterSendInput {
  newsletterId: string;
  apiKeyId: string;
  subject: string;
  recipientCount?: number;
  skippedNonSubscribers?: number;
  status: NewsletterSendStatus;
  moderationVerdict?: ModerationVerdict;
  moderationCategory?: string;
  moderationReason?: string;
  errorMessage?: string;
}

/**
 * Records one attempted external-API newsletter send, whatever the
 * outcome. Called from every exit path in the `/newsletters/send` route
 * (sent, rate-limited, no recipients, moderation-blocked, errored) so the
 * audit trail is complete rather than only capturing successes.
 *
 * Fire-and-forget from the caller's perspective: a logging failure
 * shouldn't ever surface as a failure of the send request itself, so
 * errors are caught and logged rather than thrown.
 */
export const logNewsletterSend = async (
  input: LogNewsletterSendInput
): Promise<void> => {
  try {
    await db.insert(newsletterSendLogs).values({
      newsletterId: input.newsletterId,
      apiKeyId: input.apiKeyId,
      subject: input.subject,
      recipientCount: input.recipientCount ?? 0,
      skippedNonSubscribers: input.skippedNonSubscribers ?? 0,
      status: input.status,
      moderationVerdict: input.moderationVerdict,
      moderationCategory: input.moderationCategory,
      moderationReason: input.moderationReason,
      errorMessage: input.errorMessage,
    });
  } catch (error) {
    console.error(
      `Failed to log newsletter send for newsletter ${input.newsletterId}:`,
      error
    );
  }
};
