import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@workspace/axios";
import { toast } from "sonner";

export interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  status: "subscribed" | "unsubscribed" | "pending" | "bounced";
  createdAt: string;
}

import { PaginatedResponse } from "@workspace/types";

export function useSubscribers(newsletterId: string, page = 1, limit = 10) {
  return useQuery({
    queryKey: ["subscribers", newsletterId, page, limit],
    queryFn: async () => {
      const res = await api.get<{ data: PaginatedResponse<Subscriber> }>(
        `/newsletters/${newsletterId}/subscribers`,
        { params: { page, limit } }
      );
      return res.data.data;
    },
    enabled: !!newsletterId,
  });
}

interface CreateSubscriberData {
  email: string;
  name?: string;
}

export function useCreateSubscriber(newsletterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSubscriberData) => {
      const res = await api.post<{ data: Subscriber }>(
        `/newsletters/${newsletterId}/subscribers`,
        data
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscribers", newsletterId] });
      toast.success("Subscriber added successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to add subscriber");
    },
  });
}

interface ImportSubscribersResult {
  imported: number;
  skippedDuplicates: number;
  invalidRows: number;
  totalRows: number;
}

export function useImportSubscribers(newsletterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (csvContent: string) => {
      const res = await api.post<{ data: ImportSubscribersResult }>(
        `/newsletters/${newsletterId}/subscribers/import`,
        { csvContent }
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subscribers", newsletterId] });
      const skipped = (data?.skippedDuplicates ?? 0) + (data?.invalidRows ?? 0);
      toast.success(
        `Imported ${data?.imported ?? 0} subscriber${data?.imported === 1 ? "" : "s"}` +
          (skipped > 0 ? ` (${skipped} skipped)` : "")
      );
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to import subscribers"
      );
    },
  });
}

export function useDeleteSubscriber(newsletterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriberId: string) => {
      const res = await api.delete(
        `/newsletters/${newsletterId}/subscribers/${subscriberId}`
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscribers", newsletterId] });
      toast.success("Subscriber removed successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to remove subscriber"
      );
    },
  });
}
