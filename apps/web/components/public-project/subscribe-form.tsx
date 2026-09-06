"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SubscribeForm({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Relative path — next.config.mjs rewrites /api/:path+ to the API
      // server, so this works the same in dev and prod without an env var.
      const res = await fetch(
        `/api/v1/public/projects/${encodeURIComponent(slug)}/subscribe`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        }
      );
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.message || "Failed to subscribe");
        return;
      }

      setSubscribed(true);
      toast.success("You're subscribed!");
    } catch {
      toast.error("Failed to subscribe. Try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (subscribed) {
    return (
      <p className="text-sm text-muted-foreground">
        You're on the list — thanks for subscribing.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        disabled={isSubmitting}
        className="flex-1"
      />
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Subscribe
      </Button>
    </form>
  );
}
