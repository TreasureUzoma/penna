"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { createNewsletterSubscriberSchema } from "@workspace/validations";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SubscribeForm({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim() || isSubmitting) return;

    const validation = createNewsletterSubscriberSchema.safeParse({
      name: name.trim() || undefined,
      email: email.trim(),
      newsletterId: "id", // just to satisfy the validation package
    });

    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || "Invalid input";
      toast.error(firstError);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(
        `/api/v1/public/newsletters/${encodeURIComponent(slug)}/subscribe`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validation.data),
        },
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.message || "Failed to subscribe");
        return;
      }

      setSubscribed(true);
      setConfirmationEmail(email.trim());
      toast.success(
        json.message || "Check your email to confirm your subscription",
      );
    } catch {
      toast.error("Failed to subscribe. Try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (subscribed) {
    return (
      <p className="text-sm text-muted-foreground">
        Check your inbox at <strong>{confirmationEmail}</strong> to confirm your
        subscription.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
      <Input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name (optional)"
        disabled={isSubmitting}
        className="flex-1"
      />
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        disabled={isSubmitting}
        className="flex-1"
      />
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full sm:w-auto"
      >
        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Subscribe
      </Button>
    </form>
  );
}
