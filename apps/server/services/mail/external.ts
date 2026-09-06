import { sendNewsletterEmail, sendBulkNewsletterEmails } from "./ses";
import { applyBranding } from "./branding";
import { getVerifiedSendingDomain } from "../domains";

export const sendEmailNewsletter = async (
  project: { id: string; slug: string },
  recipientEmails: string[],
  subject: string,
  html: string,
  replyTo?: string,
  removeBranding = false
) => {
  if (recipientEmails.length === 0) {
    throw new Error("No recipient emails provided");
  }

  const brandedHtml = applyBranding(html, removeBranding);
  // Falls back to the shared NEWSLETTER_DOMAIN (see ses.ts) whenever the
  // project has no verified custom domain — see services/domains.ts.
  const fromDomain = await getVerifiedSendingDomain(project.id);

  if (recipientEmails.length === 1 && recipientEmails[0]) {
    const result = await sendNewsletterEmail({
      projectId: project.id,
      projectSlug: project.slug,
      recipientEmail: recipientEmails[0],
      subject,
      html: brandedHtml,
      replyTo,
      fromDomain,
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send newsletter");
    }

    return result;
  }

  // Send to multiple recipients
  const result = await sendBulkNewsletterEmails({
    project,
    recipientEmails,
    subject,
    html: brandedHtml,
    replyTo,
    fromDomain,
  });

  if (!result.success && result.failed === recipientEmails.length) {
    throw new Error("Failed to send newsletter to all recipients");
  }

  return result;
};

