import { routeStatus } from "@/lib/utils";
import {
  createNewsletterSubscriber,
  getNewsletterSubscribers,
  getRecentSubscribers,
  removeNewsletterSubscriber,
} from "@/services/subscriptions";
import { getNewsletterOrFail } from "@/utils/newsletter-access";
import { validationErrorResponse } from "@/utils/validation-error-response";
import { zValidator } from "@hono/zod-validator";
import {
  createNewsletterSubscriberSchema,
  isValidUUID,
} from "@workspace/validations";
import { Hono } from "hono";

const subscriptionRoutes = new Hono();

// get all subscribers from a newsletter
subscriptionRoutes.get(
  "/:id",
  zValidator("param", isValidUUID, (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  async (c) => {
    const { id: newsletterId } = c.req.valid("param");

    const { page, limit } = c.req.query();
    const pageNumber = page ? parseInt(page) : undefined;
    const limitNumber = limit ? parseInt(limit) : undefined;

    const newsletter = await getNewsletterOrFail(c, newsletterId, [
      "owner",
      "admin",
      "editor",
      "viewer",
    ]);
    if (!newsletter) return;

    const subscribers = await getNewsletterSubscribers(
      newsletterId,
      pageNumber,
      limitNumber
    );

    return c.json(
      {
        data: subscribers,
        success: true,
        message: "Fetched newsletter subscribers successfully",
      },
      200
    );
  }
);

subscriptionRoutes.get(
  "/:id/recent",
  zValidator("param", isValidUUID, (result, c) => {
    if (!result.success) {
      return validationErrorResponse(c, result.error);
    }
  }),
  async (c) => {
    const { id: newsletterId } = c.req.valid("param");


    const newsletter = await getNewsletterOrFail(c, newsletterId, [
      "owner",
      "admin",
      "editor",
      "viewer",
    ]);
    if (!newsletter) return;

    const subscribers = await getRecentSubscribers(newsletterId);

    return c.json(
      {
        data: subscribers,
        success: true,
        message: "Fetched newsletter subscribers successfully",
      },
      200
    );
  }
);

// create subscriber (internal)
subscriptionRoutes.post(
  "/",
  zValidator("json", createNewsletterSubscriberSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const body = c.req.valid("json");
    const newsletter = await getNewsletterOrFail(c, body.newsletterId, [
      "owner",
      "admin",
    ]);
    if (!newsletter) return;
    const serviceData = await createNewsletterSubscriber(body);
    return c.json(serviceData, routeStatus(serviceData));
  }
);

subscriptionRoutes.post(
  "/delete",
  zValidator("json", createNewsletterSubscriberSchema, (result, c) => {
    if (!result.success) return validationErrorResponse(c, result.error);
  }),
  async (c) => {
    const body = c.req.valid("json");
    const newsletter = await getNewsletterOrFail(c, body.newsletterId, [
      "owner",
      "admin",
    ]);
    if (!newsletter) return;
    const serviceData = await removeNewsletterSubscriber(
      body.newsletterId,
      body.email
    );

    if (serviceData.success == false) {
      return c.json(serviceData, 400);
    }
    return c.json(serviceData, 200);
  }
);

export default subscriptionRoutes;
