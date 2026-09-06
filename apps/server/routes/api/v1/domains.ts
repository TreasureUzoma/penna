import { listUserDomains } from "@/services/domains";
import { routeStatus } from "@/lib/utils";
import type { AppBindings, AuthType } from "@/types";
import { Hono } from "hono";

const domainsRoute = new Hono<AppBindings>();

// All domains across every project the user belongs to — backs the
// account-wide Domains page in the root sidebar. Per-project add/verify/
// remove still live under /projects/:id/domains (see routes/api/v1/projects.ts);
// this route is read-only and just fans out across projects.
domainsRoute.get("/", async (c) => {
  const cookieUser = c.get("user") as AuthType;
  const serviceData = await listUserDomains(cookieUser.id);
  return c.json(serviceData, routeStatus(serviceData));
});

export default domainsRoute;
