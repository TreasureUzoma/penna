import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  serial,
  pgEnum,
  integer,
  jsonb,
  index,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userAuthMethodEnum = pgEnum("user_auth_method", [
  "email",
  "google",
  "github",
]);
export const projectRoleEnum = pgEnum("project_role", [
  "owner",
  "admin",
  "editor",
  "viewer",
]);
export const userStatusEnum = pgEnum("user_status", [
  "active",
  "suspended",
  "read-only",
]);
export const userRoleEnum = pgEnum("user_role", [
  "user",
  "admin",
  "superadmin",
]);
export const userSubscriptionEnum = pgEnum("user_subscription", [
  "free",
  "pro",
  "enterprise",
]);
/**
 * The exact billing plan slug (matches `packages/constants/plans.ts`).
 * `subscriptionType` above only distinguishes free/pro/enterprise for
 * feature gating (e.g. `canRemoveBranding`), which collapses "professional"
 * and "business" into the same "pro" bucket — too coarse to know which
 * plan's subscriber cap actually applies. `plan` is the precise slug used
 * for that.
 */
export const userPlanEnum = pgEnum("user_plan", [
  "hobby",
  "professional",
  "business",
  "enterprise",
]);
export const emailStatusEnum = pgEnum("email_status", ["published", "draft"]);
export const subscriberStatusEnum = pgEnum("subscriber_status", [
  "subscribed",
  "unsubscribed",
  "pending",
  "bounced",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "failed",
  "refunded",
  "cancelled",
]);
export const paymentProviderEnum = pgEnum("payment_provider", [
  "stripe",
  "paypal",
  "flutterwave",
  "paystack",
  "paddle",
  "manual",
]);
export const emailTypeEnum = pgEnum("email_type", ["email", "web", "both"]);
export const newsletterSendStatusEnum = pgEnum("newsletter_send_status", [
  "sent",
  "blocked_rate_limit",
  "blocked_no_recipients",
  "blocked_moderation",
  "error",
]);
export const moderationVerdictEnum = pgEnum("moderation_verdict", [
  "clean",
  "review",
  "block",
]);

export const users = pgTable("users", {
  serial: serial("serial").primaryKey(),
  id: uuid("id").defaultRandom().notNull().unique(),
  providerId: text("provider_id"),
  name: text("name").notNull(),
  username: text("username").unique(),
  email: text("email").notNull().unique(),
  password: text("password"),
  emailVerifiedAt: timestamp("email_verified_at"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().notNull(),
  authMethod: userAuthMethodEnum("auth_method").default("email"),
  status: userStatusEnum("status").default("active"),
  role: userRoleEnum("role").default("user"),
  subscriptionType: userSubscriptionEnum("subscription_type").default("free"),
  plan: userPlanEnum("plan").default("hobby").notNull(),
});

export const projects = pgTable("projects", {
  serial: serial("serial").primaryKey(),
  id: uuid("id").defaultRandom().notNull().unique(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  config: jsonb("config").default({}),
  isActive: boolean("is_active").default(true).notNull(),
  isPrivateAt: timestamp("is_private_at"),
  createdAt: timestamp("created_at").defaultNow().notNull().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().notNull(),
});

export const projectMembers = pgTable(
  "project_members",
  {
    serial: serial("serial").primaryKey(),
    id: uuid("id").defaultRandom().notNull().unique(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: projectRoleEnum("role").default("viewer").notNull(),
    joinedAt: timestamp("joined_at").defaultNow(),
  },
  (table) => ({
    projectIdx: index("project_members_project_idx").on(table.projectId),
    userIdx: index("project_members_user_idx").on(table.userId),
    projectUserUnique: uniqueIndex("project_members_project_user_idx").on(
      table.projectId,
      table.userId,
    ),
  }),
);

export const projectApiKeys = pgTable(
  "project_api_keys",
  {
    serial: serial("serial").primaryKey(),
    id: uuid("id").defaultRandom().notNull().unique(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    publicKey: varchar("public_key", { length: 128 }).notNull().unique(),
    encryptedSecretKey: varchar("encrypted_secret_key", { length: 256 })
      .notNull()
      .unique(), // stored as encrypted
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").defaultNow(),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => ({
    projectIdx: index("api_keys_project_idx").on(table.projectId),
    publickKeyIdx: index("api_keys_public_key_idx").on(table.publicKey),
  }),
);

export const emails = pgTable(
  "emails",
  {
    serial: serial("serial").primaryKey(),
    id: uuid("id").defaultRandom().notNull().unique(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    body: text("body").notNull(), // encrypted
    sentAt: timestamp("sent_at").defaultNow().notNull().notNull(),
    status: emailStatusEnum("status").notNull(),
  },
  (table) => ({
    projectIdx: index("emails_project_idx").on(table.projectId),
    statusIdx: index("emails_status_idx").on(table.status),
  }),
);

export const domains = pgTable(
  "domains",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Nullable: a domain can be verified before it's attached to any
    // project (see the account-wide Domains page) and assigned to one
    // later — see `assignDomainToProject` in services/domains.ts.
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    // Who verified this domain. Doubles as the permission check for an
    // unassigned domain (no project members to check yet) and stays set
    // after assignment for provenance, though project membership takes
    // over as the actual permission check at that point.
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 255 }).notNull().unique(), // e.g. "blog.john.dev"
    verified: boolean("verified").default(false).notNull(),

    dkimKey: text("dkim_key"), // public key you provide
    txtRecord: text("txt_record"), // record user adds to DNS
    spfRecord: text("spf_record"), // optional for sending
    cnameRecord: text("cname_record"), // for web domain use

    type: emailTypeEnum("type").default("email"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("domains_project_idx").on(table.projectId),
    nameIdx: uniqueIndex("domains_name_idx").on(table.name),
  }),
);

export const subscribers = pgTable(
  "subscribers",
  {
    serial: serial("serial").primaryKey(),
    id: uuid("id").defaultRandom().notNull().unique(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name"),
    email: text("email").notNull(),
    status: subscriberStatusEnum("status").default("subscribed").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull().notNull(),
  },
  (table) => ({
    projectIdx: index("subscribers_project_idx").on(table.projectId),
    statusIdx: index("subscribers_status_idx").on(table.status),
    projectEmailUnique: uniqueIndex("subscribers_project_email_idx").on(
      table.projectId,
      table.email,
    ),
  }),
);

export const projectInvites = pgTable(
  "project_invites",
  {
    serial: serial("serial").primaryKey(),
    id: uuid("id").defaultRandom().notNull().unique(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    invitedByUserId: uuid("invited_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    invitedToUserId: uuid("invited_to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: projectRoleEnum("role").default("viewer").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull().notNull(),
    acceptedAt: timestamp("accepted_at"),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => ({
    projectIdx: index("project_invites_project_idx").on(table.projectId),
    invitedToUserIdx: index("project_invites_invited_to_user_idx").on(
      table.invitedToUserId,
    ),
    projectToUserUnique: uniqueIndex("project_invites_project_to_user_idx").on(
      table.projectId,
      table.invitedToUserId,
    ),
  }),
);

export const payments = pgTable(
  "payments",
  {
    serial: serial("serial").primaryKey(),
    id: uuid("id").defaultRandom().notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    provider: paymentProviderEnum("provider").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("USD"),
    reference: text("reference").notNull().unique(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("payments_user_idx").on(table.userId),
    projectIdx: index("payments_project_idx").on(table.projectId),
    statusIdx: index("payments_status_idx").on(table.status),
  }),
);

export const verification = pgTable("verification", {
  serial: serial("serial").primaryKey(),
  id: uuid("id").defaultRandom().notNull().unique(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  type: text("type").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    serial: serial("serial").primaryKey(),
    id: uuid("id").defaultRandom().notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    revoked: boolean("revoked").notNull().default(false),
    userAgent: text("user_agent").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("refresh_tokens_user_idx").on(table.userId),
  }),
);

export const passwordResets = pgTable(
  "password_resets",
  {
    serial: serial("serial").primaryKey(),
    id: uuid("id").defaultRandom().notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    used: boolean("used").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull().notNull(),
  },
  (table) => ({
    userIdx: index("password_resets_user_idx").on(table.userId),
  }),
);

export const segments = pgTable(
  "segments",
  {
    serial: serial("serial").primaryKey(),
    id: uuid("id").defaultRandom().notNull().unique(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    criteria: jsonb("criteria").default({}), // stores filtering criteria
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("segments_project_idx").on(table.projectId),
  }),
);

export const segmentSubscribers = pgTable(
  "segment_subscribers",
  {
    serial: serial("serial").primaryKey(),
    id: uuid("id").defaultRandom().notNull().unique(),
    segmentId: uuid("segment_id")
      .notNull()
      .references(() => segments.id, { onDelete: "cascade" }),
    subscriberId: uuid("subscriber_id")
      .notNull()
      .references(() => subscribers.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (table) => ({
    segmentIdx: index("segment_subscribers_segment_idx").on(table.segmentId),
    subscriberIdx: index("segment_subscribers_subscriber_idx").on(
      table.subscriberId,
    ),
    segmentSubscriberUnique: uniqueIndex(
      "segment_subscribers_segment_subscriber_idx",
    ).on(table.segmentId, table.subscriberId),
  }),
);

/**
 * One row per attempted external-API newsletter send (`POST
 * .../newsletters/send`), whether it went out, was blocked (rate limit, no
 * resolvable recipients, moderation) or errored. Gives project owners and
 * admins an audit trail for abuse review, independent of the `emails`
 * table (which is dashboard-composed campaigns, not raw API sends).
 */
export const newsletterSendLogs = pgTable(
  "newsletter_send_logs",
  {
    serial: serial("serial").primaryKey(),
    id: uuid("id").defaultRandom().notNull().unique(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    apiKeyId: uuid("api_key_id")
      .notNull()
      .references(() => projectApiKeys.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    recipientCount: integer("recipient_count").notNull().default(0),
    skippedNonSubscribers: integer("skipped_non_subscribers")
      .notNull()
      .default(0),
    status: newsletterSendStatusEnum("status").notNull(),
    moderationVerdict: moderationVerdictEnum("moderation_verdict"),
    moderationCategory: text("moderation_category"),
    moderationReason: text("moderation_reason"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("newsletter_send_logs_project_idx").on(table.projectId),
    createdAtIdx: index("newsletter_send_logs_created_at_idx").on(
      table.createdAt,
    ),
  }),
);

export const newsletterSendLogRelations = relations(
  newsletterSendLogs,
  ({ one }) => ({
    project: one(projects, {
      fields: [newsletterSendLogs.projectId],
      references: [projects.id],
    }),
    apiKey: one(projectApiKeys, {
      fields: [newsletterSendLogs.apiKeyId],
      references: [projectApiKeys.id],
    }),
  }),
);

export const projectInviteRelations = relations(projectInvites, ({ one }) => ({
  project: one(projects, {
    fields: [projectInvites.projectId],
    references: [projects.id],
  }),
  invitedBy: one(users, {
    fields: [projectInvites.invitedByUserId],
    references: [users.id],
    relationName: "invited_by_user",
  }),
  invitedTo: one(users, {
    fields: [projectInvites.invitedToUserId],
    references: [users.id],
    relationName: "invited_to_user",
  }),
}));

export const domainRelations = relations(domains, ({ one }) => ({
  project: one(projects, {
    fields: [domains.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [domains.createdByUserId],
    references: [users.id],
  }),
}));

export const userRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  passwordResets: many(passwordResets),
  payments: many(payments),
  projectMemberships: many(projectMembers),
}));

export const projectRelations = relations(projects, ({ one, many }) => ({
  emails: many(emails),
  subscribers: many(subscribers),
  payments: many(payments),
  apiKeys: many(projectApiKeys),
  members: many(projectMembers),
  invites: many(projectInvites),
  segments: many(segments),
  newsletterSendLogs: many(newsletterSendLogs),
}));

export const projectMemberRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
}));

export const apiKeyRelations = relations(projectApiKeys, ({ one }) => ({
  project: one(projects, {
    fields: [projectApiKeys.projectId],
    references: [projects.id],
  }),
}));

export const emailRelations = relations(emails, ({ one }) => ({
  project: one(projects, {
    fields: [emails.projectId],
    references: [projects.id],
  }),
}));

export const subscriberRelations = relations(subscribers, ({ one }) => ({
  project: one(projects, {
    fields: [subscribers.projectId],
    references: [projects.id],
  }),
}));

export const refreshTokenRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const passwordResetRelations = relations(passwordResets, ({ one }) => ({
  user: one(users, {
    fields: [passwordResets.userId],
    references: [users.id],
  }),
}));

export const paymentRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [payments.projectId],
    references: [projects.id],
  }),
}));

export const segmentRelations = relations(segments, ({ one, many }) => ({
  project: one(projects, {
    fields: [segments.projectId],
    references: [projects.id],
  }),
  subscribers: many(segmentSubscribers),
}));

export const segmentSubscriberRelations = relations(
  segmentSubscribers,
  ({ one }) => ({
    segment: one(segments, {
      fields: [segmentSubscribers.segmentId],
      references: [segments.id],
    }),
    subscriber: one(subscribers, {
      fields: [segmentSubscribers.subscriberId],
      references: [subscribers.id],
    }),
  }),
);
