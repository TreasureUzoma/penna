"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@workspace/axios";
import { toast } from "sonner";
import { ChangePasswordData } from "@workspace/validations";

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: ChangePasswordData) => {
      const res = await api.post("/auth/change-password", data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Password changed successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to change password");
    },
  });
}

export function useActiveSessions() {
  return useQuery({
    queryKey: ["active-sessions"],
    queryFn: async () => {
      const res = await api.get("/auth/sessions");
      return res.data.data;
    },
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await api.delete(`/auth/sessions/${sessionId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-sessions"] });
      toast.success("Session revoked successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to revoke session");
    },
  });
}

/** Signs out every session except the one making this request. */
export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await api.post("/auth/sessions/revoke-others");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-sessions"] });
      toast.success("Signed out of all other sessions");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to sign out other sessions"
      );
    },
  });
}
