"use client";

import React from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@workspace/ui/components/button";
import { AnimatedTabs } from "./animated-tabs";
import Logo from "@workspace/ui/components/logo";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";
import { useGetProfile } from "@/hooks/use-auth";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { usePathname, useParams } from "next/navigation";
import { ProjectSwitcher } from "./project-switcher";
import { useSelectedLayoutSegments } from "next/navigation";

export default function AppTopNav() {
  const [scrollY, setScrollY] = React.useState(0);
  const pathname = usePathname();
  const params = useParams();
  const segments = useSelectedLayoutSegments();
  const isProjectRoute =
    segments[0] === "projects" && !!segments[1] && segments[1] !== "new";
  const projectSlug = isProjectRoute ? segments[1] : null;

  React.useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const globalTabs = [
    { label: "Projects", value: "projects", href: "/projects" },
    { label: "Settings", value: "settings", href: "/settings" },
    { label: "Docs", value: "docs", href: "/docs" },
  ];

  const projectTabs = projectSlug
    ? [
        {
          label: "Overview",
          value: "overview",
          href: `/projects/${projectSlug}`,
        },
        {
          label: "Posts",
          value: "posts",
          href: `/projects/${projectSlug}/posts`,
        },
        {
          label: "Analytics",
          value: "analytics",
          href: `/projects/${projectSlug}/analytics`,
        },
        {
          label: "Subscribers",
          value: "subscribers",
          href: `/projects/${projectSlug}/subscribers`,
        },
        {
          label: "Settings",
          value: "settings",
          href: `/projects/${projectSlug}/settings`,
        },
      ]
    : [];

  const tabs = isProjectRoute ? projectTabs : globalTabs;

  let activeTabValue: string;

  if (isProjectRoute) {
    activeTabValue = segments[2] || "overview";
  } else {
    activeTabValue = segments[0] || "projects";
  }

  const { data: profileData, isLoading: profileLoading } = useGetProfile();
  return (
    <>
      <header className="w-full bg-background relative">
        <motion.div
          className="fixed top-0 left-0 z-50 pt-5 pl-5"
          animate={{
            scale: Math.max(0.8, 1 - scrollY * 0.006),
          }}
          transition={{
            duration: 0.1,
            ease: "linear",
          }}
        >
          <Link href="/projects">
            <Logo />
          </Link>
        </motion.div>

        <div className="flex justify-between px-5 items-center pt-3 pb-0 pl-14">
          <div className="flex items-center gap-2">
            <Separator
              orientation="vertical"
              className={cn(
                "h-7 w-[2px] rotate-[12deg] origin-center bg-muted-foreground/20 transition-all duration-500"
              )}
            />
            <div className="flex gap-2.5 text-sm leading-tight">
              {profileLoading ? (
                <>
                  <Skeleton className="w-24 h-3 rounded-sm" />
                  <Skeleton className="w-20 h-3 rounded-sm mt-1" />
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-medium">
                    {profileData?.email}
                  </span>

                  <Link
                    href="/billings"
                    className="bg-muted text-xs px-2 py-1 rounded-full"
                  >
                    {profileData?.plan ?? "Free"}
                  </Link>
                </div>
              )}
            </div>

            {isProjectRoute && (
              <>
                <Separator
                  orientation="vertical"
                  className={cn(
                    "h-7 w-[2px] rotate-[12deg] origin-center bg-muted-foreground/20 transition-all duration-500"
                  )}
                />
                <ProjectSwitcher />
              </>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              asChild
              variant="outline"
              size="icon"
              className="scale-95 rounded-full"
            >
              <Link href="/notifications">
                <Bell className="h-4 w-4" />
              </Link>
            </Button>
            {profileLoading ? (
              <Skeleton className="rounded-full w-8.5 h-8.5" />
            ) : (
              <Avatar>
                <AvatarImage
                  className="rounded-lg"
                  src={
                    profileData?.avatarUrl ||
                    `https://avatar.idolo.dev/${profileData?.email}`
                  }
                  alt="penna-user"
                />
                <AvatarFallback>L</AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </header>

      <div className="sticky top-0 bg-background border-b border-border z-40">
        <div className="flex justify-center items-center h-10">
          <motion.div
            className="flex justify-center flex-1 h-full"
            animate={{
              x: Math.min(scrollY * 0.5, 40),
            }}
            transition={{
              duration: 0.05,
              ease: "linear",
            }}
          >
            <AnimatedTabs tabs={tabs} activeTab={activeTabValue} />
          </motion.div>
        </div>
      </div>
    </>
  );
}
