import type {
  InferSelectModel,
  InferInsertModel,
  InferEnum,
} from "drizzle-orm";

import { newsletterRoleEnum, teamRoleEnum, refreshTokens, users } from "../schema.js";

export type SelectUser = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type NewRefreshToken = InferInsertModel<typeof refreshTokens>;
export type SelectToken = InferSelectModel<typeof refreshTokens>;

// Deprecated — newsletters no longer have their own role, see TeamRoles.
export type NewsletterRoles = InferEnum<typeof newsletterRoleEnum>;
export type TeamRoles = InferEnum<typeof teamRoleEnum>;
