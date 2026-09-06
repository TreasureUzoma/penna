import { routeStatus } from "@/lib/utils";
import {
  createNewsletterPostDraft,
  getAllNewsletterPosts,
  updateNewsletterPost,
} from "@/services/posts";
import { getNewsletterOrFail } from "@/utils/newsletter-access";
import { validationErrorResponse } from "@/utils/validation-error-response";
import { zValidator } from "@hono/zod-validator";
import { insertPostSchema, isValidUUID } from "@workspace/validations";
import { Hono } from "hono";

const postRoutes = new Hono();

// create post as draft
postRoutes.post(
  "/",
  zValidator("json", insertPostSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const body = c.req.valid("json");

    const newsletter = await getNewsletterOrFail(c, body.newsletterId, [
      "admin",
      "owner",
    ]);
    if (!newsletter) return;

    const serviceData = await createNewsletterPostDraft(body);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// update posts status, if status published, it sends
postRoutes.patch(
  "/:id",
  zValidator("param", isValidUUID, (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  zValidator("json", insertPostSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const body = c.req.valid("json");
    const { id: postId } = c.req.valid("param");

    const newsletter = await getNewsletterOrFail(c, body.newsletterId, [
      "admin",
      "owner",
      "editor",
    ]);
    if (!newsletter) return;

    const serviceData = await updateNewsletterPost(postId, body);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

// get all posts in  a projct
postRoutes.get(
  "/id",
  zValidator("param", isValidUUID, (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  async (c) => {
    const { id: newsletterId } = c.req.valid("param");

    await getNewsletterOrFail(c, newsletterId, [
      "admin",
      "owner",
      "viewer",
      "editor",
    ]);

    const serviceData = await getAllNewsletterPosts(newsletterId);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

export default postRoutes;
