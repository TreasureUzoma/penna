import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { SubscriberAvatar } from "@/components/subscriber-avatar";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BadgeAlertIcon,
  LicenseDraftIcon,
  SendIcon,
} from "@hugeicons/core-free-icons";

interface ActivityFeedProps {
  activities?: Array<{
    id: string;
    type: "subscriber" | "email";
    name?: string;
    email?: string;
    subject?: string;
    createdAt: string;
  }>;
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  // Subscriber entries render a SubscriberAvatar instead (see below), so
  // this only ever needs to cover the non-subscriber types.
  const getIcon = (type: string) => {
    switch (type) {
      case "email":
        return SendIcon;
      case "draft":
        return LicenseDraftIcon;
      default:
        return BadgeAlertIcon;
    }
  };

  const getTimeAgo = (date: string) => {
    try {
      // Simple relative time if date-fns is not available
      const now = new Date();
      const diff = now.getTime() - new Date(date).getTime();
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
  };

  return (
    <Card className="h-full md:max-h-[60vh] overflow-y-auto">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {activities?.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No recent activity
            </p>
          )}
          {activities?.map((activity) => {
            return (
              <div key={activity.id} className="flex gap-4">
                <div className="mt-1">
                  {activity.type === "subscriber" ? (
                    <SubscriberAvatar
                      name={activity.name}
                      email={activity.email}
                    />
                  ) : (
                    <div className="p-2 rounded-full bg-neutral-100">
                      <HugeiconsIcon
                        icon={getIcon(activity.type)}
                        className="h-4 w-4 text-background"
                      />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-tight">
                    {activity.type === "subscriber" ? (
                      <>
                        <span className="font-semibold">
                          {activity.name || activity.email}
                        </span>{" "}
                        subscribed
                      </>
                    ) : (
                      <>
                        Post{" "}
                        <span className="font-semibold">
                          "{activity.subject}"
                        </span>{" "}
                        sent
                      </>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getTimeAgo(activity.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
