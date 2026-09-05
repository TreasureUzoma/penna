import { routeStatus } from "@/lib/utils";
import { renderNewsletterMarkdown } from "@/lib/markdown";
import { projectApiKey } from "@/middlewares/project-api-keys";
import { getSubscribers, getSubscribedEmailsFromList } from "@/services/subscribers";
import { createProjectSubscriber } from "@/services/subscriptions";
import { sendEmailNewsletter } from "@/services/mail/external";
import {
  assertNewsletterSendCapacity,
  NewsletterSendLimitError,
} from "@/services/limits";
import { logNewsletterSend } from "@/services/newsletter-send-log";
import { moderateNewsletterContent } from "@/services/moderation";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

type ExternalProjectContext = {
  Variables: {
    project: {
      id: string;
      apiKeyId: string;
      name: string;
      slug: string;
      keyType: "public" | "private";
    };
  };
};

const externalProjectRoutes = new Hono<ExternalProjectContext>().use(
  projectApiKey,
);

externalProjectRoutes.post("/subscriber/new", async (c) => {
  const projectData = c.get("project");
  const { email } = await c.req.json();
  const serviceData = await createProjectSubscriber({
    projectId: projectData.id,
    email,
  });
  return c.json(serviceData, routeStatus(serviceData));
});

externalProjectRoutes.get("/subscribers", async (c) => {
  const projectData = c.get("project");

  if (projectData.keyType !== "private") {
    return c.json(
      { success: false, message: "Unauthorized: Private key required" },
      401,
    );
  }

  const { page, limit } = c.req.query();
  const pageNumber = page ? parseInt(page) : 1;
  const limitNumber = limit ? parseInt(limit) : 10;

  const serviceData = await getSubscribers(
    projectData.id,
    pageNumber,
    limitNumber,
  );
  return c.json(serviceData, routeStatus(serviceData));
});

// Max recipients a single call can resolve to (recipientEmails + segments
// combined), independent of the per-project daily send cap — keeps one
// oversized request from being used to blast an entire large list in one
// shot, and keeps the moderation check's input size bounded.
const MAX_RECIPIENTS_PER_SEND = 5000;

// Send newsletter via API
externalProjectRoutes.post(
  "/newsletters/send",
  zValidator(
    "json",
    z.object({
      subject: z.string().min(1, "Subject is required"),
      content: z.string().min(1, "Content is required"),
      recipientEmails: z
        .array(z.string().email())
        .min(1, "At least one recipient is required")
        .max(
          MAX_RECIPIENTS_PER_SEND,
          `A single request can include at most ${MAX_RECIPIENTS_PER_SEND} recipientEmails`,
        )
        .optional(),
      segmentIds: z.array(z.string()).optional(),
    }),
  ),
  async (c) => {
    const projectData = c.get("project");

    try {
      // Require private key for sending
      if (projectData.keyType !== "private") {
        return c.json(
          { success: false, message: "Unauthorized: Private key required" },
          401,
        );
      }

      const { subject, content, recipientEmails, segmentIds } =
        c.req.valid("json");

      // --- Layer 2: per-project daily send cap, checked first since it's
      // the cheapest rejection and shouldn't cost a recipient-resolution
      // or moderation call if the project is already over its cap. ---
      try {
        await assertNewsletterSendCapacity(projectData.id);
      } catch (err) {
        if (err instanceof NewsletterSendLimitError) {
          await logNewsletterSend({
            projectId: projectData.id,
            apiKeyId: projectData.apiKeyId,
            subject,
            status: "blocked_rate_limit",
            errorMessage: err.message,
          });
          return c.json({ success: false, message: err.message }, 429);
        }
        throw err;
      }

      // --- Layer 1: resolve recipients, then scope to actual subscribers ---
      const candidateEmails: Set<string> = new Set(recipientEmails || []);

      if (segmentIds && segmentIds.length > 0) {
        const { getSegmentSubscribers } = await import("@/services/segments");

        for (const segmentId of segmentIds) {
          const result = await getSegmentSubscribers(segmentId, projectData.id);
          if (result.success && Array.isArray(result.data)) {
            result.data.forEach((subscriber: { email: string }) =>
              candidateEmails.add(subscriber.email)
            );
          }
        }
      }

      if (candidateEmails.size > MAX_RECIPIENTS_PER_SEND) {
        const message = `This request resolved to ${candidateEmails.size} recipients, which exceeds the ${MAX_RECIPIENTS_PER_SEND} limit per request. Split the send across multiple calls or use fewer/smaller segments.`;
        await logNewsletterSend({
          projectId: projectData.id,
          apiKeyId: projectData.apiKeyId,
          subject,
          status: "error",
          errorMessage: message,
        });
        return c.json({ success: false, message }, 400);
      }

      const candidateList = Array.from(candidateEmails);
      const recipients = await getSubscribedEmailsFromList(
        projectData.id,
        candidateList,
      );
      const skippedNonSubscribers = candidateList.length - recipients.length;

      if (recipients.length === 0) {
        await logNewsletterSend({
          projectId: projectData.id,
          apiKeyId: projectData.apiKeyId,
          subject,
          skippedNonSubscribers,
          status: "blocked_no_recipients",
          errorMessage: "No recipients specified",
        });
        return c.json(
          { success: false, message: "No recipients specified" },
          400,
        );
      }

      // --- Layer 4: AI content moderation, run last since it's the most
      // expensive check and there's no point paying for it on a request
      // that has no valid recipients anyway. ---
      const moderation = await moderateNewsletterContent({
        subject,
        content,
        projectName: projectData.name,
      });

      if (moderation.verdict === "block") {
        await logNewsletterSend({
          projectId: projectData.id,
          apiKeyId: projectData.apiKeyId,
          subject,
          recipientCount: recipients.length,
          skippedNonSubscribers,
          status: "blocked_moderation",
          moderationVerdict: moderation.verdict,
          moderationCategory: moderation.category,
          moderationReason: moderation.reason,
        });
        return c.json(
          {
            success: false,
            message: `This newsletter was blocked by content moderation: ${moderation.reason}`,
          },
          403,
        );
      }

      const htmlContent = renderNewsletterMarkdown(content);

      const result = await sendEmailNewsletter(
        { id: projectData.id, slug: projectData.slug },
        recipients,
        subject,
        htmlContent,
      );

      await logNewsletterSend({
        projectId: projectData.id,
        apiKeyId: projectData.apiKeyId,
        subject,
        recipientCount: recipients.length,
        skippedNonSubscribers,
        status: "sent",
        moderationVerdict: moderation.verdict,
        moderationCategory: moderation.category,
        moderationReason: moderation.reason,
      });

      return c.json(
        {
          success: true,
          message: "Newsletter sent successfully",
          data: { ...result, skippedNonSubscribers },
        },
        200,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send newsletter";

      // Body was already validated by zValidator before this handler ran,
      // so it's safe to read again here even though the `const { subject }`
      // above is out of scope in this catch block.
      await logNewsletterSend({
        projectId: projectData.id,
        apiKeyId: projectData.apiKeyId,
        subject: c.req.valid("json").subject,
        status: "error",
        errorMessage: message,
      });

      return c.json(
        {
          success: false,
          message,
        },
        500,
      );
    }
  },
);

export default externalProjectRoutes;
