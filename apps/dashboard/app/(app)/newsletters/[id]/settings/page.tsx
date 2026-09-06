"use client";

import { useNewsletter } from "@/hooks/use-newsletters";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SettingsTab } from "../components/settings-tab";

export default function NewsletterSettingsPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: newsletter, isLoading, error } = useNewsletter(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !newsletter) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-destructive">Failed to load newsletter</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsTab newsletter={newsletter} />
    </div>
  );
}
