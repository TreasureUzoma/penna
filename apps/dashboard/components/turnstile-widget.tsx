"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { useTheme } from "next-themes";

export function TurnstileWidget({
  onVerify,
}: {
  onVerify: (token: string) => void;
}) {
  const { resolvedTheme } = useTheme();

  return (
    <Turnstile
      className="w-full"
      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
      options={{
        theme: resolvedTheme === "dark" ? "dark" : "light",
      }}
      onSuccess={onVerify}
    />
  );
}
