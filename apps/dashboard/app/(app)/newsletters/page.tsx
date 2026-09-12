"use client";

import { useState, useEffect } from "react";
import {
  useDashboardNewsletters,
  useDashboardActivity,
} from "@/hooks/use-dashboard";
import { NewsletterList } from "./components/newsletter-list";
import { NewsletterListSkeleton } from "./components/newsletter-list-skeleton";
import { SearchAndFilter } from "./components/search-and-filter";
import { RecentActivity } from "./components/recent-activity";
import { Button } from "@workspace/ui/components/button";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { DashboardOverview } from "@workspace/validations";
import { useGetProfile } from "@/hooks/use-auth";
import { OnboardingModal } from "./components/onboarding-modal";
import Link from "next/link";

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
    if (!sessionLoading && newslettersData?.newsletters?.data?.length === 0) {
      setShowOnboarding(true);
    }
  }, [sessionLoading, newslettersData]);

  if (sessionLoading) {
    return (
      <div className="min-h-screen px-8 py-12 flex-col gap-6 flex">
        <div className="space-y-3">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-10 w-full bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <NewsletterListSkeleton />
          <NewsletterListSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-8 py-12 flex-col gap-6 flex">
      {/* Top section — Title, Search, Filter, and New button */}
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <SearchAndFilter
              onFilterChange={setSort}
              onSearchChange={setSearch}
              searchValue={search}
            />
          </div>
        </div>
      </div>

      {/* 2x2 Grid — Activity and Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
        {/* Activity Column */}
        <div>
          <RecentActivity activity={activityData?.activity} />
        </div>

        {/* Projects/Newsletters Column */}
        <div className="space-y-4">
          {isNewslettersLoading ? (
            <NewsletterListSkeleton />
          ) : (
            <NewsletterList newsletters={newslettersData?.newsletters?.data} />
          )}

          {newslettersData?.newsletters?.meta &&
            newslettersData?.newsletters?.meta.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  Page {newslettersData?.newsletters?.meta.page} of{" "}
                  {newslettersData?.newsletters?.meta.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={newslettersData?.newsletters?.meta.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      newslettersData?.newsletters?.meta.page >=
                      newslettersData?.newsletters?.meta.totalPages
                    }
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
