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
  CONSTRAINT "email_recipients_token_unique" UNIQUE("token"),
  CONSTRAINT "email_recipients_email_recipient_idx" UNIQUE("email_id", "email")
);
--> statement-breakpoint
ALTER TABLE "email_recipients" ADD CONSTRAINT "email_recipients_email_id_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "emails"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "email_recipients" ADD CONSTRAINT "email_recipients_newsletter_id_newsletters_id_fk" FOREIGN KEY ("newsletter_id") REFERENCES "newsletters"("id") ON DELETE cascade;
--> statement-breakpoint
CREATE INDEX "email_recipients_email_idx" ON "email_recipients" USING btree ("email_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "email_recipients_token_idx" ON "email_recipients" USING btree ("token");
