import type { MiddlewareHandler } from "hono";

/**
 * List of known bot / spam User-Agent strings to block.
 */
const BLOCKED_USER_AGENTS: string[] = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
];

export const blockBadUserAgents: MiddlewareHandler = async (c, next) => {
  const userAgent = c.req.header("user-agent") || c.req.header("User-Agent");

  if (userAgent && BLOCKED_USER_AGENTS.some((blocked) => userAgent.includes(blocked.trim()))) {
    return c.json(
      {
        success: false,
        message: "Forbidden",
      },
      403,
    );
  }

  await next();
};
