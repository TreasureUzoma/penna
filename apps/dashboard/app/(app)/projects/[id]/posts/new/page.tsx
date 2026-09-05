"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCreateEmail } from "@/hooks/use-emails";
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

export default function NewPostPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { mutate: createEmail, isPending: isCreating } =
    useCreateEmail(projectId);

  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const handleSchedule = () => {
    if (!subject) {
      toast.error("Subject is required");
      return;
    }
    if (!content) {
      toast.error("Content is required");
      return;
    }
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
          router.push(`/projects/${projectId}/posts`);
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

    createEmail(
      {
        subject,
        body: content,
      },
      {
        onSuccess: () => {
          toast.success("Post created successfully");
          router.push(`/projects/${projectId}/posts`);
        },
      },
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-8 px-8 py-4 gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create Post</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/projects/${projectId}/posts`)}
          >
            Cancel
          </Button>
          <Popover open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" disabled={isCreating}>
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
          <Button onClick={handleSave} disabled={isCreating}>
            {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Save className="w-4 h-4 mr-2" />
            Create Draft
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
