"use client";

import { Turnstile } from "@marsidev/react-turnstile";

export function TurnstileWidget({
  onVerify,
}: {
  onVerify: (token: string) => void;
}) {
  const turnstileKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!;
  return (
    <Turnstile className="w-full" siteKey={turnstileKey} onSuccess={onVerify} />
  );
}
