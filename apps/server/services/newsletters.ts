import { encryptDataSubtle } from "@/lib/encrypt";
import { generateApiKeys } from "@/lib/utils";
import type { InsertApiKey } from "@/types";
import { db } from "@workspace/db";
import {
  domains,
  newsletterApiKeys,
  newsletters,
  subscribers,
  teamMembers,
  teams,
  users,
} from "@workspace/db/schema";
import type { ServiceResponse } from "@workspace/types";
import { getTeamPlan } from "./teams";
import type {
  ApiKeyScope,
  NewNewsletter,
  UpdateNewsletter,
} from "@workspace/validations";
import { moderateNewsletterContent } from "./moderation";

import { and, count, desc, eq, isNull } from "drizzle-orm";
import { paginate } from "@/utils/pagination";
import { envConfig } from "@/config";

const encryptionKey = envConfig.ENCRYPTION_KEY!;

// `data.teamId` — not a `userId` — is what a newsletter belongs to now:
// team membership is what grants access to it (see getUserNewsletterRole
// below), so there's no separate per-newsletter owner row to insert
// anymore. The route calling this validates the caller is actually an
// owner/admin of `data.teamId` before getting here.
export const createNewsletter = async (
  data: NewNewsletter,
): Promise<ServiceResponse> => {
  try {
    const [newsletter] = await db
      .insert(newsletters)
      .values({
        name: data.name,
        slug: data.slug,
        description: data.description,
        teamId: data.teamId,
      })
      .returning();
    // No API key is generated here anymore — the owner creates their own
    // from the newsletter's Settings > API Keys tab, choosing which scopes
    // to grant it there instead of getting a full-access key by default
    // that they never explicitly asked for.
    return {
      data: {
        newsletter,
      },
      message: "Newsletter created successfully",
      success: true,
    };
  } catch (err) {
    if (err instanceof Error) {
      return {
        data: null,
        success: false,
        message: err.message,
      };
    }
    return {
      data: null,
      success: false,
      message: "Something went wrong creating the newsletter.",
    };
  }
};

/**
 * Whether a newsletter's owning team is on any paid plan. Gates the coarse
 * features that only distinguish "free" from "everything else" — see
 * `packages/constants/plans.ts`, where "remove branding" appears starting
 * at the professional tier. Custom domains are available on all plans.
 *
 * Phase 1 has no team-level subscription yet (that's Phase 2 — see the
 * plan doc), so this is still keyed off an individual user's plan: the
 * team owner's. Checked server-side on every use rather than trusted from
 * stored config, in case the owner downgrades later.
 */
export const isNewsletterOwnerOnPaidPlan = async (
  newsletterId: string,
): Promise<boolean> => {
  const [newsletter] = await db
    .select({ teamId: newsletters.teamId })
    .from(newsletters)
    .where(eq(newsletters.id, newsletterId));

  if (!newsletter) return false;

  const plan = await getTeamPlan(newsletter.teamId);
  return plan.slug !== "hobby";
};

/** See `isNewsletterOwnerOnPaidPlan` — same gate, kept as a named alias at each call site for readability. */
export const canRemoveBranding = isNewsletterOwnerOnPaidPlan;

/**
 * Custom domains are available on every plan — always returns `true`.
 * Kept as an async function so call sites in routes/api/v1/newsletters.ts
 * don't need to change shape.
 */
export const canUseCustomDomain = async (
  _newsletterId: string,
): Promise<boolean> => true;

/** Whether the newsletter owner may use email tracking (opens & clicks). */
export const hasVerifiedSendingDomain = async (
  newsletterId: string,
): Promise<boolean> => {
  const [row] = await db
    .select({ id: domains.id })
    .from(domains)
    .where(
      and(
        eq(domains.newsletterId, newsletterId),
        eq(domains.verified, true),
        eq(domains.type, "email"),
      ),
    );

  return !!row;
};

/** Whether the newsletter owner may use email tracking (opens & clicks). */
export const canUseEmailTracking = async (
  newsletterId: string,
): Promise<boolean> => {
  const paidPlan = await isNewsletterOwnerOnPaidPlan(newsletterId);
  if (!paidPlan) return false;

  return await hasVerifiedSendingDomain(newsletterId);
};

/** Resolves the default workspace plan for account-level domain actions. */
export const isUserOnPaidPlan = async (userId: string): Promise<boolean> => {
  const [membership] = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId))
    .orderBy(teamMembers.joinedAt)
    .limit(1);

  if (!membership) return false;
  const plan = await getTeamPlan(membership.teamId);
  return plan.slug !== "hobby";
};

export const updateNewsletter = async (
  newsletterId: string,
  data: Partial<UpdateNewsletter>,
): Promise<ServiceResponse> => {
  try {
    const updateValues: Record<string, any> = {};
    if (data.name !== undefined) updateValues.name = data.name;
    if (data.slug !== undefined) updateValues.slug = data.slug;
    if (data.description !== undefined)
      updateValues.description = data.description;
    // There's no `isPublic` column — visibility is stored as `isPrivateAt`
    // (null = public, a timestamp = made private at that time), matching
    // what the dashboard already reads (`isPublic: !newsletter.isPrivateAt`
    // in settings-tab.tsx). Writing `isPublic` directly here was a no-op:
    // it isn't a real column, so the visibility toggle never persisted.
    if (data.isPublic !== undefined) {
      updateValues.isPrivateAt = data.isPublic ? null : new Date();
    }

    if (
      data.removeBranding !== undefined ||
      data.avatarUrl !== undefined ||
      data.emailTracking !== undefined ||
      data.webhooks !== undefined ||
      data.welcomeEmail !== undefined
    ) {
      if (data.removeBranding) {
        const allowed = await canRemoveBranding(newsletterId);
        if (!allowed) {
          return {
            data: null,
            success: false,
            message:
              "Removing Penna branding is a Pro feature. Upgrade the newsletter owner's plan to enable it.",
          };
        }
      }

      if (data.emailTracking !== undefined && data.emailTracking === true) {
        const allowed = await canUseEmailTracking(newsletterId);
        if (!allowed) {
          return {
            data: null,
            success: false,
            message:
              "Email tracking requires a Pro plan and a verified custom sending domain. Add and verify a custom domain first.",
          };
        }
      }

      if (data.webhooks !== undefined) {
        const [newsletter] = await db
          .select({ slug: newsletters.slug, name: newsletters.name })
          .from(newsletters)
          .where(eq(newsletters.id, newsletterId));

        if (
          data.webhooks.url &&
          (!data.webhooks.events || data.webhooks.events.length === 0)
        ) {
          return {
            data: null,
            success: false,
            message:
              "Select at least one webhook event before saving a webhook URL.",
          };
        }

        if (
          data.webhooks.events &&
          data.webhooks.events.length > 0 &&
          !data.webhooks.url
        ) {
          return {
            data: null,
            success: false,
            message: "Add a webhook URL to receive these newsletter events.",
          };
        }

        if (newsletter && data.webhooks.url && !data.webhooks.secret) {
          // Accept a secretless webhook as a valid config, but keep the
          // option for later if assigning a signing secret is desired.
        }
      }

      if (data.welcomeEmail !== undefined) {
        const subject = (data.welcomeEmail.subject ?? "").trim();
        const body = (data.welcomeEmail.body ?? "").trim();
        const shouldReviewWelcomeEmail =
          data.welcomeEmail.enabled !== false || !!subject || !!body;

        if (shouldReviewWelcomeEmail) {
          const [newsletter] = await db
            .select({ name: newsletters.name })
            .from(newsletters)
            .where(eq(newsletters.id, newsletterId));

          const moderation = await moderateNewsletterContent({
            subject:
              subject || `Welcome to ${newsletter?.name ?? "this newsletter"}`,
            content: body || "Welcome email",
            newsletterName: newsletter?.name ?? "this newsletter",
          });

          if (moderation.verdict !== "clean") {
            return {
              data: null,
              success: false,
              message:
                "Your welcome email was flagged by our spam/phishing moderation check. Please revise the subject and message and try again.",
            };
          }
        }
      }

      const [existing] = await db
        .select({ config: newsletters.config })
        .from(newsletters)
        .where(eq(newsletters.id, newsletterId));

      const mergedConfig = {
        ...((existing?.config as Record<string, unknown>) || {}),
      };
      if (data.removeBranding !== undefined) {
        mergedConfig.removeBranding = data.removeBranding;
      }
      if (data.avatarUrl !== undefined) {
        mergedConfig.avatarUrl = data.avatarUrl || null;
      }
      if (data.emailTracking !== undefined) {
        mergedConfig.emailTracking = !!data.emailTracking;
      }
      if (data.webhooks !== undefined) {
        mergedConfig.webhooks = {
          ...((existing?.config as Record<string, unknown> | null)?.webhooks as
            Record<string, unknown> | undefined),
          ...(data.webhooks ?? {}),
        };
      }
      if (data.welcomeEmail !== undefined) {
        const currentWelcome =
          (mergedConfig.welcomeEmail as Record<string, unknown> | undefined) ??
          {};
        mergedConfig.welcomeEmail = {
          ...currentWelcome,
          ...(data.welcomeEmail ?? {}),
        };
      }

      const [updatedNewsletter] = await db
        .update(newsletters)
        .set({
          config: mergedConfig,
          updatedAt: new Date(),
        })
        .where(eq(newsletters.id, newsletterId))
        .returning();

      return {
        data: updatedNewsletter,
        success: true,
        message: "Newsletter updated successfully",
      };
    }

    // no config fields changed, but there may still be scalar top-level fields
    if (Object.keys(updateValues).length > 0) {
      const [updatedNewsletter] = await db
        .update(newsletters)
        .set({ ...updateValues, updatedAt: new Date() })
        .where(eq(newsletters.id, newsletterId))
        .returning();

      return {
        data: updatedNewsletter,
        success: true,
        message: "Newsletter updated successfully",
      };
    }

    return {
      data: null,
      success: true,
      message: "No changes to save",
    };
  } catch (err) {
    if (err instanceof Error) {
      return {
        data: null,
        success: false,
        message: err.message,
      };
    }

    return {
      data: null,
      success: false,
      message: "Something went wrong updating the newsletter.",
    };
  }
};

/**
 * Moves a newsletter to a different team. The route validates the caller
 * is owner on the *current* team and owner/admin on the *destination*
 * team before calling this — this just does the write.
 */
export const transferNewsletterToTeam = async (
  newsletterId: string,
  teamId: string,
): Promise<ServiceResponse> => {
  try {
    const [updated] = await db
      .update(newsletters)
      .set({ teamId })
      .where(eq(newsletters.id, newsletterId))
      .returning();

    if (!updated) {
      return { data: null, success: false, message: "Newsletter not found." };
    }

    return {
      data: updated,
      success: true,
      message: "Newsletter transferred to the new team successfully.",
    };
  } catch (err) {
    return {
      data: null,
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong transferring the newsletter.",
    };
  }
};

export const deleteNewsletter = async (
  newsletterId: string,
): Promise<ServiceResponse> => {
  try {
    await db.delete(newsletters).where(eq(newsletters.id, newsletterId));
    return {
      data: null,
      success: true,
      message: "Newsletter deleted successfully.",
    };
  } catch (err) {
    if (err instanceof Error) {
      return {
        data: null,
        success: false,
        message: err.message,
      };
    }
    return {
      data: null,
      success: false,
      message: "Something went wrong while deleting newsletter.",
    };
  }
};

export const createNewsletterApiKeys = async (
  data: InsertApiKey,
): Promise<ServiceResponse> => {
  try {
    const encryptedSecret = await encryptDataSubtle(
      data.encryptedSecretKey,
      encryptionKey,
    );

    const [apiKeys] = await db
      .insert(newsletterApiKeys)
      .values({
        newsletterId: data.newsletterId,
        publicKey: data.publicKey,
        encryptedSecretKey: encryptedSecret,
      })
      .returning();

    return {
      data: apiKeys,
      message: "Inserted api key correctly",
      success: true,
    };
  } catch (err) {
    if (err instanceof Error) {
      return {
        data: null,
        success: false,
        message: err.message,
      };
    }
    return {
      data: null,
      success: false,
      message: "Something went wrong creating api keys",
    };
  }
};

export const generateAndCreateNewsletterApiKey = async (
  newsletterId: string,
  scopes: ApiKeyScope[],
): Promise<ServiceResponse> => {
  try {
    const { publicKey, secretKey } = generateApiKeys();

    const encryptedSecret = await encryptDataSubtle(secretKey, encryptionKey);

    const [apiKey] = await db
      .insert(newsletterApiKeys)
      .values({
        newsletterId,
        publicKey,
        encryptedSecretKey: encryptedSecret,
        scopes,
      })
      .returning();

    return {
      data: { ...apiKey, secretKey }, // Return raw secret key for one-time display
      message: "API key created successfully",
      success: true,
    };
  } catch (err) {
    return {
      data: null,
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong creating API key",
    };
  }
};

export const deleteNewsletterApiKey = async (
  newsletterId: string,
  keyId: string,
): Promise<ServiceResponse> => {
  try {
    const [deletedKey] = await db
      .delete(newsletterApiKeys)
      .where(
        and(
          eq(newsletterApiKeys.newsletterId, newsletterId),
          eq(newsletterApiKeys.id, keyId),
        ),
      )
      .returning();

    if (!deletedKey) {
      return {
        data: null,
        success: false,
        message: "API key not found",
      };
    }

    return {
      data: deletedKey,
      message: "API key deleted successfully",
      success: true,
    };
  } catch (err) {
    return {
      data: null,
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong deleting API key",
    };
  }
};

/**
 * A newsletter's access control is now entirely delegated to its team —
 * this resolves the newsletter's `teamId` and looks up the caller's role
 * there (`teamMembers`), rather than the deprecated `newsletterMembers`
 * table. Keeps the exact same `{success, data: {role}}` shape so
 * `getNewsletterOrFail` (and everything built on it — ~40 route call
 * sites) didn't need to change at all to become team-scoped.
 */
export const getUserNewsletterRole = async (
  newsletterId: string,
  userId: string,
) => {
  try {
    const [membership] = await db
      .select({
        newsletterId: newsletters.id,
        userId: teamMembers.userId,
        role: teamMembers.role,
      })
      .from(newsletters)
      .innerJoin(teamMembers, eq(teamMembers.teamId, newsletters.teamId))
      .where(
        and(eq(newsletters.id, newsletterId), eq(teamMembers.userId, userId)),
      );

    if (!membership) {
      return {
        success: false,
        message: "User is not a member of this newsletter's team",
        data: null,
      };
    }

    return {
      success: true,
      message: "Fetched user role successfully",
      data: membership,
    };
  } catch (err) {
    if (err instanceof Error) {
      return { success: false, message: err.message, data: null };
    }
    return {
      success: false,
      message: "Something went wrong fetching user role",
      data: null,
    };
  }
};

export const getValidNewsletter = async (newsletterId: string) => {
  const [newsletter] = await db
    .select()
    .from(newsletters)
    .where(eq(newsletters.id, newsletterId));

  if (!newsletter) {
    return { data: null, success: false, message: "Newsletter not found." };
  }

  return {
    data: newsletter,
    success: true,
    message: "Newsletter fetched successfully",
  };
};

export const getNewsletterBySlug = async (slug: string) => {
  const [row] = await db
    .select({
      newsletter: newsletters,
      teamName: teams.name,
      teamSlug: teams.slug,
    })
    .from(newsletters)
    .innerJoin(teams, eq(teams.id, newsletters.teamId))
    .where(eq(newsletters.slug, slug));

  if (!row) {
    return { data: null, success: false, message: "Newsletter not found." };
  }

  return {
    data: { ...row.newsletter, teamName: row.teamName, teamSlug: row.teamSlug },
    success: true,
    message: "Newsletter fetched successfully",
  };
};

/**
 * A newsletter's public-facing data, for the unauthenticated newsletter
 * page (routes/api/v1/public/newsletters.ts) — `null` for a private
 * newsletter, one with no `owner` member (see the ownerless-newsletter
 * issue this app has hit before), or one that just doesn't exist, so a 404
 * doesn't leak which case it was. The public URL is just penna.dev/{slug}
 * for every plan — slugs have always been globally unique, so there's no
 * per-user namespacing or plan gate on it.
 */
export const getPublicNewsletterBySlug = async (slug: string) => {
  const [newsletter] = await db
    .select({
      id: newsletters.id,
      slug: newsletters.slug,
      name: newsletters.name,
      description: newsletters.description,
      isPrivateAt: newsletters.isPrivateAt,
      config: newsletters.config,
    })
    .from(newsletters)
    .where(eq(newsletters.slug, slug));

  if (!newsletter || newsletter.isPrivateAt) {
    return { data: null, success: false, message: "Newsletter not found." };
  }

  const [owner] = await db
    .select({ userId: teamMembers.userId })
    .from(newsletters)
    .innerJoin(teamMembers, eq(teamMembers.teamId, newsletters.teamId))
    .where(
      and(eq(newsletters.id, newsletter.id), eq(teamMembers.role, "owner")),
    );

  if (!owner) {
    return { data: null, success: false, message: "Newsletter not found." };
  }

  return {
    data: {
      id: newsletter.id,
      slug: newsletter.slug,
      name: newsletter.name,
      description: newsletter.description,
      avatarUrl:
        (newsletter.config as Record<string, unknown> | null)?.avatarUrl ??
        null,
    },
    success: true,
    message: "Newsletter fetched successfully",
  };
};

export const getNewslettersByUser = (
  userId: string,
  page = 1,
  limit = 10,
  teamId?: string,
) => {
  console.log("[newsletters] getNewslettersByUser start", {
    userId,
    page,
    limit,
  });

  const offset = (page - 1) * limit;

  const dbQuery = db
    .select({
      id: newsletters.id,
      slug: newsletters.slug,
      name: newsletters.name,
      description: newsletters.description,
      config: newsletters.config,
      createdAt: newsletters.createdAt,
      updatedAt: newsletters.updatedAt,
      role: teamMembers.role,
      subscriberCount: count(subscribers.id),
    })
    .from(newsletters)
    .innerJoin(teamMembers, eq(newsletters.teamId, teamMembers.teamId))
    .leftJoin(subscribers, eq(newsletters.id, subscribers.newsletterId))
    .where(
      teamId
        ? and(eq(teamMembers.userId, userId), eq(newsletters.teamId, teamId))
        : eq(teamMembers.userId, userId),
    )
    .groupBy(
      newsletters.id,
      newsletters.slug,
      newsletters.name,
      newsletters.description,
      newsletters.config,
      newsletters.createdAt,
      newsletters.updatedAt,
      teamMembers.role,
    )
    .orderBy(desc(newsletters.createdAt))
    .limit(limit)
    .offset(offset);

  const countQuery = db
    .select({ count: count() })
    .from(newsletters)
    .innerJoin(teamMembers, eq(newsletters.teamId, teamMembers.teamId))
    .where(
      teamId
        ? and(eq(teamMembers.userId, userId), eq(newsletters.teamId, teamId))
        : eq(teamMembers.userId, userId),
    );

  const result = paginate(dbQuery, countQuery, page, limit);

  console.log("[newsletters] getNewslettersByUser queued", {
    userId,
    page,
    limit,
  });

  return result;
};

export const getNewsletterApiKeys = async (
  newsletterId: string,
): Promise<ServiceResponse> => {
  try {
    // Deliberately excludes encryptedSecretKey — the private key is only
    // ever meant to be seen once, at creation time (see
    // generateAndCreateNewsletterApiKey's one-time `secretKey` in its
    // response). Selecting and decrypting it here meant every load of the
    // API Keys tab shipped every key's private half in the response body,
    // even though the frontend's `ApiKey` type never declared that field.
    const apiKeys = await db
      .select({
        id: newsletterApiKeys.id,
        publicKey: newsletterApiKeys.publicKey,
        scopes: newsletterApiKeys.scopes,
        lastUsedAt: newsletterApiKeys.lastUsedAt,
        createdAt: newsletterApiKeys.createdAt,
      })
      .from(newsletterApiKeys)
      .where(
        and(
          eq(newsletterApiKeys.newsletterId, newsletterId),
          isNull(newsletterApiKeys.revokedAt),
        ),
      )
      .orderBy(desc(newsletterApiKeys.createdAt));

    return {
      success: true,
      message: "Fetched API keys successfully",
      data: apiKeys,
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong fetching keys",
      data: null,
    };
  }
};

// Member/invite/role-transfer management moved to apps/server/services/
// teams.ts — inviteToTeam, getUserTeamInvites, acceptTeamInvite,
// updateTeamMemberRole, transferTeamOwnership, getTeamMembers. A
// newsletter no longer has its own member list (see the schema comment
// above `teams` in packages/db/schema.ts) — team membership is what
// grants access to it.
