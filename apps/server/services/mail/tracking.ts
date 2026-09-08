import { envConfig } from "@/config";
import { db } from "@workspace/db";
import { emailRecipients } from "@workspace/db/schema";
import { and, eq, isNull } from "drizzle-orm";

async function getRecipientToken(emailId: string, newsletterId: string, email: string) {
  const [existing] = await db
    .select({ token: emailRecipients.token })
    .from(emailRecipients)
    .where(and(eq(emailRecipients.emailId, emailId), eq(emailRecipients.email, email)));
  if (existing) return existing.token;

  const [recipient] = await db
    .insert(emailRecipients)
    .values({ emailId, newsletterId, email })
    .returning({ token: emailRecipients.token });
  return recipient!.token;
}

/** Adds a per-recipient open pixel and routes ordinary HTTP(S) links through the click tracker. */
export async function addEmailTracking(
  html: string,
  emailId: string,
  newsletterId: string,
  recipientEmail: string,
) {
  const token = await getRecipientToken(emailId, newsletterId, recipientEmail);
  const clickBase = `${envConfig.API_URL}/api/v1/tracking/click/${token}?url=`;
  const withTrackedLinks = html.replace(
    /href=(['"])(https?:\/\/[^'"\s>]+)\1/gi,
    (_match, quote: string, url: string) =>
      `href=${quote}${clickBase}${encodeURIComponent(url)}${quote}`,
  );
  const pixel = `<img src="${envConfig.API_URL}/api/v1/tracking/open/${token}.gif" width="1" height="1" alt="" style="display:block;border:0;" />`;
  return `${withTrackedLinks}${pixel}`;
}

export async function recordEmailOpen(token: string) {
  await db
    .update(emailRecipients)
    .set({ openedAt: new Date() })
    .where(and(eq(emailRecipients.token, token), isNull(emailRecipients.openedAt)));
}

export async function recordEmailClick(token: string) {
  await db
    .update(emailRecipients)
    .set({ clickedAt: new Date() })
    .where(and(eq(emailRecipients.token, token), isNull(emailRecipients.clickedAt)));
}

export async function removeEmailTracking(emailId: string, email: string) {
  await db
    .delete(emailRecipients)
    .where(and(eq(emailRecipients.emailId, emailId), eq(emailRecipients.email, email)));
}
