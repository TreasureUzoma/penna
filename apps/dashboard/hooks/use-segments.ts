import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@workspace/axios";
import { toast } from "sonner";

export interface Segment {
  id: string;
  name: string;
  description: string | null;
  criteria: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  subscriberCount: number;
}

export function useSegments(newsletterId: string) {
  return useQuery({
    queryKey: ["segments", newsletterId],
    queryFn: async () => {
      const res = await api.get<{ data: Segment[] }>(`/segments/${newsletterId}`);
      return res.data.data;
    },
    enabled: !!newsletterId,
  });
}

interface CreateSegmentData {
  name: string;
  description?: string;
}

export function useCreateSegment(newsletterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSegmentData) => {
      const res = await api.post<{ data: Segment }>(
        `/segments/${newsletterId}`,
        data
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["segments", newsletterId] });
      toast.success("Segment created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create segment");
    },
  });
}

export function useDeleteSegment(newsletterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (segmentId: string) => {
      const res = await api.delete(`/segments/${newsletterId}/${segmentId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["segments", newsletterId] });
      toast.success("Segment deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete segment");
    },
  });
}

export interface SegmentSubscriber {
  id: string;
  email: string;
}

export function useSegmentSubscribers(newsletterId: string, segmentId: string) {
  return useQuery({
    queryKey: ["segments", newsletterId, segmentId, "subscribers"],
    queryFn: async () => {
      const res = await api.get<{ data: SegmentSubscriber[] }>(
        `/segments/${newsletterId}/${segmentId}/subscribers`
      );
      return res.data.data;
    },
    enabled: !!newsletterId && !!segmentId,
  });
}

export function useAddSubscriberToSegment(newsletterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      segmentId,
      subscriberId,
    }: {
      segmentId: string;
      subscriberId: string;
    }) => {
      const res = await api.post(
        `/segments/${newsletterId}/${segmentId}/subscribers/${subscriberId}`
      );
      return res.data;
    },
    onSuccess: (_data, { segmentId }) => {
      queryClient.invalidateQueries({ queryKey: ["segments", newsletterId] });
      queryClient.invalidateQueries({
        queryKey: ["segments", newsletterId, segmentId, "subscribers"],
      });
      toast.success("Subscriber added to segment");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add subscriber to segment");
    },
  });
}

export function useRemoveSubscriberFromSegment(newsletterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      segmentId,
      subscriberId,
    }: {
      segmentId: string;
      subscriberId: string;
    }) => {
      const res = await api.delete(
        `/segments/${newsletterId}/${segmentId}/subscribers/${subscriberId}`
      );
      return res.data;
    },
    onSuccess: (_data, { segmentId }) => {
      queryClient.invalidateQueries({ queryKey: ["segments", newsletterId] });
      queryClient.invalidateQueries({
        queryKey: ["segments", newsletterId, segmentId, "subscribers"],
      });
      toast.success("Subscriber removed from segment");
    },
    onError: (error: any) => {
      toast.error(
        error.message || "Failed to remove subscriber from segment"
      );
    },
  });
}
