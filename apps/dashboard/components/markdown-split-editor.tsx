"use client";

import React, { useState, useRef } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
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
} from "lucide-react";

interface MarkdownSplitEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** Hides the toolbar and disables the textarea — for a post that's already been sent. */
  readOnly?: boolean;
}

export function MarkdownSplitEditor({
  value,
  onChange,
  className,
  readOnly = false,
}: MarkdownSplitEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Simple Markdown Parser (Regex based)
  const parseMarkdown = (text: string) => {
    let html = text
      // Code blocks
      .replace(
        /```([\s\S]*?)```/g,
        '<pre class="bg-muted p-4 rounded-md my-4 overflow-x-auto"><code>$1</code></pre>',
      )
      // Inline code
      .replace(
        /`([^`]+)`/g,
        '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>',
      )
      // Images
      .replace(
        /!\[(.*?)\]\((.*?)\)/g,
        '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg my-4 border" />',
      )
      // Links
      .replace(
        /\[(.*?)\]\((.*?)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-4 hover:opacity-80">$1</a>',
      )
      // Headers
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-6 mb-4">$1</h1>')
      .replace(
        /^## (.*$)/gm,
        '<h2 class="text-2xl font-semibold mt-5 mb-3">$1</h2>',
      )
      .replace(
        /^### (.*$)/gm,
        '<h3 class="text-xl font-medium mt-4 mb-2">$1</h3>',
      )
      // Bold
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Blockquote
      .replace(
        /^> (.*$)/gm,
        '<blockquote class="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">$1</blockquote>',
      )
      // Unordered Lists (simple support)
      .replace(/^\- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
      // Line breaks
      .replace(/\n/g, "<br />");

    return html;
  };

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

    // Restore selection/cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      insertText(`![${file.name}](${base64})`);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className={cn(
        "flex flex-col border rounded-md overflow-hidden bg-background h-full",
        className,
      )}
    >
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-1 p-2 border-b bg-muted/30 overflow-x-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => insertText("# ")}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => insertText("## ")}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => insertText("**", "**")}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => insertText("*", "*")}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => insertText("- ")}
            title="List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => insertText("> ")}
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => insertText("```\n", "\n```")}
            title="Code Block"
          >
            <Code className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => insertText("[", "](url)")}
            title="Link"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          <div className="relative">
            <Button variant="ghost" size="icon" className="relative">
              <ImageIcon className="h-4 w-4" />
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleImageUpload}
              />
            </Button>
          </div>
        </div>
      )}

      {/* Editor Area — side-by-side split on md+; stacked (write above
          preview) on mobile, since two half-width panes are unusably
          narrow on a phone. */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        {/* Input */}
        <div className="w-full md:w-1/2 h-64 md:h-full border-b md:border-b-0 md:border-r flex flex-col shrink-0 md:shrink">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly}
            className="flex-1 w-full h-full resize-none border-0 rounded-none focus-visible:ring-0 p-4 font-mono text-sm leading-relaxed disabled:opacity-100 disabled:cursor-not-allowed"
            placeholder="Type your markdown here..."
          />
        </div>

        {/* Preview */}
        <div className="w-full md:w-1/2 h-64 md:h-full overflow-y-auto p-6 prose dark:prose-invert max-w-none">
          {value ? (
            <div dangerouslySetInnerHTML={{ __html: parseMarkdown(value) }} />
          ) : (
            <p className="text-muted-foreground text-sm italic">
              Preview will appear here...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
