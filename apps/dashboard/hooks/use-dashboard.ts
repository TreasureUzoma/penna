import { useQuery } from "@tanstack/react-query";
import api from "@workspace/axios";
import type { DashboardOverview } from "@workspace/validations";
import type { ServiceResponse } from "@workspace/types";

interface DashboardData {
  stats: {
    totalProjects: number;
    totalSubscribers: number;
    totalRevenue: number;
    totalPosts: number;
  };
  projects: {
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
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res =
        await api.get<ServiceResponse<{ stats: DashboardData["stats"] }>>(
          `/dashboard/stats`
        );
      return res.data.data;
    },
  });
}

export function useDashboardProjects(
  params: Omit<DashboardOverview, "limit"> & { limit?: number }
) {
  return useQuery({
    queryKey: ["dashboard-projects", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", params.page.toString());
      if (params.limit) searchParams.set("limit", params.limit.toString());
      if (params.sort) searchParams.set("sort", params.sort);
      if (params.search) searchParams.set("search", params.search);

      const res = await api.get<
        ServiceResponse<{ projects: DashboardData["projects"] }>
      >(`/dashboard/projects?${searchParams.toString()}`);
      return res.data.data;
    },
  });
}

export interface RecentActivityItem {
  id: string;
  subject: string;
  sentAt: string;
  projectId: string;
  projectName: string;
  projectSlug: string;
}

export function useDashboardActivity() {
  return useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: async () => {
      const res = await api.get<
        ServiceResponse<{ activity: RecentActivityItem[] }>
      >(`/dashboard/activity`);
      return res.data.data;
    },
  });
}

export interface TopProject {
  id: string;
  name: string;
  slug: string;
  subscriberCount: number;
}

interface AccountAnalytics {
  chartData: Array<{ date: string; count: number }>;
  topProjects: TopProject[];
}

export function useDashboardAnalytics(days: number) {
  return useQuery({
    queryKey: ["dashboard-analytics", days],
    queryFn: async () => {
      const res = await api.get<ServiceResponse<AccountAnalytics>>(
        `/dashboard/analytics?days=${days}`
      );
      return res.data.data;
    },
  });
}

// Keep the old hook for backward compatibility if needed elsewhere
export function useDashboardOverview(params: DashboardOverview) {
  return useQuery({
    queryKey: ["dashboard-overview", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", params.page.toString());
      if (params.limit) searchParams.set("limit", params.limit.toString());
      if (params.sort) searchParams.set("sort", params.sort);
      if (params.search) searchParams.set("search", params.search);

      const res = await api.get<ServiceResponse<DashboardData>>(
        `/dashboard/overview?${searchParams.toString()}`
      );
      return res.data;
    },
  });
}
