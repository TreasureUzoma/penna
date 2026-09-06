import { encryptDataSubtle } from "@/lib/encrypt";
import { generateApiKeys } from "@/lib/utils";
import type { InsertApiKey } from "@/types";
import { db } from "@workspace/db";
import {
  newsletterApiKeys,
  newsletterInvites,
  newsletters,
  subscribers,
} from "@workspace/db/schema";
import type { NewsletterRoles, ServiceResponse } from "@workspace/types";
import type {
  ApiKeyScope,
  NewNewsletter,
  NewNewsletterInvite,
  UpdateNewsletter,
} from "@workspace/validations";
import { newsletterMembers, users } from "@workspace/db/schema";

import { and, count, desc, eq, isNull } from "drizzle-orm";
import { paginate } from "@/utils/pagination";
import { envConfig } from "@/config";
import { sendNewsletterInviteEmail } from "./mail/internal";

const encryptionKey = envConfig.ENCRYPTION_KEY!;

export const createNewsletter = async (
  data: NewNewsletter,
  userId: string
): Promise<ServiceResponse> => {
  try {
    const [newsletter] = await db
      .insert(newsletters)
      .values({
        name: data.name,
        slug: data.slug,
        description: data.description,
      })
      .returning();
    await db.insert(newsletterMembers).values({
      newsletterId: newsletter!.id,
      userId: userId,
      role: "owner",
    });
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
 * Whether a newsletter's owner is on any paid plan. Gates the coarse
 * features that only distinguish "free" from "everything else" — see
 * `packages/constants/plans.ts`, where "remove branding" and "custom
 * domain" both appear starting at the professional tier. Checked against
 * the newsletter owner's plan (not just whoever happens to be toggling the
 * setting), and re-checked server-side on every use rather than trusted
 * from stored config, in case the owner downgrades later.
 */
export const isNewsletterOwnerOnPaidPlan = async (
  newsletterId: string
): Promise<boolean> => {
  const [owner] = await db
    .select({ subscriptionType: users.subscriptionType })
    .from(newsletterMembers)
    .innerJoin(users, eq(newsletterMembers.userId, users.id))
    .where(
      and(
        eq(newsletterMembers.newsletterId, newsletterId),
        eq(newsletterMembers.role, "owner")
      )
    );

  return !!owner && owner.subscriptionType !== "free";
};

/** See `isNewsletterOwnerOnPaidPlan` — same gate, kept as a named alias at each call site for readability. */
export const canRemoveBranding = isNewsletterOwnerOnPaidPlan;

/** See `isNewsletterOwnerOnPaidPlan` — same gate, kept as a named alias at each call site for readability. */
export const canUseCustomDomain = isNewsletterOwnerOnPaidPlan;

/**
 * Same "any paid plan" gate as `isNewsletterOwnerOnPaidPlan`, but for a
 * domain that isn't attached to any newsletter yet (see the account-wide
 * Domains page) — there's no newsletter owner to check yet, so this checks
 * the verifying user's own plan instead.
 */
export const isUserOnPaidPlan = async (userId: string): Promise<boolean> => {
  const [user] = await db
    .select({ subscriptionType: users.subscriptionType })
    .from(users)
    .where(eq(users.id, userId));

  return !!user && user.subscriptionType !== "free";
};

export const updateNewsletter = async (
  newsletterId: string,
  data: Partial<UpdateNewsletter>
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

    if (data.removeBranding !== undefined || data.avatarUrl !== undefined) {
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
        // Empty string clears it back to the initials fallback — same
        // "unset by writing empty" convention used for other optional
        // profile-ish fields (e.g. profile.ts's avatarUrl).
        mergedConfig.avatarUrl = data.avatarUrl || null;
      }
      updateValues.config = mergedConfig;
    }

    if (Object.keys(updateValues).length === 0) {
      return {
        data: null,
        success: false,
        message: "No fields to update",
      };
    }

    const [updatedNewsletter] = await db
      .update(newsletters)
      .set(updateValues)
      .where(eq(newsletters.id, newsletterId))
      .returning();

    return {
      data: updatedNewsletter,
      success: true,
      message: "Newsletter updated successfully",
    };
  } catch (err) {
    return {
      data: null,
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong updating newsletter",
    };
  }
};

export const deleteNewsletter = async (
  newsletterId: string
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
  data: InsertApiKey
): Promise<ServiceResponse> => {
  try {
    const encryptedSecret = await encryptDataSubtle(
      data.encryptedSecretKey,
      encryptionKey
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
  scopes: ApiKeyScope[]
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
  keyId: string
): Promise<ServiceResponse> => {
  try {
    const [deletedKey] = await db
      .delete(newsletterApiKeys)
      .where(
        and(
          eq(newsletterApiKeys.newsletterId, newsletterId),
          eq(newsletterApiKeys.id, keyId)
        )
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

export const getUserNewsletterRole = async (
  newsletterId: string,
  userId: string
) => {
  try {
    const [membership] = await db
      .select({
        newsletterId: newsletterMembers.newsletterId,
        userId: newsletterMembers.userId,
        role: newsletterMembers.role,
      })
      .from(newsletterMembers)
      .where(
        and(
          eq(newsletterMembers.newsletterId, newsletterId),
          eq(newsletterMembers.userId, userId)
        )
      );

    if (!membership) {
      return {
        success: false,
        message: "User is not a member of this newsletter",
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
  const [newsletter] = await db
    .select()
    .from(newsletters)
    .where(eq(newsletters.slug, slug));

  if (!newsletter) {
    return { data: null, success: false, message: "Newsletter not found." };
  }

  return {
    data: newsletter,
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
    .select({ userId: newsletterMembers.userId })
    .from(newsletterMembers)
    .where(
      and(
        eq(newsletterMembers.newsletterId, newsletter.id),
        eq(newsletterMembers.role, "owner")
      )
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
  limit = 10
) => {
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
      role: newsletterMembers.role,
      subscriberCount: count(subscribers.id),
    })
    .from(newsletters)
    .innerJoin(
      newsletterMembers,
      eq(newsletters.id, newsletterMembers.newsletterId)
    )
    .leftJoin(subscribers, eq(newsletters.id, subscribers.newsletterId))
    .where(eq(newsletterMembers.userId, userId))
    .groupBy(
      newsletters.id,
      newsletters.slug,
      newsletters.name,
      newsletters.description,
      newsletters.config,
      newsletters.createdAt,
      newsletters.updatedAt,
      newsletterMembers.role
    )
    .orderBy(desc(newsletters.createdAt))
    .limit(limit)
    .offset(offset);

  const countQuery = db
    .select({ count: count() })
    .from(newsletterMembers)
    .where(eq(newsletterMembers.userId, userId));

  return paginate(dbQuery, countQuery, page, limit);
};

export const getNewsletterApiKeys = async (
  newsletterId: string
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
          isNull(newsletterApiKeys.revokedAt)
        )
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

export const inviteUserToNewsletter = async (
  newsletterId: string,
  invitedByUserId: string,
  invitedToUserId: string,
  role: NewsletterRoles
): Promise<ServiceResponse> => {
  try {
    const [existingMember] = await db
      .select()
      .from(newsletterMembers)
      .where(
        and(
          eq(newsletterMembers.newsletterId, newsletterId),
          eq(newsletterMembers.userId, invitedToUserId)
        )
      );

    if (existingMember) {
      return {
        data: null,
        success: false,
        message: "User is already a member of this newsletter.",
      };
    }

    const [existingInvite] = await db
      .select()
      .from(newsletterInvites)
      .where(
        and(
          eq(newsletterInvites.newsletterId, newsletterId),
          eq(newsletterInvites.invitedToUserId, invitedToUserId),
          isNull(newsletterInvites.acceptedAt)
        )
      );

    if (existingInvite) {
      return {
        data: null,
        success: false,
        message: "An active invitation for this user already exists.",
      };

      // todo: send new invite if its been over 3 days n inite was sent
    }

    const [newInvite] = await db
      .insert(newsletterInvites)
      .values({
        newsletterId,
        invitedByUserId,
        invitedToUserId,
        role,
      } as NewNewsletterInvite)
      .returning();

    const [newsletter] = await db
      .select()
      .from(newsletters)
      .where(eq(newsletters.id, newsletterId));
    const [inviter] = await db
      .select()
      .from(users)
      .where(eq(users.id, invitedByUserId));
    const [invitee] = await db
      .select()
      .from(users)
      .where(eq(users.id, invitedToUserId));

    if (invitee) {
      await sendNewsletterInviteEmail(
        invitee.email,
        inviter?.name ?? "Someone",
        newsletter?.name ?? "a newsletter",
        role
      );
    }

    return {
      data: newInvite,
      message: "User invited successfully",
      success: true,
    };
  } catch (err) {
    return {
      data: null,
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong sending the newsletter invitation.",
    };
  }
};

export const getUserNewsletterInvites = async (
  userId: string
): Promise<ServiceResponse> => {
  try {
    const invites = await db
      .select({
        inviteId: newsletterInvites.id,
        newsletterId: newsletterInvites.newsletterId,
        newsletterName: newsletters.name,
        invitedBy: newsletterInvites.invitedByUserId,
        role: newsletterInvites.role,
        createdAt: newsletterInvites.createdAt,
      })
      .from(newsletterInvites)
      .innerJoin(newsletters, eq(newsletterInvites.newsletterId, newsletters.id))
      .where(
        and(
          eq(newsletterInvites.invitedToUserId, userId),
          isNull(newsletterInvites.acceptedAt)
        )
      )
      .orderBy(desc(newsletterInvites.createdAt));

    return {
      data: invites,
      message: "Fetched newsletter invites successfully",
      success: true,
    };
  } catch (err) {
    return {
      data: null,
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong fetching newsletter invites.",
    };
  }
};

export const acceptNewsletterInvite = async (
  inviteId: string,
  acceptingUserId: string
): Promise<ServiceResponse> => {
  try {
    const [invite] = await db
      .select()
      .from(newsletterInvites)
      .where(eq(newsletterInvites.id, inviteId));

    if (!invite) {
      return {
        data: null,
        success: false,
        message: "Invitation not found.",
      };
    }

    if (invite.invitedToUserId !== acceptingUserId) {
      return {
        data: null,
        success: false,
        message: "You are not authorized to accept this invitation.",
      };
    }

    if (invite.acceptedAt) {
      return {
        data: null,
        success: false,
        message: "This invitation has already been accepted.",
      };
    }

    const [existingMember] = await db
      .select()
      .from(newsletterMembers)
      .where(
        and(
          eq(newsletterMembers.newsletterId, invite.newsletterId),
          eq(newsletterMembers.userId, acceptingUserId)
        )
      );

    if (existingMember) {
      await db
        .update(newsletterInvites)
        .set({ acceptedAt: new Date() })
        .where(eq(newsletterInvites.id, inviteId));

      return {
        data: { newsletterId: invite.newsletterId },
        success: true,
        message:
          "You are already a member of this newsletter. Invitation marked as accepted.",
      };
    }

    await db.insert(newsletterMembers).values({
      newsletterId: invite.newsletterId,
      userId: acceptingUserId,
      role: invite.role,
    });

    const [updatedInvite] = await db
      .update(newsletterInvites)
      .set({ acceptedAt: new Date() })
      .where(eq(newsletterInvites.id, inviteId))
      .returning();

    return {
      data: {
        newsletterId: invite.newsletterId,
        role: invite.role,
        invite: updatedInvite,
      },
      message:
        "Newsletter invitation accepted successfully. You are now a member.",
      success: true,
    };
  } catch (err) {
    return {
      data: null,
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong accepting the newsletter invitation.",
    };
  }
};

export const updateNewsletterMemberRole = async (
  newsletterId: string,
  targetUserId: string,
  newRole: NewsletterRoles
): Promise<ServiceResponse> => {
  try {
    if (newRole === "owner") {
      return {
        data: null,
        success: false,
        message:
          "Transferring newsletter ownership requires a dedicated function to ensure a new owner is designated.",
      };
    }

    const [updatedMember] = await db
      .update(newsletterMembers)
      .set({
        role: newRole,
      })
      .where(
        and(
          eq(newsletterMembers.newsletterId, newsletterId),
          eq(newsletterMembers.userId, targetUserId)
        )
      )
      .returning();

    if (!updatedMember) {
      return {
        data: null,
        success: false,
        message: "User is not a member of this newsletter.",
      };
    }

    return {
      data: updatedMember,
      success: true,
      message: `User role updated to '${newRole}' successfully.`,
    };
  } catch (err) {
    return {
      data: null,
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong updating the newsletter member's role.",
    };
  }
};

export const transferNewsletterOwnership = async (
  newsletterId: string,
  currentOwnerId: string,
  newOwnerUserId: string
): Promise<ServiceResponse> => {
  try {
    if (currentOwnerId === newOwnerUserId) {
      return {
        data: null,
        success: false,
        message: "You already own this newsletter.",
      };
    }

    const [currentOwnerMembership] = await db
      .select()
      .from(newsletterMembers)
      .where(
        and(
          eq(newsletterMembers.newsletterId, newsletterId),
          eq(newsletterMembers.userId, currentOwnerId)
        )
      );

    if (!currentOwnerMembership || currentOwnerMembership.role !== "owner") {
      return {
        data: null,
        success: false,
        message: "Only the current owner can transfer ownership.",
      };
    }

    const [targetMembership] = await db
      .select()
      .from(newsletterMembers)
      .where(
        and(
          eq(newsletterMembers.newsletterId, newsletterId),
          eq(newsletterMembers.userId, newOwnerUserId)
        )
      );

    if (!targetMembership) {
      return {
        data: null,
        success: false,
        message:
          "The new owner must already be a member of this newsletter. Invite them first.",
      };
    }

    // Promote the new owner first so there's never a moment with zero owners
    // if the second update below were to fail.
    const [newOwner] = await db
      .update(newsletterMembers)
      .set({ role: "owner" })
      .where(
        and(
          eq(newsletterMembers.newsletterId, newsletterId),
          eq(newsletterMembers.userId, newOwnerUserId)
        )
      )
      .returning();

    await db
      .update(newsletterMembers)
      .set({ role: "admin" })
      .where(
        and(
          eq(newsletterMembers.newsletterId, newsletterId),
          eq(newsletterMembers.userId, currentOwnerId)
        )
      );

    return {
      data: newOwner,
      success: true,
      message:
        "Newsletter ownership transferred successfully. You are now an admin on this newsletter.",
    };
  } catch (err) {
    return {
      data: null,
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong transferring newsletter ownership.",
    };
  }
};

export const getNewsletterMembers = async (
  newsletterId: string
): Promise<ServiceResponse> => {
  try {
    const members = await db
      .select({
        userId: newsletterMembers.userId,
        role: newsletterMembers.role,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(newsletterMembers)
      .innerJoin(users, eq(newsletterMembers.userId, users.id))
      .where(eq(newsletterMembers.newsletterId, newsletterId));

    return {
      success: true,
      message: "Fetched newsletter members successfully",
      data: members,
    };
  } catch (err) {
    if (err instanceof Error) {
      return { success: false, message: err.message, data: null };
    }
    return {
      success: false,
      message: "Something went wrong fetching newsletter members",
      data: null,
    };
  }
};
