CREATE TABLE "public_page_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"newsletter_id" uuid NOT NULL,
	"page_key" text DEFAULT '' NOT NULL,
	"post_id" uuid,
	"day" timestamp NOT NULL,
	"views" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public_page_views" ADD CONSTRAINT "public_page_views_newsletter_id_newsletters_id_fk" FOREIGN KEY ("newsletter_id") REFERENCES "public"."newsletters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_page_views" ADD CONSTRAINT "public_page_views_post_id_emails_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."emails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "public_page_views_newsletter_day_idx" ON "public_page_views" USING btree ("newsletter_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "public_page_views_page_day_unique" ON "public_page_views" USING btree ("newsletter_id","page_key","day");