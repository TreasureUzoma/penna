import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Users, TrendingUp, Mail, Send } from "lucide-react";
import numeral from "numeral";

interface KPICardsProps {
  stats?: {
    totalSubscribers: number;
    growth7d: number;
    growth30d: number;
    lastPostSent: string | null;
    openRate: number;
  };
}

export function KPICards({ stats }: KPICardsProps) {
  const lastSent = stats?.lastPostSent
    ? new Date(stats.lastPostSent).toLocaleDateString()
    : "Never";

  const kpis = [
    {
      title: "Subscribers",
      value: numeral(stats?.totalSubscribers).format("0,0"),
      description: "Total active subscribers",
      icon: Users,
    },
    {
      title: "Growth",
      value: `+${stats?.growth7d ?? 0}`,
      description: "New subscribers this week",
      icon: TrendingUp,
      trend:
        stats?.growth7d && stats?.totalSubscribers
          ? ((stats.growth7d / stats.totalSubscribers) * 100).toFixed(1) + "%"
          : "0%",
    },
    {
      title: "Open Rate",
      value: "-",
      description: "Average for last campaign",
      icon: Mail,
    },
    {
      title: "Last Sent",
      value: lastSent,
      description: "Most recent newsletter",
      icon: Send,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title}>
          <CardHeader>
            <CardTitle>{kpi.title}</CardTitle>
            <kpi.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpi.trend && (
                <span className="text-emerald-500 font-medium mr-1">
                  {kpi.trend}
                </span>
              )}
              {kpi.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
