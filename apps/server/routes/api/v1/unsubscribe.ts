import { envConfig } from "@/config";
import { routeStatus } from "@/lib/utils";
import { sendUnsubscribeCofirmationEmail } from "@/services/mail/internal";
import {
  confirmUnsubscribe,
  getProjectSubscriberExistence,
} from "@/services/subscriptions";
import { validationErrorResponse } from "@/utils/validation-error-response";
import { zValidator } from "@hono/zod-validator";
import {
  isValidToken,
  unsubscribeFromProjectSchema,
} from "@workspace/validations";
import { Hono } from "hono";
import type { Context } from "hono";
import { sign, verify } from "hono/jwt";

const unsubscribeRoutes = new Hono();

/**
 * Shared by both the manual confirm-flow token (`/unsubscribe/:token`
 * below) and the one-click token (`/one-click/:token`) — same
 * verify-then-unsubscribe logic either way, they just differ in how the
 * token was minted and how long it stays valid.
 */
const verifyAndUnsubscribe = async (c: Context, token: string) => {
  const validToken = await verify(
    token,
    envConfig.UNSUBSCRIBE_SECRET || "",
    "HS256"
  );

  if (!validToken) {
    return c.json(
      {
        data: null,
        message: "Invalid or tampered token",
        success: false,
      },
      401
    );
  }

  const { projectId, email } = validToken as {
    projectId: string;
    email: string;
  };

  if (!projectId || !email) {
    return c.json({ success: false, message: "Invalid token payload" }, 400);
  }

  const serviceData = await confirmUnsubscribe({ projectId, email });
  return c.json(serviceData, routeStatus(serviceData));
};

// unsubsribe req
unsubscribeRoutes.post(
  zValidator("json", unsubscribeFromProjectSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const body = c.req.valid("json");
    const existence = await getProjectSubscriberExistence(body);

    if (existence.success == false) {
      return c.json(existence, 404);
    }

    const token = await sign(
      {
        projectId: body.projectId,
        email: body.email,
        exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15m from now
      },
      envConfig.UNSUBSCRIBE_SECRET!
    );

    const confirmUrl = `${envConfig.APP_URL}/unsubscribe/confirm?token=${token}`;

    await sendUnsubscribeCofirmationEmail(
      body.email,
      existence.data.projectName,
      confirmUrl
    );

    return c.json({
      success: true,
      message: "Confirmation email sent",
      data: body.email,
    });
  }
);

// confirm unsubscribe
unsubscribeRoutes.get(
  "/unsubscribe/:token",
  zValidator("param", isValidToken, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const { token } = c.req.valid("param");
    return verifyAndUnsubscribe(c, token);
  }
);

// One-click unsubscribe (RFC 8058) — the link/header embedded directly in
// every newsletter send (see lib/list-unsubscribe.ts), not the "type in
// your email, then confirm via a follow-up email" flow above. Both GET (a
// plain click, for clients without RFC 8058 support) and POST (a mail
// provider's automated one-click submission) unsubscribe immediately, no
// second confirmation step — the signed token, embedded in one specific
// already-sent email, is itself the proof this is a real request.
const oneClickParamValidator = zValidator(
  "param",
  isValidToken,
  (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }
);

unsubscribeRoutes.get("/one-click/:token", oneClickParamValidator, (c) => {
  const { token } = c.req.valid("param");
  return verifyAndUnsubscribe(c, token);
});

unsubscribeRoutes.post("/one-click/:token", oneClickParamValidator, (c) => {
  const { token } = c.req.valid("param");
  return verifyAndUnsubscribe(c, token);
});

export default unsubscribeRoutes;
