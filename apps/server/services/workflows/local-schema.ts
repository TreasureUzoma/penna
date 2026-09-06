/**
 * A deliberately local, duplicated subset of `packages/db/schema.ts` — just
 * the tables `services/workflows/steps.ts` needs.
 *
 * Why duplicated instead of imported: the Workflow SDK compiles queued step
 * functions into a standalone bundle (`.nitro/workflow/steps.mjs`) that runs
 * outside the main app process. Its bundler treats anything resolving into
 * `node_modules` as external and leaves it unbundled — fine for real npm
 * packages, broken for `@workspace/db`, which ships raw, unbuilt TypeScript
 * with no `exports` map. Local files within `apps/server` (this one
 * included) get inlined into the bundle correctly, so step functions that
 * need DB access during queued/deferred execution go through this file
 * instead.
 *
 * Source of truth is still `packages/db/schema.ts` — if those tables change
 * shape, this file needs updating too. Kept intentionally small (only the
 * columns actually read) to minimize how much there is to keep in sync.
 */
import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  serial,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";

export const emailStatusEnum = pgEnum("email_status", ["published", "draft"]);
export const subscriberStatusEnum = pgEnum("subscriber_status", [
  "subscribed",
  "unsubscribed",
  "pending",
  "bounced",
]);
export const newsletterRoleEnum = pgEnum("newsletter_role", [
  "owner",
  "admin",
  "editor",
  "viewer",
]);
export const userSubscriptionEnum = pgEnum("user_subscription", [
  "free",
  "pro",
  "enterprise",
]);

export const newsletters = pgTable("newsletters", {
  serial: serial("serial").primaryKey(),
  id: uuid("id").defaultRandom().notNull().unique(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  config: jsonb("config").default({}),
  isActive: boolean("is_active").default(true).notNull(),
  isPrivateAt: timestamp("is_private_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emails = pgTable("emails", {
  serial: serial("serial").primaryKey(),
  id: uuid("id").defaultRandom().notNull().unique(),
  newsletterId: uuid("newsletter_id").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  status: emailStatusEnum("status").notNull(),
});

export const subscribers = pgTable("subscribers", {
  serial: serial("serial").primaryKey(),
  id: uuid("id").defaultRandom().notNull().unique(),
  newsletterId: uuid("newsletter_id").notNull(),
  name: text("name"),
  email: text("email").notNull(),
  status: subscriberStatusEnum("status").default("subscribed").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const newsletterMembers = pgTable("newsletter_members", {
  serial: serial("serial").primaryKey(),
  id: uuid("id").defaultRandom().notNull().unique(),
  newsletterId: uuid("newsletter_id").notNull(),
  userId: uuid("user_id").notNull(),
  role: newsletterRoleEnum("role").default("viewer").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const users = pgTable("users", {
  serial: serial("serial").primaryKey(),
  id: uuid("id").defaultRandom().notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  subscriptionType: userSubscriptionEnum("subscription_type").default("free"),
});
