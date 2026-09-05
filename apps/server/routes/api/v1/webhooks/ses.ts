import { Hono } from "hono";
import { handleSnsPayload } from "@/services/mail/ses-events";

/**
 * Public — deliberately NOT behind session auth (mounted before
 * `v1.use("*", withAuth)` in index.ts). AWS SNS calls this directly and
 * can't carry a Penna session cookie; authenticity is verified via SNS's
 * own message signature plus a TopicArn check instead (see
 * `handleSnsPayload`), which fails closed if `SES_NOTIFICATIONS_TOPIC_ARN`
 * isn't configured.
 */
const sesWebhookRoute = new Hono();

sesWebhookRoute.post("/", async (c) => {
  // Signature verification needs the exact raw body bytes, not a
  // JSON.parse → re-serialize round trip.
  const rawBody = await c.req.text();

  const result = await handleSnsPayload(rawBody);

  return c.json(
    {
      success: result.success,
      message: result.message,
    },
    result.success ? 200 : 400
  );
});

export default sesWebhookRoute;
