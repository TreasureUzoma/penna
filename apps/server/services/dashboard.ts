import { db } from "@workspace/db";
import {
  emails,
  payments,
  newsletterMembers,
  newsletters,
  subscribers,
} from "@workspace/db/schema";
import type { ServiceResponse } from "@workspace/types";
import type { DashboardOverview } from "@workspace/validations";
import { paginate } from "@/utils/pagination";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  sql,
  sum,
} from "drizzle-orm";

export const getDashboardOverview = async (
  userId: string,
  page = 1,
  limit = 10,
  sort: DashboardOverview["sort"] = "newest",
  search?: string
): Promise<ServiceResponse> => {
  try {
    const userNewsletters = await db
      .select({ id: newsletters.id })
      .from(newsletters)
      .innerJoin(newsletterMembers, eq(newsletters.id, newsletterMembers.newsletterId))
      .where(eq(newsletterMembers.userId, userId));

    const newsletterIds = userNewsletters.map((p) => p.id);

    let totalNewsletters = newsletterIds.length;
    let totalSubscribers = 0;
    let totalRevenue = 0;
    let totalPosts = 0;

    if (newsletterIds.length > 0) {
      const [subStats] = await db
        .select({ count: count() })
        .from(subscribers)
        .where(inArray(subscribers.newsletterId, newsletterIds));
      totalSubscribers = subStats?.count ?? 0;

      const [revStats] = await db
        .select({ total: sum(payments.amount) })
        .from(payments)
        .where(inArray(payments.newsletterId, newsletterIds));
      totalRevenue = revStats?.total ? parseInt(revStats.total) : 0;

      const [postStats] = await db
        .select({ count: count() })
        .from(emails)
        .where(inArray(emails.newsletterId, newsletterIds));
      totalPosts = postStats?.count ?? 0;
    }

    const offset = (page - 1) * limit;

    let orderBy;
    switch (sort) {
      case "name":
        orderBy = asc(newsletters.name);
        break;
      case "oldest":
        orderBy = asc(newsletters.createdAt);
        break;
      case "newest":
      case "activity":
      default:
        orderBy = desc(newsletters.createdAt);
        break;
      // Note: Sorting by revenue or subscribers would require complex joins/subqueries
      // For now, we'll fallback to createdAt for these complex sorts or implement them if strictly needed
      // im only implementing simple ones first.
    }

    // Build where conditions
    const whereConditions = [eq(newsletterMembers.userId, userId)];

    if (search && search.trim()) {
      whereConditions.push(
        sql`LOWER(${newsletters.name}) LIKE LOWER(${"%" + search + "%"})`
      );
    }

    const dbQuery = db
      .select({
        id: newsletters.id,
        name: newsletters.name,
        description: newsletters.description,
        createdAt: newsletters.createdAt,
        updatedAt: newsletters.updatedAt,
        role: newsletterMembers.role,
        slug: newsletters.slug,
      })
      .from(newsletters)
      .innerJoin(newsletterMembers, eq(newsletters.id, newsletterMembers.newsletterId))
      .where(and(...whereConditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const countQuery = db
      .select({ count: count() })
      .from(newsletters)
      .innerJoin(newsletterMembers, eq(newsletters.id, newsletterMembers.newsletterId))
      .where(and(...whereConditions));

    const newslettersData = await paginate(dbQuery, countQuery, page, limit);

    return {
      success: true,
      message: "Dashboard overview fetched successfully",
      data: {
        stats: {
          totalNewsletters,
          totalSubscribers,
          totalRevenue,
          totalPosts,
        },
        newsletters: newslettersData,
      },
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong fetching dashboard overview",
      data: null,
    };
  }
};

/**
 * The most recently *actually sent* posts across every newsletter the user
 * belongs to — scheduled-but-not-yet-sent posts are excluded (they're not
 * "activity" yet), matching the same published-and-sentAt-has-passed check
 * used to lock post editing (see the dashboard's posts/[postId] page).
 */
export const getRecentActivity = async (
  userId: string,
  limit = 5
): Promise<ServiceResponse> => {
  try {
    const userNewsletters = await db
      .select({ id: newsletters.id })
      .from(newsletters)
      .innerJoin(newsletterMembers, eq(newsletters.id, newsletterMembers.newsletterId))
      .where(eq(newsletterMembers.userId, userId));

    const newsletterIds = userNewsletters.map((p) => p.id);

    if (newsletterIds.length === 0) {
      return {
        success: true,
        message: "No recent activity",
        data: [],
      };
    }

    const recentPosts = await db
      .select({
        id: emails.id,
        subject: emails.subject,
        sentAt: emails.sentAt,
        newsletterId: emails.newsletterId,
        newsletterName: newsletters.name,
        newsletterSlug: newsletters.slug,
      })
      .from(emails)
      .innerJoin(newsletters, eq(emails.newsletterId, newsletters.id))
      .where(
        and(
          inArray(emails.newsletterId, newsletterIds),
          eq(emails.status, "published"),
          lte(emails.sentAt, new Date())
        )
      )
      .orderBy(desc(emails.sentAt))
      .limit(limit);

    return {
      success: true,
      message: "Recent activity fetched successfully",
      data: recentPosts,
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong fetching recent activity",
      data: null,
    };
  }
};

/**
 * Account-wide analytics — combined subscriber growth across every newsletter
 * the user belongs to, plus a ranking of their top newsletters by active
 * subscriber count. Distinct from `getNewsletterAnalytics` (services/
 * analytics.ts), which is scoped to one newsletter.
 */
export const getAccountAnalytics = async (
  userId: string,
  days: number = 30
): Promise<ServiceResponse> => {
  try {
    const userNewsletters = await db
      .select({ id: newsletters.id })
      .from(newsletters)
      .innerJoin(newsletterMembers, eq(newsletters.id, newsletterMembers.newsletterId))
      .where(eq(newsletterMembers.userId, userId));

    const newsletterIds = userNewsletters.map((p) => p.id);

    if (newsletterIds.length === 0) {
      return {
        success: true,
        message: "No analytics yet",
        data: { chartData: [], topNewsletters: [] },
      };
    }

    const now = new Date();
    const timeframeDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Combined daily new-subscriber counts across every newsletter.
    const dailyGrowth = await db
      .select({
        date: sql<string>`date_trunc('day', ${subscribers.createdAt})`,
        count: sql<number>`count(${subscribers.id})::int`,
      })
      .from(subscribers)
      .where(
        and(
          inArray(subscribers.newsletterId, newsletterIds),
          gte(subscribers.createdAt, timeframeDate)
        )
      )
      .groupBy(sql`1`)
      .orderBy(sql`1 asc`);

    // Fill gaps so the chart shows a continuous line, not just days with signups.
    const chartStartDate = new Date(timeframeDate);
    chartStartDate.setHours(0, 0, 0, 0);
    const chartData = [];
    for (let i = 0; i <= days; i++) {
      const d = new Date(chartStartDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split("T")[0];
      const existing = dailyGrowth.find(
        (row) => new Date(row.date).toISOString().split("T")[0] === dateStr
      );
      chartData.push({ date: dateStr, count: existing ? existing.count : 0 });
    }

    // Top newsletters by active subscriber count.
    const topNewsletters = await db
      .select({
        id: newsletters.id,
        name: newsletters.name,
        slug: newsletters.slug,
        subscriberCount: count(subscribers.id),
      })
      .from(newsletters)
      .innerJoin(newsletterMembers, eq(newsletters.id, newsletterMembers.newsletterId))
      .leftJoin(
        subscribers,
        and(
          eq(subscribers.newsletterId, newsletters.id),
          eq(subscribers.status, "subscribed")
        )
      )
      .where(eq(newsletterMembers.userId, userId))
      .groupBy(newsletters.id)
      .orderBy(desc(count(subscribers.id)))
      .limit(5);

    return {
      success: true,
      message: "Account analytics fetched successfully",
      data: { chartData, topNewsletters },
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong fetching account analytics",
      data: null,
    };
  }
};
