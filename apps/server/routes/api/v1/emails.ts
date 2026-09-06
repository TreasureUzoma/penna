import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppBindings } from "@/types";
import { sendEmailNewsletter } from "@/services/mail/external";
import { getNewsletterOrFail } from "@/utils/newsletter-access";
import { validationErrorResponse } from "@/utils/validation-error-response";

const emailsRoute = new Hono<AppBindings>();

// Send newsletter to subscribers
emailsRoute.post(
  "/:newsletterId/send",
  zValidator(
    "param",
    z.object({ newsletterId: z.string().min(1) }),
    (result, c) => {
      if (!result.success) {
        return validationErrorResponse(c, result.error);
      }
    }
  ),
  zValidator(
    "json",
    z.object({
      subject: z.string().min(1, "Subject is required"),
      html: z.string().min(1, "Email content is required"),
      recipientEmails: z
        .array(z.string().email())
        .min(1, "At least one recipient is required"),
      replyTo: z.string().email().optional(),
    }),
    (result, c) => {
      if (!result.success) {
        return validationErrorResponse(c, result.error);
      }
    }
  ),
  async (c) => {
    try {
      const { newsletterId } = c.req.valid("param");
      const { subject, html, recipientEmails, replyTo } = c.req.valid("json");

      // Verify user has access to this newsletter
      const newsletterOrRes = await getNewsletterOrFail(c, newsletterId);
      if (newsletterOrRes instanceof Response) return newsletterOrRes;
      const newsletter = newsletterOrRes;

      // Send newsletter
      const result = await sendEmailNewsletter(
        { id: newsletter.id, slug: newsletter.slug },
        recipientEmails,
        subject,
        html,
        replyTo
      );

      return c.json(
        {
          success: true,
          message: "Newsletter sent successfully",
          data: result,
        },
        200
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send newsletter";

      return c.json(
        {
          success: false,
          message,
        },
        500
      );
    }
  }
);

// Send test email
emailsRoute.post(
  "/:newsletterId/test",
  zValidator(
    "param",
    z.object({ newsletterId: z.string().min(1) }),
    (result, c) => {
      if (!result.success) {
        return validationErrorResponse(c, result.error);
      }
    }
  ),
  zValidator(
    "json",
    z.object({
      testEmail: z.string().email("Invalid email address"),
      subject: z.string().min(1, "Subject is required"),
      html: z.string().min(1, "Email content is required"),
    }),
    (result, c) => {
      if (!result.success) {
        return validationErrorResponse(c, result.error);
      }
    }
  ),
  async (c) => {
    try {
      const { newsletterId } = c.req.valid("param");
      const { testEmail, subject, html } = c.req.valid("json");

      // Verify user has access to this newsletter
      const newsletterOrRes = await getNewsletterOrFail(c, newsletterId);
      if (newsletterOrRes instanceof Response) return newsletterOrRes;
      const newsletter = newsletterOrRes;

      // Send test email
      const result = await sendEmailNewsletter(
        { id: newsletter.id, slug: newsletter.slug },
        [testEmail],
        subject,
        html
      );

      return c.json(
        {
          success: true,
          message: "Test email sent successfully",
          data: result,
        },
        200
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send test email";

      return c.json(
        {
          success: false,
          message,
        },
        500
      );
    }
  }
);

export default emailsRoute;
