import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@workspace/axios";
import { toast } from "sonner";
import type { ServiceResponse } from "@workspace/types";

export interface Email {
  id: string;
  subject: string;
  body: string;
  status: "published" | "draft";
  sentAt: string;
}

export function useEmails(newsletterId: string) {
  return useQuery({
    queryKey: ["emails", newsletterId],
    queryFn: async () => {
      const res = await api.get<{ data: Email[] }>(
        `/newsletters/${newsletterId}/emails`
      );
      return res.data.data;
    },
    enabled: !!newsletterId,
  });
}

export function useEmail(newsletterId: string, emailId: string) {
  return useQuery({
    queryKey: ["email", newsletterId, emailId],
    queryFn: async () => {
      const res = await api.get<{ data: Email }>(
        `/newsletters/${newsletterId}/emails/${emailId}`
      );
      return res.data.data;
    },
    enabled: !!newsletterId && !!emailId,
  });
}

interface CreateEmailData {
  subject: string;
  body: string;
  sentAt?: string;
  status?: "published" | "draft";
}

export function useCreateEmail(newsletterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEmailData) => {
      const res = await api.post<{ data: Email }>(
        `/newsletters/${newsletterId}/emails`,
        data
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails", newsletterId] });
      toast.success("Post created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create post");
    },
  });
}

type UpdateEmailValues = {
  emailId: string;
  subject?: string;
  body?: string;
  status?: "published" | "draft";
  sentAt?: string;
};

export function useUpdateEmail(newsletterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: UpdateEmailValues) => {
      const { emailId, ...data } = values;
      const res = await api.patch<ServiceResponse<any>>(
        `/newsletters/${newsletterId}/emails/${emailId}`,
        data
      );
      return res.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Post updated successfully");
        queryClient.invalidateQueries({ queryKey: ["emails", newsletterId] });
      } else {
        toast.error(data.message || "Failed to update post");
      }
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Something went wrong"
      );
    },
  });
}

export function useDeleteEmail(newsletterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emailId: string) => {
      const res = await api.delete(`/newsletters/${newsletterId}/emails/${emailId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails", newsletterId] });
      toast.success("Post deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete post");
    },
  });
}
