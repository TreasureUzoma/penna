"use client";

import { Button } from "@workspace/ui/components/button";
import Link from "next/link";

interface NewsletterHeaderProps {
  email?: string | null;
}

export function NewsletterHeader({ email }: NewsletterHeaderProps) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Button asChild className="w-full sm:w-auto">
        <Link href="/new">New Newsletter</Link>
      </Button>
    </div>
  );
}
