import { Hono, type Context } from "hono";
import { getSignedCookie } from "hono/cookie";
import { and, eq, gt } from "drizzle-orm";
import { randomBytes, createHash } from "node:crypto";
import { db } from "@workspace/db";
import { users, verification } from "@workspace/db/schema";
import { envConfig } from "@/config";
import { sign, verify } from "hono/jwt";
import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import { fromJsonSchema } from "@modelcontextprotocol/server";
import { rateLimiter } from "@/middlewares/rate-limiter";

const router = new Hono();
router.use("/oauth/register", rateLimiter(60 * 60 * 1000, 20));
router.use("/oauth/token", rateLimiter(60 * 60 * 1000, 120));
router.use("/oauth/revoke", rateLimiter(60 * 60 * 1000, 120));
router.use("/oauth/authorize/*", rateLimiter(60 * 60 * 1000, 40));
const issuer = new URL(envConfig.API_URL).origin;
const resource = `${issuer}/api/v1/mcp`;
const challenge = (token: string) => createHash("sha256").update(token).digest("hex");
const opaque = () => randomBytes(32).toString("base64url");

async function saveRecord(identifier: string, value: unknown, type: string, expiresAt: Date) {
  await db.insert(verification).values({ identifier, value: JSON.stringify(value), type, expiresAt });
}
async function getRecord(identifier: string, type: string) {
  const [record] = await db.select().from(verification).where(and(eq(verification.identifier, identifier), eq(verification.type, type), gt(verification.expiresAt, new Date()))).limit(1);
  if (!record) return null;
  try { return JSON.parse(record.value) as Record<string, any>; } catch { return null; }
}
async function consumeRecord(identifier: string, type: string) {
  const [record] = await db.delete(verification).where(and(eq(verification.identifier, identifier), eq(verification.type, type), gt(verification.expiresAt, new Date()))).returning();
  if (!record) return null;
  try { return JSON.parse(record.value) as Record<string, any>; } catch { return null; }
}

router.get("/oauth-authorization-server", (c) => c.json({
  issuer,
  authorization_endpoint: `${envConfig.DASHBOARD_SITE}/oauth/authorize`,
  token_endpoint: `${issuer}/api/v1/oauth/token`,
  registration_endpoint: `${issuer}/api/v1/oauth/register`,
  revocation_endpoint: `${issuer}/api/v1/oauth/revoke`,
  response_types_supported: ["code"],
  grant_types_supported: ["authorization_code", "refresh_token"],
  code_challenge_methods_supported: ["S256"],
  token_endpoint_auth_methods_supported: ["none"],
  scopes_supported: ["penna:dashboard"],
}));
router.get("/oauth-protected-resource/api/v1/mcp", (c) => c.json({
  resource, authorization_servers: [issuer], bearer_methods_supported: ["header"], scopes_supported: ["penna:dashboard"],
}));

router.post("/oauth/register", async (c) => {
  const body = await c.req.json().catch(() => null) as { redirect_uris?: unknown; client_name?: string } | null;
  if (!Array.isArray(body?.redirect_uris) || body.redirect_uris.length === 0 || body.redirect_uris.length > 10 || body.redirect_uris.some((uri) => typeof uri !== "string" || !isSafeRedirect(uri))) {
    return c.json({ error: "invalid_redirect_uri" }, 400);
  }
  const clientId = opaque();
  await saveRecord(clientId, { redirect_uris: body.redirect_uris, client_name: String(body.client_name ?? "MCP client").slice(0, 120) }, "mcp-client", new Date("9999-12-31"));
  return c.json({ client_id: clientId, client_name: body.client_name ?? "MCP client", redirect_uris: body.redirect_uris, token_endpoint_auth_method: "none" }, 201);
});

function isSafeRedirect(value: string) {
  try {
    const url = new URL(value);
    if (url.username || url.password) return false;
    return !url.hash && (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)));
  } catch { return false; }
}
function isDashboardPost(c: Context) {
  const origin = c.req.header("origin");
  return c.req.header("content-type")?.includes("application/json") && (!origin || origin === new URL(envConfig.DASHBOARD_SITE).origin);
}

// The dashboard consent screen posts back here. The browser's Penna cookie is
// required; OAuth clients can never approve access on a user's behalf.
router.get("/oauth/authorize", (c) => c.redirect(`${envConfig.DASHBOARD_SITE}/oauth/authorize?${new URL(c.req.url).searchParams.toString()}`));
router.get("/oauth/client/:clientId", async (c) => {
  const client = await getRecord(c.req.param("clientId"), "mcp-client");
  if (!client) return c.json({ error: "invalid_client" }, 404);
  return c.json({ client_name: client.client_name });
});
router.post("/oauth/authorize/approve", async (c) => {
  if (!isDashboardPost(c)) return c.json({ error: "invalid_origin" }, 403);
  const access = await getSignedCookie(c, envConfig.JWT_ACCESS_SECRET!, "pennaAccessToken");
  if (!access) return c.json({ error: "login_required" }, 401);
  let user: { id: string; email: string; name?: string };
  try { user = (await verify(access, envConfig.JWT_ACCESS_SECRET!, "HS256")) as typeof user; } catch { return c.json({ error: "login_required" }, 401); }
  const body = await c.req.json().catch(() => null) as Record<string, string> | null;
  const clientId = body?.client_id ?? "";
  const client = await getRecord(clientId, "mcp-client");
  if (!client || !body?.redirect_uri || !(client.redirect_uris as string[]).includes(body.redirect_uri)) return c.json({ error: "invalid_client" }, 400);
  if (body.response_type !== "code" || (body.scope && body.scope !== "penna:dashboard")) return c.json({ error: "invalid_scope_or_response_type" }, 400);
  if (!body.code_challenge || body.code_challenge_method !== "S256" || !/^[A-Za-z0-9_-]{43,128}$/.test(body.code_challenge)) return c.json({ error: "invalid_request" }, 400);
  const state = body.state ?? "";
  if (state.length > 1024) return c.json({ error: "invalid_request" }, 400);
  const code = opaque();
  await saveRecord(challenge(code), { userId: user.id, clientId, redirect_uri: body.redirect_uri, code_challenge: body.code_challenge }, "mcp-code", new Date(Date.now() + 5 * 60_000));
  const redirect = new URL(body.redirect_uri);
  redirect.searchParams.set("code", code);
  if (state) redirect.searchParams.set("state", state);
  return c.json({ redirect: redirect.toString() });
});
router.post("/oauth/authorize/deny", async (c) => {
  if (!isDashboardPost(c)) return c.json({ error: "invalid_origin" }, 403);
  const access = await getSignedCookie(c, envConfig.JWT_ACCESS_SECRET!, "pennaAccessToken");
  if (!access) return c.json({ error: "login_required" }, 401);
  const body = await c.req.json().catch(() => null) as Record<string, string> | null;
  const client = await getRecord(body?.client_id ?? "", "mcp-client");
  if (!client || !body?.redirect_uri || !(client.redirect_uris as string[]).includes(body.redirect_uri)) return c.json({ error: "invalid_client" }, 400);
  if ((body.state ?? "").length > 1024) return c.json({ error: "invalid_request" }, 400);
  const redirect = new URL(body.redirect_uri); redirect.searchParams.set("error", "access_denied"); if (body.state) redirect.searchParams.set("state", body.state);
  return c.json({ redirect: redirect.toString() });
});

router.post("/oauth/token", async (c) => {
  const body = await c.req.parseBody();
  const grant = String(body.grant_type ?? "");
  if (grant === "authorization_code") {
    const code = String(body.code ?? ""); const clientId = String(body.client_id ?? "");
    const data = await consumeRecord(challenge(code), "mcp-code");
    const client = await getRecord(clientId, "mcp-client");
    if (!data || !client || data.clientId !== clientId || data.redirect_uri !== body.redirect_uri || challenge(String(body.code_verifier ?? "")) !== data.code_challenge) return c.json({ error: "invalid_grant" }, 400);
    const [user] = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
    if (!user || user.status === "suspended") return c.json({ error: "invalid_grant" }, 400);
    const refresh = opaque();
    await saveRecord(challenge(refresh), { userId: user.id, clientId }, "mcp-refresh", new Date(Date.now() + 30 * 24 * 60 * 60_000));
    const access_token = await sign({ id: user.id, email: user.email, name: user.name, aud: resource, scope: "penna:dashboard", client_id: clientId, exp: Math.floor(Date.now() / 1000) + 3600 }, envConfig.JWT_ACCESS_SECRET!);
    return c.json({ access_token, token_type: "Bearer", expires_in: 3600, refresh_token: refresh, scope: "penna:dashboard" });
  }
  if (grant === "refresh_token") {
    const refresh = String(body.refresh_token ?? ""); const key = challenge(refresh);
    const existing = await getRecord(key, "mcp-refresh");
    if (!existing || existing.clientId !== body.client_id) return c.json({ error: "invalid_grant" }, 400);
    const data = await consumeRecord(key, "mcp-refresh");
    if (!data || data.clientId !== body.client_id) return c.json({ error: "invalid_grant" }, 400);
    const [user] = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
    if (!user || user.status === "suspended") return c.json({ error: "invalid_grant" }, 400);
    const next = opaque(); await saveRecord(challenge(next), data, "mcp-refresh", new Date(Date.now() + 30 * 24 * 60 * 60_000));
    const access_token = await sign({ id: user.id, email: user.email, name: user.name, aud: resource, scope: "penna:dashboard", client_id: data.clientId, exp: Math.floor(Date.now() / 1000) + 3600 }, envConfig.JWT_ACCESS_SECRET!);
    return c.json({ access_token, token_type: "Bearer", expires_in: 3600, refresh_token: next, scope: "penna:dashboard" });
  }
  return c.json({ error: "unsupported_grant_type" }, 400);
});

router.post("/oauth/revoke", async (c) => {
  const body = await c.req.parseBody();
  const clientId = String(body.client_id ?? "");
  const token = String(body.token ?? "");
  if (String(body.token_type_hint ?? "refresh_token") === "refresh_token") {
    const key = challenge(token);
    const existing = await getRecord(key, "mcp-refresh");
    if (existing?.clientId === clientId) await consumeRecord(key, "mcp-refresh");
  }
  // RFC 7009 responds successfully even when a token is already invalid.
  return c.body(null, 200);
});

const allowedApiPrefixes = ["newsletters", "teams", "subscribers", "subscriptions", "profile", "emails", "dashboard", "segments", "domains"];
const mcp = createMcpHandler(() => {
  const server = new McpServer({ name: "Penna", version: "1.0.0" });
  server.registerTool("penna_read", { title: "Read Penna dashboard", description: "Read data from the signed-in user's Penna dashboard. Use an API path relative to /api/v1, such as newsletters or dashboard/analytics, and include query parameters in path.", inputSchema: fromJsonSchema<{ path: string }>({ type: "object", properties: { path: { type: "string", minLength: 1, maxLength: 500 } }, required: ["path"], additionalProperties: false }) }, async ({ path }, ctx) => callDashboard("GET", path, undefined, ctx));
  server.registerTool("penna_change", { title: "Change Penna dashboard", description: "Create, update, or delete dashboard data using the signed-in user's Penna permissions. This can send emails or make other lasting changes; confirm the user's intent before calling those actions.", inputSchema: fromJsonSchema<{ method: "POST" | "PUT" | "PATCH" | "DELETE"; path: string; body?: unknown }>({ type: "object", properties: { method: { type: "string", enum: ["POST", "PUT", "PATCH", "DELETE"] }, path: { type: "string", minLength: 1, maxLength: 500 }, body: {} }, required: ["method", "path"], additionalProperties: false }), annotations: { destructiveHint: true }, }, async ({ method, path, body }, ctx) => callDashboard(method, path, body, ctx));
  server.registerTool("penna_upload_image", { title: "Upload an image to Penna", description: "Upload a JPEG, PNG, GIF, or WebP image up to 10 MB and return its public URL. Pass the image as base64 without a data URL prefix.", inputSchema: fromJsonSchema<{ filename: string; mime_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp"; base64: string }>({ type: "object", properties: { filename: { type: "string", minLength: 1, maxLength: 180 }, mime_type: { type: "string", enum: ["image/jpeg", "image/png", "image/gif", "image/webp"] }, base64: { type: "string", minLength: 1, maxLength: 14_000_000 } }, required: ["filename", "mime_type", "base64"], additionalProperties: false }), annotations: { destructiveHint: true }, }, async ({ filename, mime_type, base64 }, ctx) => uploadImage(filename, mime_type, base64, ctx));
  server.registerResource("dashboard-api", "penna://dashboard/api", { title: "Penna dashboard API guide", mimeType: "text/plain" }, async () => ({ contents: [{ uri: "penna://dashboard/api", mimeType: "text/plain", text: `Use penna_read and penna_change with paths relative to /api/v1. Available route groups: ${allowedApiPrefixes.join(", ")}. Query parameters belong in path. The caller's existing Penna roles and permissions apply to every operation.` }] }));
  return server;
});

async function callDashboard(method: string, path: string, body: unknown, ctx: any) {
  const cleanPath = path.replace(/^\/+/, "");
  const [routePath, query] = cleanPath.split("?", 2);
  const routeSegments = (routePath ?? "").split("/");
  let decodedSegments: string[];
  try { decodedSegments = routeSegments.map((segment) => decodeURIComponent(segment)); } catch { decodedSegments = []; }
  const segment = decodedSegments[0] ?? "";
  if (!allowedApiPrefixes.includes(segment) || decodedSegments.some((item) => item === ".." || item === "." || /[\\/:]/.test(item)) || cleanPath.includes("#")) return { isError: true, content: [{ type: "text" as const, text: "That dashboard path is not available." }] };
  const bearer = ctx?.http?.authInfo?.token;
  if (typeof bearer !== "string") return { isError: true, content: [{ type: "text" as const, text: "Authentication is required." }] };
  const url = new URL(`/api/v1/${routeSegments.map(encodeURIComponent).join("/")}${query === undefined ? "" : `?${query}`}`, issuer);
  const response = await fetch(url, { method, headers: { authorization: `Bearer ${bearer}`, ...(body === undefined ? {} : { "content-type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await response.text();
  return { isError: !response.ok, content: [{ type: "text" as const, text: text.slice(0, 100_000) }] };
}

async function uploadImage(filename: string, mimeType: string, base64: string, ctx: any) {
  const token = ctx?.http?.authInfo?.token;
  if (typeof token !== "string") return { isError: true, content: [{ type: "text" as const, text: "Authentication is required." }] };
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) return { isError: true, content: [{ type: "text" as const, text: "Image data must be valid base64." }] };
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length === 0 || bytes.length > 10 * 1024 * 1024) return { isError: true, content: [{ type: "text" as const, text: "Image must be no larger than 10 MB." }] };
  const form = new FormData();
  form.set("file", new File([bytes], filename.replace(/[\\/]/g, "_"), { type: mimeType }));
  const response = await fetch(new URL("/api/v1/upload", issuer), { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
  const result = await response.text();
  return { isError: !response.ok, content: [{ type: "text" as const, text: result.slice(0, 100_000) }] };
}

router.all("/mcp", async (c) => {
  const auth = c.req.header("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return c.json({ error: "unauthorized" }, 401, { "WWW-Authenticate": `Bearer resource_metadata="${issuer}/.well-known/oauth-protected-resource/api/v1/mcp", scope="penna:dashboard"` });
  try {
    const claims = await verify(auth.slice(7), envConfig.JWT_ACCESS_SECRET!, "HS256") as { aud?: string; scope?: string; exp?: number };
    if (claims.aud !== resource || claims.scope !== "penna:dashboard" || !claims.exp || claims.exp <= Date.now() / 1000) throw new Error("invalid");
  } catch { return c.json({ error: "invalid_token" }, 401, { "WWW-Authenticate": `Bearer resource_metadata="${issuer}/.well-known/oauth-protected-resource/api/v1/mcp", error="invalid_token"` }); }
  const claims = await verify(auth.slice(7), envConfig.JWT_ACCESS_SECRET!, "HS256") as { client_id: string; exp: number };
  return mcp.fetch(c.req.raw, { authInfo: { token: auth.slice(7), clientId: claims.client_id, scopes: ["penna:dashboard"], expiresAt: claims.exp, resource: new URL(resource) } });
});

export default router;
