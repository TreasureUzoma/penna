import type { MiddlewareHandler } from "hono";
import { getSignedCookie, setSignedCookie } from "hono/cookie";
import { verify, sign } from "hono/jwt";
import { envConfig } from "@/config";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { refreshTokens, users } from "@workspace/db/schema";

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;
const FIFTEEN_MINUTES_SECONDS = 15 * 60;

async function generateTokens(
  userId: string,
  email: string,
  name?: string,
  plan?: string
) {
  const currentTime = Math.floor(Date.now() / 1000);

  const accessToken = await sign(
    {
      id: userId,
      email,
      name,
      plan,
      exp: currentTime + FIFTEEN_MINUTES_SECONDS,
    },
    envConfig.JWT_ACCESS_SECRET!
  );

  const refreshToken = await sign(
    { id: userId, exp: currentTime + SEVEN_DAYS_SECONDS },
    envConfig.JWT_REFRESH_SECRET!
  );

  const refreshExpDate = new Date(Date.now() + SEVEN_DAYS_SECONDS * 1000);

  return { accessToken, refreshToken, refreshExpDate };
}

// Middleware
export const withAuth: MiddlewareHandler = async (c, next) => {
  try {
    const accessToken = await getSignedCookie(
      c,
      envConfig.JWT_ACCESS_SECRET!,
      "pennaAccessToken"
    );

    if (accessToken) {
      try {
        const decoded = (await verify(
          accessToken,
          envConfig.JWT_ACCESS_SECRET!,
          "HS256"
        )) as { id: string; email: string; name?: string; plan?: string };

        // Inject user into context
        c.set("user", decoded);
        return await next();
      } catch {
        // Access token invalid, continue to refresh
      }
    }

    // Check refresh token
    const refreshToken = await getSignedCookie(
      c,
      envConfig.JWT_REFRESH_SECRET,
      "pennaRefreshToken"
    );
    if (!refreshToken)
      return c.json({ message: "Unauthorized", success: false }, 401);

    let decodedRefresh: { id: string };
    try {
      decodedRefresh = (await verify(
        refreshToken,
        envConfig.JWT_REFRESH_SECRET,
        "HS256"
      )) as { id: string };
    } catch {
      return c.json({ message: "Unauthorized", success: false }, 401);
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decodedRefresh.id))
      .limit(1);

    if (!user) return c.json({ message: "Unauthorized", success: false }, 401);

    // Check if this refresh token is revoked
    const [tokenRecord] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, refreshToken))
      .limit(1);

    if (!tokenRecord || tokenRecord.revoked) {
      return c.json({ message: "Unauthorized", success: false }, 401);
    }

    // Generate new tokens
    const {
      accessToken: newAccess,
      refreshToken: newRefresh,
      refreshExpDate,
    } = await generateTokens(
      user.id,
      user.email,
      user.name,
      user.subscriptionType ?? undefined
    );

    // Update refresh token in database
    await db
      .update(refreshTokens)
      .set({ token: newRefresh, expiresAt: refreshExpDate })
      .where(eq(refreshTokens.token, refreshToken));

    // Set new cookies
    await setSignedCookie(
      c,
      "pennaAccessToken",
      newAccess,
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
      newRefresh,
      envConfig.JWT_REFRESH_SECRET,
      {
        httpOnly: true,
        secure: envConfig.NODE_ENV === "production",
        sameSite: "Lax",
        path: "/",
        maxAge: SEVEN_DAYS_SECONDS,
      }
    );

    // Set user in context
    c.set("user", {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.subscriptionType ?? undefined,
    });
    
    return await next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return c.json(
      { message: "Unauthorized (middleware)", success: false },
      401
    );
  }
};
