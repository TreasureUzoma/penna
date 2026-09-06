import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@workspace/axios";
import type { Newsletter } from "@workspace/constants/types/newsletters";
import type { ServiceResponse } from "@workspace/types";
import type { UpdateNewsletter } from "@workspace/validations";
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

export function useNewsletters() {
  return useQuery({
    queryKey: ["newsletters"],
    queryFn: async () => {
      const res = await api.get<{ data: PaginatedResponse<Newsletter> }>(
        "/newsletters"
      );
      return res.data.data.data;
    },
  });
}

export function useNewsletter(slug: string) {
  return useQuery({
    queryKey: ["newsletter", slug],
    queryFn: async () => {
      const res = await api.get<{ newsletter: any }>(`/newsletters/slug/${slug}`);
      return res.data.newsletter;
    },
    enabled: !!slug,
  });
}

export function useUpdateNewsletter(newsletterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: UpdateNewsletter) => {
      const res = await api.patch(`/newsletters/${newsletterId}`, values);
      return res.data;
    },
    onSuccess: () => {
      // Keyed by the URL slug, not the DB id (see useNewsletter above) — a
      // newsletter's slug can differ from its id, so invalidating
      // ["newsletter", newsletterId] here would silently miss the cache
      // entry the settings page is actually reading from. Invalidate the
      // whole "newsletter" prefix instead so this works regardless of
      // which one the caller passed in.
      queryClient.invalidateQueries({ queryKey: ["newsletter"] });
      toast.success("Newsletter updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update newsletter");
    },
  });
}

export function useDeleteNewsletter() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (newsletterId: string) => {
      const res = await api.delete(`/newsletters/${newsletterId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletters"] });
      toast.success("Newsletter deleted successfully");
      router.push("/newsletters");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete newsletter");
    },
  });
}

export interface NewsletterAnalytics {
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

export function useNewsletterAnalytics(id: string, days: number = 30) {
  return useQuery({
    queryKey: ["newsletter-analytics", id, days],
    queryFn: async () => {
      const res = await api.get<ServiceResponse<NewsletterAnalytics>>(
        `/newsletters/${id}/analytics?days=${days}`
      );
      return res.data.data;
    },
    enabled: !!id,
  });
}
