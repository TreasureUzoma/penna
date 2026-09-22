"use client";

import { Turnstile } from "@marsidev/react-turnstile";

export function TurnstileWidget({
  onVerify,
}: {
  onVerify: (token: string) => void;
}) {
  return (
    <Turnstile
      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
      onSuccess={onVerify}
    />
  );
}
