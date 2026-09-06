"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEmail, useUpdateEmail } from "@/hooks/use-emails";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { MarkdownSplitEditor } from "@/components/markdown-split-editor";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@workspace/ui/components/card";
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

  const handleSchedule = () => {
    if (!scheduledDate) return;

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
          router.push(`/newsletters/${newsletterId}/posts`);
        },
      },
    );
  };

  const handleSave = () => {
    if (!subject) {
      toast.error("Subject is required");
      return;
    }
    if (!content) {
      toast.error("Content is required");
      return;
    }

    updateEmail(
      {
        emailId: postId,
        subject,
        body: content,
      },
      {
        onSuccess: () => {
          // Toast is handled in the hook
          router.push(`/newsletters/${newsletterId}/posts`);
        },
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
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-8 px-8 py-4 gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isAlreadySent ? "View Post" : "Edit Post"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/newsletters/${newsletterId}/posts`)}
          >
            {isAlreadySent ? "Back" : "Cancel"}
          </Button>
          {!isAlreadySent && (
            <>
              <Popover open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" disabled={isUpdating}>
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Schedule
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Schedule Post</h4>
                      <p className="text-sm text-muted-foreground">
                        Choose a date and time to publish this post.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Input
                        type="datetime-local"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                      />
                      <Button
                        onClick={handleSchedule}
                        disabled={isUpdating || !scheduledDate}
                      >
                        {isUpdating && (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        Confirm Schedule
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button onClick={handleSave} disabled={isUpdating}>
                {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
            </>
          )}
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
              disabled={isAlreadySent}
              className="text-lg font-medium border-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50 h-auto disabled:opacity-100"
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
