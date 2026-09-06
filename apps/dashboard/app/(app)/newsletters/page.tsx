"use client";

import { useState, useEffect } from "react";
import {
  useDashboardStats,
  useDashboardNewsletters,
  useDashboardActivity,
} from "@/hooks/use-dashboard";
import { DashboardStats } from "./components/dashboard-stats";
import { DashboardStatsSkeleton } from "./components/dashboard-stats-skeleton";
import { NewsletterHeader } from "./components/newsletter-header";
import { NewsletterList } from "./components/newsletter-list";
import { NewsletterListSkeleton } from "./components/newsletter-list-skeleton";
import { SearchAndFilter } from "./components/search-and-filter";
import { RecentActivity } from "./components/recent-activity";
import { Button } from "@workspace/ui/components/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DashboardOverview } from "@workspace/validations";
import { useGetProfile } from "@/hooks/use-auth";
import { OnboardingModal } from "./components/onboarding-modal";

export default function NewslettersPage() {
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
  const { data: newslettersData, isLoading: isNewslettersLoading } =
    useDashboardNewsletters({
      page,
      limit: 10,
      sort,
      search: debouncedSearch,
    });
  const { data: profile, isLoading: sessionLoading } = useGetProfile();
  const { data: activityData } = useDashboardActivity();

  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!isStatsLoading && statsData?.stats?.totalNewsletters === 0) {
      setShowOnboarding(true);
    }
  }, [isStatsLoading, statsData]);

  const meta = newslettersData?.newsletters?.meta;

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
            <NewsletterListSkeleton />
          </div>
          <div className="lg:col-span-2">
            <NewsletterListSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-8 py-12 flex-col gap-8 flex">
      {/* Header Section — includes the "New Newsletter" button */}
      <NewsletterHeader email={profile?.name?.split(" ")[0]} />

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

        {/* Right column — the actual newsletter list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Newsletters</h2>
          </div>
          <SearchAndFilter
            onFilterChange={setSort}
            onSearchChange={setSearch}
            searchValue={search}
          />

          {isNewslettersLoading ? (
            <NewsletterListSkeleton />
          ) : (
            <NewsletterList newsletters={newslettersData?.newsletters?.data} />
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
