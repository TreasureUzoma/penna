import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

export function NewsletterListSkeleton() {
  return (
    <div>
      <div className="mb-4">
        <Skeleton className="h-6 w-28" />
      </div>

      <div className="space-y-2 flex flex-col">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="w-full py-3 rounded-sm px-4">
            <CardContent className="space-y-1 p-0">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
