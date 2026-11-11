import { db } from "@workspace/db";
import { emailRecipients, emails, publicPageViews, subscribers } from "@workspace/db/schema";
import type { ServiceResponse } from "@workspace/types";
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";

export const getNewsletterAnalytics = async (
  newsletterId: string,
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
          eq(subscribers.newsletterId, newsletterId),
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
          eq(subscribers.newsletterId, newsletterId),
          gte(subscribers.createdAt, sevenDaysAgo)
        )
      );
    const growth7d = subStats7d?.count ?? 0;

    const [subStats30d] = await db
      .select({ count: count() })
      .from(subscribers)
      .where(
        and(
          eq(subscribers.newsletterId, newsletterId),
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
          eq(emails.newsletterId, newsletterId),
          eq(emails.status, "published"),
          lte(emails.sentAt, now)
        )
      )
      .orderBy(desc(emails.sentAt))
      .limit(1);

    const [recipientStats] = lastEmail
      ? await db
          .select({
            sent: count(),
            opened: count(emailRecipients.openedAt),
            clicked: count(emailRecipients.clickedAt),
          })
          .from(emailRecipients)
          .where(eq(emailRecipients.emailId, lastEmail.id))
      : [{ sent: 0, opened: 0, clicked: 0 }];
    const sentCount = recipientStats?.sent ?? 0;
    const openRate = sentCount
      ? Number((((recipientStats?.opened ?? 0) / sentCount) * 100).toFixed(1))
      : 0;
    const clickRate = sentCount
      ? Number((((recipientStats?.clicked ?? 0) / sentCount) * 100).toFixed(1))
      : 0;

    // 4. Subscriber growth chart
    const dailyGrowth = await db.execute(sql`
      SELECT 
        date_trunc('day', created_at) as date,
        count(id)::int as count
      FROM subscribers
      WHERE newsletter_id = ${newsletterId}
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
      .where(eq(subscribers.newsletterId, newsletterId))
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
          eq(emails.newsletterId, newsletterId),
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
      .where(eq(subscribers.newsletterId, newsletterId))
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

    const publicViewRows = await db
      .select({ day: publicPageViews.day, views: sql<number>`sum(${publicPageViews.views})::int` })
      .from(publicPageViews)
      .where(and(
        eq(publicPageViews.newsletterId, newsletterId),
        gte(publicPageViews.day, timeframeDate),
      ))
      .groupBy(publicPageViews.day)
      .orderBy(publicPageViews.day);
    const publicViewsByDay = Array.from({ length: days + 1 }, (_, index) => {
      const d = new Date(timeframeDate);
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() + index);
      const date = d.toISOString().slice(0, 10);
      const row = publicViewRows.find((item) =>
        new Date(item.day).toISOString().slice(0, 10) === date,
      );
      return { date, views: row?.views ?? 0 };
    });
    const [publicPageViewsTotal] = await db
      .select({ views: sql<number>`coalesce(sum(${publicPageViews.views}), 0)::int` })
      .from(publicPageViews)
      .where(and(
        eq(publicPageViews.newsletterId, newsletterId),
        gte(publicPageViews.day, timeframeDate),
      ));
    const campaignPerformance = await db
      .select({
        id: emails.id,
        subject: emails.subject,
        sentAt: emails.sentAt,
        recipients: count(emailRecipients.id),
        opened: count(emailRecipients.openedAt),
        clicked: count(emailRecipients.clickedAt),
      })
      .from(emails)
      .leftJoin(emailRecipients, eq(emailRecipients.emailId, emails.id))
      .where(and(
        eq(emails.newsletterId, newsletterId),
        eq(emails.status, "published"),
        gte(emails.sentAt, timeframeDate),
        lte(emails.sentAt, now),
      ))
      .groupBy(emails.id, emails.subject, emails.sentAt)
      .orderBy(desc(emails.sentAt))
      .limit(20);
    const popularPublicPosts = await db
      .select({
        postId: publicPageViews.postId,
        subject: emails.subject,
        views: sql<number>`sum(${publicPageViews.views})::int`,
      })
      .from(publicPageViews)
      .innerJoin(emails, eq(publicPageViews.postId, emails.id))
      .where(and(
        eq(publicPageViews.newsletterId, newsletterId),
        gte(publicPageViews.day, timeframeDate),
      ))
      .groupBy(publicPageViews.postId, emails.subject)
      .orderBy(desc(sql`sum(${publicPageViews.views})`))
      .limit(5);

    return {
      success: true,
      message: "Newsletter analytics fetched successfully",
      data: {
        stats: {
          totalSubscribers,
          growth7d,
          growth30d,
          lastPostSent: lastEmail?.sentAt ?? null,
          openRate,
        },
        chartData: filledData,
        activity,
        statusBreakdown,
        publicViews: {
          total: publicPageViewsTotal?.views ?? 0,
          byDay: publicViewsByDay,
          popularPosts: popularPublicPosts,
        },
        campaignPerformance: campaignPerformance.map((campaign) => ({
          ...campaign,
          openRate: campaign.recipients
            ? Number(((campaign.opened / campaign.recipients) * 100).toFixed(1))
            : null,
          clickRate: campaign.recipients
            ? Number(((campaign.clicked / campaign.recipients) * 100).toFixed(1))
            : null,
        })),
        lastPost: lastEmail
          ? {
              id: lastEmail.id,
              subject: lastEmail.subject,
              sentAt: lastEmail.sentAt,
              openRate,
              clickRate,
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
          : "Something went wrong fetching newsletter analytics",
      data: null,
    };
  }
};

export async function recordPublicPageView(newsletterId: string, postId?: string) {
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  let validPostId: string | null = null;

  if (postId) {
    const [post] = await db
      .select({ id: emails.id })
      .from(emails)
      .where(and(
        eq(emails.id, postId),
        eq(emails.newsletterId, newsletterId),
        eq(emails.status, "published"),
        lte(emails.sentAt, new Date()),
      ))
      .limit(1);
    if (!post) return false;
    validPostId = post.id;
  }

  await db
    .insert(publicPageViews)
    .values({
      newsletterId,
      pageKey: validPostId ?? "",
      postId: validPostId,
      day,
      views: 1,
    })
    .onConflictDoUpdate({
      target: [publicPageViews.newsletterId, publicPageViews.pageKey, publicPageViews.day],
      set: { views: sql`${publicPageViews.views} + 1` },
    });
  return true;
}
