import { sendNewsletterEmail, sendBulkNewsletterEmails } from "./ses";
import { renderNewsletterMarkdown, renderNewsletterTemplate } from "@/lib/markdown";
import { buildListUnsubscribeHeaders } from "@/lib/list-unsubscribe";
import { applyBranding } from "./branding";
import { getVerifiedSendingDomain } from "../domains";
import { canRemoveBranding } from "../newsletters";
import { db } from "@workspace/db";
import { newsletters } from "@workspace/db/schema";
import type { NewsletterTemplateContext } from "@/lib/markdown";
import { eq } from "drizzle-orm";

const getNewsletterBrandingPreference = async (newsletterId: string) => {
  const [newsletter] = await db
    .select({ config: newsletters.config })
    .from(newsletters)
    .where(eq(newsletters.id, newsletterId));

  const wantsBrandingRemoved =
    (newsletter?.config as { removeBranding?: boolean } | null)
      ?.removeBranding === true;

  // The setting alone is never enough: a downgrade must immediately put the
  // footer back on outgoing mail.
  return wantsBrandingRemoved && (await canRemoveBranding(newsletterId));
};

export const sendEmailNewsletter = async (
  newsletter: { id: string; slug: string },
  recipientEmails: string[],
  subject: string,
  html: string,
  replyTo?: string,
  removeBranding?: boolean,
  emailId?: string
) => {
  if (recipientEmails.length === 0) {
    throw new Error("No recipient emails provided");
  }

  // Workflow sends have already resolved the preference in their step. API
  // sends arrive here directly, so resolve it from the newsletter record.
  const shouldRemoveBranding =
    removeBranding ?? (await getNewsletterBrandingPreference(newsletter.id));
  const brandedHtml = applyBranding(html, shouldRemoveBranding);
  // Falls back to the shared NEWSLETTER_DOMAIN (see ses.ts) whenever the
  // newsletter has no verified custom domain — see services/domains.ts.
  const fromDomain = await getVerifiedSendingDomain(newsletter.id);

  if (recipientEmails.length === 1 && recipientEmails[0]) {
    const result = await sendNewsletterEmail({
      newsletterId: newsletter.id,
      newsletterSlug: newsletter.slug,
      recipientEmail: recipientEmails[0],
      subject,
      html: brandedHtml,
      replyTo,
      fromDomain,
      emailId,
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send newsletter");
    }

    return result;
  }

  // Send to multiple recipients
  const result = await sendBulkNewsletterEmails({
    newsletter,
    recipientEmails,
    subject,
    html: brandedHtml,
    replyTo,
    fromDomain,
    emailId,
  });

  if (!result.success && result.failed === recipientEmails.length) {
    throw new Error("Failed to send newsletter to all recipients");
  }

  return result;
};

export const sendPersonalizedEmailNewsletter = async (
  newsletter: { id: string; slug: string; name: string },
  subscribers: Array<{ email: string; name: string | null }>,
  subjectTemplate: string,
  markdown: string,
) => {
  const shouldRemoveBranding = await getNewsletterBrandingPreference(newsletter.id);
  const fromDomain = await getVerifiedSendingDomain(newsletter.id);
  const results = {
    success: true,
    sent: 0,
    failed: 0,
    errors: [] as Array<{ email: string; error: string }>,
  };

  for (const subscriber of subscribers) {
    try {
      const unsubscribeInfo = await buildListUnsubscribeHeaders(newsletter.id, subscriber.email);
      const name = subscriber.name?.trim() ?? "";
      const context: NewsletterTemplateContext = {
        subscriber: { ...subscriber, first_name: name ? name.split(/\s+/)[0] : "" },
        newsletter,
        email: { subject: subjectTemplate, publish_date: new Date() },
        unsubscribe_url: unsubscribeInfo.unsubscribeUrl,
      };
      const subject = renderNewsletterTemplate(subjectTemplate, context);
      const renderedHtml = applyBranding(
        renderNewsletterMarkdown(markdown, context),
        shouldRemoveBranding,
      );
      const result = await sendNewsletterEmail({
        newsletterId: newsletter.id,
        newsletterSlug: newsletter.slug,
        recipientEmail: subscriber.email,
        subject,
        html: renderedHtml,
        fromDomain,
        unsubscribeInfo,
      });

      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push({ email: subscriber.email, error: result.error || "Failed to send email" });
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        email: subscriber.email,
        error: error instanceof Error ? error.message : "Failed to send email",
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  results.success = results.failed === 0;
  return results;
};