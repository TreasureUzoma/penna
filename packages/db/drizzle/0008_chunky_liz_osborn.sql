CREATE TYPE "public"."paddle_subscription_status" AS ENUM('active', 'trialing', 'past_due', 'paused', 'canceled');--> statement-breakpoint
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
ALTER TABLE "team_subscriptions" ADD CONSTRAINT "team_subscriptions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_subscriptions_team_idx" ON "team_subscriptions" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_subscriptions_status_idx" ON "team_subscriptions" USING btree ("status");