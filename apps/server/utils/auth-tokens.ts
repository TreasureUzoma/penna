import { sign } from "hono/jwt";
import { setSignedCookie } from "hono/cookie";
import { envConfig } from "@/config";
import { insertAuthRefreshToken } from "@/services/auth";
import type { Context } from "hono";

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;
const FIFTEEN_MINUTES_SECONDS = 15 * 60;

export const generateTokens = async (
  userId: string,
  email: string,
  name: string,
  plan?: string
) => {
  const now = Math.floor(Date.now() / 1000);

  const accessExp = now + FIFTEEN_MINUTES_SECONDS;
  const refreshExp = now + SEVEN_DAYS_SECONDS;
  const refreshExpDate = new Date(Date.now() + SEVEN_DAYS_SECONDS * 1000);

  const accessToken = await sign(
    { id: userId, email, name, plan, exp: accessExp },
    envConfig.JWT_ACCESS_SECRET
  );

  const refreshToken = await sign(
    { id: userId, exp: refreshExp },
    envConfig.JWT_REFRESH_SECRET
  );

  return { accessToken, refreshToken, refreshExpDate };
};

export const storeRefreshToken = async (
  userId: string,
  refreshToken: string,
  refreshExpDate: Date,
  userAgent: string
): Promise<void> => {
  await insertAuthRefreshToken({
    userId,
    expiresAt: refreshExpDate,
    userAgent,
    token: refreshToken,
  });
};

export const setAuthCookies = async (
  c: Context,
  accessToken: string,
  refreshToken: string
): Promise<void> => {
  await setSignedCookie(
    c,
    "pennaAccessToken",
    accessToken,
    envConfig.JWT_ACCESS_SECRET,
    {
      httpOnly: true,
      secure: envConfig.NODE_ENV === "production",
      sameSite: "Lax",
      path: "/",
      maxAge: FIFTEEN_MINUTES_SECONDS,
    }
  );

  await setSignedCookie(
    c,
    "pennaRefreshToken",
    refreshToken,
    envConfig.JWT_REFRESH_SECRET,
    {
      httpOnly: true,
      secure: envConfig.NODE_ENV === "production",
      sameSite: "Lax",
      path: "/",
      maxAge: SEVEN_DAYS_SECONDS,
    }
  );
};

export const clearAuthCookies = async (c: Context): Promise<void> => {
  await setSignedCookie(
    c,
    "pennaAccessToken",
    "",
    envConfig.JWT_ACCESS_SECRET,
    {
      httpOnly: true,
      secure: envConfig.NODE_ENV === "production",
      sameSite: "Lax",
      path: "/",
      maxAge: 0,
    }
  );

  await setSignedCookie(
    c,
    "pennaRefreshToken",
    "",
    envConfig.JWT_REFRESH_SECRET,
    {
      httpOnly: true,
      secure: envConfig.NODE_ENV === "production",
      sameSite: "Lax",
      path: "/",
      maxAge: 0,
    }
  );
};
