import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import {
  SESv2Client,
  SendEmailCommand as SendEmailV2Command,
} from "@aws-sdk/client-sesv2";
import { envConfig } from "@/config";
import { buildListUnsubscribeHeaders } from "@/lib/list-unsubscribe";
import { appendUnsubscribeFooter } from "./branding";

const sesClient = new SESClient({
  region: envConfig.AWS_REGION,
  credentials: {
    accessKeyId: envConfig.AWS_ACCESS_KEY_ID,
    secretAccessKey: envConfig.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Newsletter sends specifically use SES v2 instead of v1 above — v1's
 * simple `SendEmailCommand` has no way to attach custom headers, and a
 * `List-Unsubscribe` header (RFC 8058) is required for Gmail/Yahoo bulk-
 * sender compliance (see lib/list-unsubscribe.ts). System/transactional
 * email (`sendSystemEmail` below) isn't bulk/marketing mail, so it stays
 * on the simpler v1 client.
 */
const sesV2Client = new SESv2Client({
  region: envConfig.AWS_REGION,
  credentials: {
    accessKeyId: envConfig.AWS_ACCESS_KEY_ID,
    secretAccessKey: envConfig.AWS_SECRET_ACCESS_KEY,
  },
});

export interface SendNewsletterOptions {
  projectId: string;
  projectSlug: string;
  recipientEmail: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export interface SendBulkNewsletterOptions {
  project: { id: string; slug: string };
  recipientEmails: string[];
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Send a single newsletter email via AWS SES
 */
export const sendNewsletterEmail = async (
  options: SendNewsletterOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const { projectId, projectSlug, recipientEmail, subject, html, replyTo } =
      options;

    // Per-recipient: the token embedded in both the visible footer link and
    // the List-Unsubscribe header is signed for this exact (project, email)
    // pair, so it can't be reused to unsubscribe someone else.
    const { unsubscribeUrl, header } = await buildListUnsubscribeHeaders(
      projectId,
      recipientEmail
    );
    const htmlWithFooter = appendUnsubscribeFooter(html, unsubscribeUrl);

    const command = new SendEmailV2Command({
      // {slug}@newsletter.penna.dev — not newsletter@{slug}.newsletter.penna.dev.
      // The onboarding UI (create-project-form.tsx, username-form.tsx) has
      // always shown subscribers this short, non-repetitive form; this was
      // the one place still sending from the longer one.
      FromEmailAddress: `${projectSlug}@${envConfig.NEWSLETTER_DOMAIN}`,
      Destination: {
        ToAddresses: [recipientEmail],
      },
      Content: {
        Simple: {
          Subject: {
            Data: subject,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: htmlWithFooter,
              Charset: "UTF-8",
            },
          },
          Headers: [
            { Name: "List-Unsubscribe", Value: header },
            {
              Name: "List-Unsubscribe-Post",
              Value: "List-Unsubscribe=One-Click",
            },
          ],
        },
      },
      ReplyToAddresses: replyTo ? [replyTo] : undefined,
    });

    const response = await sesV2Client.send(command);

    return {
      success: true,
      messageId: response.MessageId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Failed to send newsletter email:", errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Send newsletter to multiple recipients
 * Note: AWS SES has rate limits. Consider using SendBulkTemplatedEmail for large lists
 */
export const sendBulkNewsletterEmails = async (
  options: SendBulkNewsletterOptions
): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  errors?: Array<{ email: string; error: string }>;
}> => {
  const { project, recipientEmails, subject, html, replyTo } = options;
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as Array<{ email: string; error: string }>,
  };

  // AWS SES has rate limits - add small delay between sends
  const DELAY_MS = 10; // 10ms between emails

  for (const email of recipientEmails) {
    try {
      const result = await sendNewsletterEmail({
        projectId: project.id,
        projectSlug: project.slug,
        recipientEmail: email,
        subject,
        html,
        replyTo,
      });

      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push({
          email,
          error: result.error || "Unknown error",
        });
      }

      // Add delay to respect SES rate limits
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    } catch (error) {
      results.failed++;
      results.errors.push({
        email,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    success: results.failed === 0,
    ...results,
  };
};

export interface SendSystemEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send a transactional/system email (limit warnings, account notices,
 * etc.) from `SYSTEM_EMAIL_FROM`, as opposed to `sendNewsletterEmail`,
 * which sends from a project's own `{slug}@{NEWSLETTER_DOMAIN}` identity.
 */
export const sendSystemEmail = async (
  options: SendSystemEmailOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const { to, subject, html } = options;

    const command = new SendEmailCommand({
      Source: envConfig.SYSTEM_EMAIL_FROM,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: html,
            Charset: "UTF-8",
          },
        },
      },
    });

    const response = await sesClient.send(command);

    return {
      success: true,
      messageId: response.MessageId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Failed to send system email:", errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Verify email address with AWS SES (for testing)
 */
export const verifyEmailAddress = async (
  email: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { VerifyEmailIdentityCommand } = await import(
      "@aws-sdk/client-ses"
    );
    const command = new VerifyEmailIdentityCommand({ EmailAddress: email });
    await sesClient.send(command);

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      success: false,
      error: errorMessage,
    };
  }
};
