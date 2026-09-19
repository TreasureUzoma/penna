"use client";

import { useEffect } from "react";
import { usePathname, useParams } from "next/navigation";
import { NewsletterSwitcher } from "@/components/newsletter-switcher";
import { Button } from "@workspace/ui/components/button";
import { Plus } from "lucide-react";
import { useModalStore } from "@/stores/use-modal-store";

const SECTION_TITLES: Record<string, string> = {
  "": "Overview",
  posts: "Posts",
  subscribers: "Subscribers",
  segments: "Segments",
  domains: "Domains",
  analytics: "Analytics",
  settings: "Settings",
};

const ACTION_BUTTON_CONFIG: Record<
  string,
  { label: string; action: () => void }
> = {};

// Will be populated in the component with access to openModal

const DEFAULT_ACTION = {
  label: "New Post",
  action: (slug: string) => `/newsletters/${slug}/posts/new`,
};

export default function NewsletterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const slug = params.id as string;
  const { openModal } = useModalStore();

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
  const section = rest[0] ?? "";

  // Determine action button based on section
  const getActionButton = () => {
    switch (section) {
      case "subscribers":
        return {
          label: "New Subscriber",
          onClick: () => openModal("new-subscriber"),
        };
      case "segments":
        return {
          label: "New Segment",
          onClick: () => openModal("new-segment"),
        };
      case "domains":
        return {
          label: "New Domain",
          onClick: () => openModal("new-domain"),
        };
      default:
        return {
          label: "New Post",
          href: `/newsletters/${slug}/posts/new`,
        };
    }
  };

  const actionButton = getActionButton();

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
          {"href" in actionButton ? (
            <Button asChild size="sm" className="justify-self-end">
              <a href={actionButton.href}>
                <Plus className="w-4 h-4" />
                {actionButton.label}
              </a>
            </Button>
          ) : (
            <Button
              size="sm"
              className="justify-self-end"
              onClick={actionButton.onClick}
            >
              <Plus className="w-4 h-4" />
              {actionButton.label}
            </Button>
          )}
        </div>
      )}
      <div className="flex-1 p-8">{children}</div>
    </div>
  );
}
