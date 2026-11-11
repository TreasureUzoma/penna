ALTER TABLE "users" DROP COLUMN "subscription_type";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "plan";--> statement-breakpoint
DROP TYPE "public"."user_plan";--> statement-breakpoint
DROP TYPE "public"."user_subscription";