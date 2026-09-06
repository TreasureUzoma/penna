import { db } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { InsertPost } from "@workspace/validations";
import type { ServiceResponse } from "@workspace/types";
import { emails, newsletterMembers } from "@workspace/db/schema";
import { decryptDataSubtle, encryptDataSubtle } from "@/lib/encrypt";
import { envConfig } from "@/config";
import { start } from "workflow/api";
import { emailCampaignWorkflow } from "./workflows/email-campaign";

/**
 * Always hands the actual send off to the durable workflow, whether it's
 * scheduled for later or "now" — never sends synchronously in the request
 * handler. See `services/emails.ts`'s `triggerSendIfPublished` for why.
 */
const triggerSendIfPublished = async (emailId: string, sentAt?: Date) => {
  const scheduledTime = sentAt ?? new Date();
  await start(emailCampaignWorkflow, [
    { emailId, scheduledTime: scheduledTime.toISOString() },
  ]);
};

export const createNewsletterPostDraft = async (
  body: InsertPost
): Promise<ServiceResponse<InsertPost>> => {
  try {
    const encryptedBody = await encryptDataSubtle(
      body.body,
      envConfig.ENCRYPTION_KEY || ""
    );
    const [newPost] = await db
      .insert(emails)
      .values({
        ...body,
        body: encryptedBody,
      })
      .returning();

    if (!newPost) {
      return {
        data: null,
        success: false,
        message: "Failed to create post draft.",
      };
    }

    if (newPost.status === "published") {
      await triggerSendIfPublished(
        newPost.id,
        body.sentAt ? new Date(body.sentAt) : undefined
      );
    }

    return {
      data: newPost,
      success: true,
      message: "Post draft created successfully.",
    };
  } catch (err) {
    let errorMessage = "Failed to create post draft due to a server error.";
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    return { data: null, success: false, message: errorMessage };
  }
};

export const updateNewsletterPost = async (
  postId: string,
  body: Partial<InsertPost>
): Promise<ServiceResponse<InsertPost>> => {
  try {
    const fieldsToUpdate: Partial<typeof emails.$inferInsert> = { ...body };

    // encrypt body if it exists
    if (body.body) {
      fieldsToUpdate.body = await encryptDataSubtle(
        body.body,
        envConfig.ENCRYPTION_KEY || ""
      );
    }

    const [updatedPost] = await db
      .update(emails)
      .set(fieldsToUpdate)
      .where(eq(emails.id, postId))
      .returning();

    if (updatedPost?.body) {
      updatedPost.body = await decryptDataSubtle(
        updatedPost.body,
        envConfig.ENCRYPTION_KEY || ""
      );
    }

    if (body.status === "published") {
      await triggerSendIfPublished(
        postId,
        body.sentAt ? new Date(body.sentAt) : undefined
      );
    }

    if (!updatedPost) {
      return {
        data: null,
        success: false,
        message: "Post not found or update failed.",
      };
    }

    return {
      data: updatedPost,
      success: true,
      message: `Post ${updatedPost.status} successfully.`,
    };
  } catch (err) {
    let errorMessage = "Failed to update post due to a server error.";
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    return { data: null, success: false, message: errorMessage };
  }
};

/**
 * Records a newsletter sent through the external API as a published post,
 * so it shows up in the dashboard's post history the same as one sent
 * through the app. Without this, the external `/send` endpoint only ever
 * wrote to `newsletterSendLogs` (an audit log, not shown on the Posts
 * page) — the email genuinely went out, but there was no record of it as
 * a post.
 */
export const recordSentNewsletterPost = async (
  newsletterId: string,
  subject: string,
  content: string
): Promise<void> => {
  const encryptedBody = await encryptDataSubtle(
    content,
    envConfig.ENCRYPTION_KEY || ""
  );
  await db.insert(emails).values({
    newsletterId,
    subject,
    body: encryptedBody,
    status: "published",
  });
};

export const getAllNewsletterPosts = async (
  userId: string
): Promise<ServiceResponse<InsertPost[]>> => {
  try {
    const userPosts = await db
      .select({
        serial: emails.serial,
        id: emails.id,
        newsletterId: emails.newsletterId,
        subject: emails.subject,
        body: emails.body,
        sentAt: emails.sentAt,
        status: emails.status,
      })
      .from(emails)
      .innerJoin(newsletterMembers, eq(emails.newsletterId, newsletterMembers.newsletterId))
      .where(eq(newsletterMembers.userId, userId));

    // decrypt all post bodies
    const decryptedPosts = await Promise.all(
      userPosts.map(async (post) => ({
        ...post,
        body: await decryptDataSubtle(
          post.body,
          envConfig.ENCRYPTION_KEY || ""
        ),
      }))
    );

    return {
      data: decryptedPosts,
      success: true,
      message: "User posts fetched successfully.",
    };
  } catch (err) {
    let errorMessage = "Failed to retrieve user posts due to a server error.";
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    return { data: null, success: false, message: errorMessage };
  }
};
