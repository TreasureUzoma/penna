import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@workspace/axios";
import { toast } from "sonner";

export interface DnsCnameRecord {
  name: string;
  value: string;
}

export interface DomainRecord {
  id: string;
  projectId: string | null;
  name: string;
  verified: boolean;
  createdAt: string;
  dnsRecords: DnsCnameRecord[];
  /** null when the domain has been verified but not assigned to a project yet. */
  project: { id: string; slug: string; name: string } | null;
}

/**
 * Domains visible to the current user. Pass `projectId` for a single
 * project's Domains tab; omit it for the account-wide Domains page, which
 * also picks up domains the user has verified but not assigned yet.
 */
export function useDomains(projectId?: string) {
  return useQuery({
    queryKey: ["domains", projectId ?? "all"],
    queryFn: async () => {
      const res = await api.get<{ data: DomainRecord[] }>("/domains", {
        params: projectId ? { projectId } : undefined,
      });
      return res.data.data;
    },
  });
}

/** Adds a domain — pass `projectId` to add it straight into a project, or omit it to verify first and assign later. */
export function useAddDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      projectId,
    }: {
      name: string;
      projectId?: string;
    }) => {
      const res = await api.post<{ data: DomainRecord; message: string }>(
        "/domains",
        { name, projectId }
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["domains"] });
      toast.success(data.message || "Domain added");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to add domain");
    },
  });
}

export function useVerifyDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (domainId: string) => {
      const res = await api.post<{ data: DomainRecord; message: string }>(
        `/domains/${domainId}/verify`
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["domains"] });
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

/** Attaches an already-verified, unassigned domain to a project. */
export function useAssignDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      domainId,
      projectId,
    }: {
      domainId: string;
      projectId: string;
    }) => {
      const res = await api.post<{ data: DomainRecord; message: string }>(
        `/domains/${domainId}/assign`,
        { projectId }
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["domains"] });
      toast.success(data.message || "Domain assigned");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to assign domain");
    },
  });
}

export function useDeleteDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (domainId: string) => {
      const res = await api.delete(`/domains/${domainId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["domains"] });
      toast.success("Domain removed");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to remove domain");
    },
  });
}
