import { routeStatus } from "@/lib/utils";
import { renderNewsletterMarkdown } from "@/lib/markdown";
import { newsletterApiKey } from "@/middlewares/newsletter-api-keys";
import { getSubscribers, getSubscribedEmailsFromList } from "@/services/subscribers";
import { createNewsletterSubscriber } from "@/services/subscriptions";
import { sendEmailNewsletter } from "@/services/mail/external";
import {
  assertNewsletterSendCapacity,
  NewsletterSendLimitError,
} from "@/services/limits";
import { logNewsletterSend } from "@/services/newsletter-send-log";
import { recordSentNewsletterPost } from "@/services/posts";
import { moderateNewsletterContent } from "@/services/moderation";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

type ExternalNewsletterContext = {
  Variables: {
    newsletter: {
      id: string;
      apiKeyId: string;
      name: string;
      slug: string;
      keyType: "public" | "private";
    };
  };
};

const externalNewslettersRoute = new Hono<ExternalNewsletterContext>().use(
  newsletterApiKey,
);

externalNewslettersRoute.post("/subscriber/new", async (c) => {
  const newsletterData = c.get("newsletter");
  const { email } = await c.req.json();
  const serviceData = await createNewsletterSubscriber({
    newsletterId: newsletterData.id,
    email,
  });
  return c.json(serviceData, routeStatus(serviceData));
});

externalNewslettersRoute.get("/subscribers", async (c) => {
  const newsletterData = c.get("newsletter");

  if (newsletterData.keyType !== "private") {
    return c.json(
      { success: false, message: "Unauthorized: Private key required" },
      401,
    );
  }

  const { page, limit } = c.req.query();
  const pageNumber = page ? parseInt(page) : 1;
  const limitNumber = limit ? parseInt(limit) : 10;

  const serviceData = await getSubscribers(
    newsletterData.id,
    pageNumber,
    limitNumber,
  );
  return c.json(serviceData, routeStatus(serviceData));
});

// Max recipients a single call can resolve to (recipientEmails + segments
// combined), independent of the per-newsletter daily send cap — keeps one
// oversized request from being used to blast an entire large list in one
// shot, and keeps the moderation check's input size bounded.
const MAX_RECIPIENTS_PER_SEND = 5000;

// Send newsletter via API
externalNewslettersRoute.post(
  "/send",
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
    const newsletterData = c.get("newsletter");

    try {
      // Require private key for sending
      if (newsletterData.keyType !== "private") {
        return c.json(
          { success: false, message: "Unauthorized: Private key required" },
          401,
        );
      }

      const { subject, content, recipientEmails, segmentIds } =
        c.req.valid("json");

      // --- Layer 2: per-newsletter daily send cap, checked first since it's
      // the cheapest rejection and shouldn't cost a recipient-resolution
      // or moderation call if the newsletter is already over its cap. ---
      try {
        await assertNewsletterSendCapacity(newsletterData.id);
      } catch (err) {
        if (err instanceof NewsletterSendLimitError) {
          await logNewsletterSend({
            newsletterId: newsletterData.id,
            apiKeyId: newsletterData.apiKeyId,
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
          const result = await getSegmentSubscribers(segmentId, newsletterData.id);
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
          newsletterId: newsletterData.id,
          apiKeyId: newsletterData.apiKeyId,
          subject,
          status: "error",
          errorMessage: message,
        });
        return c.json({ success: false, message }, 400);
      }

      const candidateList = Array.from(candidateEmails);
      const recipients = await getSubscribedEmailsFromList(
        newsletterData.id,
        candidateList,
      );
      const skippedNonSubscribers = candidateList.length - recipients.length;

      if (recipients.length === 0) {
        await logNewsletterSend({
          newsletterId: newsletterData.id,
          apiKeyId: newsletterData.apiKeyId,
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
        newsletterName: newsletterData.name,
      });

      if (moderation.verdict === "block") {
        await logNewsletterSend({
          newsletterId: newsletterData.id,
          apiKeyId: newsletterData.apiKeyId,
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
        { id: newsletterData.id, slug: newsletterData.slug },
        recipients,
        subject,
        htmlContent,
      );

      // The send already happened and can't be undone, so a failure here
      // shouldn't turn a successful send into an error response — just log
      // it. See recordSentNewsletterPost's doc comment for why this exists.
      try {
        await recordSentNewsletterPost(newsletterData.id, subject, content);
      } catch (err) {
        console.error("Failed to record sent newsletter as a post:", err);
      }

      await logNewsletterSend({
        newsletterId: newsletterData.id,
        apiKeyId: newsletterData.apiKeyId,
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
        newsletterId: newsletterData.id,
        apiKeyId: newsletterData.apiKeyId,
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

export default externalNewslettersRoute;
