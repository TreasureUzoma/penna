"use client";

import { useState } from "react";
import {
  useDashboardStats,
  useDashboardAnalytics,
  useDashboardActivity,
} from "@/hooks/use-dashboard";
import { DashboardStats } from "../newsletters/components/dashboard-stats";
import { DashboardStatsSkeleton } from "../newsletters/components/dashboard-stats-skeleton";
import { RecentActivity } from "../newsletters/components/recent-activity";
import { GrowthChart } from "../newsletters/[id]/components/overview/growth-chart";
import { GrowthChartSkeleton } from "../newsletters/[id]/components/overview/growth-chart-skeleton";
import { TopNewsletters } from "./components/top-newsletters";

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState(30);

  const { data: statsData, isLoading: isStatsLoading } = useDashboardStats();
  const { data: analyticsData, isLoading: isAnalyticsLoading } =
    useDashboardAnalytics(timeframe);
  const { data: activityData } = useDashboardActivity();

  return (
    <div className="min-h-screen px-8 py-12 flex-col gap-8 flex">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Combined performance across every newsletter you own.
        </p>
      </div>

      {isStatsLoading ? (
        <DashboardStatsSkeleton />
      ) : (
        <DashboardStats stats={statsData?.stats} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
        <div className="lg:col-span-2">
          {isAnalyticsLoading ? (
            <GrowthChartSkeleton />
          ) : (
            <GrowthChart
              data={analyticsData?.chartData}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
            />
          )}
        </div>
        <div>
          <TopNewsletters newsletters={analyticsData?.topNewsletters} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <RecentActivity activity={activityData?.activity} />
        </div>
      </div>
    </div>
  );
}
