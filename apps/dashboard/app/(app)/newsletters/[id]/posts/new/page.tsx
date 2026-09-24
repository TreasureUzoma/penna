"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCreateEmail } from "@/hooks/use-emails";
import { useSegments } from "@/hooks/use-segments";
import { useSubscribers } from "@/hooks/use-subscribers";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { MarkdownSplitEditor } from "@/components/markdown-split-editor";
import { Loader2 } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlbumIcon,
  Calendar02Icon,
  SendIcon,
  UsersRoundIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Badge } from "@workspace/ui/components/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";

export default function NewPostPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const newsletterId = params.id as string;

  const { mutate: createEmail, isPending: isCreating } =
    useCreateEmail(newsletterId);
  const { data: segments } = useSegments(newsletterId);
  const { data: subscribersData } = useSubscribers(newsletterId, 1, 1000);

  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [isRecipientsOpen, setIsRecipientsOpen] = useState(false);

  // Save/Schedule/Publish all share one mutation, so `isCreating` alone
  // can't tell them apart — without this, clicking one spins every button.
  const [pendingAction, setPendingAction] = useState<
    "draft" | "schedule" | "publish" | null
  >(null);

  // "YYYY-MM-DDTHH:mm" in local time, for the datetime-local input's `min` —
  // stops the popover from accepting a "scheduled" time that's already in
  // the past, which is the same confusing overlap Publish Now exists to
  // avoid: scheduling should always mean "later," never "right now."
  const toLocalDatetimeValue = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const minScheduleValue = toLocalDatetimeValue(new Date());

  const handleSegmentToggle = (segmentId: string) => {
    setSelectedSegments((prev) =>
      prev.includes(segmentId)
        ? prev.filter((id) => id !== segmentId)
        : [...prev, segmentId],
    );
  };

  const getRecipientCount = () => {
    if (selectedSegments.length === 0) {
      // All subscribers
      return subscribersData?.meta?.total || 0;
    }
    // Sum up unique subscribers from selected segments
    const selectedSegmentData = segments?.filter((s) =>
      selectedSegments.includes(s.id),
    );
    const uniqueCount = selectedSegmentData?.reduce(
      (sum, seg) => sum + seg.subscriberCount,
      0,
    );
    return uniqueCount || 0;
  };

  const validateFields = () => {
    if (!subject) {
      toast.error("Subject is required");
      return false;
    }
    if (!content) {
      toast.error("Content is required");
      return false;
    }
    return true;
  };

  const handleSchedule = () => {
    if (!validateFields()) return;
    if (!scheduledDate) return;

    setPendingAction("schedule");
    createEmail(
      {
        subject,
        body: content,
        sentAt: new Date(scheduledDate).toISOString(),
        status: "published",
        segmentIds: selectedSegments.length > 0 ? selectedSegments : undefined,
      },
      {
        onSuccess: () => {
          setIsScheduleOpen(false);
          toast.success(
            `Post scheduled for ${new Date(scheduledDate).toLocaleString()}`,
          );
          router.push(`/newsletters/${newsletterId}/posts`);
        },
        onSettled: () => setPendingAction(null),
      },
    );
  };

  const handlePublishNow = () => {
    if (!validateFields()) return;

    setPendingAction("publish");
    createEmail(
      {
        subject,
        body: content,
        status: "published",
        segmentIds: selectedSegments.length > 0 ? selectedSegments : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Post published — sending now");
          router.push(`/newsletters/${newsletterId}/posts`);
        },
        onSettled: () => setPendingAction(null),
      },
    );
  };

  const handleSaveDraft = () => {
    if (!validateFields()) return;

    setPendingAction("draft");
    createEmail(
      {
        subject,
        body: content,
        segmentIds: selectedSegments.length > 0 ? selectedSegments : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Draft saved");
          router.push(`/newsletters/${newsletterId}/posts`);
        },
        onSettled: () => setPendingAction(null),
      },
    );
  };

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] -m-4 sm:-m-8 px-4 sm:px-8 py-4 gap-4 overflow-y-auto md:overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Create Post
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/newsletters/${newsletterId}/posts`)}
          >
            Cancel
          </Button>
          <Popover open={isRecipientsOpen} onOpenChange={setIsRecipientsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" disabled={isCreating}>
                <HugeiconsIcon
                  icon={UsersRoundIcon}
                  className="w-3.5 h-3.5 mr-1.5"
                />
                Recipients{" "}
                <Badge
                  variant="secondary"
                  className="ml-1.5 text-[10px] px-1.5 py-0"
                >
                  {getRecipientCount()}
                </Badge>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 max-w-[calc(100vw-2rem)]"
              align="end"
            >
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">
                    Select Recipients
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Choose which segments to send to, or leave all unchecked to
                    send to all subscribers.
                  </p>
                </div>
                {segments && segments.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {segments.map((segment) => (
                      <div
                        key={segment.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`segment-${segment.id}`}
                          checked={selectedSegments.includes(segment.id)}
                          onCheckedChange={() =>
                            handleSegmentToggle(segment.id)
                          }
                        />
                        <label
                          htmlFor={`segment-${segment.id}`}
                          className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {segment.name}
                          <span className="text-muted-foreground ml-1.5">
                            ({segment.subscriberCount})
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No segments available. All subscribers will receive this
                    post.
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            disabled={isCreating}
          >
            {pendingAction === "draft" && (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            )}
            <HugeiconsIcon icon={AlbumIcon} className="w-3.5 h-3.5 mr-1.5" />
            Save Draft
          </Button>
          <Popover open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" disabled={isCreating}>
                <HugeiconsIcon
                  icon={Calendar02Icon}
                  className="w-3.5 h-3.5 mr-1.5"
                />
                Schedule
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 max-w-[calc(100vw-2rem)]"
              align="end"
            >
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Schedule Post</h4>
                  <p className="text-xs text-muted-foreground">
                    Pick a future date and time — the post sends automatically
                    then. To send right away, use{" "}
                    <span className="font-medium text-foreground">
                      Publish Now
                    </span>{" "}
                    instead.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Input
                    type="datetime-local"
                    min={minScheduleValue}
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleSchedule}
                    disabled={isCreating || !scheduledDate}
                  >
                    {pendingAction === "schedule" && (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    )}
                    Confirm Schedule
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button size="sm" onClick={handlePublishNow} disabled={isCreating}>
            {pendingAction === "publish" && (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            )}
            <HugeiconsIcon icon={SendIcon} className="w-3.5 h-3.5 mr-1.5" />
            Publish
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-[450px] md:min-h-0 overflow-hidden border-0 shadow-none bg-transparent">
        <CardContent className="p-0 h-full flex flex-col gap-3">
          <div className="shrink-0 bg-background border rounded-lg p-3 space-y-0.5">
            <label className="text-xs sm:text-sm font-medium">
              Subject Line
            </label>
            <Input
              placeholder="Enter an engaging subject line..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-base sm:text-lg font-medium border-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50 h-auto p-0"
            />
          </div>

          <div className="flex-1 min-h-0">
            <MarkdownSplitEditor
              value={content}
              onChange={setContent}
              className="h-full shadow-sm"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
