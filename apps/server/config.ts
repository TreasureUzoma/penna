import { z } from "zod";

const envSchema = z.object({
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  APP_URL: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_ACCESS_SECRET: z.string(),
  NODE_ENV: z.string().default("development"),
  REDIS_URL: z.string(),
  PORT: z.coerce.number().default(3005),
  ENCRYPTION_KEY: z.string(),
  UNSUBSCRIBE_SECRET: z.string(),
  NEWSLETTER_DOMAIN: z.string().default("newsletter.penna.dev"),
  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  // Sender for system/transactional email (limit warnings, etc.) — distinct
  // from NEWSLETTER_DOMAIN, which is per-project outbound newsletter mail.
  // Must be a verified SES identity.
  SYSTEM_EMAIL_FROM: z.string().default("notifications@penna.dev"),
  // ARN of the SNS topic AWS SES publishes bounce/complaint notifications
  // to — see apps/server/services/mail/README.md for setup. The
  // /webhooks/ses route rejects every message outright if this isn't set,
  // and rejects any message whose own TopicArn doesn't match it —
  // signature verification alone only proves "this came from *some* SNS
  // topic", not that it's ours.
  SES_NOTIFICATIONS_TOPIC_ARN: z.string().optional(),
  // Used to build links (e.g. "upgrade your plan") in system emails.
  DASHBOARD_SITE: z.string().default("http://localhost:3001"),
  PADDLE_API_KEY: z.string(),
  PADDLE_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
  // Required to verify Paddle webhook signatures — from Paddle Dashboard >
  // Developer Tools > Notifications > (your webhook destination) > secret
  // key. Webhooks are rejected outright if this isn't set.
  PADDLE_WEBHOOK_SECRET: z.string().optional(),
  // Paddle price IDs for each paid plan (Dashboard > Catalog > Prices).
  // Checkout for a plan fails with a clear error if its price ID isn't set.
  PADDLE_PRICE_ID_PROFESSIONAL: z.string().optional(),
  PADDLE_PRICE_ID_BUSINESS: z.string().optional(),
  // Powers spam/phishing content moderation on external-API newsletter
  // sends (see services/moderation.ts). Optional so the feature fails
  // open (moderation skipped, not the whole send) in envs where it isn't
  // configured yet, rather than breaking `envConfig.parse` for everyone.
  GROQ_API_KEY: z.string().optional(),
});

export const envConfig = envSchema.parse(process.env);
