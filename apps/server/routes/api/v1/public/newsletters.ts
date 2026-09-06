import { getPublicNewsletterBySlug } from "@/services/newsletters";
import { getPublicEmails, getPublicEmail } from "@/services/emails";
import { createNewsletterSubscriber } from "@/services/subscriptions";
import { routeStatus } from "@/lib/utils";
import { validationErrorResponse } from "@/utils/validation-error-response";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createNewsletterSubscriberSchema } from "@workspace/validations";
import { rateLimiter } from "@/middlewares/rate-limiter";

// Unauthenticated newsletter data for the public newsletter page (apps/web's
// /u/:username/:slug and, for Pro+ owners, /:slug) — mounted before the
// `v1.use("*", withAuth)` gate in index.ts, same as /auth and /unsubscribe.
const publicNewslettersRoute = new Hono();

const slugParam = z.object({ slug: z.string().min(1) });

const loadPublicNewsletter = async (slug: string) => getPublicNewsletterBySlug(slug);

publicNewslettersRoute.get(
  "/:slug",
  zValidator("param", slugParam, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const { slug } = c.req.valid("param");
    const serviceData = await loadPublicNewsletter(slug);
    return c.json(serviceData, serviceData.success ? 200 : 404);
  }
);

publicNewslettersRoute.get(
  "/:slug/posts",
  zValidator("param", slugParam, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const { slug } = c.req.valid("param");
    const newsletterRes = await loadPublicNewsletter(slug);
    if (!newsletterRes.success || !newsletterRes.data) {
      return c.json(newsletterRes, 404);
    }

    const { page, limit } = c.req.query();
    const serviceData = await getPublicEmails(
      newsletterRes.data.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10
    );
    return c.json(serviceData, routeStatus(serviceData));
  }
);

publicNewslettersRoute.get(
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
    const newsletterRes = await loadPublicNewsletter(slug);
    if (!newsletterRes.success || !newsletterRes.data) {
      return c.json(newsletterRes, 404);
    }

    const serviceData = await getPublicEmail(newsletterRes.data.id, postId);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

publicNewslettersRoute.post(
  "/:slug/subscribe",
  // Tighter than the route-level limit above (60/min) — this one writes,
  // and is the one worth throttling harder against spam-subscribing.
  rateLimiter(60 * 60 * 1000, 10),
  zValidator("param", slugParam, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  zValidator(
    "json",
    createNewsletterSubscriberSchema.omit({ newsletterId: true }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    }
  ),
  async (c) => {
    const { slug } = c.req.valid("param");
    const newsletterRes = await loadPublicNewsletter(slug);
    if (!newsletterRes.success || !newsletterRes.data) {
      return c.json(newsletterRes, 404);
    }

    const { email, name } = c.req.valid("json");
    const serviceData = await createNewsletterSubscriber({
      newsletterId: newsletterRes.data.id,
      email,
      name,
    });
    return c.json(serviceData, routeStatus(serviceData));
  }
);

export default publicNewslettersRoute;
