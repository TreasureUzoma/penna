import {
  acceptNewsletterInvite,
  createNewsletter,
  deleteNewsletter,
  getNewsletterApiKeys,
  getNewslettersByUser,
  getNewsletterBySlug,
  getUserNewsletterInvites,
  inviteUserToNewsletter,
  updateNewsletter,
  updateNewsletterMemberRole,
  getNewsletterMembers,
  generateAndCreateNewsletterApiKey,
  deleteNewsletterApiKey,
  transferNewsletterOwnership,
  canRemoveBranding,
  canUseCustomDomain,
} from "@/services/newsletters";
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
import { getNewsletterAnalytics } from "@/services/analytics";
import { z } from "zod";
import type { AppBindings, AuthType } from "@/types";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  acceptNewsletterInviteSchema,
  createNewsletterSchema,
  inviteUserToNewsletterSchema,
  isValidUUID,
  updateNewsletterMemberRoleSchema,
  updateNewsletterSchema,
} from "@workspace/validations";
import { routeStatus } from "@/lib/utils";
import { validationErrorResponse } from "@/utils/validation-error-response";
import { getNewsletterOrFail } from "@/utils/newsletter-access";

const newslettersRoute = new Hono<AppBindings>();

// delete a newsletter
newslettersRoute.delete(
  "/:id",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  async (c) => {
    const { id: newsletterId } = c.req.valid("param");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId, [
      "owner",
      "admin",
    ]);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const deleteService = await deleteNewsletter(newsletter.id);
    return c.json(deleteService, routeStatus(deleteService));
  }
);

// get a newsletter api key
newslettersRoute.get(
  "/api/:id",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const { id: newsletterId } = c.req.valid("param");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId, [
      "owner",
      "admin",
    ]);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const serviceData = await getNewsletterApiKeys(newsletter.id);

    return c.json(serviceData, routeStatus(serviceData));
  }
);

// create a newsletter api key
newslettersRoute.post(
  "/api/:id",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const { id: newsletterId } = c.req.valid("param");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId, [
      "owner",
      "admin",
    ]);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const serviceData = await generateAndCreateNewsletterApiKey(newsletter.id);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// delete a newsletter api key
newslettersRoute.delete(
  "/api/:id/:keyId",
  zValidator(
    "param",
    z.object({ id: z.string().min(1), keyId: z.string().uuid() }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    }
  ),
  async (c) => {
    const { id: newsletterId, keyId } = c.req.valid("param");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId, [
      "owner",
      "admin",
    ]);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const serviceData = await deleteNewsletterApiKey(newsletter.id, keyId);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// create a newsletter
newslettersRoute.post(
  "/new",
  zValidator("json", createNewsletterSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const cookieUser = c.get("user") as AuthType;
    const body = c.req.valid("json");
    const serviceData = await createNewsletter(body, cookieUser.id);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// update a newsletter
newslettersRoute.patch(
  "/:id",
  zValidator("json", updateNewsletterSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  async (c) => {
    const { id: newsletterId } = c.req.valid("param");
    const body = c.req.valid("json");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId, [
      "owner",
      "admin",
    ]);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;
    const serviceData = await updateNewsletter(newsletter.id, body);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// get a newsletter by slug
newslettersRoute.get(
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
    const serviceData = await getNewsletterBySlug(slug);

    if (!serviceData.success || !serviceData.data) {
      return c.json(serviceData, 404);
    }

    // Computed server-side (mirrors the check `updateNewsletter` re-runs on
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
        newsletter: {
          ...serviceData.data,
          canRemoveBranding: removableBranding,
          canUseCustomDomain: customDomainAllowed,
        },
      },
      200
    );
  }
);

// get a newsletter
newslettersRoute.get(
  "/:id",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  async (c) => {
    const { id: newsletterId } = c.req.valid("param");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;
    return c.json({ newsletter }, 200);
  }
);

// get newsletter analytics
newslettersRoute.get(
  "/:id/analytics",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  async (c) => {
    const { id: newsletterId } = c.req.valid("param");
    const { days } = c.req.query();
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const daysNum = days ? parseInt(days) : 30;

    const serviceData = await getNewsletterAnalytics(newsletter.id, daysNum);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// get newsletter members
newslettersRoute.get(
  "/:id/members",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  async (c) => {
    const { id: newsletterId } = c.req.valid("param");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const serviceData = await getNewsletterMembers(newsletter.id);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// Custom sending domains live under the flat /domains route (see
// routes/api/v1/domains.ts) rather than nested here — a domain can be
// verified before it's assigned to any newsletter, so it can't always be
// reached via a /:id newsletter param. The dashboard's per-newsletter Domains
// tab calls that route with a `newsletterId` filter/body field instead.

// transfer newsletter ownership to another existing member
newslettersRoute.post(
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
    const { id: newsletterId } = c.req.valid("param");
    const { newOwnerUserId } = c.req.valid("json");
    const cookieUser = c.get("user") as AuthType;

    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId, ["owner"]);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const serviceData = await transferNewsletterOwnership(
      newsletter.id,
      cookieUser.id,
      newOwnerUserId
    );
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// get all newsletters
newslettersRoute.get("/", async (c) => {
  const { page, limit } = c.req.query();
  const cookieUser = c.get("user") as AuthType;

  const pageNumber = page ? parseInt(page) : undefined;
  const limitNumber = limit ? parseInt(limit) : undefined;

  const newsletter = await getNewslettersByUser(
    cookieUser.id,
    pageNumber,
    limitNumber
  );

  return c.json(
    {
      data: newsletter,
      success: true,
      message: "Fetched all newsletters successfully",
    },
    200
  );
});

// newsletter roles

// update newsletter roles
newslettersRoute.patch(
  "/roles/:id",
  zValidator("json", updateNewsletterMemberRoleSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const body = c.req.valid("json");
    const newsletterOrRes = await getNewsletterOrFail(c, body.newsletterId, [
      "owner",
      "admin",
    ]);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const serviceData = await updateNewsletterMemberRole(
      newsletter.id,
      body.targetUserId,
      body.role
    );
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// accept role invite
newslettersRoute.post(
  "/roles/accept",
  zValidator("json", acceptNewsletterInviteSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const body = c.req.valid("json");
    const serviceData = await acceptNewsletterInvite(
      body.inviteId,
      body.acceptingUserId
    );
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// get all user roles
newslettersRoute.get("/roles", async (c) => {
  const cookieUser = c.get("user") as AuthType;
  const serviceData = await getUserNewsletterInvites(cookieUser.id);
  return c.json(serviceData, routeStatus(serviceData));
});

//
newslettersRoute.post(
  "/roles/new",
  zValidator("json", inviteUserToNewsletterSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const body = c.req.valid("json");
    const newsletterOrRes = await getNewsletterOrFail(c, body.newsletterId, [
      "owner",
      "admin",
    ]);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const serviceData = await inviteUserToNewsletter(
      newsletter.id,
      body.invitedByUserId,
      body.invitedToUserId,
      body.role
    );
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// get newsletter subscribers
newslettersRoute.get(
  "/:id/subscribers",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  async (c) => {
    const { id: newsletterId } = c.req.valid("param");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const { page, limit } = c.req.query();
    const pageNumber = page ? parseInt(page) : 1;
    const limitNumber = limit ? parseInt(limit) : 10;
    const serviceData = await getSubscribers(
      newsletter.id,
      pageNumber,
      limitNumber
    );
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// create subscriber
newslettersRoute.post(
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
    const { id: newsletterId } = c.req.valid("param");
    const { email, name } = c.req.valid("json");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const serviceData = await createSubscriber(newsletter.id, email, name);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// import subscribers via CSV
newslettersRoute.post(
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
    const { id: newsletterId } = c.req.valid("param");
    const { csvContent } = c.req.valid("json");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId, [
      "owner",
      "admin",
      "editor",
    ]);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const serviceData = await importSubscribersFromCsv(newsletter.id, csvContent);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// delete subscriber
newslettersRoute.delete(
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
    const { id: newsletterId, subscriberId } = c.req.valid("param");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const serviceData = await deleteSubscriber(newsletter.id, subscriberId);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// get newsletter emails
newslettersRoute.get(
  "/:id/emails",
  zValidator("param", z.object({ id: z.string().min(1) }), (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  async (c) => {
    const { id: newsletterId } = c.req.valid("param");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const serviceData = await getEmails(newsletter.id);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// get a single email
newslettersRoute.get(
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
    const { id: newsletterId, emailId } = c.req.valid("param");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const serviceData = await getEmail(newsletter.id, emailId);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// create email
newslettersRoute.post(
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
    const { id: newsletterId } = c.req.valid("param");
    const { subject, body, status, sentAt } = c.req.valid("json");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const serviceData = await createEmail(
      newsletter.id,
      subject,
      body,
      status,
      sentAt
    );
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// update email
newslettersRoute.patch(
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
    const { id: newsletterId, emailId } = c.req.valid("param");
    const { subject, body, status, sentAt } = c.req.valid("json");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const serviceData = await updateEmail(
      newsletter.id,
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
newslettersRoute.delete(
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
    const { id: newsletterId, emailId } = c.req.valid("param");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const serviceData = await deleteEmail(newsletter.id, emailId);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

export default newslettersRoute;
