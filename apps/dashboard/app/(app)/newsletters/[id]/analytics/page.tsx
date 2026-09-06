"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useNewsletter, useNewsletterAnalytics } from "@/hooks/use-newsletters";
import { useEmails } from "@/hooks/use-emails";
import { Loader2, Mail, MailX, MailWarning, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import Link from "next/link";
import numeral from "numeral";
import { GrowthChart } from "../components/overview/growth-chart";
import { GrowthChartSkeleton } from "../components/overview/growth-chart-skeleton";
import { ActivityFeed } from "../components/overview/activity-feed";
import { ActivityFeedSkeleton } from "../components/overview/activity-feed-skeleton";

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

  const { data: newsletter, isLoading: isNewsletterLoading } = useNewsletter(slug);
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
      icon: Mail,
      color: "text-emerald-500",
    },
    {
      label: "Unsubscribed",
      value: breakdown?.unsubscribed ?? 0,
      icon: MailX,
      color: "text-muted-foreground",
    },
    {
      label: "Bounced",
      value: breakdown?.bounced ?? 0,
      icon: MailWarning,
      color: "text-amber-500",
    },
    {
      label: "Pending",
      value: breakdown?.pending ?? 0,
      icon: Clock,
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
        new Date(email.sentAt).getTime() <= Date.now()
    )
    .sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    );

  return (
    <div className="space-y-8 pb-10">
      <p className="text-muted-foreground">
        Subscriber health and send history for this newsletter.
      </p>

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
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
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

      <Card>
        <CardHeader>
          <CardTitle>Send History</CardTitle>
        </CardHeader>
        <CardContent>
          {isEmailsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : sendHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No posts sent yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sendHistory.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/newsletters/${slug}/posts/${email.id}`}
                        className="hover:underline"
                      >
                        {email.subject}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(email.sentAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
