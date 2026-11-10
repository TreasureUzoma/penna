"use client";

import React, { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import api from "@workspace/axios";
import { toast } from "sonner";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  Image as ImageIcon,
  Link as LinkIcon,
  Quote,
  Code,
  Loader2,
  Eye,
  PenSquare,
} from "lucide-react";

interface MarkdownSplitEditorProps {
  newsletterId: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** Hides the toolbar and disables the textarea — for a post that's already been sent. */
  readOnly?: boolean;
}

export function MarkdownSplitEditor({
  newsletterId,
  value,
  onChange,
  className,
  readOnly = false,
}: MarkdownSplitEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeTab, setActiveTab] = useState<"write" | "preview">(
    readOnly ? "preview" : "write",
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [previewContent, setPreviewContent] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setPreviewContent(value), 250);
    return () => window.clearTimeout(timeout);
  }, [value]);

  const { data: previewHtml, isFetching: isPreviewLoading } = useQuery({
    queryKey: ["markdown-preview", newsletterId, previewContent],
    queryFn: async ({ signal }) => {
      const response = await api.post<{ data: { html: string } }>(
        `/newsletters/${newsletterId}/markdown-preview`,
        { content: previewContent },
        { signal },
      );
      return response.data.data.html;
    },
    placeholderData: (previousHtml) => previousHtml,
    refetchOnWindowFocus: false,
    enabled: Boolean(newsletterId && previewContent),
    staleTime: 30_000,
    gcTime: 0,
  });

  const insertText = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText =
      value.substring(0, start) +
      before +
      selectedText +
      after +
      value.substring(end);

    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";
    setIsUploadingImage(true);
    const placeholder = `![Uploading ${file.name}...]()`;
    insertText(placeholder);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post<{
        success: boolean;
        data: { url: string };
        message?: string;
      }>("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const url = res.data?.data?.url;
      if (url) {
        const textarea = textareaRef.current;
        const currentVal = textarea ? textarea.value : value;
        const updatedVal = currentVal.replace(
          placeholder,
          `![${file.name}](${url})`,
        );
        onChange(updatedVal);
        toast.success("Image uploaded successfully");
      } else {
        throw new Error(res.data?.message || "No image URL returned");
      }
    } catch (err: any) {
      const textarea = textareaRef.current;
      const currentVal = textarea ? textarea.value : value;
      onChange(currentVal.replace(placeholder, ""));
      toast.error(err.message || "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col border rounded-md overflow-hidden bg-background h-full min-h-[350px] md:min-h-0",
        className,
      )}
    >
      {/* Mobile Tab Toggle Bar (Always visible on mobile) */}
      <div className="flex md:hidden items-center justify-between p-2 border-b bg-muted/40 shrink-0">
        <div className="flex items-center gap-1 bg-muted/80 p-1 rounded-lg border w-full">
          <button
            type="button"
            onClick={() => setActiveTab("write")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all",
              activeTab === "write"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <PenSquare className="h-3.5 w-3.5" />
            Write
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all",
              activeTab === "preview"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </button>
        </div>
      </div>

      {/* Formatting Toolbar */}
      {!readOnly && (
        <div
          className={cn(
            "items-center gap-1 p-2 border-b bg-muted/20 overflow-x-auto shrink-0 touch-pan-x",
            activeTab === "write" ? "flex" : "hidden md:flex",
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => insertText("# ")}
            title="Heading 1"
            className="h-8 w-8 shrink-0"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => insertText("## ")}
            title="Heading 2"
            className="h-8 w-8 shrink-0"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1 shrink-0" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => insertText("**", "**")}
            title="Bold"
            className="h-8 w-8 shrink-0"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => insertText("*", "*")}
            title="Italic"
            className="h-8 w-8 shrink-0"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1 shrink-0" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => insertText("- ")}
            title="List"
            className="h-8 w-8 shrink-0"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => insertText("> ")}
            title="Quote"
            className="h-8 w-8 shrink-0"
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => insertText("```\n", "\n```")}
            title="Code Block"
            className="h-8 w-8 shrink-0"
          >
            <Code className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1 shrink-0" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => insertText("[", "](url)")}
            title="Link"
            className="h-8 w-8 shrink-0"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => insertText("~~", "~~")} title="Strikethrough" className="h-8 px-2 shrink-0">S̶</Button>
          <Button variant="ghost" size="sm" onClick={() => insertText("~", "~")} title="Subscript" className="h-8 px-2 shrink-0">x₂</Button>
          <Button variant="ghost" size="sm" onClick={() => insertText("^", "^")} title="Superscript" className="h-8 px-2 shrink-0">x²</Button>
          <Button variant="ghost" size="sm" onClick={() => insertText("| Column | Column |\n| --- | --- |\n| Value | Value |\n")} title="Insert table" className="h-8 px-2 shrink-0">Table</Button>
          <Button variant="ghost" size="sm" onClick={() => insertText("{{ subscriber.first_name | default: 'there' }}")} title="Insert personalization" className="h-8 px-2 shrink-0">Vars</Button>
          <div className="relative shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8"
              disabled={isUploadingImage}
              title="Upload image"
            >
              {isUploadingImage ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                onChange={handleImageUpload}
                disabled={isUploadingImage}
              />
            </Button>
          </div>
        </div>
      )}

      {!readOnly && activeTab === "write" && (
        <details className="border-b bg-muted/10 px-3 py-2 text-xs text-muted-foreground shrink-0">
          <summary className="cursor-pointer select-none font-medium">Markdown & personalization guide</summary>
          <p className="mt-2">Supports tables, task lists, fenced code, footnotes, ~~strikethrough~~, ~subscript~, ^superscript^, and standalone links to YouTube, Vimeo, Spotify, SoundCloud, Bandcamp, GIPHY, Instagram, X, and GitHub Gist.</p>
          <p className="mt-1"><code>{"{{ subscriber.first_name }}"}</code>, <code>{"{{ subscriber.name }}"}</code>, <code>{"{{ subscriber.email }}"}</code>, <code>{"{{ newsletter.name }}"}</code>, <code>{"{{ email.publish_date }}"}</code>, and <code>{"{{ unsubscribe_url }}"}</code> are available. Add <code>| default: 'there'</code>, <code>| upper</code>, <code>| lower</code>, <code>| capfirst</code>, or <code>| urlencode</code>. Use <code>{"{% if subscriber.name %}...{% else %}...{% endif %}"}</code> for conditional content.</p>
        </details>
      )}

      {/* Editor & Preview Split Container */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden relative">
        {/* Write View */}
        <div
          className={cn(
            "w-full md:w-1/2 h-full border-b md:border-b-0 md:border-r flex flex-col min-h-0 overflow-hidden",
            activeTab === "write" ? "flex" : "hidden md:flex",
          )}
        >
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly}
            className="flex-1 w-full h-full resize-none border-0 rounded-none focus-visible:ring-0 p-3 md:p-4 font-mono text-sm leading-relaxed disabled:opacity-100 disabled:cursor-not-allowed [field-sizing:fixed] overflow-y-auto"
            placeholder="Type your markdown here..."
          />
        </div>

        {/* Preview View */}
        <div
          className={cn(
            "w-full md:w-1/2 h-full overflow-y-auto p-4 md:p-6 prose dark:prose-invert max-w-none min-h-0",
            activeTab === "preview" ? "block" : "hidden md:block",
          )}
        >
          {value ? (
            <div dangerouslySetInnerHTML={{ __html: previewHtml ?? "" }} />
          ) : (
            <p className="text-muted-foreground text-sm italic">
              {isPreviewLoading ? "Rendering preview..." : "Preview will appear here..."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
