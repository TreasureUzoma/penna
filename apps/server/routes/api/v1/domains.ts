import {
  listUserDomains,
  addDomain,
  refreshDomainVerification,
  removeDomain,
  assignDomainToProject,
} from "@/services/domains";
import { routeStatus } from "@/lib/utils";
import { validationErrorResponse } from "@/utils/validation-error-response";
import type { AppBindings, AuthType } from "@/types";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { addDomainSchema, assignDomainSchema } from "@workspace/validations";

const domainsRoute = new Hono<AppBindings>();

// All domains visible to the user — ones attached to a project they
// belong to, plus ones they've verified but not assigned to a project yet.
// The dashboard's per-project Domains tab calls this with `?projectId=` to
// narrow it to just that project; the account-wide Domains page calls it
// with no filter.
domainsRoute.get(
  "/",
  zValidator(
    "query",
    z.object({ projectId: z.string().uuid().optional() }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    }
  ),
  async (c) => {
    const cookieUser = c.get("user") as AuthType;
    const { projectId } = c.req.valid("query");
    const serviceData = await listUserDomains(cookieUser.id, projectId);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// Add a domain — with `projectId`, it's added straight into that project
// (caller must manage it); without one, it's verified under the caller's
// own account and assigned to a project later via /:domainId/assign.
domainsRoute.post(
  "/",
  zValidator("json", addDomainSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const cookieUser = c.get("user") as AuthType;
    const { name, projectId } = c.req.valid("json");
    const serviceData = await addDomain(cookieUser.id, name, projectId);
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

// Attach an already-verified, unassigned domain to a project.
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
    const { projectId } = c.req.valid("json");
    const serviceData = await assignDomainToProject(
      cookieUser.id,
      domainId,
      projectId
    );
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// Remove a domain (unassigned or attached to a project).
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
