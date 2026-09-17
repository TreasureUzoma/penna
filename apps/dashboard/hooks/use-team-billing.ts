import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@workspace/axios";
import { toast } from "sonner";
import type { Plan, PlanSlug } from "@workspace/constants/plans";
import { showErrorToast } from "../lib/error-toast";

export interface TeamSubscription {
  id: string;
  teamId: string;
  paddleSubscriptionId: string;
  paddleCustomerId: string;
  planSlug: string;
  priceId: string;
  status: "active" | "trialing" | "past_due" | "paused" | "canceled";
  quantity: number;
  scheduledChange: { action: string; effectiveAt: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamBillingInfo {
  subscription: TeamSubscription | null;
  plan: Plan;
}

/**
 * A team's real Paddle subscription (if any) plus its resolved effective
 * plan. A team with no live subscription yet still has an effective plan —
 * the server resolves the Phase-1 fallback (the owner's individual plan)
 * server-side, so `plan` is always populated even when `subscription` isn't.
 */
export function useTeamSubscription(teamId: string) {
  return useQuery({
    queryKey: ["team-subscription", teamId],
    queryFn: async () => {
      const res = await api.get<{ data: TeamBillingInfo }>(
        `/teams/${teamId}/subscription`,
      );
      return res.data.data;
    },
    enabled: !!teamId,
  });
}

export interface CreateTeamCheckoutOptions {
  planSlug: PlanSlug;
  successUrl: string;
  cancelUrl: string;
}

export function useCreateTeamCheckout(teamId: string) {
  return useMutation({
    mutationFn: async (values: CreateTeamCheckoutOptions) => {
      const res = await api.post(`/teams/${teamId}/checkout`, values);
      return res.data as {
        success: boolean;
        message: string;
        data: { transactionId: string; url: string } | null;
      };
    },
    onError: (error) => {
      showErrorToast(error, "Failed to start checkout");
    },
  });
}

export function useCancelTeamSubscription(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await api.post(`/teams/${teamId}/cancel-subscription`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["team-subscription", teamId],
      });
      toast.success("Subscription canceled");
    },
    onError: (error) => {
      showErrorToast(error, "Failed to cancel subscription");
    },
  });
}
