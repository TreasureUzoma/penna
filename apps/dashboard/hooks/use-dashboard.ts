import { useQuery } from "@tanstack/react-query";
import api from "@workspace/axios";
import type { DashboardOverview } from "@workspace/validations";
import type { ServiceResponse } from "@workspace/types";
import { useActiveTeam } from "@/hooks/use-active-team";

interface DashboardData {
  stats: {
    totalNewsletters: number;
    totalSubscribers: number;
    totalRevenue: number;
    totalPosts: number;
  };
  newsletters: {
    data: any[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export function useDashboardStats() {
  const { activeTeam, isLoading: isLoadingTeams } = useActiveTeam();
  return useQuery({
    queryKey: ["dashboard-stats", activeTeam?.id],
    queryFn: async () => {
      const query = activeTeam ? `?teamId=${activeTeam.id}` : "";
      const res =
        await api.get<ServiceResponse<{ stats: DashboardData["stats"] }>>(
          `/dashboard/stats${query}`
        );
      return res.data.data;
    },
    enabled: !isLoadingTeams,
  });
}

export function useDashboardNewsletters(
  params: Omit<DashboardOverview, "limit"> & { limit?: number }
) {
  const { activeTeam, isLoading: isLoadingTeams } = useActiveTeam();
  return useQuery({
    queryKey: ["dashboard-newsletters", params, activeTeam?.id],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", params.page.toString());
      if (params.limit) searchParams.set("limit", params.limit.toString());
      if (params.sort) searchParams.set("sort", params.sort);
      if (params.search) searchParams.set("search", params.search);
      if (activeTeam) searchParams.set("teamId", activeTeam.id);

      const res = await api.get<
        ServiceResponse<{ newsletters: DashboardData["newsletters"] }>
      >(`/dashboard/newsletters?${searchParams.toString()}`);
      return res.data.data;
    },
    enabled: !isLoadingTeams,
  });
}

export interface RecentActivityItem {
  id: string;
  subject: string;
  sentAt: string;
  newsletterId: string;
  newsletterName: string;
  newsletterSlug: string;
}

export function useDashboardActivity() {
  const { activeTeam, isLoading: isLoadingTeams } = useActiveTeam();
  return useQuery({
    queryKey: ["dashboard-activity", activeTeam?.id],
    queryFn: async () => {
      const query = activeTeam ? `?teamId=${activeTeam.id}` : "";
      const res = await api.get<
        ServiceResponse<{ activity: RecentActivityItem[] }>
      >(`/dashboard/activity${query}`);
      return res.data.data;
    },
    enabled: !isLoadingTeams,
  });
}

export interface TopNewsletter {
  id: string;
  name: string;
  slug: string;
  subscriberCount: number;
}

interface AccountAnalytics {
  chartData: Array<{ date: string; count: number }>;
  topNewsletters: TopNewsletter[];
}

export function useDashboardAnalytics(days: number) {
  const { activeTeam, isLoading: isLoadingTeams } = useActiveTeam();
  return useQuery({
    queryKey: ["dashboard-analytics", days, activeTeam?.id],
    queryFn: async () => {
      const params = new URLSearchParams({ days: days.toString() });
      if (activeTeam) params.set("teamId", activeTeam.id);
      const res = await api.get<ServiceResponse<AccountAnalytics>>(
        `/dashboard/analytics?${params.toString()}`
      );
      return res.data.data;
    },
    enabled: !isLoadingTeams,
  });
}

// Keep the old hook for backward compatibility if needed elsewhere
export function useDashboardOverview(params: DashboardOverview) {
  const { activeTeam, isLoading: isLoadingTeams } = useActiveTeam();
  return useQuery({
    queryKey: ["dashboard-overview", params, activeTeam?.id],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", params.page.toString());
      if (params.limit) searchParams.set("limit", params.limit.toString());
      if (params.sort) searchParams.set("sort", params.sort);
      if (params.search) searchParams.set("search", params.search);
      if (activeTeam) searchParams.set("teamId", activeTeam.id);

      const res = await api.get<ServiceResponse<DashboardData>>(
        `/dashboard/overview?${searchParams.toString()}`
      );
      return res.data;
    },
    enabled: !isLoadingTeams,
  });
}
