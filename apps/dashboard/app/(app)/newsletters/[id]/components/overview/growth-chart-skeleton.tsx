import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

export function GrowthChartSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-32" />
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full mt-4 flex items-end gap-2">
          {[...Array(15)].map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1"
              style={{ height: `${Math.random() * 100 + 50}px` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
