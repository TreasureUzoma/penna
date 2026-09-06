import {
  listUserDomains,
  addDomain,
  refreshDomainVerification,
  removeDomain,
  assignDomainToNewsletter,
} from "@/services/domains";
import { routeStatus } from "@/lib/utils";
import { validationErrorResponse } from "@/utils/validation-error-response";
import type { AppBindings, AuthType } from "@/types";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { addDomainSchema, assignDomainSchema } from "@workspace/validations";

const domainsRoute = new Hono<AppBindings>();

// All domains visible to the user — ones attached to a newsletter they
// belong to, plus ones they've verified but not assigned to a newsletter yet.
// The dashboard's per-newsletter Domains tab calls this with `?newsletterId=` to
// narrow it to just that newsletter; the account-wide Domains page calls it
// with no filter.
domainsRoute.get(
  "/",
  zValidator(
    "query",
    z.object({ newsletterId: z.string().uuid().optional() }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    }
  ),
  async (c) => {
    const cookieUser = c.get("user") as AuthType;
    const { newsletterId } = c.req.valid("query");
    const serviceData = await listUserDomains(cookieUser.id, newsletterId);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// Add a domain — with `newsletterId`, it's added straight into that newsletter
// (caller must manage it); without one, it's verified under the caller's
// own account and assigned to a newsletter later via /:domainId/assign.
domainsRoute.post(
  "/",
  zValidator("json", addDomainSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const cookieUser = c.get("user") as AuthType;
    const { name, newsletterId } = c.req.valid("json");
    const serviceData = await addDomain(cookieUser.id, name, newsletterId);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// Re-check a domain's DNS/verification status against SES.
domainsRoute.post(
  "/:domainId/verify",
  zValidator(
    "param",
    z.object({ domainId: z.string().uuid() }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    }
  ),
  async (c) => {
    const cookieUser = c.get("user") as AuthType;
    const { domainId } = c.req.valid("param");
    const serviceData = await refreshDomainVerification(
      cookieUser.id,
      domainId
    );
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// Attach an already-verified, unassigned domain to a newsletter.
domainsRoute.post(
  "/:domainId/assign",
  zValidator(
    "param",
    z.object({ domainId: z.string().uuid() }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    }
  ),
  zValidator("json", assignDomainSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const cookieUser = c.get("user") as AuthType;
    const { domainId } = c.req.valid("param");
    const { newsletterId } = c.req.valid("json");
    const serviceData = await assignDomainToNewsletter(
      cookieUser.id,
      domainId,
      newsletterId
    );
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// Remove a domain (unassigned or attached to a newsletter).
domainsRoute.delete(
  "/:domainId",
  zValidator(
    "param",
    z.object({ domainId: z.string().uuid() }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    }
  ),
  async (c) => {
    const cookieUser = c.get("user") as AuthType;
    const { domainId } = c.req.valid("param");
    const serviceData = await removeDomain(cookieUser.id, domainId);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

export default domainsRoute;
