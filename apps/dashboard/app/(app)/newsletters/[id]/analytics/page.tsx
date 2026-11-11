"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useNewsletter, useNewsletterAnalytics } from "@/hooks/use-newsletters";
import { useEmails } from "@/hooks/use-emails";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import numeral from "numeral";
import { GrowthChart } from "../components/overview/growth-chart";
import { GrowthChartSkeleton } from "../components/overview/growth-chart-skeleton";
import { ActivityFeed } from "../components/overview/activity-feed";
import { ActivityFeedSkeleton } from "../components/overview/activity-feed-skeleton";
import { PublicViewsChart } from "../components/public-views-chart";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Clock01Icon,
  MailIcon,
  MailWarningIcon,
  MailXIcon,
} from "@hugeicons/core-free-icons";

/**
 * Deliberately distinct from the Overview tab rather than repeating its
 * KPI cards: subscriber health (subscribed/unsubscribed/bounced — real now
 * that the SES bounce/complaint webhook actually suppresses subscribers)
 * and the full send history, not just the single "latest post" Overview
 * already shows. The growth chart and activity feed are the same
 * components Overview uses (same underlying data), since this tab is
 * where someone actually wants to dig into them at a chosen timeframe
 * rather than the one preset Overview shows.
 */
export default function NewsletterAnalyticsPage() {
  const params = useParams();
  const slug = params.id as string;
  const [timeframe, setTimeframe] = useState(30);

  const { data: newsletter, isLoading: isNewsletterLoading } =
    useNewsletter(slug);
  const { data: analytics, isLoading: isAnalyticsLoading } =
    useNewsletterAnalytics(newsletter?.id ?? "", timeframe);
  const { data: emails, isLoading: isEmailsLoading } = useEmails(slug);

  if (isNewsletterLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const breakdown = analytics?.statusBreakdown;
  const statusCards = [
    {
      label: "Subscribed",
      value: breakdown?.subscribed ?? 0,
      icon: MailIcon,
      color: "text-emerald-500",
    },
    {
      label: "Unsubscribed",
      value: breakdown?.unsubscribed ?? 0,
      icon: MailXIcon,
      color: "text-muted-foreground",
    },
    {
      label: "Bounced",
      value: breakdown?.bounced ?? 0,
      icon: MailWarningIcon,
      color: "text-amber-500",
    },
    {
      label: "Pending",
      value: breakdown?.pending ?? 0,
      icon: Clock01Icon,
      color: "text-blue-500",
    },
  ];

  // Same "actually sent" definition used everywhere else (posts list
  // status badges, the edit-lock, account-wide recent activity): status
  // published AND sentAt has actually passed — excludes scheduled posts
  // that haven't gone out yet.

  return (
    <div className="space-y-8 pb-10">
      <p className="text-muted-foreground">
        Subscriber health and send history for this newsletter.
      </p>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Public page views</h2>
        {isAnalyticsLoading ? (
          <Card>
            <CardHeader><div className="h-5 w-36 animate-pulse rounded bg-muted" /></CardHeader>
            <CardContent><div className="h-[230px] w-full animate-pulse rounded-md bg-muted/60" /></CardContent>
          </Card>
        ) : analytics?.publicViews?.byDay ? (
          <PublicViewsChart data={analytics.publicViews.byDay} />
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {isAnalyticsLoading ? (
            [...Array(2)].map((_, cardIndex) => (
              <Card key={cardIndex}>
                <CardHeader><div className="h-4 w-40 animate-pulse rounded bg-muted" /></CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-7 w-24 animate-pulse rounded bg-muted/70" />
                  {cardIndex === 1 && [...Array(3)].map((__, rowIndex) => (
                    <div key={rowIndex} className="h-4 w-full animate-pulse rounded bg-muted/50" />
                  ))}
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Views in selected period</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-semibold">{numeral(analytics?.publicViews?.total ?? 0).format("0,0")}</p></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Most viewed public posts</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {(analytics?.publicViews?.popularPosts ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No public post views in this period yet.</p>
                  ) : analytics!.publicViews.popularPosts.map((post) => (
                    <div key={post.postId} className="flex justify-between gap-4 text-sm">
                      <span className="truncate">{post.subject}</span>
                      <span className="tabular-nums text-muted-foreground">{numeral(post.views).format("0,0")}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Sent campaigns</h2>
        <Card>
          <CardContent className="pt-6">
            {isAnalyticsLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="grid gap-3 border-b pb-4 last:border-0 md:grid-cols-[minmax(0,1fr)_repeat(3,auto)] md:items-center md:gap-6">
                    <div className="space-y-2"><div className="h-4 w-48 max-w-full animate-pulse rounded bg-muted" /><div className="h-3 w-24 animate-pulse rounded bg-muted/60" /></div>
                    {[...Array(3)].map((__, metricIndex) => <div key={metricIndex} className="h-4 w-24 animate-pulse rounded bg-muted/60" />)}
                  </div>
                ))}
              </div>
            ) : (analytics?.campaignPerformance ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No campaigns were sent in this period.</p>
            ) : (
              <div className="space-y-4">
                {analytics!.campaignPerformance.map((campaign) => (
                  <div key={campaign.id} className="grid gap-2 border-b pb-4 last:border-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_repeat(3,auto)] md:items-center md:gap-6">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{campaign.subject}</p>
                      <p className="text-xs text-muted-foreground">{new Date(campaign.sentAt).toLocaleDateString()}</p>
                    </div>
                    <p className="text-sm"><span className="text-muted-foreground">Recipients </span>{numeral(campaign.recipients).format("0,0")}</p>
                    <p className="text-sm"><span className="text-muted-foreground">Opens </span>{campaign.openRate === null ? "Not collected" : `${campaign.openRate}%`}</p>
                    <p className="text-sm"><span className="text-muted-foreground">Clicks </span>{campaign.clickRate === null ? "Not collected" : `${campaign.clickRate}%`}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {!newsletter?.canUseEmailTracking && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
          Open and click tracking is available only for newsletters on a Pro
          plan with a verified custom sending domain. Add or verify a domain in
          the Domains tab before turning it on in Settings.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isAnalyticsLoading
          ? [...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-6 w-12 rounded bg-muted animate-pulse" />
                </CardContent>
              </Card>
            ))
          : statusCards.map((stat) => (
              <Card key={stat.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <HugeiconsIcon
                    icon={stat.icon}
                    className={`h-4 w-4 ${stat.color}`}
                  />
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-medium">
                    {numeral(stat.value).format("0,0")}
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {isAnalyticsLoading ? (
            <GrowthChartSkeleton />
          ) : (
            <GrowthChart
              data={analytics?.chartData}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
            />
          )}
        </div>
        <div>
          {isAnalyticsLoading ? (
            <ActivityFeedSkeleton />
          ) : (
            <ActivityFeed activities={analytics?.activity} />
          )}
        </div>
      </div>
    </div>
  );
}
