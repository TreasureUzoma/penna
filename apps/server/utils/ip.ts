import type { Context } from "hono";

/**
 * Extracts the client IP address from request headers (x-forwarded-for, cf-connecting-ip, x-real-ip, etc.)
 * with fallback for local development environments.
 */
export function getClientIp(c: Context): string {
  const xForwardedFor = c.req.header("x-forwarded-for");
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const cfIp = c.req.header("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const realIp = c.req.header("x-real-ip");
  if (realIp) return realIp.trim();

  const clientIp =
    c.req.header("x-client-ip") ||
    c.req.header("fastly-client-ip") ||
    c.req.header("true-client-ip");
  if (clientIp) return clientIp.trim();

  // Fallback for Hono Node server / local dev
  const nodeRemoteIp = (c.env as unknown as { incoming?: { socket?: { remoteAddress?: string } } })?.incoming?.socket?.remoteAddress;
  if (nodeRemoteIp) return nodeRemoteIp;

  return "127.0.0.1";
}
