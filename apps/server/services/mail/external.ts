import { sendNewsletterEmail, sendBulkNewsletterEmails } from "./ses";
import { applyBranding } from "./branding";
import { getVerifiedSendingDomain } from "../domains";
import { canRemoveBranding } from "../newsletters";
import { db } from "@workspace/db";
import { newsletters } from "@workspace/db/schema";
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
