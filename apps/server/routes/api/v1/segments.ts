import { routeStatus } from "@/lib/utils";
import { getNewsletterOrFail } from "@/utils/newsletter-access";
import { validationErrorResponse } from "@/utils/validation-error-response";
import {
  createSegment,
  getSegments,
  getSegment,
  updateSegment,
  deleteSegment,
  getSegmentSubscribers,
  addSubscriberToSegment,
  removeSubscriberFromSegment,
} from "@/services/segments";
import type { AppBindings } from "@/types";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const segmentRoutes = new Hono<AppBindings>();

// Get all segments for a newsletter
segmentRoutes.get(
  "/:newsletterId",
  zValidator(
    "param",
    z.object({ newsletterId: z.string().min(1) }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    },
  ),
  async (c) => {
    const { newsletterId } = c.req.valid("param");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const serviceData = await getSegments(newsletter.id);
    return c.json(serviceData, routeStatus(serviceData));
  },
);

// Create a new segment
segmentRoutes.post(
  "/:newsletterId",
  zValidator(
    "param",
    z.object({ newsletterId: z.string().min(1) }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    },
  ),
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Name is required"),
      description: z.string().optional(),
      criteria: z.record(z.unknown()).optional(),
    }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    },
  ),
  async (c) => {
    const { newsletterId } = c.req.valid("param");
    const { name, description, criteria } = c.req.valid("json");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const serviceData = await createSegment(
      newsletter.id,
      name,
      description,
      criteria,
    );

    return c.json(serviceData, routeStatus(serviceData));
  },
);

// Get a single segment
segmentRoutes.get(
  "/:newsletterId/:segmentId",
  zValidator(
    "param",
    z.object({
      newsletterId: z.string().min(1),
      segmentId: z.string().uuid(),
    }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    },
  ),
  async (c) => {
    const { newsletterId, segmentId } = c.req.valid("param");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const serviceData = await getSegment(segmentId, newsletter.id);
    return c.json(serviceData, routeStatus(serviceData));
  },
);

// Update a segment
segmentRoutes.patch(
  "/:newsletterId/:segmentId",
  zValidator(
    "param",
    z.object({
      newsletterId: z.string().min(1),
      segmentId: z.string().uuid(),
    }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    },
  ),
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      criteria: z.record(z.unknown()).optional(),
    }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    },
  ),
  async (c) => {
    const { newsletterId, segmentId } = c.req.valid("param");
    const updates = c.req.valid("json");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const serviceData = await updateSegment(segmentId, newsletter.id, updates);
    return c.json(serviceData, routeStatus(serviceData));
  },
);

// Delete segment
segmentRoutes.delete(
  "/:newsletterId/:segmentId",
  zValidator(
    "param",
    z.object({
      newsletterId: z.string().min(1),
      segmentId: z.string().uuid(),
    }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    },
  ),
  async (c) => {
    const { newsletterId, segmentId } = c.req.valid("param");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const serviceData = await deleteSegment(segmentId, newsletter.id);
    return c.json(serviceData, routeStatus(serviceData));
  },
);

// Get subscribers in a segment
segmentRoutes.get(
  "/:newsletterId/:segmentId/subscribers",
  zValidator(
    "param",
    z.object({
      newsletterId: z.string().min(1),
      segmentId: z.string().uuid(),
    }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    },
  ),
  async (c) => {
    const { newsletterId, segmentId } = c.req.valid("param");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const serviceData = await getSegmentSubscribers(segmentId, newsletter.id);
    return c.json(serviceData, routeStatus(serviceData));
  },
);

// Add subscriber to segment
segmentRoutes.post(
  "/:newsletterId/:segmentId/subscribers/:subscriberId",
  zValidator(
    "param",
    z.object({
      newsletterId: z.string().min(1),
      segmentId: z.string().uuid(),
      subscriberId: z.string().uuid(),
    }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    },
  ),
  async (c) => {
    const { newsletterId, segmentId, subscriberId } = c.req.valid("param");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const serviceData = await addSubscriberToSegment(
      segmentId,
      subscriberId,
      newsletter.id,
    );

    return c.json(serviceData, routeStatus(serviceData));
  },
);

// Remove subscriber from segment
segmentRoutes.delete(
  "/:newsletterId/:segmentId/subscribers/:subscriberId",
  zValidator(
    "param",
    z.object({
      newsletterId: z.string().min(1),
      segmentId: z.string().uuid(),
      subscriberId: z.string().uuid(),
    }),
    (result, c) => {
      if (!result.success) return validationErrorResponse(c, result.error);
    },
  ),
  async (c) => {
    const { newsletterId, segmentId, subscriberId } = c.req.valid("param");
    const newsletterOrRes = await getNewsletterOrFail(c, newsletterId);
    if (newsletterOrRes instanceof Response) return newsletterOrRes;
    const newsletter = newsletterOrRes;

    const serviceData = await removeSubscriberFromSegment(
      segmentId,
      subscriberId,
      newsletter.id,
    );

    return c.json(serviceData, routeStatus(serviceData));
  },
);

export default segmentRoutes;
