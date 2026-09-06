"use client";

import numeral from "numeral";
import { FolderKanban, Users, FileText, DollarSign } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

const currencySymbol = "$";

interface DashboardStatsProps {
  stats?: {
    totalNewsletters: number;
    totalSubscribers: number;
    totalRevenue: number;
    totalPosts: number;
  };
  /**
   * Fixed 2x2 grid instead of the viewport-responsive default — for
   * placing this inside a narrower column, where `lg:grid-cols-4` would
   * otherwise still trigger at large viewports regardless of how narrow
   * the actual parent column is (Tailwind breakpoints key off viewport
   * width, not container width).
   */
  compact?: boolean;
}

export function DashboardStats({ stats, compact = false }: DashboardStatsProps) {
  const dashboardStats = [
    {
      title: "Total Newsletters",
      value: stats?.totalNewsletters ?? 0,
      icon: FolderKanban,
    },
    {
      title: "Total Subscribers",
      value: stats?.totalSubscribers ?? 0,
      icon: Users,
    },
    { title: "Total Posts", value: stats?.totalPosts ?? 0, icon: FileText },
    {
      title: "Total Revenue",
      value: stats?.totalRevenue ?? 0,
      icon: DollarSign,
      isCurrency: true,
    },
  ];

  return (
    <div
      className={
        compact ? "grid gap-4 grid-cols-2" : "grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      }
    >
      {dashboardStats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-medium">
              {stat.isCurrency
                ? `${currencySymbol}${numeral(stat.value).format("0,0")}`
                : numeral(stat.value).format("0,0")}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
