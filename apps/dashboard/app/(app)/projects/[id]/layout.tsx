"use client";

import { usePathname, useParams } from "next/navigation";
import { useProject } from "@/hooks/use-projects";
import { ProjectSwitcher } from "@/components/project-switcher";
import { Button } from "@workspace/ui/components/button";
import { Plus } from "lucide-react";
import Link from "next/link";

const SECTION_TITLES: Record<string, string> = {
  "": "Overview",
  posts: "Posts",
  analytics: "Analytics",
  subscribers: "Subscribers",
  segments: "Segments",
  settings: "Settings",
};

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const slug = params.id as string;
  const { data: project } = useProject(slug);

  const rest = pathname
    .replace(`/projects/${slug}`, "")
    .split("/")
    .filter(Boolean);

  // posts/new and posts/[postId] are full-height, distraction-free editors
  // that manage their own header (with Save/Schedule/Cancel actions) and
  // escape this layout's padding via `-m-8` — a second, sticky title bar
  // above them would just be redundant chrome eating into their height.
  const isFullBleedEditor = rest[0] === "posts" && rest.length > 1;
  const title = SECTION_TITLES[rest[0] ?? ""] ?? "";

  return (
    <div className="flex flex-col min-h-screen">
      {!isFullBleedEditor && (
        // Sticky to the scrolling container in app-shell.tsx (the
        // `overflow-y-auto` main pane), not the window — stays put while
        // a long page (e.g. a big subscriber table) scrolls beneath it.
        <div className="sticky top-0 z-10 shrink-0 bg-background border-b border-border px-8 py-4 flex items-center justify-between gap-4">
          <ProjectSwitcher />
          <h1 className="md:text-md font-semibold tracking-tight">{title}</h1>
          <Button asChild size="sm">
            <Link href={`/projects/${slug}/posts/new`}>
              <Plus className="w-4 h-4 mr-2" />
              New Post
            </Link>
          </Button>
        </div>
      )}
      <div className="flex-1 p-8 pt-6">{children}</div>
    </div>
  );
}
