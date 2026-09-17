CREATE TYPE "public"."email_status" AS ENUM('published', 'draft');--> statement-breakpoint
CREATE TYPE "public"."email_type" AS ENUM('email', 'web', 'both');--> statement-breakpoint
CREATE TYPE "public"."moderation_verdict" AS ENUM('clean', 'review', 'block');--> statement-breakpoint
CREATE TYPE "public"."newsletter_role" AS ENUM('owner', 'admin', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."newsletter_send_status" AS ENUM('sent', 'blocked_rate_limit', 'blocked_no_recipients', 'blocked_moderation', 'error');--> statement-breakpoint
CREATE TYPE "public"."paddle_subscription_status" AS ENUM('active', 'trialing', 'past_due', 'paused', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('stripe', 'paypal', 'flutterwave', 'paystack', 'paddle', 'manual');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."subscriber_status" AS ENUM('subscribed', 'unsubscribed', 'pending', 'bounced');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('owner', 'admin', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."user_auth_method" AS ENUM('email', 'google', 'github');--> statement-breakpoint
CREATE TYPE "public"."user_plan" AS ENUM('hobby', 'professional', 'business', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'superadmin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'read-only');--> statement-breakpoint
CREATE TYPE "public"."user_subscription" AS ENUM('free', 'pro', 'enterprise');--> statement-breakpoint
CREATE TABLE "domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"newsletter_id" uuid,
	"created_by_user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"dkim_key" text,
	"txt_record" text,
	"spf_record" text,
	"cname_record" text,
	"type" "email_type" DEFAULT 'email',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "domains_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "email_recipients" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"email_id" uuid NOT NULL,
	"newsletter_id" uuid NOT NULL,
	"email" text NOT NULL,
	"token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_recipients_id_unique" UNIQUE("id"),
	CONSTRAINT "email_recipients_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "emails" (
	"serial" serial PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"newsletter_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"status" "email_status" NOT NULL,
	"moderation_blocked_at" timestamp,
	"moderation_blocked_reason" text,
	"moderation_blocked_category" text,
	CONSTRAINT "emails_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "newsletter_api_keys" (
	"serial" serial PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"newsletter_id" uuid NOT NULL,
	"public_key" varchar(128) NOT NULL,
	"encrypted_secret_key" varchar(256) NOT NULL,
	"scopes" jsonb DEFAULT '["subscribers:write","subscribers:read","newsletter:send"]'::jsonb NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"revoked_at" timestamp,
	CONSTRAINT "newsletter_api_keys_id_unique" UNIQUE("id"),
	CONSTRAINT "newsletter_api_keys_public_key_unique" UNIQUE("public_key"),
	CONSTRAINT "newsletter_api_keys_encrypted_secret_key_unique" UNIQUE("encrypted_secret_key")
);
--> statement-breakpoint
CREATE TABLE "newsletter_invites" (
	"serial" serial PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"newsletter_id" uuid NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"invited_to_user_id" uuid NOT NULL,
	"role" "newsletter_role" DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	"revoked_at" timestamp,
	CONSTRAINT "newsletter_invites_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "newsletter_members" (
	"serial" serial PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"newsletter_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "newsletter_role" DEFAULT 'viewer' NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	CONSTRAINT "newsletter_members_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "newsletter_send_logs" (
	"serial" serial PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"newsletter_id" uuid NOT NULL,
	"api_key_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"skipped_non_subscribers" integer DEFAULT 0 NOT NULL,
	"status" "newsletter_send_status" NOT NULL,
	"moderation_verdict" "moderation_verdict",
	"moderation_category" text,
	"moderation_reason" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_send_logs_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "newsletters" (
	"serial" serial PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"config" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_private_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "newsletters_id_unique" UNIQUE("id"),
	CONSTRAINT "newsletters_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"serial" serial PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_resets_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"serial" serial PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"newsletter_id" uuid,
	"provider" "payment_provider" NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"reference" text NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_id_unique" UNIQUE("id"),
	CONSTRAINT "payments_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"serial" serial PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"user_agent" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "segment_subscribers" (
	"serial" serial PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"segment_id" uuid NOT NULL,
	"subscriber_id" uuid NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "segment_subscribers_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "segments" (
	"serial" serial PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"newsletter_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"criteria" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "segments_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"serial" serial PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"newsletter_id" uuid NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"status" "subscriber_status" DEFAULT 'subscribed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscribers_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "team_invites" (
	"serial" serial PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"invited_to_user_id" uuid,
	"email" text NOT NULL,
	"role" "team_role" DEFAULT 'viewer' NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"revoked_at" timestamp,
	CONSTRAINT "team_invites_id_unique" UNIQUE("id"),
	CONSTRAINT "team_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"serial" serial PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "team_role" DEFAULT 'viewer' NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	CONSTRAINT "team_members_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "team_subscriptions" (
	"serial" serial PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"paddle_subscription_id" text NOT NULL,
	"paddle_customer_id" text NOT NULL,
	"plan_slug" text NOT NULL,
	"price_id" text NOT NULL,
	"status" "paddle_subscription_status" NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"scheduled_change" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_subscriptions_id_unique" UNIQUE("id"),
	CONSTRAINT "team_subscriptions_paddle_subscription_id_unique" UNIQUE("paddle_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"serial" serial PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "teams_id_unique" UNIQUE("id"),
	CONSTRAINT "teams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"serial" serial PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text,
	"email_verified_at" timestamp,
	"avatar_url" text,
	"signup_ip" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"auth_method" "user_auth_method" DEFAULT 'email',
	"status" "user_status" DEFAULT 'active',
	"role" "user_role" DEFAULT 'user',
	"subscription_type" "user_subscription" DEFAULT 'free',
	"plan" "user_plan" DEFAULT 'hobby' NOT NULL,
	CONSTRAINT "users_id_unique" UNIQUE("id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"serial" serial PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"type" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "verification_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_newsletter_id_newsletters_id_fk" FOREIGN KEY ("newsletter_id") REFERENCES "public"."newsletters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_recipients" ADD CONSTRAINT "email_recipients_email_id_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_recipients" ADD CONSTRAINT "email_recipients_newsletter_id_newsletters_id_fk" FOREIGN KEY ("newsletter_id") REFERENCES "public"."newsletters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_newsletter_id_newsletters_id_fk" FOREIGN KEY ("newsletter_id") REFERENCES "public"."newsletters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_api_keys" ADD CONSTRAINT "newsletter_api_keys_newsletter_id_newsletters_id_fk" FOREIGN KEY ("newsletter_id") REFERENCES "public"."newsletters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_invites" ADD CONSTRAINT "newsletter_invites_newsletter_id_newsletters_id_fk" FOREIGN KEY ("newsletter_id") REFERENCES "public"."newsletters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_invites" ADD CONSTRAINT "newsletter_invites_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_invites" ADD CONSTRAINT "newsletter_invites_invited_to_user_id_users_id_fk" FOREIGN KEY ("invited_to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_members" ADD CONSTRAINT "newsletter_members_newsletter_id_newsletters_id_fk" FOREIGN KEY ("newsletter_id") REFERENCES "public"."newsletters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_members" ADD CONSTRAINT "newsletter_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_send_logs" ADD CONSTRAINT "newsletter_send_logs_newsletter_id_newsletters_id_fk" FOREIGN KEY ("newsletter_id") REFERENCES "public"."newsletters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_send_logs" ADD CONSTRAINT "newsletter_send_logs_api_key_id_newsletter_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."newsletter_api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletters" ADD CONSTRAINT "newsletters_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_newsletter_id_newsletters_id_fk" FOREIGN KEY ("newsletter_id") REFERENCES "public"."newsletters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment_subscribers" ADD CONSTRAINT "segment_subscribers_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment_subscribers" ADD CONSTRAINT "segment_subscribers_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segments" ADD CONSTRAINT "segments_newsletter_id_newsletters_id_fk" FOREIGN KEY ("newsletter_id") REFERENCES "public"."newsletters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_newsletter_id_newsletters_id_fk" FOREIGN KEY ("newsletter_id") REFERENCES "public"."newsletters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_invited_to_user_id_users_id_fk" FOREIGN KEY ("invited_to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_subscriptions" ADD CONSTRAINT "team_subscriptions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "domains_newsletter_idx" ON "domains" USING btree ("newsletter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "domains_name_idx" ON "domains" USING btree ("name");--> statement-breakpoint
CREATE INDEX "email_recipients_email_idx" ON "email_recipients" USING btree ("email_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_recipients_token_idx" ON "email_recipients" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "email_recipients_email_recipient_idx" ON "email_recipients" USING btree ("email_id","email");--> statement-breakpoint
CREATE INDEX "emails_newsletter_idx" ON "emails" USING btree ("newsletter_id");--> statement-breakpoint
CREATE INDEX "emails_status_idx" ON "emails" USING btree ("status");--> statement-breakpoint
CREATE INDEX "api_keys_newsletter_idx" ON "newsletter_api_keys" USING btree ("newsletter_id");--> statement-breakpoint
CREATE INDEX "api_keys_public_key_idx" ON "newsletter_api_keys" USING btree ("public_key");--> statement-breakpoint
CREATE INDEX "newsletter_invites_newsletter_idx" ON "newsletter_invites" USING btree ("newsletter_id");--> statement-breakpoint
CREATE INDEX "newsletter_invites_invited_to_user_idx" ON "newsletter_invites" USING btree ("invited_to_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_invites_newsletter_to_user_idx" ON "newsletter_invites" USING btree ("newsletter_id","invited_to_user_id");--> statement-breakpoint
CREATE INDEX "newsletter_members_newsletter_idx" ON "newsletter_members" USING btree ("newsletter_id");--> statement-breakpoint
CREATE INDEX "newsletter_members_user_idx" ON "newsletter_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_members_newsletter_user_idx" ON "newsletter_members" USING btree ("newsletter_id","user_id");--> statement-breakpoint
CREATE INDEX "newsletter_send_logs_newsletter_idx" ON "newsletter_send_logs" USING btree ("newsletter_id");--> statement-breakpoint
CREATE INDEX "newsletter_send_logs_created_at_idx" ON "newsletter_send_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "password_resets_user_idx" ON "password_resets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payments_user_idx" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payments_newsletter_idx" ON "payments" USING btree ("newsletter_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "segment_subscribers_segment_idx" ON "segment_subscribers" USING btree ("segment_id");--> statement-breakpoint
CREATE INDEX "segment_subscribers_subscriber_idx" ON "segment_subscribers" USING btree ("subscriber_id");--> statement-breakpoint
CREATE UNIQUE INDEX "segment_subscribers_segment_subscriber_idx" ON "segment_subscribers" USING btree ("segment_id","subscriber_id");--> statement-breakpoint
CREATE INDEX "segments_newsletter_idx" ON "segments" USING btree ("newsletter_id");--> statement-breakpoint
CREATE INDEX "subscribers_newsletter_idx" ON "subscribers" USING btree ("newsletter_id");--> statement-breakpoint
CREATE INDEX "subscribers_status_idx" ON "subscribers" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "subscribers_newsletter_email_idx" ON "subscribers" USING btree ("newsletter_id","email");--> statement-breakpoint
CREATE INDEX "team_invites_team_idx" ON "team_invites" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_invites_email_idx" ON "team_invites" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "team_invites_token_idx" ON "team_invites" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "team_invites_team_email_idx" ON "team_invites" USING btree ("team_id","email");--> statement-breakpoint
CREATE INDEX "team_members_team_idx" ON "team_members" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_members_user_idx" ON "team_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_members_team_user_idx" ON "team_members" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE INDEX "team_subscriptions_team_idx" ON "team_subscriptions" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_subscriptions_status_idx" ON "team_subscriptions" USING btree ("status");