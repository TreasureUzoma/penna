-- Rename "projects" -> "newsletters" throughout, and drop users.username
-- (the public URL is now just penna.dev/{slug} for everyone — slugs have
-- always been globally unique, so there was never a collision problem for
-- a username to solve). Hand-written rather than drizzle-kit generated:
-- drizzle-kit's rename detection needs an interactive prompt this
-- environment can't provide, and RENAME is what keeps this data-preserving
-- (a generated drop+recreate would not be).

ALTER TABLE "projects" RENAME TO "newsletters";
ALTER TABLE "project_members" RENAME TO "newsletter_members";
ALTER TABLE "project_api_keys" RENAME TO "newsletter_api_keys";
ALTER TABLE "project_invites" RENAME TO "newsletter_invites";

ALTER TABLE "newsletter_members" RENAME COLUMN "project_id" TO "newsletter_id";
ALTER TABLE "newsletter_api_keys" RENAME COLUMN "project_id" TO "newsletter_id";
ALTER TABLE "newsletter_invites" RENAME COLUMN "project_id" TO "newsletter_id";
ALTER TABLE "emails" RENAME COLUMN "project_id" TO "newsletter_id";
ALTER TABLE "domains" RENAME COLUMN "project_id" TO "newsletter_id";
ALTER TABLE "subscribers" RENAME COLUMN "project_id" TO "newsletter_id";
ALTER TABLE "payments" RENAME COLUMN "project_id" TO "newsletter_id";
ALTER TABLE "segments" RENAME COLUMN "project_id" TO "newsletter_id";
ALTER TABLE "newsletter_send_logs" RENAME COLUMN "project_id" TO "newsletter_id";

ALTER TYPE "project_role" RENAME TO "newsletter_role";

ALTER TABLE "users" DROP COLUMN IF EXISTS "username";

-- Index renames, for consistency with schema.ts (cosmetic — Postgres
-- doesn't care, but a future `drizzle-kit generate` diffing against these
-- names will).
ALTER INDEX IF EXISTS "project_members_project_idx" RENAME TO "newsletter_members_newsletter_idx";
ALTER INDEX IF EXISTS "project_members_user_idx" RENAME TO "newsletter_members_user_idx";
ALTER INDEX IF EXISTS "project_members_project_user_idx" RENAME TO "newsletter_members_newsletter_user_idx";
ALTER INDEX IF EXISTS "api_keys_project_idx" RENAME TO "api_keys_newsletter_idx";
ALTER INDEX IF EXISTS "emails_project_idx" RENAME TO "emails_newsletter_idx";
ALTER INDEX IF EXISTS "domains_project_idx" RENAME TO "domains_newsletter_idx";
ALTER INDEX IF EXISTS "subscribers_project_idx" RENAME TO "subscribers_newsletter_idx";
ALTER INDEX IF EXISTS "subscribers_project_email_idx" RENAME TO "subscribers_newsletter_email_idx";
ALTER INDEX IF EXISTS "project_invites_project_idx" RENAME TO "newsletter_invites_newsletter_idx";
ALTER INDEX IF EXISTS "project_invites_invited_to_user_idx" RENAME TO "newsletter_invites_invited_to_user_idx";
ALTER INDEX IF EXISTS "project_invites_project_to_user_idx" RENAME TO "newsletter_invites_newsletter_to_user_idx";
ALTER INDEX IF EXISTS "payments_project_idx" RENAME TO "payments_newsletter_idx";
ALTER INDEX IF EXISTS "segments_project_idx" RENAME TO "segments_newsletter_idx";
ALTER INDEX IF EXISTS "newsletter_send_logs_project_idx" RENAME TO "newsletter_send_logs_newsletter_idx";
