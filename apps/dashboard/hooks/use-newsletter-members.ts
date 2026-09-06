import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@workspace/axios";
import { toast } from "sonner";

export function useNewsletterMembers(newsletterId: string) {
  return useQuery({
    queryKey: ["newsletter-members", newsletterId],
    queryFn: async () => {
      const res = await api.get(`/newsletters/${newsletterId}/members`);
      return res.data.data;
    },
    enabled: !!newsletterId,
  });
}

export function useTransferOwnership(newsletterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newOwnerUserId: string) => {
      const res = await api.post(
        `/newsletters/${newsletterId}/transfer-ownership`,
        { newOwnerUserId }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["newsletter-members", newsletterId],
      });
      toast.success("Newsletter ownership transferred");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to transfer ownership"
      );
    },
  });
}

export function useUpdateNewsletterMember(newsletterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await api.patch(`/newsletters/roles/update`, {
        newsletterId,
        targetUserId: userId,
        role,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["newsletter-members", newsletterId],
      });
      toast.success("Member role updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update role");
    },
  });
}
