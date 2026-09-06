"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

interface GrowthChartProps {
  data?: Array<{
    date: string;
    count: number;
  }>;
  timeframe: number;
  onTimeframeChange: (timeframe: number) => void;
}

const chartConfig = {
  count: {
    label: "Subscribers",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function GrowthChart({
  data,
  timeframe,
  onTimeframeChange,
}: GrowthChartProps) {
  const chartData =
    data?.map((d) => ({
      date: new Date(d.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      count: Number(d.count),
    })) || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-semibold">
          Subscriber Growth
        </CardTitle>
        <Tabs
          value={timeframe.toString()}
          onValueChange={(v) => onTimeframeChange(parseInt(v))}
        >
          <TabsList className="h-8">
            <TabsTrigger value="7" className="text-xs">
              7d
            </TabsTrigger>
            <TabsTrigger value="30" className="text-xs">
              30d
            </TabsTrigger>
            <TabsTrigger value="90" className="text-xs">
              90d
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full mt-4">
          {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <AreaChart
                data={chartData}
                margin={{
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="rgba(0,0,0,0.05)"
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} hide />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Area
                  dataKey="count"
                  type="natural"
                  fill="var(--color-count)"
                  fillOpacity={0.1}
                  stroke="var(--color-count)"
                  strokeWidth={2}
                  stackId="a"
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
              <p className="text-sm text-muted-foreground">
                Not enough data to show growth
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
