import { recordEmailClick, recordEmailOpen } from "@/services/mail/tracking";
import { Hono } from "hono";

const trackingRoute = new Hono();
const transparentGif = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="), (c) => c.charCodeAt(0));

trackingRoute.get("/open/:token.gif", async (c) => {
  await recordEmailOpen(c.req.param("token"));
  return new Response(transparentGif, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, max-age=0" },
  });
});

trackingRoute.get("/click/:token", async (c) => {
  const url = c.req.query("url");
  if (!url) return c.text("Missing destination URL.", 400);
  let destination: URL;
  try {
    destination = new URL(url);
  } catch {
    return c.text("Invalid destination URL.", 400);
  }
  if (destination.protocol !== "https:" && destination.protocol !== "http:") {
    return c.text("Invalid destination URL.", 400);
  }
  await recordEmailClick(c.req.param("token"));
  return c.redirect(destination.toString(), 302);
});

export default trackingRoute;
