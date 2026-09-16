ALTER TYPE "public"."payment_provider" ADD VALUE IF NOT EXISTS 'paddle' BEFORE 'manual';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "segment_subscribers" (
	"serial" serial PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"segment_id" uuid NOT NULL,
	"subscriber_id" uuid NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "segment_subscribers_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "segments" (
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
DO $$ BEGIN
 ALTER TABLE "segment_subscribers" ADD CONSTRAINT "segment_subscribers_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "segment_subscribers" ADD CONSTRAINT "segment_subscribers_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "segments" ADD CONSTRAINT "segments_newsletter_id_newsletters_id_fk" FOREIGN KEY ("newsletter_id") REFERENCES "public"."newsletters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "segment_subscribers_segment_idx" ON "segment_subscribers" USING btree ("segment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "segment_subscribers_subscriber_idx" ON "segment_subscribers" USING btree ("subscriber_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "segment_subscribers_segment_subscriber_idx" ON "segment_subscribers" USING btree ("segment_id","subscriber_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "segments_newsletter_idx" ON "segments" USING btree ("newsletter_id");