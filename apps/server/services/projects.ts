import { decryptDataSubtle, encryptDataSubtle } from "@/lib/encrypt";
import { generateApiKeys } from "@/lib/utils";
import type { InsertApiKey } from "@/types";
import { db } from "@workspace/db";
import {
  projectApiKeys,
  projectInvites,
  projects,
  subscribers,
} from "@workspace/db/schema";
import type { ProjectRoles, ServiceResponse } from "@workspace/types";
import type {
  NewProject,
  NewProjectInvite,
  UpdateProject,
} from "@workspace/validations";
import { projectMembers, users } from "@workspace/db/schema";

import { and, count, desc, eq, isNull } from "drizzle-orm";
import { paginate } from "@/utils/pagination";
import { envConfig } from "@/config";
import { sendProjectInviteEmail } from "./mail/internal";

const encryptionKey = envConfig.ENCRYPTION_KEY!;

export const createProject = async (
  data: NewProject,
  userId: string
): Promise<ServiceResponse> => {
  try {
    const [project] = await db
      .insert(projects)
      .values({
        name: data.name,
        slug: data.slug,
        description: data.description,
      })
      .returning();
    await db.insert(projectMembers).values({
      projectId: project!.id,
      userId: userId,
      role: "owner",
    });
    const { publicKey, secretKey } = generateApiKeys();
    await createProjectApiKeys({
      publicKey,
      encryptedSecretKey: secretKey,
      projectId: project!.id,
    });
    return {
      data: {
        project,
      },
      message: "Project created successfully",
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
      message:
        "Something went wrong creating the project and its initial keys.",
    };
  }
};

/**
 * Whether a project is allowed to remove Penna branding from outgoing
 * emails. Gated on the project owner's plan (not just whoever happens to be
 * toggling the setting), and re-checked server-side on every send rather
 * than trusted from the stored config, in case the owner downgrades later.
 */
export const canRemoveBranding = async (projectId: string): Promise<boolean> => {
  const [owner] = await db
    .select({ subscriptionType: users.subscriptionType })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.role, "owner")
      )
    );

  return !!owner && owner.subscriptionType !== "free";
};

export const updateProject = async (
  projectId: string,
  data: Partial<UpdateProject>
): Promise<ServiceResponse> => {
  try {
    const updateValues: Record<string, any> = {};
    if (data.name !== undefined) updateValues.name = data.name;
    if (data.slug !== undefined) updateValues.slug = data.slug;
    if (data.description !== undefined)
      updateValues.description = data.description;
    // There's no `isPublic` column — visibility is stored as `isPrivateAt`
    // (null = public, a timestamp = made private at that time), matching
    // what the dashboard already reads (`isPublic: !project.isPrivateAt`
    // in settings-tab.tsx). Writing `isPublic` directly here was a no-op:
    // it isn't a real column, so the visibility toggle never persisted.
    if (data.isPublic !== undefined) {
      updateValues.isPrivateAt = data.isPublic ? null : new Date();
    }

    if (data.removeBranding !== undefined) {
      if (data.removeBranding) {
        const allowed = await canRemoveBranding(projectId);
        if (!allowed) {
          return {
            data: null,
            success: false,
            message:
              "Removing Penna branding is a Pro feature. Upgrade the project owner's plan to enable it.",
          };
        }
      }

      const [existing] = await db
        .select({ config: projects.config })
        .from(projects)
        .where(eq(projects.id, projectId));

      updateValues.config = {
        ...((existing?.config as Record<string, unknown>) || {}),
        removeBranding: data.removeBranding,
      };
    }

    if (Object.keys(updateValues).length === 0) {
      return {
        data: null,
        success: false,
        message: "No fields to update",
      };
    }

    const [updatedProject] = await db
      .update(projects)
      .set(updateValues)
      .where(eq(projects.id, projectId))
      .returning();

    return {
      data: updatedProject,
      success: true,
      message: "Project updated successfully",
    };
  } catch (err) {
    return {
      data: null,
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong updating project",
    };
  }
};

export const deleteProject = async (
  projectId: string
): Promise<ServiceResponse> => {
  try {
    await db.delete(projects).where(eq(projects.id, projectId));
    return {
      data: null,
      success: true,
      message: "Project deleted successfully.",
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
      message: "Something went wrong while deleting project.",
    };
  }
};

export const createProjectApiKeys = async (
  data: InsertApiKey
): Promise<ServiceResponse> => {
  try {
    const encryptedSecret = await encryptDataSubtle(
      data.encryptedSecretKey,
      encryptionKey
    );

    const [apiKeys] = await db
      .insert(projectApiKeys)
      .values({
        projectId: data.projectId,
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

export const generateAndCreateProjectApiKey = async (
  projectId: string
): Promise<ServiceResponse> => {
  try {
    const { publicKey, secretKey } = generateApiKeys();

    const encryptedSecret = await encryptDataSubtle(secretKey, encryptionKey);

    const [apiKey] = await db
      .insert(projectApiKeys)
      .values({
        projectId,
        publicKey,
        encryptedSecretKey: encryptedSecret,
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

export const deleteProjectApiKey = async (
  projectId: string,
  keyId: string
): Promise<ServiceResponse> => {
  try {
    const [deletedKey] = await db
      .delete(projectApiKeys)
      .where(
        and(
          eq(projectApiKeys.projectId, projectId),
          eq(projectApiKeys.id, keyId)
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

export const getUserProjectRole = async (projectId: string, userId: string) => {
  try {
    const [membership] = await db
      .select({
        projectId: projectMembers.projectId,
        userId: projectMembers.userId,
        role: projectMembers.role,
      })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId)
        )
      );

    if (!membership) {
      return {
        success: false,
        message: "User is not a member of this project",
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

export const getValidProject = async (projectId: string) => {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) {
    return { data: null, success: false, message: "Project not found." };
  }

  return {
    data: project,
    success: true,
    message: "Project fetched successfully",
  };
};

export const getProjectBySlug = async (slug: string) => {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, slug));

  if (!project) {
    return { data: null, success: false, message: "Project not found." };
  }

  return {
    data: project,
    success: true,
    message: "Project fetched successfully",
  };
};

export const getProjectsByUser = (userId: string, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  const dbQuery = db
    .select({
      id: projects.id,
      slug: projects.slug,
      name: projects.name,
      description: projects.description,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      role: projectMembers.role,
      subscriberCount: count(subscribers.id),
    })
    .from(projects)
    .innerJoin(projectMembers, eq(projects.id, projectMembers.projectId))
    .leftJoin(subscribers, eq(projects.id, subscribers.projectId))
    .where(eq(projectMembers.userId, userId))
    .groupBy(
      projects.id,
      projects.slug,
      projects.name,
      projects.description,
      projects.createdAt,
      projects.updatedAt,
      projectMembers.role
    )
    .orderBy(desc(projects.createdAt))
    .limit(limit)
    .offset(offset);

  const countQuery = db
    .select({ count: count() })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));

  return paginate(dbQuery, countQuery, page, limit);
};

export const getProjectApiKeys = async (
  projectId: string
): Promise<ServiceResponse> => {
  try {
    const apiKeys = await db
      .select()
      .from(projectApiKeys)
      .where(
        and(
          eq(projectApiKeys.projectId, projectId),
          isNull(projectApiKeys.revokedAt)
        )
      )
      .orderBy(desc(projectApiKeys.createdAt));

    for (const key of apiKeys) {
      key.encryptedSecretKey = await decryptDataSubtle(
        key.encryptedSecretKey,
        encryptionKey
      );
    }

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

export const inviteUserToProject = async (
  projectId: string,
  invitedByUserId: string,
  invitedToUserId: string,
  role: ProjectRoles
): Promise<ServiceResponse> => {
  try {
    const [existingMember] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, invitedToUserId)
        )
      );

    if (existingMember) {
      return {
        data: null,
        success: false,
        message: "User is already a member of this project.",
      };
    }

    const [existingInvite] = await db
      .select()
      .from(projectInvites)
      .where(
        and(
          eq(projectInvites.projectId, projectId),
          eq(projectInvites.invitedToUserId, invitedToUserId),
          isNull(projectInvites.acceptedAt)
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
      .insert(projectInvites)
      .values({
        projectId,
        invitedByUserId,
        invitedToUserId,
        role,
      } as NewProjectInvite)
      .returning();

    // todo: use actual team name
    await sendProjectInviteEmail("[projectName]", role);

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
          : "Something went wrong sending the project invitation.",
    };
  }
};

export const getUserProjectInvites = async (
  userId: string
): Promise<ServiceResponse> => {
  try {
    const invites = await db
      .select({
        inviteId: projectInvites.id,
        projectId: projectInvites.projectId,
        projectName: projects.name,
        invitedBy: projectInvites.invitedByUserId,
        role: projectInvites.role,
        createdAt: projectInvites.createdAt,
      })
      .from(projectInvites)
      .innerJoin(projects, eq(projectInvites.projectId, projects.id))
      .where(
        and(
          eq(projectInvites.invitedToUserId, userId),
          isNull(projectInvites.acceptedAt)
        )
      )
      .orderBy(desc(projectInvites.createdAt));

    return {
      data: invites,
      message: "Fetched project invites successfully",
      success: true,
    };
  } catch (err) {
    return {
      data: null,
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong fetching project invites.",
    };
  }
};

export const acceptProjectInvite = async (
  inviteId: string,
  acceptingUserId: string
): Promise<ServiceResponse> => {
  try {
    const [invite] = await db
      .select()
      .from(projectInvites)
      .where(eq(projectInvites.id, inviteId));

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
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, invite.projectId),
          eq(projectMembers.userId, acceptingUserId)
        )
      );

    if (existingMember) {
      await db
        .update(projectInvites)
        .set({ acceptedAt: new Date() })
        .where(eq(projectInvites.id, inviteId));

      return {
        data: { projectId: invite.projectId },
        success: true,
        message:
          "You are already a member of this project. Invitation marked as accepted.",
      };
    }

    await db.insert(projectMembers).values({
      projectId: invite.projectId,
      userId: acceptingUserId,
      role: invite.role,
    });

    const [updatedInvite] = await db
      .update(projectInvites)
      .set({ acceptedAt: new Date() })
      .where(eq(projectInvites.id, inviteId))
      .returning();

    return {
      data: {
        projectId: invite.projectId,
        role: invite.role,
        invite: updatedInvite,
      },
      message:
        "Project invitation accepted successfully. You are now a member.",
      success: true,
    };
  } catch (err) {
    return {
      data: null,
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong accepting the project invitation.",
    };
  }
};

export const updateProjectMemberRole = async (
  projectId: string,
  targetUserId: string,
  newRole: ProjectRoles
): Promise<ServiceResponse> => {
  try {
    if (newRole === "owner") {
      return {
        data: null,
        success: false,
        message:
          "Transferring project ownership requires a dedicated function to ensure a new owner is designated.",
      };
    }

    const [updatedMember] = await db
      .update(projectMembers)
      .set({
        role: newRole,
      })
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, targetUserId)
        )
      )
      .returning();

    if (!updatedMember) {
      return {
        data: null,
        success: false,
        message: "User is not a member of this project.",
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
          : "Something went wrong updating the project member's role.",
    };
  }
};

export const transferProjectOwnership = async (
  projectId: string,
  currentOwnerId: string,
  newOwnerUserId: string
): Promise<ServiceResponse> => {
  try {
    if (currentOwnerId === newOwnerUserId) {
      return {
        data: null,
        success: false,
        message: "You already own this project.",
      };
    }

    const [currentOwnerMembership] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, currentOwnerId)
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
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, newOwnerUserId)
        )
      );

    if (!targetMembership) {
      return {
        data: null,
        success: false,
        message:
          "The new owner must already be a member of this project. Invite them first.",
      };
    }

    // Promote the new owner first so there's never a moment with zero owners
    // if the second update below were to fail.
    const [newOwner] = await db
      .update(projectMembers)
      .set({ role: "owner" })
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, newOwnerUserId)
        )
      )
      .returning();

    await db
      .update(projectMembers)
      .set({ role: "admin" })
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, currentOwnerId)
        )
      );

    return {
      data: newOwner,
      success: true,
      message:
        "Project ownership transferred successfully. You are now an admin on this project.",
    };
  } catch (err) {
    return {
      data: null,
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong transferring project ownership.",
    };
  }
};

export const getProjectMembers = async (
  projectId: string
): Promise<ServiceResponse> => {
  try {
    const members = await db
      .select({
        userId: projectMembers.userId,
        role: projectMembers.role,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId));

    return {
      success: true,
      message: "Fetched project members successfully",
      data: members,
    };
  } catch (err) {
    if (err instanceof Error) {
      return { success: false, message: err.message, data: null };
    }
    return {
      success: false,
      message: "Something went wrong fetching project members",
      data: null,
    };
  }
};
