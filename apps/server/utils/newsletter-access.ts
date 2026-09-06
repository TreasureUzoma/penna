import type { Context } from "hono";
import type { AuthType } from "@/types";
import {
  getValidNewsletter,
  getUserNewsletterRole,
  getNewsletterBySlug,
} from "@/services/newsletters";
import type { NewsletterRoles } from "@workspace/types";

export const getNewsletterOrFail = async (
  c: Context,
  newsletterIdOrSlug: string,
  allowedRoles?: NewsletterRoles[]
) => {
  const cookieUser = c.get("user") as AuthType;

  // check if newsletter exists
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      newsletterIdOrSlug
    );

  let newsletterRes;
  if (isUuid) {
    newsletterRes = await getValidNewsletter(newsletterIdOrSlug);
  } else {
    newsletterRes = await getNewsletterBySlug(newsletterIdOrSlug);
  }

  if (!newsletterRes.success || !newsletterRes.data) {
    return c.json(
      { success: false, message: "Newsletter not found", data: null },
      404
    );
  }

  const newsletter = newsletterRes.data;

  // if roles are specified, check permissions
  if (allowedRoles && allowedRoles.length > 0) {
    const userRoleRes = await getUserNewsletterRole(
      newsletter.id,
      cookieUser.id
    );
    const role = userRoleRes.data?.role;
    if (!role || !allowedRoles.includes(role)) {
      return c.json(
        {
          success: false,
          message: "You don't have enough permissions",
          data: null,
        },
        403
      );
    }
  }

  // if everything passes, return the newsletter
  return newsletter;
};
