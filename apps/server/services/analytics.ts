import { db } from "@workspace/db";
import { emails, subscribers } from "@workspace/db/schema";
import type { ServiceResponse } from "@workspace/types";
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";

export const getProjectAnalytics = async (
  projectId: string,
  days: number = 30
): Promise<ServiceResponse<any>> => {
  try {
    const now = new Date();
    const timeframeDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Total Subscribers
    const [subStats] = await db
      .select({ count: count() })
      .from(subscribers)
      .where(
        and(
          eq(subscribers.projectId, projectId),
          eq(subscribers.status, "subscribed")
        )
      );
    const totalSubscribers = subStats?.count ?? 0;

    // 2. Growth (7d and 30d)
    const [subStats7d] = await db
      .select({ count: count() })
      .from(subscribers)
      .where(
        and(
          eq(subscribers.projectId, projectId),
          gte(subscribers.createdAt, sevenDaysAgo)
        )
      );
    const growth7d = subStats7d?.count ?? 0;

    const [subStats30d] = await db
      .select({ count: count() })
      .from(subscribers)
      .where(
        and(
          eq(subscribers.projectId, projectId),
          gte(subscribers.createdAt, thirtyDaysAgo)
        )
      );
    const growth30d = subStats30d?.count ?? 0;

    // 3. Last post sent — excludes posts scheduled for the future, which
    // are "published" but haven't actually gone out yet (see the same
    // published-and-sentAt-has-passed check in dashboard/services.ts's
    // getRecentActivity and the posts/[postId] edit-lock).
    const [lastEmail] = await db
      .select()
      .from(emails)
      .where(
        and(
          eq(emails.projectId, projectId),
          eq(emails.status, "published"),
          lte(emails.sentAt, now)
        )
      )
      .orderBy(desc(emails.sentAt))
      .limit(1);

    // 4. Subscriber growth chart
    const dailyGrowth = await db.execute(sql`
      SELECT 
        date_trunc('day', created_at) as date,
        count(id)::int as count
      FROM subscribers
      WHERE project_id = ${projectId}
        AND created_at >= ${timeframeDate}
      GROUP BY 1
      ORDER BY 1 ASC
    `);

    // Fill gaps
    const rows = dailyGrowth.rows as any[];
    const filledData = [];
    const chartStartDate = new Date(timeframeDate);
    chartStartDate.setHours(0, 0, 0, 0);

    for (let i = 0; i <= days; i++) {
      const d = new Date(chartStartDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split("T")[0];

      const existing = rows.find((row) => {
        const rowDate = new Date(row.date);
        return rowDate.toISOString().split("T")[0] === dateStr;
      });

      filledData.push({
        date: dateStr,
        count: existing ? existing.count : 0,
      });
    }

    // 5. Recent Activity Feed
    const recentSubscribers = await db
      .select({
        id: subscribers.id,
        name: subscribers.name,
        email: subscribers.email,
        createdAt: subscribers.createdAt,
        type: sql<string>`'subscriber'`,
      })
      .from(subscribers)
      .where(eq(subscribers.projectId, projectId))
      .orderBy(desc(subscribers.createdAt))
      .limit(5);

    const recentEmails = await db
      .select({
        id: emails.id,
        subject: emails.subject,
        createdAt: emails.sentAt,
        type: sql<string>`'email'`,
      })
      .from(emails)
      .where(
        and(
          eq(emails.projectId, projectId),
          eq(emails.status, "published"),
          lte(emails.sentAt, now)
        )
      )
      .orderBy(desc(emails.sentAt))
      .limit(5);

    // Combine and sort activity
    const activity = [...recentSubscribers, ...recentEmails]
      .sort(
        (a, b) =>
          new Date(b.createdAt as any).getTime() -
          new Date(a.createdAt as any).getTime()
      )
      .slice(0, 10);

    // 6. Subscriber status breakdown — bounced/unsubscribed counts are
    // real now that the SES bounce/complaint webhook (services/mail/
    // ses-events.ts) actually suppresses subscribers on delivery failure.
    const statusRows = await db
      .select({ status: subscribers.status, count: count() })
      .from(subscribers)
      .where(eq(subscribers.projectId, projectId))
      .groupBy(subscribers.status);

    const statusBreakdown = {
      subscribed: 0,
      unsubscribed: 0,
      bounced: 0,
      pending: 0,
    };
    for (const row of statusRows) {
      statusBreakdown[row.status] = row.count;
    }

    return {
      success: true,
      message: "Project analytics fetched successfully",
      data: {
        stats: {
          totalSubscribers,
          growth7d,
          growth30d,
          lastPostSent: lastEmail?.sentAt ?? null,
          openRate: 0, // Mocked for now
        },
        chartData: filledData,
        activity,
        statusBreakdown,
        lastPost: lastEmail
          ? {
              id: lastEmail.id,
              subject: lastEmail.subject,
              sentAt: lastEmail.sentAt,
              openRate: 0, // Mocked
              clickRate: 0, // Mocked
            }
          : null,
      },
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong fetching project analytics",
      data: null,
    };
  }
};
