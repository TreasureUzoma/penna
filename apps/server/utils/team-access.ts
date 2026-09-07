import type { Context } from "hono";
import type { AuthType } from "@/types";
import { getValidTeam, getUserTeamRole, getTeamBySlug } from "@/services/teams";
import type { TeamRoles } from "@workspace/types";

/**
 * Team's equivalent of getNewsletterOrFail (apps/server/utils/newsletter-
 * access.ts) — same shape (accepts a UUID or slug, returns the row or a
 * Hono Response on failure), same allowedRoles gating. Newsletter routes
 * that used to check newsletterMembers now resolve the newsletter's team
 * and check membership here instead (see getUserNewsletterRole in
 * services/newsletters.ts).
 */
export const getTeamOrFail = async (
  c: Context,
  teamIdOrSlug: string,
  allowedRoles?: TeamRoles[]
) => {
  const cookieUser = c.get("user") as AuthType;

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      teamIdOrSlug
    );

  const teamRes = isUuid
    ? await getValidTeam(teamIdOrSlug)
    : await getTeamBySlug(teamIdOrSlug);

  if (!teamRes.success || !teamRes.data) {
    return c.json({ success: false, message: "Team not found", data: null }, 404);
  }

  const team = teamRes.data;

  if (allowedRoles && allowedRoles.length > 0) {
    const userRoleRes = await getUserTeamRole(team.id, cookieUser.id);
    const role = userRoleRes.data?.role;
    if (!role || !allowedRoles.includes(role)) {
      return c.json(
        { success: false, message: "You don't have enough permissions", data: null },
        403
      );
    }
  }

  return team;
};
