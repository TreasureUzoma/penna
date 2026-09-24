import { Card, CardContent, CardTitle } from "@workspace/ui/components/card";
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
    },
    {
      title: "Growth",
      value: `+${stats?.growth7d ?? 0}`,
      description: "New subscribers this week",
      trend:
        stats?.growth7d && stats?.totalSubscribers
          ? ((stats.growth7d / stats.totalSubscribers) * 100).toFixed(1) + "%"
          : "0%",
    },
    {
      // Open/click tracking isn't implemented yet (no tracking pixel on
      // sent emails, no click-redirect endpoint) — the API always reports
      // 0 for this. Showing "Coming soon" instead of a value reads as
      // intentional; a bare "-" or a fake "0%" both read as broken data.
      title: "Open Rate",
      value: `${stats?.openRate ?? "-"}%`,
      description: "Unique opens from the latest newsletter",
    },
    {
      title: "Last Sent",
      value: lastSent,
      description: "Most recent newsletter",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title}>
          <CardContent>
            <CardTitle className="my-3 text-xs text-muted-foreground">
              {kpi.title}
            </CardTitle>
            <div className="text-3xl font-bold">{kpi.value}</div>
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
