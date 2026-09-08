ALTER TABLE "emails" ADD COLUMN "moderation_blocked_at" timestamp;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "moderation_blocked_reason" text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "moderation_blocked_category" text;