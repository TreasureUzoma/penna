import type { Context, Next } from "hono";

/**
 * Honeypot middleware for auth endpoints.
 *
 * A hidden `website` field is rendered in the login/signup form but kept
 * invisible to real users via CSS (`display:none` / `aria-hidden`).
 * Bots that blindly fill every input will populate it; real browsers won't.
 *
 * When the field is non-empty we return a fake 200 so the bot thinks it
 * succeeded — giving it no signal that something went wrong, which slows
 * down automated re-tries.
 */
export const honeypot = async (c: Context, next: Next) => {
  try {
    const body = await c.req.json().catch(() => ({}));

    if (body?.website) {
      // Silently swallow the request. Re-inject the body so downstream
      // middleware that also calls c.req.json() doesn't blow up (Hono caches
      // the parsed body after the first read).
      return c.json({ success: true, message: "ok" }, 200);
    }
  } catch {
    // Parsing failed (e.g. non-JSON content-type) — just let it fall through
    // to the real validators who will reject it properly.
  }

  await next();
};
