"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { plans } from "@workspace/constants/plans";
import type { PlanSlug } from "@workspace/constants/plans";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useTeams } from "@/hooks/use-teams";
import {
  useTeamSubscription,
  useCancelTeamSubscription,
  useCreateTeamCheckout,
} from "@/hooks/use-team-billing";
import { SettingsLayout } from "../../components/settings-layout";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { toast } from "sonner";

export default function SubscribePage(): React.ReactNode {
  return (
    <Suspense fallback={null}>
      <SubscribePageContent />
    </Suspense>
  );
}

function SubscribePageContent(): React.ReactNode {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planSlug = searchParams.get("plan");
  const teamSlug = searchParams.get("team");

  const { data: teams, isLoading: isLoadingTeams } = useTeams();
  const activeTeam =
    (teamSlug ? teams?.find((t) => t.slug === teamSlug) : undefined) ??
    teams?.[0];

  const { data: billing, isLoading: isLoadingBilling } = useTeamSubscription(
    activeTeam?.id ?? "",
  );
  const { mutate: createCheckout } = useCreateTeamCheckout(
    activeTeam?.id ?? "",
  );
  const { mutate: cancelSubscription } = useCancelTeamSubscription(
    activeTeam?.id ?? "",
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const profileLoading = isLoadingTeams || isLoadingBilling;
  const selectedPlan = plans.find((p) => p.slug === planSlug);
  const currentPlan =
    plans.find((p) => p.slug === billing?.plan.slug) || plans[0]!;
  const isOwnerOrAdmin =
    activeTeam?.role === "owner" || activeTeam?.role === "admin";

  // Redirect if no plan selected or invalid plan
  useEffect(() => {
    if (!profileLoading && (!planSlug || !selectedPlan)) {
      router.push("/settings/billing");
    }
  }, [profileLoading, planSlug, selectedPlan, router]);

  // Redirect if already on this plan
  useEffect(() => {
    if (billing && selectedPlan && billing.plan.slug === selectedPlan.slug) {
      router.push("/settings/billing");
    }
  }, [billing, selectedPlan, router]);

  // Redirect if this member can't manage billing for the team
  useEffect(() => {
    if (!profileLoading && activeTeam && !isOwnerOrAdmin) {
      toast.error("Only a team owner or admin can change billing");
      router.push("/settings/billing");
    }
  }, [profileLoading, activeTeam, isOwnerOrAdmin, router]);

  const handleSubscribe = async () => {
    if (!selectedPlan || !activeTeam) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Downgrading to the free plan is just a cancel — no checkout needed.
      if (selectedPlan.slug === "hobby") {
        cancelSubscription(undefined, {
          onSuccess: () => {
            setSuccess(true);
            setTimeout(() => {
              router.push("/settings/billing");
              router.refresh();
            }, 2000);
          },
          onError: (err: any) => {
            setError(err.response?.data?.message || "Failed to downgrade");
          },
          onSettled: () => setIsProcessing(false),
        });
        return;
      }

      // Create a real per-seat checkout session for paid plans.
      createCheckout(
        {
          planSlug: selectedPlan.slug as PlanSlug,
          successUrl: `${window.location.origin}/settings/billing?success=true&team=${activeTeam.slug}`,
          cancelUrl: `${window.location.origin}/settings/billing/subscribe?plan=${selectedPlan.slug}&team=${activeTeam.slug}`,
        },
        {
          onSuccess: (response) => {
            if (response.success && response.data?.url) {
              toast.success("Redirecting to checkout...");
              window.location.href = response.data.url;
            } else {
              setError(response.message || "Failed to create checkout");
            }
          },
          onError: (err: any) => {
            setError(
              err.response?.data?.message || "Failed to create checkout",
            );
          },
          onSettled: () => setIsProcessing(false),
        },
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to process subscription";
      setError(errorMessage);
      toast.error(errorMessage);
      setIsProcessing(false);
    }
  };

  if (profileLoading || !selectedPlan || !activeTeam) {
    return (
      <SettingsLayout>
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>

              <div className="flex justify-center">
                <Skeleton className="h-4 w-4" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 flex-1" />
              </div>
            </CardContent>
          </Card>
        </div>
      </SettingsLayout>
    );
  }

  const isUpgrade = selectedPlan.tier > (currentPlan?.tier || 0);
  const isDowngrade = selectedPlan.tier < (currentPlan?.tier || 0);
  const seatCount = billing?.subscription?.quantity;

  return (
    <SettingsLayout>
      <div className="max-w-2xl space-y-6">
        {/* Plan Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Confirm Subscription</CardTitle>
            <CardDescription>
              Review {activeTeam.name}'s subscription details before proceeding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Plan */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Current Plan
              </p>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="capitalize font-medium">
                  {currentPlan.name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {currentPlan.price === 0
                    ? "Free"
                    : `$${currentPlan.price}/seat/month`}
                </span>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="text-muted-foreground">↓</div>
            </div>

            {/* New Plan */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                New Plan
              </p>
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                <span className="capitalize font-medium">
                  {selectedPlan.name}
                </span>
                <span className="text-sm font-semibold">
                  {selectedPlan.price === 0
                    ? "Free"
                    : `$${selectedPlan.price}/seat/month`}
                </span>
              </div>
            </div>

            {/* Plan Features */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Features
              </p>
              <ul className="space-y-2">
                {selectedPlan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Billing Info */}
            {selectedPlan.price !== 0 && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-sm">
                  <span className="text-muted-foreground">Billing: </span>
                  <span className="font-medium">Monthly, per seat</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Seats: </span>
                  <span className="font-medium">
                    {seatCount ?? "current team size"}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Amount: </span>
                  <span className="font-medium">
                    ${selectedPlan.price}
                    {seatCount
                      ? ` × ${seatCount} = $${(selectedPlan.price ?? 0) * seatCount}`
                      : ""}
                    /month
                  </span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Subscribers: </span>
                  <span className="font-medium">
                    {selectedPlan.subscribers === null
                      ? "unlimited"
                      : `up to ${selectedPlan.subscribers.toLocaleString()}`}
                  </span>
                </p>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Subscription updated successfully! Redirecting...
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubscribe}
                disabled={isProcessing || success}
                className="flex-1"
              >
                {isProcessing && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {success
                  ? "Subscription Updated"
                  : isUpgrade
                    ? "Upgrade Now"
                    : isDowngrade
                      ? "Downgrade"
                      : "Subscribe"}
              </Button>
            </div>

            {/* Info Text */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center">
                {isUpgrade &&
                  "Your team's new plan will be active immediately."}
                {isDowngrade &&
                  "Your team will be downgraded at the end of your current billing cycle."}
                {!isUpgrade &&
                  !isDowngrade &&
                  "Your team's subscription will be updated immediately."}
              </p>
              {selectedPlan.price !== 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  30-day money-back guarantee.{" "}
                  <a
                    href="https://penna.dev/refund"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    View refund policy
                  </a>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Paddle Info */}
        {selectedPlan.price !== 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You will be redirected to Paddle to complete your payment
              securely.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </SettingsLayout>
  );
}
