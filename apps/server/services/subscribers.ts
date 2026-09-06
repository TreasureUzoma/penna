import { db } from "@workspace/db";
import { subscribers } from "@workspace/db/schema";
import type { ServiceResponse } from "@workspace/types";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { paginate } from "@/utils/pagination";
import { parse } from "csv-parse/sync";
import {
  assertSubscriberCapacity,
  getNewsletterSubscriberUsage,
  syncSubscriberLimitWarnings,
  SubscriberLimitError,
} from "./limits";

export const getSubscribers = async (
  newsletterId: string,
  page = 1,
  limit = 10
): Promise<ServiceResponse> => {
  try {
    const offset = (page - 1) * limit;

    const dbQuery = db
      .select()
      .from(subscribers)
      .where(eq(subscribers.newsletterId, newsletterId))
      .orderBy(desc(subscribers.createdAt))
      .limit(limit)
      .offset(offset);

    const countQuery = db
      .select({ count: count() })
      .from(subscribers)
      .where(eq(subscribers.newsletterId, newsletterId));

    const paginatedData = await paginate(dbQuery, countQuery, page, limit);

    return {
      success: true,
      message: "Fetched subscribers successfully",
      data: paginatedData,
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong fetching subscribers",
      data: null,
    };
  }
};

export const createSubscriber = async (
  newsletterId: string,
  email: string,
  name?: string
): Promise<ServiceResponse> => {
  try {
    const [existingSubscriber] = await db
      .select()
      .from(subscribers)
      .where(
        and(eq(subscribers.newsletterId, newsletterId), eq(subscribers.email, email))
      );

    if (existingSubscriber) {
      return {
        success: false,
        message: "Subscriber with this email already exists in the newsletter",
        data: null,
      };
    }

    const usage = await assertSubscriberCapacity(newsletterId);

    const [newSubscriber] = await db
      .insert(subscribers)
      .values({
        newsletterId,
        email,
        name,
        status: "subscribed",
      })
      .returning();

    void syncSubscriberLimitWarnings({ ...usage, count: usage.count + 1 });

    return {
      success: true,
      message: "Subscriber created successfully",
      data: newSubscriber,
    };
  } catch (err) {
    if (err instanceof SubscriberLimitError) {
      return { success: false, message: err.message, data: null };
    }
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong creating subscriber",
      data: null,
    };
  }
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_IMPORT_ROWS = 10_000;

export const importSubscribersFromCsv = async (
  newsletterId: string,
  csvContent: string
): Promise<ServiceResponse> => {
  try {
    let rows: Record<string, string>[];
    try {
      rows = parse(csvContent, {
        columns: (header: string[]) =>
          header.map((h) => h.trim().toLowerCase()),
        skip_empty_lines: true,
        trim: true,
      });
    } catch (parseErr) {
      return {
        success: false,
        message:
          parseErr instanceof Error
            ? `Failed to parse CSV: ${parseErr.message}`
            : "Failed to parse CSV.",
        data: null,
      };
    }

    if (rows.length > MAX_IMPORT_ROWS) {
      return {
        success: false,
        message: `CSV has too many rows (${rows.length}). Max ${MAX_IMPORT_ROWS} per import.`,
        data: null,
      };
    }

    const seen = new Set<string>();
    const validRows: { email: string; name: string | null }[] = [];
    let invalidCount = 0;
    let duplicatesInFile = 0;

    for (const row of rows) {
      const email = row.email?.trim().toLowerCase();
      const name = row.name?.trim() || null;

      if (!email || !EMAIL_REGEX.test(email)) {
        invalidCount++;
        continue;
      }

      if (seen.has(email)) {
        duplicatesInFile++;
        continue;
      }

      seen.add(email);
      validRows.push({ email, name });
    }

    if (validRows.length === 0) {
      return {
        success: false,
        message:
          "No valid subscribers found in CSV. Make sure it has an 'email' column.",
        data: null,
      };
    }

    const usage = await getNewsletterSubscriberUsage(newsletterId);
    if (!usage) {
      return {
        success: false,
        message: "Could not determine this newsletter's subscriber limit.",
        data: null,
      };
    }

    const remainingCapacity =
      usage.cap === null
        ? validRows.length
        : Math.max(0, usage.cap - usage.count);
    const skippedForLimit = Math.max(0, validRows.length - remainingCapacity);
    const importableRows = validRows.slice(0, remainingCapacity);

    if (importableRows.length === 0) {
      void syncSubscriberLimitWarnings(usage);
      return {
        success: false,
        message: `${usage.newsletterName} is already at its ${usage.plan.name} plan limit of ${usage.cap?.toLocaleString()} subscribers. Upgrade to import more.`,
        data: null,
      };
    }

    const inserted = await db
      .insert(subscribers)
      .values(
        importableRows.map((row) => ({
          newsletterId,
          email: row.email,
          name: row.name,
          status: "subscribed" as const,
        }))
      )
      .onConflictDoNothing({
        target: [subscribers.newsletterId, subscribers.email],
      })
      .returning();

    void syncSubscriberLimitWarnings({
      ...usage,
      count: usage.count + inserted.length,
    });

    const limitNote =
      skippedForLimit > 0
        ? ` ${skippedForLimit} row${skippedForLimit === 1 ? "" : "s"} skipped — over your ${usage.plan.name} plan's subscriber limit.`
        : "";

    return {
      success: true,
      message: `Imported ${inserted.length} subscriber${inserted.length === 1 ? "" : "s"}.${limitNote}`,
      data: {
        imported: inserted.length,
        skippedDuplicates:
          importableRows.length - inserted.length + duplicatesInFile,
        skippedForLimit,
        invalidRows: invalidCount,
        totalRows: rows.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong importing subscribers",
      data: null,
    };
  }
};

/**
 * All actively-subscribed emails for a newsletter, unpaginated — for actual
 * sends, not UI listing.
 */
export const getSubscribedEmails = async (
  newsletterId: string
): Promise<string[]> => {
  const rows = await db
    .select({ email: subscribers.email })
    .from(subscribers)
    .where(
      and(
        eq(subscribers.newsletterId, newsletterId),
        eq(subscribers.status, "subscribed")
      )
    );

  return rows.map((r) => r.email);
};

/**
 * Filters a candidate list of email addresses down to the ones that are
 * actually subscribed to this newsletter. Used to scope external-API sends
 * (`recipientEmails`) to real subscribers instead of letting a caller send
 * to arbitrary addresses just because they hold a valid private key.
 */
export const getSubscribedEmailsFromList = async (
  newsletterId: string,
  emails: string[]
): Promise<string[]> => {
  if (emails.length === 0) return [];

  const rows = await db
    .select({ email: subscribers.email })
    .from(subscribers)
    .where(
      and(
        eq(subscribers.newsletterId, newsletterId),
        eq(subscribers.status, "subscribed"),
        inArray(subscribers.email, emails)
      )
    );

  return rows.map((r) => r.email);
};

export const deleteSubscriber = async (
  newsletterId: string,
  subscriberId: string
): Promise<ServiceResponse> => {
  try {
    const [deletedSubscriber] = await db
      .delete(subscribers)
      .where(
        and(
          eq(subscribers.newsletterId, newsletterId),
          eq(subscribers.id, subscriberId)
        )
      )
      .returning();

    if (!deletedSubscriber) {
      return {
        success: false,
        message: "Subscriber not found",
        data: null,
      };
    }

    return {
      success: true,
      message: "Subscriber deleted successfully",
      data: deletedSubscriber,
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong deleting subscriber",
      data: null,
    };
  }
};
