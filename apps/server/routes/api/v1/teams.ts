import {
  createTeam,
  getUserTeams,
  updateTeam,
  deleteTeam,
  getTeamMembers,
  updateTeamMemberRole,
  transferTeamOwnership,
  inviteToTeam,
  getUserTeamInvites,
  acceptTeamInvite,
  revokeTeamInvite,
} from "@/services/teams";
import { getTeamOrFail } from "@/utils/team-access";
import { routeStatus } from "@/lib/utils";
import { validationErrorResponse } from "@/utils/validation-error-response";
import type { AppBindings, AuthType } from "@/types";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  createTeamSchema,
  updateTeamSchema,
  updateTeamMemberRoleSchema,
  transferTeamOwnershipSchema,
  inviteToTeamSchema,
  acceptTeamInviteSchema,
} from "@workspace/validations";

const teamsRoute = new Hono<AppBindings>();

// create a team — creator becomes owner
teamsRoute.post(
  "/",
  zValidator("json", createTeamSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const cookieUser = c.get("user") as AuthType;
    const body = c.req.valid("json");
    const serviceData = await createTeam(body, cookieUser.id);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// list my teams
teamsRoute.get("/", async (c) => {
  const cookieUser = c.get("user") as AuthType;
  const { page, limit } = c.req.query();
  const data = await getUserTeams(
    cookieUser.id,
    page ? parseInt(page) : undefined,
    limit ? parseInt(limit) : undefined
  );
  return c.json({ data, success: true, message: "Fetched teams successfully" }, 200);
});

// my pending invites (across every team) — registered before "/:id" so
// this literal segment doesn't get swallowed by the param route.
teamsRoute.get("/invites", async (c) => {
  const cookieUser = c.get("user") as AuthType;
  const serviceData = await getUserTeamInvites(cookieUser.email);
  return c.json(serviceData, routeStatus(serviceData));
});

// accept an invite by its emailed token
teamsRoute.post(
  "/invites/accept",
  zValidator("json", acceptTeamInviteSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const cookieUser = c.get("user") as AuthType;
    const { token } = c.req.valid("json");
    const serviceData = await acceptTeamInvite(token, cookieUser.id, cookieUser.email);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// get one team
teamsRoute.get(
  "/:id",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const teamOrRes = await getTeamOrFail(c, id, [
      "owner",
      "admin",
      "editor",
      "viewer",
    ]);
    if (teamOrRes instanceof Response) return teamOrRes;
    return c.json({ team: teamOrRes }, 200);
  }
);

// update a team
teamsRoute.patch(
  "/:id",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  zValidator("json", updateTeamSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const teamOrRes = await getTeamOrFail(c, id, ["owner", "admin"]);
    if (teamOrRes instanceof Response) return teamOrRes;

    const serviceData = await updateTeam(teamOrRes.id, body);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// delete a team — the most destructive action in the app (cascades to
// every newsletter it owns), owner-only.
teamsRoute.delete(
  "/:id",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const teamOrRes = await getTeamOrFail(c, id, ["owner"]);
    if (teamOrRes instanceof Response) return teamOrRes;

    const serviceData = await deleteTeam(teamOrRes.id);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// list team members — any member can see the roster
teamsRoute.get(
  "/:id/members",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const teamOrRes = await getTeamOrFail(c, id, [
      "owner",
      "admin",
      "editor",
      "viewer",
    ]);
    if (teamOrRes instanceof Response) return teamOrRes;

    const serviceData = await getTeamMembers(teamOrRes.id);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// update a member's role
teamsRoute.patch(
  "/:id/members/:userId",
  zValidator(
    "param",
    z.object({ id: z.string().min(1), userId: z.string().uuid() }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    }
  ),
  zValidator("json", updateTeamMemberRoleSchema.pick({ role: true }), (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const { id, userId } = c.req.valid("param");
    const { role } = c.req.valid("json");
    const teamOrRes = await getTeamOrFail(c, id, ["owner", "admin"]);
    if (teamOrRes instanceof Response) return teamOrRes;

    const serviceData = await updateTeamMemberRole(teamOrRes.id, userId, role);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// transfer ownership to another existing member
teamsRoute.post(
  "/:id/transfer-ownership",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  zValidator("json", transferTeamOwnershipSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { newOwnerUserId } = c.req.valid("json");
    const cookieUser = c.get("user") as AuthType;

    const teamOrRes = await getTeamOrFail(c, id, ["owner"]);
    if (teamOrRes instanceof Response) return teamOrRes;

    const serviceData = await transferTeamOwnership(
      teamOrRes.id,
      cookieUser.id,
      newOwnerUserId
    );
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// invite someone by email
teamsRoute.post(
  "/:id/invites",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  zValidator("json", inviteToTeamSchema.pick({ email: true, role: true }), (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { email, role } = c.req.valid("json");
    const cookieUser = c.get("user") as AuthType;

    const teamOrRes = await getTeamOrFail(c, id, ["owner", "admin"]);
    if (teamOrRes instanceof Response) return teamOrRes;

    const serviceData = await inviteToTeam(teamOrRes.id, cookieUser.id, email, role);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// revoke a pending invite
teamsRoute.delete(
  "/:id/invites/:inviteId",
  zValidator(
    "param",
    z.object({ id: z.string().min(1), inviteId: z.string().uuid() }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    }
  ),
  async (c) => {
    const { id, inviteId } = c.req.valid("param");
    const teamOrRes = await getTeamOrFail(c, id, ["owner", "admin"]);
    if (teamOrRes instanceof Response) return teamOrRes;

    const serviceData = await revokeTeamInvite(inviteId);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

export default teamsRoute;
