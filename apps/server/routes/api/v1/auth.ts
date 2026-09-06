import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  loginSchema,
  createAccountSchema,
  verifyResetPasswordSchema,
  isValidEmail,
  verifyEmailSchema,
  changePasswordSchema,
} from "@workspace/validations";
import {
  login,
  createOauthUser,
  signup,
  deleteAuthRefreshToken,
  forgotPassword,
  verifyResetPassword,
  getGoogleAuthUrl,
  getGithubAuthUrl,
  verifyEmail,
  changePassword,
  getActiveSessions,
  revokeSession,
  revokeAllOtherSessions,
  getSessionIdByToken,
  SIGNUPS_CLOSED_MESSAGE,
} from "@/services/auth";
import { getSignedCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import { envConfig } from "@/config";
import {
  generateTokens,
  storeRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from "@/utils/auth-tokens";
import type { Context } from "hono";
import type { ServiceResponse } from "@workspace/types";
import { validationErrorResponse } from "@/utils/validation-error-response";
import type { AuthType, AppBindings } from "@/types";
import { routeStatus } from "@/lib/utils";
import { withAuth } from "@/middlewares/session";

const authRoute = new Hono<AppBindings>();

const handleAuth = async (
  c: Context,
  serviceData: ServiceResponse<{
    id: string;
    email: string;
    name?: string;
    subscriptionType?: string | null;
  }>
) => {
  if (!serviceData.success || !serviceData.data?.id) {
    return c.json(
      {
        success: false,
        message: serviceData.message || "Authentication failed",
      },
      401
    );
  }

  const { id, email, name } = serviceData.data;
  const userAgent = c.req.header("User-Agent") || "unknown";

  const { accessToken, refreshToken, refreshExpDate } = await generateTokens(
    id,
    email,
    name || "-",
    serviceData.data.subscriptionType ?? undefined
  );

  await storeRefreshToken(id, refreshToken, refreshExpDate, userAgent);
  await setAuthCookies(c, accessToken, refreshToken);

  return c.json(
    {
      message: "Authentication successful",
      data: serviceData.data,
      success: true,
    },
    201
  );
};

authRoute.post(
  "/login",
  zValidator("json", loginSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const body = c.req.valid("json");
    const serviceData = await login(body);

    if (serviceData.success && serviceData.data) {
      const mappedData = {
        success: serviceData.success,
        message: serviceData.message,
        data: {
          id: serviceData.data.id,
          email: serviceData.data.email,
          name: serviceData.data.name,
          subscriptionType: serviceData.data.subscriptionType ?? undefined,
        },
      };
      return handleAuth(c, mappedData);
    }

    return handleAuth(c, serviceData);
  }
);

authRoute.post(
  "/signup",
  zValidator("json", createAccountSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const body = c.req.valid("json");
    const serviceData = await signup(body);

    if (serviceData.success && serviceData.data) {
      const mappedData = {
        success: serviceData.success,
        message: serviceData.message,
        data: {
          id: serviceData.data.id,
          email: serviceData.data.email,
          name: serviceData.data.name,
          subscriptionType: serviceData.data.subscriptionType ?? undefined,
        },
      };
      return handleAuth(c, mappedData);
    }

    return handleAuth(c, serviceData);
  }
);

authRoute.get("/google/url", (c) => {
  return c.json({ url: getGoogleAuthUrl() }, 200);
});

authRoute.get("/google/callback", async (c) => {
  const code = c.req.query("code");

  if (!code) {
    return c.redirect("/login?error=missing_code", 302);
  }

  const serviceData = await createOauthUser("google", code);

  if (serviceData.success && serviceData.data?.id) {
    const { id, email, name } = serviceData.data;
    const userAgent = c.req.header("User-Agent") || "unknown";

    const { accessToken, refreshToken, refreshExpDate } = await generateTokens(
      id,
      email,
      name || "-",
      undefined
    );

    await storeRefreshToken(id, refreshToken, refreshExpDate, userAgent);
    await setAuthCookies(c, accessToken, refreshToken);

    return c.redirect("/dashboard", 302);
  }

  if (serviceData.message === SIGNUPS_CLOSED_MESSAGE) {
    return c.redirect("/login?error=signups_closed", 302);
  }

  return c.redirect("/login?error=auth_failed", 302);
});

authRoute.get("/github/url", (c) => {
  return c.json({ url: getGithubAuthUrl() }, 200);
});

authRoute.get("/github/callback", async (c) => {
  const code = c.req.query("code");

  if (!code) {
    return c.redirect("/login?error=missing_code", 302);
  }

  const serviceData = await createOauthUser("github", code);

  if (serviceData.success && serviceData.data?.id) {
    const { id, email, name } = serviceData.data;
    const userAgent = c.req.header("User-Agent") || "unknown";

    const { accessToken, refreshToken, refreshExpDate } = await generateTokens(
      id,
      email,
      name || "-"
    );

    await storeRefreshToken(id, refreshToken, refreshExpDate, userAgent);
    await setAuthCookies(c, accessToken, refreshToken);

    return c.redirect("/dashboard", 302);
  }

  if (serviceData.message === SIGNUPS_CLOSED_MESSAGE) {
    return c.redirect("/login?error=signups_closed", 302);
  }

  return c.redirect("/login?error=auth_failed", 302);
});

authRoute.post("/logout", async (c) => {
  const refreshToken = await getSignedCookie(
    c,
    envConfig.JWT_REFRESH_SECRET,
    "pennaRefreshToken"
  );

  if (refreshToken) {
    try {
      const decoded = (await verify(
        refreshToken,
        envConfig.JWT_REFRESH_SECRET!,
        "HS256"
      )) as { id: string };
      if (decoded.id) await deleteAuthRefreshToken(decoded.id);
    } catch {
      console.warn("Invalid or expired refresh token during logout");
    }
  }

  await clearAuthCookies(c);
  return c.json({ message: "Logout successful", success: true }, 200);
});

authRoute.post(
  "/forgotten-password",
  zValidator("json", isValidEmail, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const body = c.req.valid("json");
    const serviceData = await forgotPassword(body.email);
    return c.json(serviceData, 200);
  }
);

authRoute.post(
  "/reset-password",
  zValidator("json", verifyResetPasswordSchema, (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  async (c) => {
    const body = c.req.valid("json");
    const serviceData = await verifyResetPassword(body);

    if (!serviceData.success) {
      return c.json(serviceData, 400);
    }

    return c.json(serviceData, 200);
  }
);

authRoute.post(
  "/verify-email",
  zValidator("json", verifyEmailSchema, (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  async (c) => {
    const body = c.req.valid("json");
    const serviceData = await verifyEmail(body);

    if (!serviceData.success) {
      return c.json(serviceData, 400);
    }

    return c.json(serviceData, 200);
  }
);

authRoute.use("*", withAuth);
authRoute.post(
  "/change-password",
  zValidator("json", changePasswordSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const user = c.get("user") as AuthType;
    if (!user) return c.json({ success: false, message: "Unauthorized" }, 401);

    const body = c.req.valid("json");
    const serviceData = await changePassword(user.id, body);

    return c.json(serviceData, routeStatus(serviceData));
  }
);

authRoute.get("/sessions", async (c) => {
  const user = c.get("user") as AuthType;

  const serviceData = await getActiveSessions(user.id);
  return c.json(serviceData, routeStatus(serviceData));
});

authRoute.delete("/sessions/:id", async (c) => {
  const user = c.get("user") as AuthType;

  const sessionId = c.req.param("id");
  const serviceData = await revokeSession(sessionId, user.id);
  return c.json(serviceData, routeStatus(serviceData));
});

// "Sign out everywhere else" — keeps the session making this request,
// revokes every other one. Needs the raw cookie (not just c.get("user"),
// which carries no session id) to know which row is "this" session.
authRoute.post("/sessions/revoke-others", async (c) => {
  const user = c.get("user") as AuthType;

  const refreshToken = await getSignedCookie(
    c,
    envConfig.JWT_REFRESH_SECRET,
    "pennaRefreshToken"
  );
  if (!refreshToken) {
    return c.json({ success: false, message: "No active session found" }, 401);
  }

  const currentSessionId = await getSessionIdByToken(refreshToken, user.id);
  if (!currentSessionId) {
    return c.json({ success: false, message: "Session not found" }, 404);
  }

  const serviceData = await revokeAllOtherSessions(currentSessionId, user.id);
  return c.json(serviceData, routeStatus(serviceData));
});

export default authRoute;
