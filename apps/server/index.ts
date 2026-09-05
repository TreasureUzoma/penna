import { Hono } from "hono";
import { logger } from "hono/logger";
import { rateLimiter } from "./middlewares/rate-limiter";
import { withAuth } from "./middlewares/session";
import authRoute from "./routes/api/v1/auth";
import type { Context } from "hono";
import type { AuthType } from "./types";
import projectsRoute from "./routes/api/v1/projects";
import subscriptionRoutes from "./routes/api/v1/subscriptions";
import subscriptionsPaddleRoute from "./routes/api/v1/subscriptions-paddle";
import paddleWebhookRoute from "./routes/api/v1/webhooks/paddle";
import sesWebhookRoute from "./routes/api/v1/webhooks/ses";
import unsubscribeRoutes from "./routes/api/v1/unsubscribe";
import externalProjectRoutes from "./routes/api/v1/external/projects";
import profileRoutes from "./routes/api/v1/profiles";
import postRoutes from "./routes/api/v1/posts";
import dashboardRoute from "./routes/api/v1/dashboard";
import emailsRoute from "./routes/api/v1/emails";
import segmentRoutes from "./routes/api/v1/segments";
import { start } from "workflow/api";
import { myTestWorkflow } from "./tests/workflow";

const app = new Hono();

app.use(logger());

app.notFound((c) => {
  return c.json({ message: "Not Found" }, 404);
});

app.get("/test-workflow", async (c) => {
  await start(myTestWorkflow);
  return c.json({
    message: "Workflow started",
  });
});

app.onError((err, c) => {
  return c.json(
    {
      success: false,
      message: err.message || "Internal server error",
      data: null,
    },
    500,
  );
});

const v1 = new Hono().basePath("/api/v1");

v1.get("/test-workflow", rateLimiter(60 * 1000, 5), async (c) => {
  await start(myTestWorkflow);
  return c.json({
    message: "Workflow started",
  });
});

v1.get("/health", rateLimiter(60 * 1000, 5), (c) => {
  return c.json({ message: "Server is healthy!" });
});

// Auth routes (15 req per hour for login/signup etc., no auth required)
v1.route("/auth", authRoute.use(rateLimiter(60 * 60 * 1000, 15)));

// unsubscribe route, no auth needed too
v1.route("/unsubscribe", unsubscribeRoutes.use(rateLimiter(60 * 1000, 5)));

v1.route(
  "/external/projects",
  externalProjectRoutes.use(rateLimiter(60 * 1000, 9)),
);

// Paddle webhook — public, verified via Paddle's own signature instead of
// a session (Paddle's servers can't carry a Penna session cookie)
v1.route(
  "/webhooks/paddle",
  paddleWebhookRoute.use(rateLimiter(60 * 60 * 1000, 100)),
);

// SES bounce/complaint webhook (via SNS) — public, verified via SNS's own
// message signature + topic ARN check instead of a session. Limit is much
// higher than other webhooks since a rocky send can legitimately generate
// a burst of bounce notifications in a short window.
v1.route(
  "/webhooks/ses",
  sesWebhookRoute.use(rateLimiter(60 * 60 * 1000, 2000)),
);

// Everything else requires authentication
v1.use("*", withAuth);

// 80 req per hour, /session
v1.get("/session", rateLimiter(60 * 60 * 1000, 80), (c: Context) => {
  const user = c.get("user") as AuthType | undefined;
  return c.json({
    success: true,
    data: user ?? null,
    message: "Fetched User Session Successfully",
  });
});

// projects, 70 req per hour
v1.route("/projects", projectsRoute.use(rateLimiter(60 * 60 * 1000, 70)));

// subsribers, 70 req per hour
v1.route(
  "/subscribers",
  subscriptionRoutes.use(rateLimiter(60 * 60 * 1000, 70)),
);

// paddle subscriptions, 50 req per hour
v1.route(
  "/subscriptions",
  subscriptionsPaddleRoute.use(rateLimiter(60 * 60 * 1000, 50)),
);

// profile, 70 req per hour
v1.route("/profile", profileRoutes.use(rateLimiter(60 * 60 * 1000, 70)));

// posts/emails, 90 req per hour
v1.route("/posts", postRoutes.use(rateLimiter(60 * 60 * 1000, 70)));

// emails, 100 req per hour (for sending newsletters)
v1.route("/emails", emailsRoute.use(rateLimiter(60 * 60 * 1000, 100)));

// dashboard, 70 req per hour
v1.route("/dashboard", dashboardRoute.use(rateLimiter(60 * 60 * 1000, 70)));

// segments, 70 req per hour
v1.route("/segments", segmentRoutes.use(rateLimiter(60 * 60 * 1000, 70)));

app.route("/", v1);

export default app;
