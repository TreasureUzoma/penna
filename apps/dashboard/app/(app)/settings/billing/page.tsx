"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Label } from "@workspace/ui/components/label";
import { Check, Loader2 } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { plans } from "@workspace/constants/plans";
import { useTeams } from "@/hooks/use-teams";
import { useTeamSubscription, useCancelTeamSubscription } from "@/hooks/use-team-billing";
import { SettingsLayout } from "../components/settings-layout";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";

/**
 * Paddle's transaction API doesn't return a hosted checkout page — it
 * returns `${successUrl}?_ptxn=<transactionId>` (see
 * `createTeamCheckoutSession` in apps/server/services/team-billing.ts).
 * Nothing actually opens a checkout until a page with Paddle.js on it reads
 * that `_ptxn` param and calls `Paddle.Checkout.open({ transactionId })` —
 * this is that page. Without this, visiting the returned URL just lands
 * here with the query param sitting there unused.
 */
function usePaddleTransactionCheckout(teamId: string) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [paddle, setPaddle] = useState<Paddle | null>(null);

  // Paddle's own successUrl redirect fires as soon as the client-side
  // checkout completes — it doesn't wait for the transaction/subscription
  // webhook to actually land and update the team's plan in our DB, which
  // can lag by a few seconds. Without this, the page loads, fetches the
  // still-old plan once, and the user has to manually refresh later once
  // the webhook has caught up. Poll for a short window instead so it
  // updates on its own, then strip `success` from the URL so this doesn't
  // repeat on a later unrelated visit/refresh of this page.
  useEffect(() => {
    if (searchParams.get("success") !== "true" || !teamId) return;

    let attempts = 0;
    const maxAttempts = 6;
    const interval = setInterval(() => {
      attempts += 1;
      queryClient.refetchQueries({ queryKey: ["team-subscription", teamId] });
      if (attempts >= maxAttempts) clearInterval(interval);
    }, 1500);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("success");
    params.delete("_ptxn");
    router.replace(`/settings/billing${params.toString() ? `?${params}` : ""}`);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  useEffect(() => {
    const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    const env = process.env.NEXT_PUBLIC_PADDLE_ENV;
    if (!clientToken || !env) return;

    initializePaddle({
      token: clientToken,
      environment: env as "sandbox" | "production",
      // Without this, the overlay shows its own "payment successful"
      // screen and just sits there — nothing tells it to close or
      // navigate anywhere. This makes Paddle.js itself redirect the top
      // window once checkout completes.
      checkout: {
        settings: {
          successUrl: `${window.location.origin}/settings/billing?success=true${teamId ? `&team=${encodeURIComponent(teamId)}` : ""}`,
        },
      },
      eventCallback: (event) => {
        if (event.name === "checkout.completed") {
          toast.success("Payment successful — updating your team's plan…");
          queryClient.invalidateQueries({ queryKey: ["team-subscription", teamId] });
        }
      },
    }).then((p) => p && setPaddle(p));
  }, [queryClient, teamId]);

  useEffect(() => {
    const transactionId = searchParams.get("_ptxn");
    if (!paddle || !transactionId) return;

    paddle.Checkout.open({ transactionId });
  }, [paddle, searchParams]);
}

function BillingSettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: teams, isLoading: isLoadingTeams } = useTeams();

  const requestedSlug = searchParams.get("team");
  const activeTeam =
    (requestedSlug ? teams?.find((t) => t.slug === requestedSlug) : undefined) ??
    teams?.[0];

  usePaddleTransactionCheckout(activeTeam?.id ?? "");

  const { data: billing, isLoading: isLoadingBilling } = useTeamSubscription(
    activeTeam?.id ?? ""
  );
  const { mutate: cancelSubscription, isPending: isCanceling } =
    useCancelTeamSubscription(activeTeam?.id ?? "");

  const isOwnerOrAdmin = activeTeam?.role === "owner" || activeTeam?.role === "admin";
  const currentPlanSlug = billing?.plan.slug || "hobby";
  const currentPlan = plans.find((p) => p.slug === currentPlanSlug) || plans[0]!;
  const sub = billing?.subscription;

  if (isLoadingTeams) {
    return (
      <SettingsLayout>
        <div className="flex justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </SettingsLayout>
    );
  }

  if (!activeTeam) {
    return (
      <SettingsLayout>
        <p className="text-sm text-muted-foreground">
          You're not on any team yet.
        </p>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {teams && teams.length > 1 && (
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground shrink-0">Team</Label>
            <Select
              value={activeTeam.slug}
              onValueChange={(slug) => router.push(`/settings/billing?team=${slug}`)}
            >
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.slug}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>
              {activeTeam.name} is currently on the{" "}
              <span className="capitalize">{currentPlan.name}</span> plan
              {sub && sub.quantity > 1 ? ` (${sub.quantity} seats)` : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingBilling ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-semibold text-lg capitalize">
                    {currentPlan.name} Plan
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentPlan.price === 0
                      ? "No payment method required"
                      : sub?.scheduledChange
                        ? `Cancels on ${new Date(sub.scheduledChange.effectiveAt).toLocaleDateString()}`
                        : "Billed monthly, per seat"}
                  </p>
                </div>
                {isOwnerOrAdmin && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" className="w-full sm:w-auto" asChild>
                      <a href="/settings/billing/invoices">View Invoices</a>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Available Plans</h3>
            <p className="text-sm text-muted-foreground">
              Every seat on {activeTeam.name} is billed together — adding a
              member increases the price, removing one reduces it at the
              next renewal.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.slug}
                className={
                  plan.slug === "professional"
                    ? "border-primary shadow-lg"
                    : plan.slug === currentPlanSlug
                      ? "border-muted-foreground/50"
                      : ""
                }
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg capitalize">
                      {plan.name}
                    </CardTitle>
                    {plan.slug === "professional" && (
                      <Badge variant="default">Popular</Badge>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      {plan.priceLabel}
                    </span>
                    {plan.price !== null && (
                      <span className="text-muted-foreground">
                        /seat/month
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={
                      plan.slug === currentPlanSlug ? "outline" : "default"
                    }
                    disabled={plan.slug === currentPlanSlug || !isOwnerOrAdmin}
                    title={
                      !isOwnerOrAdmin
                        ? "Only a team owner or admin can change billing"
                        : undefined
                    }
                    onClick={() => {
                      if (plan.slug !== currentPlanSlug) {
                        router.push(
                          `/settings/billing/subscribe?plan=${plan.slug}&team=${activeTeam.slug}`
                        );
                      }
                    }}
                  >
                    {plan.slug === currentPlanSlug ? "Current Plan" : "Upgrade"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {currentPlan.price !== 0 && isOwnerOrAdmin && (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive">
                Cancel Subscription
              </CardTitle>
              <CardDescription>
                {sub?.scheduledChange
                  ? "Already scheduled to cancel — the team keeps its plan until then."
                  : "Cancel at the end of the current billing period and downgrade to Hobby."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={isCanceling || !!sub?.scheduledChange}
                  >
                    {isCanceling && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {sub?.scheduledChange
                      ? "Cancellation Scheduled"
                      : "Cancel Subscription"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {activeTeam.name} will keep its current plan through the
                      rest of this billing period, then move to Hobby. This
                      isn't refunded and can't be undone from here.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                    <AlertDialogAction onClick={() => cancelSubscription()}>
                      Cancel Subscription
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}
      </div>
    </SettingsLayout>
  );
}

export default function BillingSettingsPage() {
  return (
    <Suspense fallback={null}>
      <BillingSettingsPageContent />
    </Suspense>
  );
}
