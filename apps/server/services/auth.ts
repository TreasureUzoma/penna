import { envConfig } from "@/config";
import type {
  GitHubTokenData,
  GitHubEmail,
  GitHubUser,
  NewRefreshToken,
  Login,
  Signup,
  VerifyResetPassword,
  OauthType,
  VerifyEmail,
} from "@workspace/types";

import { google } from "googleapis";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { passwordResets, refreshTokens, users } from "@workspace/db/schema";
import { and, desc, eq, gt, lt, ne } from "drizzle-orm";
import { sendForgottenPasswordEmail, sendWelcomeEmail } from "./mail/internal";
import { type ChangePasswordData } from "@workspace/validations";

const GOOGLE_REDIRECT_URI = `${envConfig.APP_URL}/api/v1/auth/google/callback`;
const GITHUB_REDIRECT_URI = `${envConfig.APP_URL}/api/v1/auth/github/callback`;

// Pre-launch lockdown: block new account creation in production while
// still allowing existing users to log in (password or OAuth). Remove
// this once the product actually launches. Matched by exact message in
// the OAuth callback routes (auth.ts) to redirect with a specific error
// code instead of the generic "auth_failed".
export const SIGNUPS_CLOSED_MESSAGE =
  "Signups are currently closed — check back after launch.";
const signupsBlocked = () => envConfig.NODE_ENV === "production";

const oauth2Client = new google.auth.OAuth2(
  envConfig.GOOGLE_CLIENT_ID,
  envConfig.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

export const getGoogleAuthUrl = () => {
  const scopes = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes.join(" "),
  });
};

export const getGithubAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: envConfig.GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_REDIRECT_URI,
    scope: "user:email",
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
};

const getGithubUserInfo = async (code: string) => {
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: envConfig.GITHUB_CLIENT_ID,
      client_secret: envConfig.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = (await tokenRes.json()) as GitHubTokenData;
  if (!tokenData.access_token) throw new Error("GitHub token exchange failed");

  const accessToken = tokenData.access_token;

  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const user = (await userRes.json()) as GitHubUser;

  const emailRes = await fetch("https://api.github.com/user/emails", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const emails = (await emailRes.json()) as GitHubEmail[];

  const primaryEmail =
    emails.find((e) => e.primary && e.verified)?.email ?? null;

  return {
    id: String(user.id),
    email: primaryEmail,
    name: user.name || user.login,
    avatarUrl: user.avatar_url,
  };
};

export const createOauthUser = async (method: OauthType, code?: string) => {
  if (!code) {
    return {
      message: `Missing ${method} authorization code`,
      data: null,
      success: false,
    };
  }

  if (method === "google") {
    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const { data: userInfo } = await oauth2.userinfo.get();

      if (!userInfo.email || !userInfo.id) {
        return {
          message: "Invalid Google user data",
          data: null,
          success: false,
        };
      }

      return await upsertUser({
        providerId: userInfo.id,
        email: userInfo.email,
        name: userInfo.name || "Unknown",
        authMethod: "google",
        avatarUrl: userInfo.picture || null,
      });
    } catch (error) {
      console.error("Google token exchange failed:", error);
      return {
        message: "Google authentication failed",
        data: null,
        success: false,
      };
    }
  }

  if (method === "github") {
    const userInfo = await getGithubUserInfo(code);
    if (!userInfo.email) {
      return {
        message: "GitHub user has no public email",
        data: null,
        success: false,
      };
    }

    return await upsertUser({
      providerId: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      authMethod: "github",
      avatarUrl: userInfo.avatarUrl || null,
    });
  }

  return {
    message: "Unsupported auth method",
    data: null,
    success: false,
  };
};

const upsertUser = async (user: {
  providerId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  authMethod: "google" | "github";
}) => {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, user.email))
    .limit(1);

  if (existing.length === 0 && signupsBlocked()) {
    return {
      message: SIGNUPS_CLOSED_MESSAGE,
      data: null,
      success: false,
    };
  }

  let currentUserId: string;

  if (existing.length === 0) {
    const [newUser] = await db
      .insert(users)
      .values({
        providerId: user.providerId,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        authMethod: user.authMethod,
        emailVerifiedAt: new Date(),
      })
      .returning({ id: users.id });

    currentUserId = newUser!.id;
  } else {
    currentUserId = existing[0]!.id;
  }

  return {
    message: "OAuth user created or fetched successfully",
    data: { id: currentUserId, email: user.email, name: user.name },
    success: true,
  };
};

export const insertAuthRefreshToken = async (data: NewRefreshToken) => {
  await db.insert(refreshTokens).values({
    token: data.token,
    expiresAt: data.expiresAt,
    revoked: false,
    userId: data.userId,
    userAgent: data.userAgent,
  });
};

export const deleteAuthRefreshToken = async (id: string) => {
  await db.delete(refreshTokens).where(eq(refreshTokens.id, id));
};

export const login = async (payload: Login) => {
  const { email, password } = payload;
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const foundUser = rows[0];
  if (!foundUser || !foundUser.password) {
    return { success: false, message: "Invalid email or password", data: null };
  }

  const valid = await bcrypt.compare(password, foundUser.password);
  if (!valid) {
    return { success: false, message: "Invalid email or password", data: null };
  }

  const { password: _, createdAt, updatedAt, ...safeUser } = foundUser;

  return {
    success: true,
    message: "Password matched",
    data: safeUser,
  };
};

export const signup = async (payload: Signup) => {
  if (signupsBlocked()) {
    return {
      success: false,
      message: SIGNUPS_CLOSED_MESSAGE,
      data: null,
    };
  }

  const { email, password, name } = payload;

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    return {
      success: false,
      message: "Email already in use",
      data: null,
    };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const [newUser] = await db
    .insert(users)
    .values({
      name,
      email,
      password: hashedPassword,
    })
    .returning();
  await sendWelcomeEmail(newUser?.name ?? "", newUser!.email);

  return {
    success: true,
    message: "Signup successful",
    data: newUser,
  };
};

export const forgotPassword = async (email: string) => {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const genericResponse = {
    success: true,
    message: "If that email exists, a reset link has been sent to it.",
    data: email,
  };

  if (!existing) return genericResponse;

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await db.insert(passwordResets).values({
    userId: existing.id,
    token,
    expiresAt,
  });

  await sendForgottenPasswordEmail(email, expiresAt, token);

  return genericResponse;
};

export const verifyResetPassword = async (payload: VerifyResetPassword) => {
  const [resetRecord] = await db
    .select()
    .from(passwordResets)
    .where(
      and(
        eq(passwordResets.token, payload.token),
        eq(passwordResets.used, false)
      )
    )
    .limit(1);

  if (!resetRecord) {
    return { success: false, message: "Invalid or used token" };
  }

  if (resetRecord.expiresAt < new Date()) {
    return { success: false, message: "Token expired" };
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  await db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, resetRecord.userId));

  await db
    .update(passwordResets)
    .set({ used: true })
    .where(eq(passwordResets.token, payload.token));

  return { success: true, message: "Password reset successfully" };
};

export const verifyEmail = async (payload: VerifyEmail) => {
  const [resetRecord] = await db
    .select()
    .from(passwordResets)
    .where(
      and(
        eq(passwordResets.token, payload.token),
        eq(passwordResets.used, false)
      )
    )
    .limit(1);

  if (!resetRecord) {
    return { success: false, message: "Invalid or used token" };
  }

  if (resetRecord.expiresAt < new Date()) {
    return { success: false, message: "Token expired" };
  }

  await db
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(users.id, resetRecord.userId));

  return { success: true, message: "Email verified successfully" };
};

export const changePassword = async (
  userId: string,
  data: ChangePasswordData
) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || !user.password) {
    return { success: false, message: "User not found or invalid" };
  }

  const valid = await bcrypt.compare(data.currentPassword, user.password);
  if (!valid) {
    return { success: false, message: "Incorrect current password" };
  }

  const hashedPassword = await bcrypt.hash(data.newPassword, 10);

  await db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, userId));

  return { success: true, message: "Password updated successfully" };
};

export const getActiveSessions = async (userId: string) => {
  const now = new Date();

  // Every login (including each silent refresh-cookie rotation in
  // withAuth) has inserted a row here with nothing to ever prune it —
  // `revoked` only flips true from an explicit logout/revoke, so a token
  // that just expired on its own after 7 days stayed listed as "active"
  // forever. Delete this user's expired rows opportunistically on read —
  // there's no scheduled job doing it, so whoever next opens this page is
  // the cleanup — then only return what's actually still usable.
  await db
    .delete(refreshTokens)
    .where(and(eq(refreshTokens.userId, userId), lt(refreshTokens.expiresAt, now)));

  const sessions = await db
    .select({
      id: refreshTokens.id,
      userAgent: refreshTokens.userAgent,
      expiresAt: refreshTokens.expiresAt,
    })
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.userId, userId),
        eq(refreshTokens.revoked, false),
        gt(refreshTokens.expiresAt, now)
      )
    )
    .orderBy(desc(refreshTokens.expiresAt));

  return {
    success: true,
    data: sessions,
    message: "Sessions fetched successfully",
  };
};

/**
 * Looks up a session's row id from its raw refresh-token cookie value —
 * there's no session id in the JWT itself, so this is how a route figures
 * out "which row is *this* request" for something like "sign out every
 * other session" (see the /sessions/revoke-others route).
 */
export const getSessionIdByToken = async (
  token: string,
  userId: string
): Promise<string | null> => {
  const [row] = await db
    .select({ id: refreshTokens.id })
    .from(refreshTokens)
    .where(and(eq(refreshTokens.token, token), eq(refreshTokens.userId, userId)));

  return row?.id ?? null;
};

export const revokeSession = async (sessionId: string, userId: string) => {
  await db
    .update(refreshTokens)
    .set({ revoked: true })
    .where(
      and(eq(refreshTokens.id, sessionId), eq(refreshTokens.userId, userId))
    );

  return { success: true, message: "Session signed out successfully" };
};

export const revokeAllOtherSessions = async (
  currentSessionId: string,
  userId: string
) => {
  await db
    .update(refreshTokens)
    .set({ revoked: true })
    .where(
      and(
        eq(refreshTokens.userId, userId),
        ne(refreshTokens.id, currentSessionId)
      )
    );

  return { success: true, message: "All other sessions signed out" };
};
