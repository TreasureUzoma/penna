"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useNewsletter, useNewsletterAnalytics } from "@/hooks/use-newsletters";
import { Loader2 } from "lucide-react";
import { KPICards } from "./components/overview/kpi-cards";
import { KPICardsSkeleton } from "./components/overview/kpi-cards-skeleton";
import { GrowthChart } from "./components/overview/growth-chart";
import { GrowthChartSkeleton } from "./components/overview/growth-chart-skeleton";
import { ActivityFeed } from "./components/overview/activity-feed";
import { ActivityFeedSkeleton } from "./components/overview/activity-feed-skeleton";
import { LatestPost } from "./components/overview/latest-post";
import { LatestPostSkeleton } from "./components/overview/latest-post-skeleton";
import { NewsletterCTA } from "./components/overview/newsletter-cta";

export default function NewsletterOverviewPage() {
  const params = useParams();
  const slug = params.id as string;
  const [timeframe, setTimeframe] = useState(30);

  const { data: newsletter, isLoading: isNewsletterLoading } = useNewsletter(slug);
  const { data: analytics, isLoading: isAnalyticsLoading } =
    useNewsletterAnalytics(newsletter?.id ?? "", timeframe);

  if (isNewsletterLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!newsletter) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <p className="text-xl font-semibold">Newsletter not found</p>
        <p className="text-muted-foreground text-sm">
          The newsletter you're looking for doesn't exist or you don't have access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <p className="text-muted-foreground">
        A snapshot of your newsletter's health and activity.
      </p>

      {isAnalyticsLoading ? (
        <KPICardsSkeleton />
      ) : (
        <KPICards stats={analytics?.stats} />
      )}

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isAnalyticsLoading ? (
          <LatestPostSkeleton />
        ) : (
          <LatestPost post={analytics?.lastPost} />
        )}
        <NewsletterCTA newsletter={newsletter} stats={analytics?.stats} />
      </div>
    </div>
  );
}
