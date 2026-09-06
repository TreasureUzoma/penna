"use client";

import { useProject } from "@/hooks/use-projects";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DomainsTab } from "../components/domains-tab";

export default function ProjectDomainsPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: project, isLoading, error } = useProject(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-destructive">Failed to load project</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DomainsTab project={project} />
    </div>
  );
}
