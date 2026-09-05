"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { plans } from "@workspace/constants/plans";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useGetProfile } from "@/hooks/use-auth";
import { SettingsLayout } from "../../components/settings-layout";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Skeleton } from "@workspace/ui/components/skeleton";
import api from "@workspace/axios";
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
  const { data: profile, isLoading: profileLoading } = useGetProfile();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedPlan = plans.find((p) => p.slug === planSlug);
  const currentPlan = plans.find((p) => p.slug === profile?.plan) || plans[0]!;

  // Redirect if no plan selected or invalid plan
  useEffect(() => {
    if (!planSlug || !selectedPlan) {
      router.push("/settings/billing");
    }
  }, [planSlug, selectedPlan, router]);

  // Redirect if already on this plan
  useEffect(() => {
    if (profile && selectedPlan && profile.plan === selectedPlan.slug) {
      router.push("/settings/billing");
    }
  }, [profile, selectedPlan, router]);

  const handleSubscribe = async () => {
    if (!selectedPlan) return;

    setIsProcessing(true);
    setError(null);

    try {
      // If upgrading to free plan, just downgrade
      if (selectedPlan.slug === "hobby") {
        const response = await api.post("/subscriptions/cancel");
        if (response.data.success) {
          setSuccess(true);
          toast.success("Subscription canceled successfully");
          setTimeout(() => {
            router.push("/settings/billing");
            router.refresh();
          }, 2000);
        } else {
          setError(response.data.message || "Failed to downgrade");
          toast.error(response.data.message || "Failed to downgrade");
        }
        return;
      }

      // Create checkout session for paid plans
      const response = await api.post("/subscriptions/checkout", {
        planSlug: selectedPlan.slug,
        successUrl: `${window.location.origin}/settings/billing?success=true`,
        cancelUrl: `${window.location.origin}/settings/billing/subscribe?plan=${selectedPlan.slug}`,
      });

      if (response.data.success && response.data.data?.url) {
        toast.success("Redirecting to checkout...");
        // Redirect to Paddle checkout
        window.location.href = response.data.data.url;
      } else {
        setError(response.data.message || "Failed to create checkout");
        toast.error(response.data.message || "Failed to create checkout");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to process subscription";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (profileLoading || !selectedPlan) {
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

  return (
    <SettingsLayout>
      <div className="max-w-2xl space-y-6">
        {/* Plan Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Confirm Subscription</CardTitle>
            <CardDescription>
              Review your subscription details before proceeding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Plan */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Current Plan
              </p>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="capitalize font-medium">{currentPlan.name}</span>
                <span className="text-sm text-muted-foreground">
                  {currentPlan.price === 0
                    ? "Free"
                    : `$${currentPlan.price}/month`}
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
                <span className="capitalize font-medium">{selectedPlan.name}</span>
                <span className="text-sm font-semibold">
                  {selectedPlan.price === 0
                    ? "Free"
                    : `$${selectedPlan.price}/month`}
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
                  <span className="font-medium">Monthly</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Amount: </span>
                  <span className="font-medium">${selectedPlan.price}/month</span>
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
            <p className="text-xs text-muted-foreground text-center">
              {isUpgrade && "Your new plan will be active immediately."}
              {isDowngrade &&
                "Your plan will be downgraded at the end of your current billing cycle."}
              {!isUpgrade &&
                !isDowngrade &&
                "Your subscription will be updated immediately."}
            </p>
          </CardContent>
        </Card>

        {/* Paddle Info */}
        {selectedPlan.price !== 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You will be redirected to Paddle to complete your payment securely.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </SettingsLayout>
  );
}
