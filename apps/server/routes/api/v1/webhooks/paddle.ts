import { Hono } from "hono";
import { handlePaddleWebhook } from "@/services/paddle";

/**
 * Public — deliberately NOT behind session auth (mounted before
 * `v1.use("*", withAuth)` in index.ts). Paddle's servers call this
 * directly and can't carry a Penna session cookie; authenticity is
 * verified via Paddle's own webhook signature instead (see
 * `handlePaddleWebhook`), which fails closed if `PADDLE_WEBHOOK_SECRET`
 * isn't configured.
 */
const paddleWebhookRoute = new Hono();

paddleWebhookRoute.post("/", async (c) => {
  // Signature verification needs the exact raw body bytes, not a
  // JSON.parse → re-serialize round trip.
  const rawBody = await c.req.text();
  const signature = c.req.header("paddle-signature");

  const result = await handlePaddleWebhook(rawBody, signature);

  return c.json(
    {
      success: result.success,
      message: result.message,
    },
    result.success ? 200 : 400
  );
});

export default paddleWebhookRoute;
