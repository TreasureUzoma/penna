import { db } from "@workspace/db";
import { teams, teamMembers, teamInvites, users, newsletters } from "@workspace/db/schema";
import type { ServiceResponse, TeamRoles } from "@workspace/types";
import type { NewTeam, UpdateTeam } from "@workspace/validations";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import crypto from "crypto";
import { paginate } from "@/utils/pagination";
import { sendTeamInviteEmail } from "./mail/internal";

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const createTeam = async (
  data: NewTeam,
  ownerUserId: string
): Promise<ServiceResponse> => {
  try {
    const [team] = await db.insert(teams).values(data).returning();
    await db.insert(teamMembers).values({
      teamId: team!.id,
      userId: ownerUserId,
      role: "owner",
    });

    return {
      data: { team },
      message: "Team created successfully",
      success: true,
    };
  } catch (err) {
    return {
      data: null,
      success: false,
      message:
        err instanceof Error ? err.message : "Something went wrong creating the team.",
    };
  }
};

export const getValidTeam = async (teamId: string) => {
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));

  if (!team) {
    return { data: null, success: false, message: "Team not found." };
  }

  return { data: team, success: true, message: "Team fetched successfully" };
};

export const getTeamBySlug = async (slug: string) => {
  const [team] = await db.select().from(teams).where(eq(teams.slug, slug));

  if (!team) {
    return { data: null, success: false, message: "Team not found." };
  }

  return { data: team, success: true, message: "Team fetched successfully" };
};

/** Backs getTeamOrFail's role check — mirrors the shape getUserNewsletterRole used to have. */
export const getUserTeamRole = async (teamId: string, userId: string) => {
  const [membership] = await db
    .select({
      teamId: teamMembers.teamId,
      userId: teamMembers.userId,
      role: teamMembers.role,
    })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));

  if (!membership) {
    return {
      success: false,
      message: "User is not a member of this team",
      data: null,
    };
  }

  return {
    success: true,
    message: "Fetched user role successfully",
    data: membership,
  };
};

export const getUserTeams = (userId: string, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;

  const dbQuery = db
    .select({
      id: teams.id,
      slug: teams.slug,
      name: teams.name,
      role: teamMembers.role,
      createdAt: teams.createdAt,
    })
    .from(teams)
    .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
    .where(eq(teamMembers.userId, userId))
    .orderBy(desc(teams.createdAt))
    .limit(limit)
    .offset(offset);

  const countQuery = db
    .select({ count: count() })
    .from(teams)
    .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
    .where(eq(teamMembers.userId, userId));

  return paginate(dbQuery, countQuery, page, limit);
};

export const updateTeam = async (
  teamId: string,
  data: Partial<UpdateTeam>
): Promise<ServiceResponse> => {
  try {
    const updateValues: Record<string, any> = {};
    if (data.name !== undefined) updateValues.name = data.name;
    if (data.slug !== undefined) updateValues.slug = data.slug;

    if (Object.keys(updateValues).length === 0) {
      return { data: null, success: false, message: "No fields to update" };
    }
    updateValues.updatedAt = new Date();

    const [updated] = await db
      .update(teams)
      .set(updateValues)
      .where(eq(teams.id, teamId))
      .returning();

    return { data: updated, success: true, message: "Team updated successfully" };
  } catch (err) {
    return {
      data: null,
      success: false,
      message: err instanceof Error ? err.message : "Something went wrong updating the team.",
    };
  }
};

/**
 * Deletes a team and (via cascade) every newsletter it owns, along with
 * their subscribers/posts/API keys/etc. Owner-only at the route level —
 * this is the single most destructive action in the whole app, so the
 * route confirms that gate before ever calling this.
 */
export const deleteTeam = async (teamId: string): Promise<ServiceResponse> => {
  try {
    await db.delete(teams).where(eq(teams.id, teamId));
    return { data: null, success: true, message: "Team deleted successfully" };
  } catch (err) {
    return {
      data: null,
      success: false,
      message: err instanceof Error ? err.message : "Something went wrong deleting the team.",
    };
  }
};

export const getTeamMembers = async (teamId: string): Promise<ServiceResponse> => {
  try {
    const members = await db
      .select({
        userId: teamMembers.userId,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        user: { id: users.id, name: users.name, email: users.email },
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));

    return { success: true, message: "Fetched team members successfully", data: members };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Something went wrong fetching team members",
      data: null,
    };
  }
};

/** Every newsletter a team owns — backs the team switcher and the "move to a team" destination picker. */
export const getTeamNewsletters = async (teamId: string): Promise<ServiceResponse> => {
  try {
    const rows = await db
      .select({
        id: newsletters.id,
        slug: newsletters.slug,
        name: newsletters.name,
      })
      .from(newsletters)
      .where(eq(newsletters.teamId, teamId))
      .orderBy(desc(newsletters.createdAt));

    return { success: true, message: "Fetched team newsletters successfully", data: rows };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Something went wrong fetching team newsletters",
      data: null,
    };
  }
};

export const updateTeamMemberRole = async (
  teamId: string,
  targetUserId: string,
  newRole: TeamRoles
): Promise<ServiceResponse> => {
  try {
    if (newRole === "owner") {
      return {
        data: null,
        success: false,
        message:
          "Transferring team ownership requires a dedicated function to ensure a new owner is designated.",
      };
    }

    const [updatedMember] = await db
      .update(teamMembers)
      .set({ role: newRole })
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, targetUserId)))
      .returning();

    if (!updatedMember) {
      return { data: null, success: false, message: "User is not a member of this team." };
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
          : "Something went wrong updating the team member's role.",
    };
  }
};

export const transferTeamOwnership = async (
  teamId: string,
  currentOwnerId: string,
  newOwnerUserId: string
): Promise<ServiceResponse> => {
  try {
    if (currentOwnerId === newOwnerUserId) {
      return { data: null, success: false, message: "You already own this team." };
    }

    const [currentOwnerMembership] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, currentOwnerId)));

    if (!currentOwnerMembership || currentOwnerMembership.role !== "owner") {
      return { data: null, success: false, message: "Only the current owner can transfer ownership." };
    }

    const [targetMembership] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, newOwnerUserId)));

    if (!targetMembership) {
      return {
        data: null,
        success: false,
        message: "The new owner must already be a member of this team. Invite them first.",
      };
    }

    // Promote the new owner first so there's never a moment with zero owners
    // if the second update below were to fail.
    const [newOwner] = await db
      .update(teamMembers)
      .set({ role: "owner" })
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, newOwnerUserId)))
      .returning();

    await db
      .update(teamMembers)
      .set({ role: "admin" })
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, currentOwnerId)));

    return {
      data: newOwner,
      success: true,
      message: "Team ownership transferred successfully. You are now an admin on this team.",
    };
  } catch (err) {
    return {
      data: null,
      success: false,
      message:
        err instanceof Error ? err.message : "Something went wrong transferring team ownership.",
    };
  }
};

/**
 * Email-based invite — the invitee doesn't need an account yet (unlike the
 * old per-newsletter invites, which required inviting an existing user by
 * ID). Looks up whether the email already belongs to a user so the invite
 * can be pre-linked, but works either way.
 */
export const inviteToTeam = async (
  teamId: string,
  invitedByUserId: string,
  email: string,
  role: TeamRoles
): Promise<ServiceResponse> => {
  try {
    const normalizedEmail = email.trim().toLowerCase();

    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (existingUser) {
      const [existingMember] = await db
        .select()
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, existingUser.id)));

      if (existingMember) {
        return { data: null, success: false, message: "User is already a member of this team." };
      }
    }

    const [existingInvite] = await db
      .select()
      .from(teamInvites)
      .where(
        and(
          eq(teamInvites.teamId, teamId),
          eq(teamInvites.email, normalizedEmail),
          isNull(teamInvites.acceptedAt),
          isNull(teamInvites.revokedAt)
        )
      );

    if (existingInvite) {
      return { data: null, success: false, message: "An active invitation for this email already exists." };
    }

    const token = crypto.randomBytes(32).toString("hex");

    const [newInvite] = await db
      .insert(teamInvites)
      .values({
        teamId,
        invitedByUserId,
        invitedToUserId: existingUser?.id ?? null,
        email: normalizedEmail,
        role,
        token,
        expiresAt: new Date(Date.now() + INVITE_EXPIRY_MS),
      })
      .returning();

    const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
    const [inviter] = await db.select().from(users).where(eq(users.id, invitedByUserId));

    await sendTeamInviteEmail(
      normalizedEmail,
      inviter?.name ?? "Someone",
      team?.name ?? "a team",
      role,
      token
    );

    return { data: newInvite, message: "Invitation sent successfully", success: true };
  } catch (err) {
    return {
      data: null,
      success: false,
      message: err instanceof Error ? err.message : "Something went wrong sending the invitation.",
    };
  }
};

/** Pending invites addressed to a user's own email — an in-app list, independent of the emailed link. */
export const getUserTeamInvites = async (userEmail: string): Promise<ServiceResponse> => {
  try {
    const invites = await db
      .select({
        inviteId: teamInvites.id,
        teamId: teamInvites.teamId,
        teamName: teams.name,
        invitedBy: teamInvites.invitedByUserId,
        role: teamInvites.role,
        createdAt: teamInvites.createdAt,
      })
      .from(teamInvites)
      .innerJoin(teams, eq(teamInvites.teamId, teams.id))
      .where(
        and(
          eq(teamInvites.email, userEmail.trim().toLowerCase()),
          isNull(teamInvites.acceptedAt),
          isNull(teamInvites.revokedAt)
        )
      )
      .orderBy(desc(teamInvites.createdAt));

    return { data: invites, message: "Fetched team invites successfully", success: true };
  } catch (err) {
    return {
      data: null,
      success: false,
      message: err instanceof Error ? err.message : "Something went wrong fetching team invites.",
    };
  }
};

/**
 * Accepts by token (the emailed link), not by a client-supplied inviteId —
 * and requires the accepting user's own email to match the invite's, so a
 * signed-in user can't accept an invite addressed to someone else just by
 * knowing/guessing the token owner's session. This closes a looseness the
 * old acceptNewsletterInvite had (it trusted `acceptingUserId` straight
 * from the request body).
 */
export const acceptTeamInvite = async (
  token: string,
  acceptingUserId: string,
  acceptingUserEmail: string
): Promise<ServiceResponse> => {
  try {
    const [invite] = await db.select().from(teamInvites).where(eq(teamInvites.token, token));

    if (!invite) {
      return { data: null, success: false, message: "Invitation not found." };
    }
    if (invite.revokedAt) {
      return { data: null, success: false, message: "This invitation has been revoked." };
    }
    if (invite.acceptedAt) {
      return { data: null, success: false, message: "This invitation has already been accepted." };
    }
    if (invite.expiresAt < new Date()) {
      return { data: null, success: false, message: "This invitation has expired." };
    }
    if (invite.email !== acceptingUserEmail.trim().toLowerCase()) {
      return {
        data: null,
        success: false,
        message: "This invitation was sent to a different email address.",
      };
    }

    const [existingMember] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, invite.teamId), eq(teamMembers.userId, acceptingUserId)));

    if (!existingMember) {
      await db.insert(teamMembers).values({
        teamId: invite.teamId,
        userId: acceptingUserId,
        role: invite.role,
      });
    }

    const [updatedInvite] = await db
      .update(teamInvites)
      .set({ acceptedAt: new Date(), invitedToUserId: acceptingUserId })
      .where(eq(teamInvites.id, invite.id))
      .returning();

    return {
      data: { teamId: invite.teamId, role: invite.role, invite: updatedInvite },
      message: "Team invitation accepted successfully. You are now a member.",
      success: true,
    };
  } catch (err) {
    return {
      data: null,
      success: false,
      message: err instanceof Error ? err.message : "Something went wrong accepting the invitation.",
    };
  }
};

export const revokeTeamInvite = async (inviteId: string): Promise<ServiceResponse> => {
  try {
    const [revoked] = await db
      .update(teamInvites)
      .set({ revokedAt: new Date() })
      .where(eq(teamInvites.id, inviteId))
      .returning();

    if (!revoked) {
      return { data: null, success: false, message: "Invitation not found." };
    }

    return { data: revoked, success: true, message: "Invitation revoked successfully." };
  } catch (err) {
    return {
      data: null,
      success: false,
      message: err instanceof Error ? err.message : "Something went wrong revoking the invitation.",
    };
  }
};
