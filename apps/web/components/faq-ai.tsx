"use client";

import { useState } from "react";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";

import { ArrowRight, Loader2 } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";

export function FaqAi() {
  const [question, setQuestion] = useState("");

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/v1/public/faq/ask",
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const value = question.trim();

    if (!value || isLoading) return;

    setQuestion("");

    await sendMessage({
      text: value,
    });
  };

  const latestAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");

  const answer = latestAssistantMessage?.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="ask anything about penna..."
          disabled={isLoading}
          className="flex-1 border-none !bg-transparent !px-0 text-sm font-medium focus-visible:ring-0"
          maxLength={500}
        />

        <Button
          type="submit"
          disabled={isLoading || !question.trim()}
          variant="ghost"
          size="sm"
          className="shrink-0 rounded-full !px-0 !h-6 !py-0"
        >
          {isLoading ? (
            <Loader2 className="pointer-events-none size-4 shrink-0 animate-spin" />
          ) : (
            <ArrowRight className="pointer-events-none size-4 shrink-0 text-muted-foreground transition-transform duration-200" />
          )}
        </Button>
      </form>

      {error && (
        <div className="text-sm text-destructive">
          {error.message || "Failed to get an answer"}
        </div>
      )}

      {answer && (
        <div
          className={cn(
            "text-sm leading-relaxed",
            isLoading && "animate-pulse",
          )}
        >
          <Streamdown plugins={{ code }} isAnimating={status === "streaming"}>
            {answer}
          </Streamdown>
        </div>
      )}
    </div>
  );
}
