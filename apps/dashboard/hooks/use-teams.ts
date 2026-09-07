import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@workspace/axios";
import { toast } from "sonner";
import type { TeamRoles } from "@workspace/types";

export interface Team {
  id: string;
  slug: string;
  name: string;
  role: TeamRoles;
  createdAt: string;
}

export interface TeamMember {
  userId: string;
  role: TeamRoles;
  joinedAt: string | null;
  user: { id: string; name: string; email: string };
}

export interface TeamInvite {
  inviteId: string;
  teamId: string;
  teamName: string;
  invitedBy: string;
  role: TeamRoles;
  createdAt: string;
}

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await api.get<{ data: { data: Team[] } }>("/teams");
      return res.data.data.data;
    },
  });
}

export function useTeam(teamId: string) {
  return useQuery({
    queryKey: ["team", teamId],
    queryFn: async () => {
      const res = await api.get(`/teams/${teamId}`);
      return res.data.team;
    },
    enabled: !!teamId,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: { name: string; slug: string }) => {
      const res = await api.post("/teams", values);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Team created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create team");
    },
  });
}

export function useUpdateTeam(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: { name?: string; slug?: string }) => {
      const res = await api.patch(`/teams/${teamId}`, values);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      toast.success("Team updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update team");
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string) => {
      const res = await api.delete(`/teams/${teamId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Team deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete team");
    },
  });
}

export function useTeamMembers(teamId: string) {
  return useQuery({
    queryKey: ["team-members", teamId],
    queryFn: async () => {
      const res = await api.get<{ data: TeamMember[] }>(`/teams/${teamId}/members`);
      return res.data.data;
    },
    enabled: !!teamId,
  });
}

export function useUpdateTeamMemberRole(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: TeamRoles }) => {
      const res = await api.patch(`/teams/${teamId}/members/${userId}`, { role });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", teamId] });
      toast.success("Member role updated");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update role");
    },
  });
}

export function useTransferTeamOwnership(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newOwnerUserId: string) => {
      const res = await api.post(`/teams/${teamId}/transfer-ownership`, {
        newOwnerUserId,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", teamId] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Team ownership transferred");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to transfer ownership");
    },
  });
}

export function useInviteToTeam(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: TeamRoles }) => {
      const res = await api.post(`/teams/${teamId}/invites`, { email, role });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", teamId] });
      toast.success("Invitation sent");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to send invitation");
    },
  });
}

export function useRevokeTeamInvite(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const res = await api.delete(`/teams/${teamId}/invites/${inviteId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", teamId] });
      toast.success("Invitation revoked");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to revoke invitation");
    },
  });
}

/** Pending invites addressed to the current user, across every team. */
export function useMyTeamInvites() {
  return useQuery({
    queryKey: ["my-team-invites"],
    queryFn: async () => {
      const res = await api.get<{ data: { data: TeamInvite[] } }>("/teams/invites");
      return res.data.data.data;
    },
  });
}

export function useAcceptTeamInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      const res = await api.post("/teams/invites/accept", { token });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["my-team-invites"] });
      toast.success("Invitation accepted");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to accept invitation");
    },
  });
}
