import {
  acceptProjectInvite,
  createProject,
  deleteProject,
  getProjectApiKeys,
  getProjectsByUser,
  getProjectBySlug,
  getUserProjectInvites,
  inviteUserToProject,
  updateProject,
  updateProjectMemberRole,
  getProjectMembers,
  generateAndCreateProjectApiKey,
  deleteProjectApiKey,
  transferProjectOwnership,
  canRemoveBranding,
  canUseCustomDomain,
} from "@/services/projects";
import {
  getSubscribers,
  createSubscriber,
  deleteSubscriber,
  importSubscribersFromCsv,
} from "@/services/subscribers";
import {
  getEmails,
  getEmail,
  createEmail,
  deleteEmail,
  updateEmail,
} from "@/services/emails";
import { getProjectAnalytics } from "@/services/analytics";
import { z } from "zod";
import type { AppBindings, AuthType } from "@/types";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  acceptProjectInviteSchema,
  createProjectSchema,
  inviteUserToProjectSchema,
  isValidUUID,
  updateProjectMemberRoleSchema,
  updateProjectSchema,
} from "@workspace/validations";
import { routeStatus } from "@/lib/utils";
import { validationErrorResponse } from "@/utils/validation-error-response";
import { getProjectOrFail } from "@/utils/project-access";

const projectsRoute = new Hono<AppBindings>();

// delete a project
projectsRoute.delete(
  "/:id",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  async (c) => {
    const { id: projectId } = c.req.valid("param");
    const projectOrRes = await getProjectOrFail(c, projectId, [
      "owner",
      "admin",
    ]);
    if (projectOrRes instanceof Response) return projectOrRes;
    const project = projectOrRes;

    const deleteService = await deleteProject(project.id);
    return c.json(deleteService, routeStatus(deleteService));
  }
);

// get a project api key
projectsRoute.get(
  "/api/:id",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const { id: projectId } = c.req.valid("param");
    const projectOrRes = await getProjectOrFail(c, projectId, [
      "owner",
      "admin",
    ]);
    if (projectOrRes instanceof Response) return projectOrRes;
    const project = projectOrRes;

    const serviceData = await getProjectApiKeys(project.id);

    return c.json(serviceData, routeStatus(serviceData));
  }
);

// create a project api key
projectsRoute.post(
  "/api/:id",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const { id: projectId } = c.req.valid("param");
    const projectOrRes = await getProjectOrFail(c, projectId, [
      "owner",
      "admin",
    ]);
    if (projectOrRes instanceof Response) return projectOrRes;
    const project = projectOrRes;

    const serviceData = await generateAndCreateProjectApiKey(project.id);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// delete a project api key
projectsRoute.delete(
  "/api/:id/:keyId",
  zValidator(
    "param",
    z.object({ id: z.string().min(1), keyId: z.string().uuid() }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    }
  ),
  async (c) => {
    const { id: projectId, keyId } = c.req.valid("param");
    const projectOrRes = await getProjectOrFail(c, projectId, [
      "owner",
      "admin",
    ]);
    if (projectOrRes instanceof Response) return projectOrRes;
    const project = projectOrRes;

    const serviceData = await deleteProjectApiKey(project.id, keyId);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// create a project
projectsRoute.post(
  "/new",
  zValidator("json", createProjectSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const cookieUser = c.get("user") as AuthType;
    const body = c.req.valid("json");
    const serviceData = await createProject(body, cookieUser.id);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// update a project
projectsRoute.patch(
  "/:id",
  zValidator("json", updateProjectSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  async (c) => {
    const { id: projectId } = c.req.valid("param");
    const body = c.req.valid("json");
    const projectOrRes = await getProjectOrFail(c, projectId, [
      "owner",
      "admin",
    ]);
    if (projectOrRes instanceof Response) return projectOrRes;
    const project = projectOrRes;
    const serviceData = await updateProject(project.id, body);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// get a project by slug
projectsRoute.get(
  "/slug/:slug",
  zValidator(
    "param",
    z.object({ slug: z.string().min(3).max(30) }),
    (result, c) => {
      if (!result.success) {
        return validationErrorResponse(c, result.error);
      }
    }
  ),
  async (c) => {
    const { slug } = c.req.valid("param");
    const serviceData = await getProjectBySlug(slug);

    if (!serviceData.success || !serviceData.data) {
      return c.json(serviceData, 404);
    }

    // Computed server-side (mirrors the check `updateProject` re-runs on
    // every branding-toggle write) so the dashboard can grey out "Remove
    // branding" for free-plan owners instead of letting them click it and
    // hit a 400 — see settings-tab.tsx. Same gate backs the custom-domains
    // tab (see domains-tab.tsx).
    const [removableBranding, customDomainAllowed] = await Promise.all([
      canRemoveBranding(serviceData.data.id),
      canUseCustomDomain(serviceData.data.id),
    ]);

    return c.json(
      {
        project: {
          ...serviceData.data,
          canRemoveBranding: removableBranding,
          canUseCustomDomain: customDomainAllowed,
        },
      },
      200
    );
  }
);

// get a project
projectsRoute.get(
  "/:id",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  async (c) => {
    const { id: projectId } = c.req.valid("param");
    const projectOrRes = await getProjectOrFail(c, projectId);
    if (projectOrRes instanceof Response) return projectOrRes;
    const project = projectOrRes;
    return c.json({ project }, 200);
  }
);

// get project analytics
projectsRoute.get(
  "/:id/analytics",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  async (c) => {
    const { id: projectId } = c.req.valid("param");
    const { days } = c.req.query();
    const projectOrRes = await getProjectOrFail(c, projectId);
    if (projectOrRes instanceof Response) return projectOrRes;
    const project = projectOrRes;

    const daysNum = days ? parseInt(days) : 30;

    const serviceData = await getProjectAnalytics(project.id, daysNum);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// get project members
projectsRoute.get(
  "/:id/members",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  async (c) => {
    const { id: projectId } = c.req.valid("param");
    const projectOrRes = await getProjectOrFail(c, projectId);
    if (projectOrRes instanceof Response) return projectOrRes;
    const project = projectOrRes;

    const serviceData = await getProjectMembers(project.id);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// Custom sending domains live under the flat /domains route (see
// routes/api/v1/domains.ts) rather than nested here — a domain can be
// verified before it's assigned to any project, so it can't always be
// reached via a /:id project param. The dashboard's per-project Domains
// tab calls that route with a `projectId` filter/body field instead.

// transfer project ownership to another existing member
projectsRoute.post(
  "/:id/transfer-ownership",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  zValidator(
    "json",
    z.object({ newOwnerUserId: z.string().uuid("Invalid user ID") }),
    (result, c) => {
      if (!result.success) {
        return validationErrorResponse(c, result.error);
      }
    }
  ),
  async (c) => {
    const { id: projectId } = c.req.valid("param");
    const { newOwnerUserId } = c.req.valid("json");
    const cookieUser = c.get("user") as AuthType;

    const projectOrRes = await getProjectOrFail(c, projectId, ["owner"]);
    if (projectOrRes instanceof Response) return projectOrRes;
    const project = projectOrRes;

    const serviceData = await transferProjectOwnership(
      project.id,
      cookieUser.id,
      newOwnerUserId
    );
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// get all projects
projectsRoute.get("/", async (c) => {
  const { page, limit } = c.req.query();
  const cookieUser = c.get("user") as AuthType;

  const pageNumber = page ? parseInt(page) : undefined;
  const limitNumber = limit ? parseInt(limit) : undefined;

  const project = await getProjectsByUser(
    cookieUser.id,
    pageNumber,
    limitNumber
  );

  return c.json(
    {
      data: project,
      success: true,
      message: "Fetched all projects successfully",
    },
    200
  );
});

// project roles

// update project roles
projectsRoute.patch(
  "/roles/:id",
  zValidator("json", updateProjectMemberRoleSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const body = c.req.valid("json");
    const projectOrRes = await getProjectOrFail(c, body.projectId, [
      "owner",
      "admin",
    ]);
    if (projectOrRes instanceof Response) return projectOrRes;
    const project = projectOrRes;

    const serviceData = await updateProjectMemberRole(
      project.id,
      body.targetUserId,
      body.role
    );
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// accept role invite
projectsRoute.post(
  "/roles/accept",
  zValidator("json", acceptProjectInviteSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const body = c.req.valid("json");
    const serviceData = await acceptProjectInvite(
      body.inviteId,
      body.acceptingUserId
    );
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// get all user roles
projectsRoute.get("/roles", async (c) => {
  const cookieUser = c.get("user") as AuthType;
  const serviceData = await getUserProjectInvites(cookieUser.id);
  return c.json(serviceData, routeStatus(serviceData));
});

//
projectsRoute.post(
  "/roles/new",
  zValidator("json", inviteUserToProjectSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const body = c.req.valid("json");
    const projectOrRes = await getProjectOrFail(c, body.projectId, [
      "owner",
      "admin",
    ]);
    if (projectOrRes instanceof Response) return projectOrRes;
    const project = projectOrRes;

    const serviceData = await inviteUserToProject(
      project.id,
      body.invitedByUserId,
      body.invitedToUserId,
      body.role
    );
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// get project subscribers
projectsRoute.get(
  "/:id/subscribers",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  async (c) => {
    const { id: projectId } = c.req.valid("param");
    const projectOrRes = await getProjectOrFail(c, projectId);
    if (projectOrRes instanceof Response) return projectOrRes;
    const project = projectOrRes;

    const { page, limit } = c.req.query();
    const pageNumber = page ? parseInt(page) : 1;
    const limitNumber = limit ? parseInt(limit) : 10;
    const serviceData = await getSubscribers(
      project.id,
      pageNumber,
      limitNumber
    );
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// create subscriber
projectsRoute.post(
  "/:id/subscribers",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  zValidator(
    "json",
    z.object({ email: z.string().email(), name: z.string().optional() }),
    (result, c) => {
      if (!result.success) {
        return validationErrorResponse(c, result.error);
      }
    }
  ),
  async (c) => {
    const { id: projectId } = c.req.valid("param");
    const { email, name } = c.req.valid("json");
    const projectOrRes = await getProjectOrFail(c, projectId);
    if (projectOrRes instanceof Response) return projectOrRes;
    const project = projectOrRes;

    const serviceData = await createSubscriber(project.id, email, name);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// import subscribers via CSV
projectsRoute.post(
  "/:id/subscribers/import",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  zValidator(
    "json",
    z.object({ csvContent: z.string().min(1, "CSV content is required") }),
    (result, c) => {
      if (!result.success) {
        return validationErrorResponse(c, result.error);
      }
    }
  ),
  async (c) => {
    const { id: projectId } = c.req.valid("param");
    const { csvContent } = c.req.valid("json");
    const projectOrRes = await getProjectOrFail(c, projectId, [
      "owner",
      "admin",
      "editor",
    ]);
    if (projectOrRes instanceof Response) return projectOrRes;
    const project = projectOrRes;

    const serviceData = await importSubscribersFromCsv(project.id, csvContent);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// delete subscriber
projectsRoute.delete(
  "/:id/subscribers/:subscriberId",
  zValidator(
    "param",
    z.object({ id: z.string().min(1), subscriberId: z.string().uuid() }),
    (result, c) => {
      if (!result.success) {
        return validationErrorResponse(c, result.error);
      }
    }
  ),
  async (c) => {
    const { id: projectId, subscriberId } = c.req.valid("param");
    const projectOrRes = await getProjectOrFail(c, projectId);
    if (projectOrRes instanceof Response) return projectOrRes;
    const project = projectOrRes;

    const serviceData = await deleteSubscriber(project.id, subscriberId);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// get project emails
projectsRoute.get(
  "/:id/emails",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  async (c) => {
    const { id: projectId } = c.req.valid("param");
    const projectOrRes = await getProjectOrFail(c, projectId);
    if (projectOrRes instanceof Response) return projectOrRes;
    const project = projectOrRes;

    const serviceData = await getEmails(project.id);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// get a single email
projectsRoute.get(
  "/:id/emails/:emailId",
  zValidator(
    "param",
    z.object({ id: z.string().min(1), emailId: z.string().uuid() }),
    (result, c) => {
      console.log("started");
      if (!result.success) {
        return validationErrorResponse(c, result.error);
      }
    }
  ),
  async (c) => {
    const { id: projectId, emailId } = c.req.valid("param");
    const projectOrRes = await getProjectOrFail(c, projectId);
    if (projectOrRes instanceof Response) return projectOrRes;
    const project = projectOrRes;

    const serviceData = await getEmail(project.id, emailId);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// create email
projectsRoute.post(
  "/:id/emails",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  zValidator(
    "json",
    z.object({
      subject: z.string().min(1),
      body: z.string().min(1),
      status: z.enum(["published", "draft"]).optional(),
      sentAt: z.coerce.date().optional(),
    }),
    (result, c) => {
      if (!result.success) {
        return validationErrorResponse(c, result.error);
      }
    }
  ),
  async (c) => {
    const { id: projectId } = c.req.valid("param");
    const { subject, body, status, sentAt } = c.req.valid("json");
    const projectOrRes = await getProjectOrFail(c, projectId);
    if (projectOrRes instanceof Response) return projectOrRes;
    const project = projectOrRes;

    const serviceData = await createEmail(
      project.id,
      subject,
      body,
      status,
      sentAt
    );
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// update email
projectsRoute.patch(
  "/:id/emails/:emailId",
  zValidator(
    "param",
    z.object({ id: z.string().min(1), emailId: z.string().uuid() }),
    (result, c) => {
      if (!result.success) {
        return validationErrorResponse(c, result.error);
      }
    }
  ),
  zValidator(
    "json",
    z.object({
      subject: z.string().min(1).optional(),
      body: z.string().min(1).optional(),
      status: z.enum(["published", "draft"]).optional(),
      sentAt: z.coerce.date().optional(),
    }),
    (result, c) => {
      if (!result.success) {
        return validationErrorResponse(c, result.error);
      }
    }
  ),
  async (c) => {
    const { id: projectId, emailId } = c.req.valid("param");
    const { subject, body, status, sentAt } = c.req.valid("json");
    const projectOrRes = await getProjectOrFail(c, projectId);
    if (projectOrRes instanceof Response) return projectOrRes;
    const project = projectOrRes;

    const serviceData = await updateEmail(
      project.id,
      emailId,
      subject,
      body,
      status,
      sentAt
    );
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// delete email
projectsRoute.delete(
  "/:id/emails/:emailId",
  zValidator(
    "param",
    z.object({ id: z.string().min(1), emailId: z.string().uuid() }),
    (result, c) => {
      if (!result.success) {
        return validationErrorResponse(c, result.error);
      }
    }
  ),
  async (c) => {
    const { id: projectId, emailId } = c.req.valid("param");
    const projectOrRes = await getProjectOrFail(c, projectId);
    if (projectOrRes instanceof Response) return projectOrRes;
    const project = projectOrRes;

    const serviceData = await deleteEmail(project.id, emailId);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

export default projectsRoute;
