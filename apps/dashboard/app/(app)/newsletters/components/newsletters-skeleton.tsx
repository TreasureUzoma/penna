"use client";

import { Card } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

export function NewslettersSkeleton() {
  return (
    <div className="min-h-screen px-4 my-12 flex-col gap-6 flex">
      {/* Header Skeleton */}
      <div className="flex-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats Skeleton */}
      <div className="border rounded-sm p-6 bg-card">
        <div className="flex-between">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border-r pr-6 last:border-0">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Search and Filter Skeleton */}
      <div className="flex items-center justify-center gap-3 w-full">
        <Skeleton className="h-14 w-full flex-1" />
        <Skeleton className="h-14 w-10" />
      </div>

      {/* Newsletter List Skeleton */}
      <div>
        <Skeleton className="h-6 w-24 mb-4" />
        {[1, 2].map((i) => (
          <Card key={i} className="py-4 my-3 px-2">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </Card>
        ))}
      </div>
    </div>
  );
}
