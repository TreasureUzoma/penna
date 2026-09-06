import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@workspace/axios";
import type { Project } from "@workspace/constants/types/projects";
import type { ServiceResponse } from "@workspace/types";
import type { UpdateProject } from "@workspace/validations";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get<{ data: PaginatedResponse<Project> }>(
        "/projects"
      );
      return res.data.data.data;
    },
  });
}

export function useProject(slug: string) {
  return useQuery({
    queryKey: ["project", slug],
    queryFn: async () => {
      const res = await api.get<{ project: any }>(`/projects/slug/${slug}`);
      return res.data.project;
    },
    enabled: !!slug,
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: UpdateProject) => {
      const res = await api.patch(`/projects/${projectId}`, values);
      return res.data;
    },
    onSuccess: () => {
      // Keyed by the URL slug, not the DB id (see useProject above) — a
      // project's slug can differ from its id, so invalidating
      // ["project", projectId] here would silently miss the cache entry
      // the settings page is actually reading from. Invalidate the whole
      // "project" prefix instead so this works regardless of which one
      // the caller passed in.
      queryClient.invalidateQueries({ queryKey: ["project"] });
      toast.success("Project updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update project");
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const res = await api.delete(`/projects/${projectId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted successfully");
      router.push("/projects");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete project");
    },
  });
}

export interface ProjectAnalytics {
  stats: {
    totalSubscribers: number;
    growth7d: number;
    growth30d: number;
    lastPostSent: string | null;
    openRate: number;
  };
  chartData: Array<{
    date: string;
    count: number;
  }>;
  activity: Array<{
    id: string;
    type: "subscriber" | "email";
    name?: string;
    email?: string;
    subject?: string;
    createdAt: string;
  }>;
  lastPost: {
    id: string;
    subject: string;
    sentAt: string;
    openRate: number;
    clickRate: number;
  } | null;
  statusBreakdown: {
    subscribed: number;
    unsubscribed: number;
    bounced: number;
    pending: number;
  };
}

export function useProjectAnalytics(id: string, days: number = 30) {
  return useQuery({
    queryKey: ["project-analytics", id, days],
    queryFn: async () => {
      const res = await api.get<ServiceResponse<ProjectAnalytics>>(
        `/projects/${id}/analytics?days=${days}`
      );
      return res.data.data;
    },
    enabled: !!id,
  });
}
