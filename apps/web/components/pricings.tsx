"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Check } from "lucide-react";
import { getPlanForSubscriberCount } from "@workspace/constants/plans";
import Link from "next/link";
import { meta } from "@workspace/constants/meta";

export function Pricings() {
  const [subscriberCount, setSubscriberCount] = useState(1000);
  const [inputValue, setInputValue] = useState("1000");

  const plan = getPlanForSubscriberCount(subscriberCount);
  const isCustomPricing = plan.price === null;
  const sentenceCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    if (value.length > 1 && value.startsWith("0")) {
      value = value.replace(/^0+/, "");
    } else if (value.length === 0) {
      value = "0";
    }

    setInputValue(value);

    const numValue = Number(value);
    setSubscriberCount(Math.max(0, numValue));
  };

  return (
    <section
      className="w-full max-w-3xl mx-auto p-4 md:py-5 space-y-8"
      id="pricing"
    >
      <div className="text-center space-y-4">
        <h3 className="text-3xl md:text-4xl font-bold text-balance">
          Simple, transparent pricing
        </h3>
        <p className="text-lg text-muted-foreground text-balance">
          Enter your subscriber count to see your pricing.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="subscribers" className="text-sm font-medium">
          About how many subscribers do you have?
        </label>
        <Input
          id="subscribers"
          type="number"
          min={0}
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Enter subscriber count"
          className="text-lg h-12"
        />
      </div>

      <Card className="border-2 border-primary shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl">{sentenceCase(plan.name)}</CardTitle>
              <CardDescription className="text-base mt-2">
                {sentenceCase(plan.description)}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-xl md:text-4xl font-bold">
                {isCustomPricing ? "Custom" : sentenceCase(plan.priceLabel)}
              </div>
              {!isCustomPricing && (
                <div className="text-sm text-muted-foreground">Per month</div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">
              {plan.subscribers === null
                ? "Unlimited subscribers"
                : `Includes up to ${plan.subscribers.toLocaleString()} subscribers`}
            </p>
            {plan.subscribers !== null && (
              <p className="text-sm text-muted-foreground mt-1">
                Pass that and we'll ask you to upgrade — no surprise overage
                charges.
              </p>
            )}
          </div>

          <div className="space-y-3">
            {plan.features.map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm">{sentenceCase(feature)}</span>
              </div>
            ))}
          </div>
        </CardContent>

        <CardFooter>
          <Button asChild className="w-full" size="lg">
            <Link
              href={
                plan.slug === "enterprise"
                  ? `mailto:${meta.salesEmail}?subject=Enterprise Inquiry`
                  : `settings/billing/subscribe?plan=${plan.slug}`
              }
            >
              {isCustomPricing ? "Contact sales" : "Get started"}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}
