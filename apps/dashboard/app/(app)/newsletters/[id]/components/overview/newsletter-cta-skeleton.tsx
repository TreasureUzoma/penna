import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

export function NewsletterCTASkeleton() {
  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
        <div className="mt-8">
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
