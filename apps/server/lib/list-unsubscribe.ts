import { sign } from "hono/jwt";
import { envConfig } from "@/config";

export interface ListUnsubscribeInfo {
  /** The plain URL — also used as the visible "Unsubscribe" link in the email body. */
  unsubscribeUrl: string;
  /** Pre-formatted value for the `List-Unsubscribe` header (angle-bracket wrapped). */
  header: string;
}

/**
 * Builds a permanent, per-recipient one-click unsubscribe link and the
 * matching `List-Unsubscribe` header value, per RFC 8058 — required by
 * Gmail/Yahoo for bulk senders (enforced above ~5,000 msgs/day to Gmail,
 * but weighed by spam filters well below that too), and what makes the
 * native "Unsubscribe" button next to the sender name show up.
 *
 * Unlike the manual unsubscribe-request flow's token (see
 * routes/api/v1/unsubscribe.ts's `POST /`, which is for a subscriber who
 * shows up on a public page and types their own email — that one expires
 * in 15 minutes to limit how long a guessed/typed request stays valid),
 * this token has no expiry: it's embedded in one specific already-sent
 * email that may sit unread in an inbox for months, and the one-click
 * button needs to keep working for as long as that email exists.
 *
 * No `mailto:` URI is included in the header — Penna doesn't process
 * inbound mail, so a `mailto:` fallback would silently go nowhere.
 */
export const buildListUnsubscribeHeaders = async (
  projectId: string,
  email: string
): Promise<ListUnsubscribeInfo> => {
  const token = await sign({ projectId, email }, envConfig.UNSUBSCRIBE_SECRET);
  const unsubscribeUrl = `${envConfig.API_URL}/api/v1/unsubscribe/one-click/${token}`;

  return {
    unsubscribeUrl,
    header: `<${unsubscribeUrl}>`,
  };
};
