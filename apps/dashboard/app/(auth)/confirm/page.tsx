"use client";

import { Button } from "@workspace/ui/components/button";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type ConfirmationState = "idle" | "submitting" | "success" | "error";

export default function SubscribeConfirmationPage() {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<ConfirmationState>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
  }, []);

  async function confirmSubscription() {
    if (!token || state === "submitting") return;

    setState("submitting");
    try {
      const response = await fetch(
        `/api/v1/public/newsletters/verify/${encodeURIComponent(token)}`,
        { method: "POST" },
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        setState("error");
        setMessage(result.message || "We could not confirm your subscription.");
        return;
      }

      setState("success");
      setMessage(result.message || "You are subscribed successfully.");
    } catch {
      setState("error");
      setMessage("We could not confirm your subscription. Please try again.");
    }
  }

  const invalidLink = !token;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4">
      <section className="w-full max-w-md rounded-xl border bg-background p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">Confirm subscription</h1>

        {state === "success" ? (
          <p className="mt-3 text-sm text-muted-foreground">{message}</p>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Click the button below to confirm your subscription to this
              newsletter.
            </p>
            {state === "error" && (
              <p className="mt-3 text-sm text-destructive">{message}</p>
            )}

            <Button
              className="mt-6 w-full"
              disabled={invalidLink || state === "submitting"}
              onClick={confirmSubscription}
            >
              {state === "submitting" && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Confirm subscription
            </Button>

            {invalidLink && (
              <p className="mt-3 text-sm text-destructive">
                This subscription link is invalid.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
