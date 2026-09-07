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
  removeTeamMember,
  getTeamPlan,
} from "@/services/teams";
import {
  getTeamSubscription,
  createTeamCheckoutSession,
  cancelTeamSubscription,
} from "@/services/team-billing";
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
  teamCheckoutSchema,
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

// remove a member — owner/admin only, can't remove the owner (transfer first)
teamsRoute.delete(
  "/:id/members/:userId",
  zValidator(
    "param",
    z.object({ id: z.string().min(1), userId: z.string().uuid() }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    }
  ),
  async (c) => {
    const { id, userId } = c.req.valid("param");
    const teamOrRes = await getTeamOrFail(c, id, ["owner", "admin"]);
    if (teamOrRes instanceof Response) return teamOrRes;

    const serviceData = await removeTeamMember(teamOrRes.id, userId);
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

// current live subscription for a team (backs Settings > Billing) — any
// member can see the team's plan, same visibility as the team itself.
// Includes the *resolved* effective plan alongside the raw Paddle
// subscription row, since a team with no live subscription yet still has
// an effective plan (the Phase-1 fallback via getTeamPlan) — the dashboard
// shouldn't have to know about that fallback itself.
teamsRoute.get(
  "/:id/subscription",
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

    const [serviceData, plan] = await Promise.all([
      getTeamSubscription(teamOrRes.id),
      getTeamPlan(teamOrRes.id),
    ]);
    return c.json(
      { ...serviceData, data: { subscription: serviceData.data, plan } },
      routeStatus(serviceData)
    );
  }
);

// start a real per-seat Paddle checkout for this team — owner/admin only,
// same gate as billing anywhere else in the app.
teamsRoute.post(
  "/:id/checkout",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  zValidator("json", teamCheckoutSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { planSlug, successUrl } = c.req.valid("json");
    const cookieUser = c.get("user") as AuthType;

    const teamOrRes = await getTeamOrFail(c, id, ["owner", "admin"]);
    if (teamOrRes instanceof Response) return teamOrRes;

    const serviceData = await createTeamCheckoutSession({
      teamId: teamOrRes.id,
      planSlug,
      successUrl,
      initiatedByUserId: cookieUser.id,
    });
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// cancel this team's real Paddle subscription — scheduled for end of the
// current billing period, owner/admin only.
teamsRoute.post(
  "/:id/cancel-subscription",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const teamOrRes = await getTeamOrFail(c, id, ["owner", "admin"]);
    if (teamOrRes instanceof Response) return teamOrRes;

    const serviceData = await cancelTeamSubscription(teamOrRes.id);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

export default teamsRoute;
