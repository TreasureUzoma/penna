import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { UserPlus, Send, AlertCircle, FileEdit } from "lucide-react";

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
  const getIcon = (type: string) => {
    switch (type) {
      case "subscriber":
        return UserPlus;
      case "email":
        return Send;
      case "draft":
        return FileEdit;
      default:
        return AlertCircle;
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
    <Card className="h-full">
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
            const Icon = getIcon(activity.type);
            return (
              <div key={activity.id} className="flex gap-4">
                <div className="mt-1">
                  <div className="p-2 rounded-full bg-neutral-100">
                    <Icon className="h-4 w-4 text-neutral-600" />
                  </div>
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
