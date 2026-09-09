import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { and, desc, eq, inArray } from "drizzle-orm";
import { envConfig } from "@/config";
import { buildListUnsubscribeHeaders } from "@/lib/list-unsubscribe";
import { applyBranding, appendUnsubscribeFooter } from "../mail/branding";
import { dbLite, schema } from "./db-lite";

const sesClient = new SESv2Client({
  region: envConfig.AWS_REGION,
  credentials: {
    accessKeyId: envConfig.AWS_ACCESS_KEY_ID,
    secretAccessKey: envConfig.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Workflow-only delivery helpers. Queued workflow bundles must stay entirely
 * within apps/server: importing the normal mail or newsletter services pulls
 * in @workspace/db, which Nitro leaves external to the standalone bundle.
 */
export async function canWorkflowRemoveBranding(
  teamId: string,
): Promise<boolean> {
  const [subscription] = await dbLite
    .select({ planSlug: schema.teamSubscriptions.planSlug })
    .from(schema.teamSubscriptions)
    .where(
      and(
        eq(schema.teamSubscriptions.teamId, teamId),
        inArray(schema.teamSubscriptions.status, ["active", "trialing"]),
      ),
    )
    .orderBy(desc(schema.teamSubscriptions.updatedAt))
    .limit(1);

  if (subscription) return subscription.planSlug !== "hobby";

  const [owner] = await dbLite
    .select({ plan: schema.users.plan })
    .from(schema.teamMembers)
    .innerJoin(schema.users, eq(schema.teamMembers.userId, schema.users.id))
    .where(
      and(
        eq(schema.teamMembers.teamId, teamId),
        eq(schema.teamMembers.role, "owner"),
      ),
    );

  return owner?.plan !== undefined && owner.plan !== "hobby";
}

async function getWorkflowSendingDomain(
  newsletterId: string,
): Promise<string | null> {
  const [domain] = await dbLite
    .select({ name: schema.domains.name })
    .from(schema.domains)
    .where(
      and(
        eq(schema.domains.newsletterId, newsletterId),
        eq(schema.domains.verified, true),
        eq(schema.domains.type, "email"),
      ),
    );

  return domain?.name ?? null;
}

async function addWorkflowTracking(
  html: string,
  emailId: string,
  newsletterId: string,
  recipientEmail: string,
): Promise<string> {
  try {
    const [existing] = await dbLite
      .select({ token: schema.emailRecipients.token })
      .from(schema.emailRecipients)
      .where(
        and(
          eq(schema.emailRecipients.emailId, emailId),
          eq(schema.emailRecipients.email, recipientEmail),
        ),
      );
    const token =
      existing?.token ??
      (
        await dbLite
          .insert(schema.emailRecipients)
          .values({ emailId, newsletterId, email: recipientEmail })
          .returning({ token: schema.emailRecipients.token })
      )[0]!.token;
    const clickBase = `${envConfig.API_URL}/api/v1/tracking/click/${token}?url=`;
    const trackedLinks = html.replace(
      /href=(['"])(https?:\/\/[^'"\s>]+)\1/gi,
      (_match, quote: string, url: string) =>
        `href=${quote}${clickBase}${encodeURIComponent(url)}${quote}`,
    );
    return `${trackedLinks}<img src="${envConfig.API_URL}/api/v1/tracking/open/${token}.gif" width="1" height="1" alt="" style="display:block;border:0;" />`;
  } catch (error) {
    const isMissingTrackingTable =
      (error as { code?: string } | undefined)?.code === "42P01" ||
      (error instanceof Error &&
        /relation .*email_recipients.* does not exist/i.test(error.message));

    if (isMissingTrackingTable) {
      console.warn(
        "[workflow] email_recipients table is missing; skipping tracking for this send",
        {
          emailId,
          newsletterId,
          recipientEmail,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return html;
    }

    throw error;
  }
}

async function sendWorkflowNewsletterEmail(
  newsletter: { id: string; slug: string },
  recipientEmail: string,
  subject: string,
  html: string,
  fromDomain: string | null,
  emailId: string,
): Promise<boolean> {
  try {
    const { unsubscribeUrl, header } = await buildListUnsubscribeHeaders(
      newsletter.id,
      recipientEmail,
    );
    const trackedHtml = await addWorkflowTracking(
      appendUnsubscribeFooter(html, unsubscribeUrl),
      emailId,
      newsletter.id,
      recipientEmail,
    );
    await sesClient.send(
      new SendEmailCommand({
        FromEmailAddress: `${newsletter.slug}@${fromDomain || envConfig.NEWSLETTER_DOMAIN}`,
        Destination: { ToAddresses: [recipientEmail] },
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: "UTF-8" },
            Body: { Html: { Data: trackedHtml, Charset: "UTF-8" } },
            Headers: [
              { Name: "List-Unsubscribe", Value: header },
              {
                Name: "List-Unsubscribe-Post",
                Value: "List-Unsubscribe=One-Click",
              },
            ],
          },
        },
      }),
    );
    return true;
  } catch (error) {
    const isMissingTrackingTable =
      (error as { code?: string } | undefined)?.code === "42P01" ||
      (error instanceof Error &&
        /relation .*email_recipients.* does not exist/i.test(error.message));

    if (isMissingTrackingTable) {
      console.warn(
        "[workflow] email_recipients table is missing; continuing without tracking cleanup",
        {
          emailId,
          newsletterId: newsletter.id,
          recipientEmail,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return false;
    }

    try {
      await dbLite
        .delete(schema.emailRecipients)
        .where(
          and(
            eq(schema.emailRecipients.emailId, emailId),
            eq(schema.emailRecipients.email, recipientEmail),
          ),
        );
    } catch (cleanupError) {
      const cleanupMissingTable =
        (cleanupError as { code?: string } | undefined)?.code === "42P01" ||
        (cleanupError instanceof Error &&
          /relation .*email_recipients.* does not exist/i.test(
            cleanupError.message,
          ));
      if (!cleanupMissingTable) {
        console.error(
          "[workflow] failed to clean up tracking row after send failure",
          cleanupError,
        );
      }
    }
    console.error("Failed to send workflow newsletter email:", error);
    return false;
  }
}

export async function sendWorkflowEmailChunk(
  newsletter: { id: string; slug: string },
  recipientEmails: string[],
  subject: string,
  html: string,
  removeBranding: boolean,
  emailId: string,
): Promise<{ sent: number; failed: number }> {
  const fromDomain = await getWorkflowSendingDomain(newsletter.id);
  const brandedHtml = applyBranding(html, removeBranding);
  let sent = 0;
  let failed = 0;

  for (const recipientEmail of recipientEmails) {
    if (
      await sendWorkflowNewsletterEmail(
        newsletter,
        recipientEmail,
        subject,
        brandedHtml,
        fromDomain,
        emailId,
      )
    ) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}
