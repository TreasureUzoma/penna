"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEmail, useUpdateEmail } from "@/hooks/use-emails";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { MarkdownSplitEditor } from "@/components/markdown-split-editor";
import { Loader2, Save, Send, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@workspace/ui/components/card";
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
import { Calendar as CalendarIcon } from "lucide-react";

export default function EditPostPage(): React.JSX.Element {
  const params = useParams();
  const postId = params.postId as string;
  const newsletterId = params.id as string;
  const router = useRouter();

  const { data: email, isLoading } = useEmail(newsletterId, postId);
  const { mutate: updateEmail, isPending: isUpdating } =
    useUpdateEmail(newsletterId);

  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  // Save/Schedule/Publish all share one mutation, so `isUpdating` alone
  // can't tell them apart — without this, clicking one spins every button.
  const [pendingAction, setPendingAction] = useState<
    "save" | "schedule" | "publish" | null
  >(null);

  useEffect(() => {
    if (email) {
      setSubject(email.subject);
      setContent(email.body || "");
      if (email.sentAt) {
        // Format for datetime-local: YYYY-MM-DDTHH:mm
        const date = new Date(email.sentAt);
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        setScheduledDate(date.toISOString().slice(0, 16));
      }
    }
  }, [email]);

  // "YYYY-MM-DDTHH:mm" in local time, for the datetime-local input's `min` —
  // stops "scheduling" a time that's already in the past, which is the same
  // confusing overlap Publish Now exists to avoid: scheduling should always
  // mean "later," never "right now."
  const toLocalDatetimeValue = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const minScheduleValue = toLocalDatetimeValue(new Date());

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
    updateEmail(
      {
        emailId: postId,
        status: "published",
        sentAt: new Date(scheduledDate).toISOString(),
        subject,
        body: content,
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
    updateEmail(
      {
        emailId: postId,
        status: "published",
        subject,
        body: content,
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

  const handleSave = () => {
    if (!validateFields()) return;

    setPendingAction("save");
    updateEmail(
      {
        emailId: postId,
        subject,
        body: content,
      },
      {
        onSuccess: () => {
          toast.success("Changes saved");
          router.push(`/newsletters/${newsletterId}/posts`);
        },
        onSettled: () => setPendingAction(null),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // A post is only truly "sent" once its status is published AND its
  // sentAt has actually passed — before that it's still scheduled (not yet
  // delivered), and editing it should keep working normally since
  // `prepareEmailSend` reads content fresh right before it fires. Once it
  // has gone out, subscribers already have the old content in their inbox
  // — editing here would silently rewrite the record without resending or
  // notifying anyone, so it's locked to read-only instead.
  const isAlreadySent =
    email?.status === "published" &&
    new Date(email.sentAt).getTime() <= Date.now();

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] -m-4 sm:-m-8 px-4 sm:px-8 py-4 gap-4 overflow-y-auto md:overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {isAlreadySent ? "View Post" : "Edit Post"}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/newsletters/${newsletterId}/posts`)}
          >
            {isAlreadySent ? "Back" : "Cancel"}
          </Button>
          {!isAlreadySent && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isUpdating}
              >
                {pendingAction === "save" && (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                )}
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Save
              </Button>
              <Popover open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isUpdating}>
                    <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                    Schedule
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 max-w-[calc(100vw-2rem)]" align="end">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Schedule Post</h4>
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
                        disabled={isUpdating || !scheduledDate}
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
              <Button size="sm" onClick={handlePublishNow} disabled={isUpdating}>
                {pendingAction === "publish" && (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                )}
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Publish
              </Button>
            </>
          )}
        </div>
      </div>

      {email?.moderationBlockedReason && (
        <Alert variant="destructive" className="shrink-0">
          <ShieldAlert />
          <AlertTitle>Blocked by content moderation</AlertTitle>
          <AlertDescription>
            <p>{email.moderationBlockedReason}</p>
            <p>
              This was reverted to a draft instead of sending — edit the
              content and try publishing again.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <Card className="flex-1 flex flex-col min-h-[450px] md:min-h-0 overflow-hidden border-0 shadow-none bg-transparent">
        <CardContent className="p-0 h-full flex flex-col gap-3">
          <div className="shrink-0 bg-background border rounded-lg p-3 space-y-0.5">
            <label className="text-xs sm:text-sm font-medium">Subject Line</label>
            <Input
              placeholder="Enter an engaging subject line..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isAlreadySent}
              className="text-base sm:text-lg font-medium border-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50 h-auto disabled:opacity-100 p-0"
            />
          </div>

          <div className="flex-1 min-h-0">
            <MarkdownSplitEditor
              value={content}
              onChange={setContent}
              readOnly={isAlreadySent}
              className="h-full shadow-sm"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
