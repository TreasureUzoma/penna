"use client";

import { useEffect } from "react";
import { usePathname, useParams } from "next/navigation";
import { useNewsletter } from "@/hooks/use-newsletters";
import { NewsletterSwitcher } from "@/components/newsletter-switcher";
import { Button } from "@workspace/ui/components/button";
import { Plus } from "lucide-react";
import Link from "next/link";

const SECTION_TITLES: Record<string, string> = {
  "": "Overview",
  posts: "Posts",
  analytics: "Analytics",
  subscribers: "Subscribers",
  segments: "Segments",
  domains: "Domains",
  settings: "Settings",
};

export default function NewsletterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const slug = params.id as string;
  const { data: newsletter } = useNewsletter(slug);

  const rest = pathname
    .replace(`/newsletters/${slug}`, "")
    .split("/")
    .filter(Boolean);

  // posts/new and posts/[postId] are full-height, distraction-free editors
  // that manage their own header (with Save/Schedule/Cancel actions) and
  // escape this layout's padding via `-m-8` — a second, sticky title bar
  // above them would just be redundant chrome eating into their height.
  const isFullBleedEditor = rest[0] === "posts" && rest.length > 1;
  const title = SECTION_TITLES[rest[0] ?? ""] ?? "";

  // Scroll to top when navigating between pages in this newsletter group
  useEffect(() => {
    // Find the scrolling container (the main pane in app-shell.tsx)
    const scrollContainer = document.querySelector("[data-scroll-container]");
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    } else {
      // Fallback: scroll window to top
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return (
    <div className="flex flex-col min-h-screen">
      {!isFullBleedEditor && (
        // Sticky to the scrolling container in app-shell.tsx (the
        // `overflow-y-auto` main pane), not the window — stays put while
        // a long page (e.g. a big subscriber table) scrolls beneath it.
        <div className="sticky top-0 z-10 shrink-0 bg-background border-b border-border px-6 py-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="min-w-0">
            <NewsletterSwitcher />
          </div>
          <h1 className="md:text-md font-semibold tracking-tight text-center truncate">
            {title}
          </h1>
          <Button asChild size="sm" className="justify-self-end">
            <Link href={`/newsletters/${slug}/posts/new`}>
              <Plus className="w-4 h-4" />
              New Post
            </Link>
          </Button>
        </div>
      )}
      <div className="flex-1 p-8">{children}</div>
    </div>
  );
}
