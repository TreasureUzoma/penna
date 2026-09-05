"use client";

import { usePathname, useParams } from "next/navigation";
import { useProject } from "@/hooks/use-projects";

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
  // escape this layout's padding via `-m-8` — a second, plain page title
  // above them would just be redundant chrome.
  const isFullBleedEditor = rest[0] === "posts" && rest.length > 1;
  const title = SECTION_TITLES[rest[0] ?? ""] ?? "";

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 p-8 pt-6">
        {!isFullBleedEditor && (
          <div className="mb-6">
            {project?.name && (
              <p className="text-sm font-medium text-muted-foreground">
                {project.name}
              </p>
            )}
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
