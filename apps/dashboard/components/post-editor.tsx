"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCreateEmail, useUpdateEmail } from "@/hooks/use-emails";
import { useSegments } from "@/hooks/use-segments";
import { useSubscribers } from "@/hooks/use-subscribers";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { MarkdownSplitEditor } from "@/components/markdown-split-editor";
import { Loader2, Info } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlbumIcon,
  Calendar02Icon,
  SendIcon,
  ShieldAlertIcon,
  UsersRoundIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Badge } from "@workspace/ui/components/badge";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@workspace/ui/components/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";

export interface PostEditorProps {
  newsletterId: string;
  postId?: string;
  initialData?: {
    subject?: string;
    body?: string;
    status?: "published" | "draft";
    sentAt?: string;
    moderationBlockedReason?: string | null;
  };
}

export function PostEditor({
  newsletterId,
  postId,
  initialData,
}: PostEditorProps): React.JSX.Element {
  const router = useRouter();
  const isEditing = Boolean(postId);

  const { mutate: createEmail, isPending: isCreating } =
    useCreateEmail(newsletterId);
  const { mutate: updateEmail, isPending: isUpdating } =
    useUpdateEmail(newsletterId);

  const isPending = isCreating || isUpdating;

  const { data: segments } = useSegments(newsletterId);
  const { data: subscribersData } = useSubscribers(newsletterId, 1, 1000);

  const [subject, setSubject] = useState(initialData?.subject || "");
  const [content, setContent] = useState(initialData?.body || "");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [isRecipientsOpen, setIsRecipientsOpen] = useState(false);

  const [pendingAction, setPendingAction] = useState<
    "draft" | "save" | "schedule" | "publish" | null
  >(null);

  useEffect(() => {
    if (initialData) {
      if (initialData.subject !== undefined) setSubject(initialData.subject);
      if (initialData.body !== undefined) setContent(initialData.body);
      if (initialData.sentAt) {
        const date = new Date(initialData.sentAt);
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        setScheduledDate(date.toISOString().slice(0, 16));
      }
    }
  }, [initialData]);

  // A post is already sent if it's an existing post with status "published"
  // and its sentAt date is in the past.
  const isAlreadySent = Boolean(
    isEditing &&
      initialData?.status === "published" &&
      initialData?.sentAt &&
      new Date(initialData.sentAt).getTime() <= Date.now(),
  );

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
      return subscribersData?.meta?.total || 0;
    }
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
    if (!subject.trim()) {
      toast.error("Subject is required");
      return false;
    }
    if (!content.trim()) {
      toast.error("Content is required");
      return false;
    }
    return true;
  };

  const handleSaveDraftOrChanges = () => {
    if (!validateFields()) return;

    if (isEditing && postId) {
      setPendingAction("save");
      updateEmail(
        {
          emailId: postId,
          subject,
          body: content,
        },
        {
          onSuccess: () => {
            toast.success(
              isAlreadySent
                ? "Post updated successfully"
                : "Changes saved",
            );
            router.push(`/newsletters/${newsletterId}/posts`);
          },
          onSettled: () => setPendingAction(null),
        },
      );
    } else {
      setPendingAction("draft");
      createEmail(
        {
          subject,
          body: content,
          segmentIds:
            selectedSegments.length > 0 ? selectedSegments : undefined,
        },
        {
          onSuccess: () => {
            toast.success("Draft saved");
            router.push(`/newsletters/${newsletterId}/posts`);
          },
          onSettled: () => setPendingAction(null),
        },
      );
    }
  };

  const handleSchedule = () => {
    if (!validateFields()) return;
    if (!scheduledDate) return;

    setPendingAction("schedule");
    const payload = {
      subject,
      body: content,
      sentAt: new Date(scheduledDate).toISOString(),
      status: "published" as const,
      segmentIds: selectedSegments.length > 0 ? selectedSegments : undefined,
    };

    if (isEditing && postId) {
      updateEmail(
        { emailId: postId, ...payload },
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
    } else {
      createEmail(payload, {
        onSuccess: () => {
          setIsScheduleOpen(false);
          toast.success(
            `Post scheduled for ${new Date(scheduledDate).toLocaleString()}`,
          );
          router.push(`/newsletters/${newsletterId}/posts`);
        },
        onSettled: () => setPendingAction(null),
      });
    }
  };

  const handlePublishNow = () => {
    if (!validateFields()) return;

    setPendingAction("publish");
    const payload = {
      subject,
      body: content,
      status: "published" as const,
      segmentIds: selectedSegments.length > 0 ? selectedSegments : undefined,
    };

    if (isEditing && postId) {
      updateEmail(
        { emailId: postId, ...payload },
        {
          onSuccess: () => {
            toast.success("Post published — sending now");
            router.push(`/newsletters/${newsletterId}/posts`);
          },
          onSettled: () => setPendingAction(null),
        },
      );
    } else {
      createEmail(payload, {
        onSuccess: () => {
          toast.success("Post published — sending now");
          router.push(`/newsletters/${newsletterId}/posts`);
        },
        onSettled: () => setPendingAction(null),
      });
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] -m-4 sm:-m-8 px-4 sm:px-8 py-4 gap-4 overflow-y-auto md:overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {isEditing ? "Edit Post" : "Create Post"}
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

          {!isAlreadySent && (
            <Popover
              open={isRecipientsOpen}
              onOpenChange={setIsRecipientsOpen}
            >
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" disabled={isPending}>
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
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDraftOrChanges}
            disabled={isPending}
          >
            {(pendingAction === "draft" || pendingAction === "save") && (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            )}
            <HugeiconsIcon icon={AlbumIcon} className="w-3.5 h-3.5 mr-1.5" />
            {isAlreadySent
              ? "Save Changes"
              : isEditing
                ? "Save Draft"
                : "Save Draft"}
          </Button>

          {!isAlreadySent && (
            <>
              <Popover open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isPending}>
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
                      <h4 className="font-medium leading-none">
                        Schedule Post
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Pick a future date and time — the post sends
                        automatically then. To send right away, use{" "}
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
                        disabled={isPending || !scheduledDate}
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

              <Button
                size="sm"
                onClick={handlePublishNow}
                disabled={isPending}
              >
                {pendingAction === "publish" && (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                )}
                <HugeiconsIcon
                  icon={SendIcon}
                  className="w-3.5 h-3.5 mr-1.5"
                />
                Publish
              </Button>
            </>
          )}
        </div>
      </div>

      {isAlreadySent && (
        <Alert className="shrink-0 bg-blue-50/50 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <AlertTitle className="font-semibold text-blue-900 dark:text-blue-100">
            Note on Editing Sent Posts
          </AlertTitle>
          <AlertDescription className="text-xs text-blue-800 dark:text-blue-300">
            Editing this post updates the version published on your newsletter's public website and web archive. It does not edit or re-send the email that was already sent to subscribers' inboxes.
          </AlertDescription>
        </Alert>
      )}

      {initialData?.moderationBlockedReason && (
        <Alert variant="destructive" className="shrink-0">
          <HugeiconsIcon icon={ShieldAlertIcon} />
          <AlertTitle>Blocked by content moderation</AlertTitle>
          <AlertDescription>
            <p>{initialData.moderationBlockedReason}</p>
            <p>
              This was reverted to a draft instead of sending — edit the content
              and try publishing again.
            </p>
          </AlertDescription>
        </Alert>
      )}

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
