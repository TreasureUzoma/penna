"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";

const config = { views: { label: "Views", color: "var(--primary)" } } satisfies ChartConfig;

export function PublicViewsChart({ data }: { data: Array<{ date: string; views: number }> }) {
  const chartData = data.map((item) => ({
    date: new Date(`${item.date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    views: Number(item.views),
  }));

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg font-semibold">Public page views</CardTitle></CardHeader>
      <CardContent>
        <div className="h-[230px] w-full">
          <ChartContainer config={config} className="h-full w-full">
            <AreaChart data={chartData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} />
              <YAxis tickLine={false} axisLine={false} hide />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
              <Area dataKey="views" type="natural" fill="var(--color-views)" fillOpacity={0.1} stroke="var(--color-views)" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
