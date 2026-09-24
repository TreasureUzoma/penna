"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useNewsletter, useNewsletterAnalytics } from "@/hooks/use-newsletters";
import { useEmails } from "@/hooks/use-emails";
import { Loader2, Mail, MailX, MailWarning } from "lucide-react";
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
  const sendHistory = (emails ?? [])
    .filter(
      (email) =>
        email.status === "published" &&
        new Date(email.sentAt).getTime() <= Date.now(),
    )
    .sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
    );

  return (
    <div className="space-y-8 pb-10">
      <p className="text-muted-foreground">
        Subscriber health and send history for this newsletter.
      </p>

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
