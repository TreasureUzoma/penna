import { sleep } from "workflow";
import { prepareEmailSend, sendEmailChunk } from "./steps";

interface EmailCampaignProps {
  emailId: string;
  scheduledTime: string; // ISO string, kept serialization-safe across the workflow boundary
}

/**
 * Recipients per step call. Kept small so any one `sendEmailChunk`
 * invocation — which is its own bounded serverless function execution when
 * deployed (e.g. to Vercel) — finishes quickly regardless of list size,
 * instead of one call trying to send to the entire subscriber list and
 * risking the function's max duration.
 */
const CHUNK_SIZE = 25;

/**
 * How many chunks run in parallel per wave. Bounds concurrent SES sends
 * (respect your account's sending rate — AWS SES starts new accounts in the
 * sandbox with very low limits) and concurrent function invocations. Tune
 * both constants to your actual SES send rate once you're out of the
 * sandbox.
 */
const MAX_CONCURRENT_CHUNKS = 4;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function emailCampaignWorkflow({
  emailId,
  scheduledTime,
}: EmailCampaignProps) {
  "use workflow";

  const scheduledDate = new Date(scheduledTime);

  if (scheduledDate.getTime() > Date.now()) {
    await sleep(scheduledDate);
  }

  const prepared = await prepareEmailSend(emailId);

  if (prepared.status !== "ready") {
    return prepared;
  }

  const chunks = chunk(prepared.recipientEmails, CHUNK_SIZE);
  let sent = 0;
  let failed = 0;

  // Waves of bounded parallel fan-out, rather than either one giant
  // sequential send or unbounded Promise.all across every chunk at once.
  for (let i = 0; i < chunks.length; i += MAX_CONCURRENT_CHUNKS) {
    const wave = chunks.slice(i, i + MAX_CONCURRENT_CHUNKS);

    const results = await Promise.all(
      wave.map((recipients) =>
        sendEmailChunk(
          prepared.newsletter,
          prepared.subject,
          prepared.html,
          recipients,
          prepared.removeBranding
        )
      )
    );

    for (const result of results) {
      sent += result.sent;
      failed += result.failed;
    }
  }

  return { status: "completed" as const, sent, failed };
}
