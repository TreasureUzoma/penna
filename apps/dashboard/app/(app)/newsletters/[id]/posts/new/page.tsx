"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCreateEmail } from "@/hooks/use-emails";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { MarkdownSplitEditor } from "@/components/markdown-split-editor";
import { Loader2, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Calendar as CalendarIcon } from "lucide-react";

export default function NewPostPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const newsletterId = params.id as string;

  const { mutate: createEmail, isPending: isCreating } =
    useCreateEmail(newsletterId);

  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  // "YYYY-MM-DDTHH:mm" in local time, for the datetime-local input's `min` —
  // stops the popover from accepting a "scheduled" time that's already in
  // the past, which is the same confusing overlap Publish Now exists to
  // avoid: scheduling should always mean "later," never "right now."
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

    createEmail(
      {
        subject,
        body: content,
        sentAt: new Date(scheduledDate).toISOString(),
        status: "published",
      },
      {
        onSuccess: () => {
          setIsScheduleOpen(false);
          toast.success(
            `Post scheduled for ${new Date(scheduledDate).toLocaleString()}`,
          );
          router.push(`/newsletters/${newsletterId}/posts`);
        },
      },
    );
  };

  const handlePublishNow = () => {
    if (!validateFields()) return;

    createEmail(
      {
        subject,
        body: content,
        status: "published",
      },
      {
        onSuccess: () => {
          toast.success("Post published — sending now");
          router.push(`/newsletters/${newsletterId}/posts`);
        },
      },
    );
  };

  const handleSaveDraft = () => {
    if (!validateFields()) return;

    createEmail(
      {
        subject,
        body: content,
      },
      {
        onSuccess: () => {
          toast.success("Draft saved");
          router.push(`/newsletters/${newsletterId}/posts`);
        },
      },
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-8 px-8 py-4 gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create Post</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/newsletters/${newsletterId}/posts`)}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isCreating}
          >
            {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Save className="w-4 h-4 mr-2" />
            Save as Draft
          </Button>
          <Popover open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" disabled={isCreating}>
                <CalendarIcon className="w-4 h-4 mr-2" />
                Schedule for later
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Schedule Post</h4>
                  <p className="text-sm text-muted-foreground">
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
                  />
                  <Button
                    onClick={handleSchedule}
                    disabled={isCreating || !scheduledDate}
                  >
                    {isCreating && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Confirm Schedule
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button onClick={handlePublishNow} disabled={isCreating}>
            {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Send className="w-4 h-4 mr-2" />
            Publish Now
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border-0 shadow-none bg-transparent">
        <CardContent className="p-0 h-full flex flex-col gap-3">
          <div className="shrink-0 bg-background border rounded-lg p-3 space-y-0.5">
            <label className="text-sm font-medium">Subject Line</label>
            <Input
              placeholder="Enter an engaging subject line..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-lg font-medium border-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50 h-auto"
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
