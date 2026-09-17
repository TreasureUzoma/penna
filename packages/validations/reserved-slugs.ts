/**
 * Reserved slugs for newsletters and teams.
 *
 * These slugs are reserved across the platform for two main reasons:
 * 1. Technical: Prevent conflicts with app routes, API endpoints, and system pages
 * 2. Brand Protection & Anti-Abuse: Prevent scammers from impersonating official/system accounts
 */
export const RESERVED_SLUGS = [
  // === TECHNICAL ROUTES ===
  // Apps/web (marketing) routes
  "about",
  "contact",
  "privacy",
  "refund",
  "terms",

  // Apps/dashboard (auth) routes
  "accept-invite",
  "confirm",
  "forgot-password",
  "login",
  "reset-password",
  "signup",
  "subscribe",
  "unsubscribe",
  "verify-email",

  // Apps/dashboard (app) routes
  "analytics",
  "billings",
  "dashboard",
  "docs",
  "domains",
  "new",
  "newsletters",
  "onboarding",
  "settings",

  // System/API routes
  "account",
  "activity",
  "api",
  "app",
  "auth",
  "billing",
  "email",
  "emails",
  "external",
  "help",
  "legal",
  "logout",
  "newsletter",
  "payments",
  "post",
  "posts",
  "pricing",
  "profile",
  "register",
  "route",
  "safety",
  "security",
  "status",
  "subscribers",
  "subscription",
  "subscriptions",
  "user",
  "users",

  // === BRAND PROTECTION & ANTI-ABUSE ===
  // Platform branding
  "penna",
  "lettera",

  // System/admin impersonation prevention
  "admin",
  "administrator",
  "root",
  "system",
  "official",
  "staff",
  "support",
  "moderator",
  "mod",

  // Team/organization impersonation
  "team",
  "teams",
  "org",
  "organization",

  // Technical/developer impersonation
  "developer",
  "developers",
  "dev",
  "engineering",

  // Common scam/phishing targets
  "blog",
  "news",
  "updates",
  "announcements",
  "info",
  "www",
  "mail",
  "webmail",
  "smtp",
  "ftp",
  "ssh",
  "assets",
  "files",
  "images",
] as const;

export const RESERVED_SLUGS_SET = new Set(
  RESERVED_SLUGS.map((name) => name.toLowerCase().trim()),
);
