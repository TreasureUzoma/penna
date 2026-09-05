"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { Check } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { plans } from "@workspace/constants/plans";
import { useGetProfile } from "@/hooks/use-auth";
import { SettingsLayout } from "../components/settings-layout";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Paddle's transaction API doesn't return a hosted checkout page — it
 * returns `${successUrl}?_ptxn=<transactionId>` (see
 * `createCheckoutSession` in apps/server/services/paddle.ts). Nothing
 * actually opens a checkout until a page with Paddle.js on it reads that
 * `_ptxn` param and calls `Paddle.Checkout.open({ transactionId })` — this
 * is that page. Without this, visiting the returned URL just lands here
 * with the query param sitting there unused.
 */
function usePaddleTransactionCheckout() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [paddle, setPaddle] = useState<Paddle | null>(null);

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
          successUrl: `${window.location.origin}/settings/billing?success=true`,
        },
      },
      eventCallback: (event) => {
        if (event.name === "checkout.completed") {
          toast.success("Payment successful — updating your plan…");
          queryClient.invalidateQueries({ queryKey: ["session"] });
        }
      },
    }).then((p) => p && setPaddle(p));
  }, [queryClient]);

  useEffect(() => {
    const transactionId = searchParams.get("_ptxn");
    if (!paddle || !transactionId) return;

    paddle.Checkout.open({ transactionId });
  }, [paddle, searchParams]);
}

function BillingSettingsPageContent() {
  usePaddleTransactionCheckout();
  const { data: profile } = useGetProfile();
  const currentPlanSlug = profile?.plan || "hobby";
  /* eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain */
  const currentPlan =
    plans.find((p) => p.slug === currentPlanSlug) || plans[0]!;

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>
              You are currently on the{" "}
              <span className="capitalize">{currentPlan.name}</span> plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <p className="font-semibold text-lg capitalize">
                  {currentPlan.name} Plan
                </p>
                <p className="text-sm text-muted-foreground">
                  {currentPlan.price === 0
                    ? "No payment method required"
                    : "Billed monthly"}
                </p>
              </div>
              <div className="flex gap-2">
                {currentPlan.price !== 0 && (
                  <Button variant="outline">Manage Subscription</Button>
                )}
                <Button
                  variant="outline"
                  asChild
                >
                  <a href="/settings/billing/invoices">View Invoices</a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Available Plans</h3>
            <p className="text-sm text-muted-foreground">
              Choose the plan that best fits your needs.
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
                      <span className="text-muted-foreground">/month</span>
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
                    disabled={plan.slug === currentPlanSlug}
                    onClick={() => {
                      if (plan.slug !== currentPlanSlug) {
                        window.location.href = `/settings/billing/subscribe?plan=${plan.slug}`;
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

        {currentPlan.price !== 0 && (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive">
                Cancel Subscription
              </CardTitle>
              <CardDescription>
                Cancel your subscription and downgrade to the Free plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive">Cancel Subscription</Button>
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
