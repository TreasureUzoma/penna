import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@workspace/axios";
import { toast } from "sonner";

export interface ApiKey {
  id: string;
  publicKey: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export function useNewsletterApiKeys(newsletterId: string) {
  return useQuery({
    queryKey: ["newsletter-api-keys", newsletterId],
    queryFn: async () => {
      const res = await api.get<{ data: ApiKey[] }>(
        `/newsletters/api/${newsletterId}`
      );
      return res.data.data;
    },
    enabled: !!newsletterId,
  });
}

export function useCreateNewsletterApiKey(newsletterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: ApiKey & { secretKey: string } }>(
        `/newsletters/api/${newsletterId}`
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["newsletter-api-keys", newsletterId],
      });
      toast.success("API key created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create API key");
    },
  });
}

export function useDeleteNewsletterApiKey(newsletterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string) => {
      const res = await api.delete(`/newsletters/api/${newsletterId}/${keyId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["newsletter-api-keys", newsletterId],
      });
      toast.success("API key deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete API key");
    },
  });
}
