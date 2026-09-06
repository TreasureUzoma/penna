import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Send } from "lucide-react";
import Link from "next/link";
import type { RecentActivityItem } from "@/hooks/use-dashboard";

interface RecentActivityProps {
  activity?: RecentActivityItem[];
}

function getTimeAgo(date: string) {
  try {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return "";
  }
}

/**
 * Account-wide counterpart to the per-newsletter ActivityFeed
 * (newsletters/[id]/components/overview/activity-feed.tsx) — same visual
 * language, but spans every newsletter the user belongs to, so each item
 * links out to its own newsletter.
 */
export function RecentActivity({ activity }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {activity?.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No posts sent yet across your newsletters.
            </p>
          )}
          {activity?.map((item) => (
            <Link
              key={item.id}
              href={`/newsletters/${item.newsletterSlug}/posts/${item.id}`}
              className="flex gap-4 -mx-2 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors"
            >
              <div className="mt-1">
                <div className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <Send className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                </div>
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                <p className="text-sm font-medium leading-tight truncate">
                  <span className="font-semibold">"{item.subject}"</span>{" "}
                  sent from {item.newsletterName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getTimeAgo(item.sentAt)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
