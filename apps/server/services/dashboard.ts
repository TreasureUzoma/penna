import { db } from "@workspace/db";
import {
  emails,
  payments,
  projectMembers,
  projects,
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
    const userProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .innerJoin(projectMembers, eq(projects.id, projectMembers.projectId))
      .where(eq(projectMembers.userId, userId));

    const projectIds = userProjects.map((p) => p.id);

    let totalProjects = projectIds.length;
    let totalSubscribers = 0;
    let totalRevenue = 0;
    let totalPosts = 0;

    if (projectIds.length > 0) {
      const [subStats] = await db
        .select({ count: count() })
        .from(subscribers)
        .where(inArray(subscribers.projectId, projectIds));
      totalSubscribers = subStats?.count ?? 0;

      const [revStats] = await db
        .select({ total: sum(payments.amount) })
        .from(payments)
        .where(inArray(payments.projectId, projectIds));
      totalRevenue = revStats?.total ? parseInt(revStats.total) : 0;

      const [postStats] = await db
        .select({ count: count() })
        .from(emails)
        .where(inArray(emails.projectId, projectIds));
      totalPosts = postStats?.count ?? 0;
    }

    const offset = (page - 1) * limit;

    let orderBy;
    switch (sort) {
      case "name":
        orderBy = asc(projects.name);
        break;
      case "oldest":
        orderBy = asc(projects.createdAt);
        break;
      case "newest":
      case "activity":
      default:
        orderBy = desc(projects.createdAt);
        break;
      // Note: Sorting by revenue or subscribers would require complex joins/subqueries
      // For now, we'll fallback to createdAt for these complex sorts or implement them if strictly needed
      // im only implementing simple ones first.
    }

    // Build where conditions
    const whereConditions = [eq(projectMembers.userId, userId)];

    if (search && search.trim()) {
      whereConditions.push(
        sql`LOWER(${projects.name}) LIKE LOWER(${"%" + search + "%"})`
      );
    }

    const dbQuery = db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        role: projectMembers.role,
        slug: projects.slug,
      })
      .from(projects)
      .innerJoin(projectMembers, eq(projects.id, projectMembers.projectId))
      .where(and(...whereConditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const countQuery = db
      .select({ count: count() })
      .from(projects)
      .innerJoin(projectMembers, eq(projects.id, projectMembers.projectId))
      .where(and(...whereConditions));

    const projectsData = await paginate(dbQuery, countQuery, page, limit);

    return {
      success: true,
      message: "Dashboard overview fetched successfully",
      data: {
        stats: {
          totalProjects,
          totalSubscribers,
          totalRevenue,
          totalPosts,
        },
        projects: projectsData,
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
 * The most recently *actually sent* posts across every project the user
 * belongs to — scheduled-but-not-yet-sent posts are excluded (they're not
 * "activity" yet), matching the same published-and-sentAt-has-passed check
 * used to lock post editing (see the dashboard's posts/[postId] page).
 */
export const getRecentActivity = async (
  userId: string,
  limit = 5
): Promise<ServiceResponse> => {
  try {
    const userProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .innerJoin(projectMembers, eq(projects.id, projectMembers.projectId))
      .where(eq(projectMembers.userId, userId));

    const projectIds = userProjects.map((p) => p.id);

    if (projectIds.length === 0) {
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
        projectId: emails.projectId,
        projectName: projects.name,
        projectSlug: projects.slug,
      })
      .from(emails)
      .innerJoin(projects, eq(emails.projectId, projects.id))
      .where(
        and(
          inArray(emails.projectId, projectIds),
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
 * Account-wide analytics — combined subscriber growth across every project
 * the user belongs to, plus a ranking of their top projects by active
 * subscriber count. Distinct from `getProjectAnalytics` (services/
 * analytics.ts), which is scoped to one project.
 */
export const getAccountAnalytics = async (
  userId: string,
  days: number = 30
): Promise<ServiceResponse> => {
  try {
    const userProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .innerJoin(projectMembers, eq(projects.id, projectMembers.projectId))
      .where(eq(projectMembers.userId, userId));

    const projectIds = userProjects.map((p) => p.id);

    if (projectIds.length === 0) {
      return {
        success: true,
        message: "No analytics yet",
        data: { chartData: [], topProjects: [] },
      };
    }

    const now = new Date();
    const timeframeDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Combined daily new-subscriber counts across every project.
    const dailyGrowth = await db
      .select({
        date: sql<string>`date_trunc('day', ${subscribers.createdAt})`,
        count: sql<number>`count(${subscribers.id})::int`,
      })
      .from(subscribers)
      .where(
        and(
          inArray(subscribers.projectId, projectIds),
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

    // Top projects by active subscriber count.
    const topProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        subscriberCount: count(subscribers.id),
      })
      .from(projects)
      .innerJoin(projectMembers, eq(projects.id, projectMembers.projectId))
      .leftJoin(
        subscribers,
        and(
          eq(subscribers.projectId, projects.id),
          eq(subscribers.status, "subscribed")
        )
      )
      .where(eq(projectMembers.userId, userId))
      .groupBy(projects.id)
      .orderBy(desc(count(subscribers.id)))
      .limit(5);

    return {
      success: true,
      message: "Account analytics fetched successfully",
      data: { chartData, topProjects },
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
