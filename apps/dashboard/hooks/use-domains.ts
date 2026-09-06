import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@workspace/axios";
import { toast } from "sonner";

export interface DnsCnameRecord {
  name: string;
  value: string;
}

export interface ProjectDomain {
  id: string;
  projectId: string;
  name: string;
  verified: boolean;
  createdAt: string;
  dnsRecords: DnsCnameRecord[];
}

/** A domain plus which project it belongs to — what the account-wide Domains page lists. */
export interface AccountDomain extends ProjectDomain {
  project: { id: string; slug: string; name: string };
}

/** Every domain across every project the user belongs to — backs the root-sidebar Domains page. */
export function useAllDomains() {
  return useQuery({
    queryKey: ["account-domains"],
    queryFn: async () => {
      const res = await api.get<{ data: AccountDomain[] }>("/domains");
      return res.data.data;
    },
  });
}

/**
 * Verify/delete for the account-wide page, which lists domains from many
 * projects at once — unlike the per-project hooks below, projectId comes
 * in with each call instead of being fixed at hook-creation time.
 */
export function useVerifyAnyDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      domainId,
    }: {
      projectId: string;
      domainId: string;
    }) => {
      const res = await api.post<{ data: ProjectDomain; message: string }>(
        `/projects/${projectId}/domains/${domainId}/verify`
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["account-domains"] });
      toast[data.data?.verified ? "success" : "info"](
        data.message || "Checked domain status"
      );
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to check domain status"
      );
    },
  });
}

export function useDeleteAnyDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      domainId,
    }: {
      projectId: string;
      domainId: string;
    }) => {
      const res = await api.delete(
        `/projects/${projectId}/domains/${domainId}`
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-domains"] });
      toast.success("Domain removed");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to remove domain");
    },
  });
}

export function useProjectDomains(projectId: string) {
  return useQuery({
    queryKey: ["project-domains", projectId],
    queryFn: async () => {
      const res = await api.get<{ data: ProjectDomain[] }>(
        `/projects/${projectId}/domains`
      );
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

export function useAddProjectDomain(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post<{ data: ProjectDomain; message: string }>(
        `/projects/${projectId}/domains`,
        { name }
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["project-domains", projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["account-domains"] });
      toast.success(data.message || "Domain added");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to add domain");
    },
  });
}

export function useVerifyProjectDomain(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (domainId: string) => {
      const res = await api.post<{ data: ProjectDomain; message: string }>(
        `/projects/${projectId}/domains/${domainId}/verify`
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["project-domains", projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["account-domains"] });
      toast[data.data?.verified ? "success" : "info"](
        data.message || "Checked domain status"
      );
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to check domain status"
      );
    },
  });
}

export function useDeleteProjectDomain(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (domainId: string) => {
      const res = await api.delete(
        `/projects/${projectId}/domains/${domainId}`
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-domains", projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["account-domains"] });
      toast.success("Domain removed");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to remove domain");
    },
  });
}
