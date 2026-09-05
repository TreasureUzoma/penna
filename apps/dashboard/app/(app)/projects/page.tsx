"use client";

import { useState, useEffect } from "react";
import {
  useDashboardStats,
  useDashboardProjects,
  useDashboardActivity,
} from "@/hooks/use-dashboard";
import { DashboardStats } from "./components/dashboard-stats";
import { DashboardStatsSkeleton } from "./components/dashboard-stats-skeleton";
import { ProjectHeader } from "./components/project-header";
import { ProjectList } from "./components/project-list";
import { ProjectListSkeleton } from "./components/project-list-skeleton";
import { SearchAndFilter } from "./components/search-and-filter";
import { RecentActivity } from "./components/recent-activity";
import { Button } from "@workspace/ui/components/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DashboardOverview } from "@workspace/validations";
import { useGetProfile } from "@/hooks/use-auth";
import { OnboardingModal } from "./components/onboarding-modal";

export default function ProjectsPage() {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<DashboardOverview["sort"]>("newest");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Separate queries - stats don't change with search
  const { data: statsData, isLoading: isStatsLoading } = useDashboardStats();
  const { data: projectsData, isLoading: isProjectsLoading } =
    useDashboardProjects({
      page,
      limit: 10,
      sort,
      search: debouncedSearch,
    });
  const { data: profile, isLoading: sessionLoading } = useGetProfile();
  const { data: activityData } = useDashboardActivity();

  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!isStatsLoading && statsData?.stats?.totalProjects === 0) {
      setShowOnboarding(true);
    }
  }, [isStatsLoading, statsData]);

  const meta = projectsData?.projects?.meta;

  if (sessionLoading) {
    return (
      <div className="min-h-screen px-8 py-12 flex-col gap-8 flex">
        <div className="space-y-3">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
        <DashboardStatsSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <ProjectListSkeleton />
          </div>
          <div className="lg:col-span-2">
            <ProjectListSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-8 py-12 flex-col gap-8 flex">
      {/* Header Section — includes the "New Project" button */}
      <ProjectHeader email={profile?.name?.split(" ")[0]} />

      {/* Stats Section — full width */}
      {isStatsLoading ? (
        <DashboardStatsSkeleton />
      ) : (
        <DashboardStats stats={statsData?.stats} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
        {/* Left column — recent activity */}
        <div className="lg:col-span-1">
          <RecentActivity activity={activityData?.activity} />
        </div>

        {/* Right column — the actual project list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Projects</h2>
          </div>
          <SearchAndFilter
            onFilterChange={setSort}
            onSearchChange={setSearch}
            searchValue={search}
          />

          {isProjectsLoading ? (
            <ProjectListSkeleton />
          ) : (
            <ProjectList projects={projectsData?.projects?.data} />
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {meta.page} of {meta.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Show more
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <OnboardingModal open={showOnboarding} onOpenChange={setShowOnboarding} />
    </div>
  );
}
