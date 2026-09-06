import { getPublicProjectBySlug } from "@/services/projects";
import { getPublicEmails, getPublicEmail } from "@/services/emails";
import { createProjectSubscriber } from "@/services/subscriptions";
import { routeStatus } from "@/lib/utils";
import { validationErrorResponse } from "@/utils/validation-error-response";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createProjectSubscriberSchema } from "@workspace/validations";
import { rateLimiter } from "@/middlewares/rate-limiter";

// Unauthenticated project data for the public project page (apps/web's
// /u/:username/:slug and, for Pro+ owners, /:slug) — mounted before the
// `v1.use("*", withAuth)` gate in index.ts, same as /auth and /unsubscribe.
const publicProjectsRoute = new Hono();

const slugParam = z.object({ slug: z.string().min(1) });

const loadPublicProject = async (slug: string) => getPublicProjectBySlug(slug);

publicProjectsRoute.get(
  "/:slug",
  zValidator("param", slugParam, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const { slug } = c.req.valid("param");
    const serviceData = await loadPublicProject(slug);
    return c.json(serviceData, serviceData.success ? 200 : 404);
  }
);

publicProjectsRoute.get(
  "/:slug/posts",
  zValidator("param", slugParam, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const { slug } = c.req.valid("param");
    const projectRes = await loadPublicProject(slug);
    if (!projectRes.success || !projectRes.data) {
      return c.json(projectRes, 404);
    }

    const { page, limit } = c.req.query();
    const serviceData = await getPublicEmails(
      projectRes.data.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10
    );
    return c.json(serviceData, routeStatus(serviceData));
  }
);

publicProjectsRoute.get(
  "/:slug/posts/:postId",
  zValidator(
    "param",
    slugParam.extend({ postId: z.string().uuid() }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    }
  ),
  async (c) => {
    const { slug, postId } = c.req.valid("param");
    const projectRes = await loadPublicProject(slug);
    if (!projectRes.success || !projectRes.data) {
      return c.json(projectRes, 404);
    }

    const serviceData = await getPublicEmail(projectRes.data.id, postId);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

publicProjectsRoute.post(
  "/:slug/subscribe",
  // Tighter than the route-level limit above (60/min) — this one writes,
  // and is the one worth throttling harder against spam-subscribing.
  rateLimiter(60 * 60 * 1000, 10),
  zValidator("param", slugParam, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  zValidator(
    "json",
    createProjectSubscriberSchema.omit({ projectId: true }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    }
  ),
  async (c) => {
    const { slug } = c.req.valid("param");
    const projectRes = await loadPublicProject(slug);
    if (!projectRes.success || !projectRes.data) {
      return c.json(projectRes, 404);
    }

    const { email, name } = c.req.valid("json");
    const serviceData = await createProjectSubscriber({
      projectId: projectRes.data.id,
      email,
      name,
    });
    return c.json(serviceData, routeStatus(serviceData));
  }
);

export default publicProjectsRoute;
