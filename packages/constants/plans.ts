export type PlanSlug = "hobby" | "professional" | "business" | "enterprise";

export type Plan = {
  tier: number;
  slug: PlanSlug;
  name: string;
  /** Included subscriber cap. `null` means unlimited (enterprise only). */
  subscribers: number | null;
  /**
   * Max external-API newsletter sends (`POST .../newsletters/send`) per
   * rolling 24h window. `null` means unlimited. Placeholder values — tune
   * once real usage patterns are known.
   */
  newslettersPerDay: number | null;
  price: number | null;
  priceLabel: string;
  description: string;
  features: string[];
};

export const plans: Plan[] = [
  {
    tier: 0,
    slug: "hobby",
    name: "hobby",
    subscribers: 100,
    newslettersPerDay: 3,
    price: 0,
    priceLabel: "free",
    description: "perfect for getting started or testing your first newsletter",
    features: ["up to 100 subscribers", "basic analytics", "email support"],
  },
  {
    tier: 1,
    slug: "professional",
    name: "professional",
    subscribers: 2500,
    newslettersPerDay: 20,
    price: 9,
    priceLabel: "$9",
    description: "for creators growing a serious audience",
    features: [
      "up to 2,500 subscribers",
      "advanced analytics",
      "priority support",
      "custom domain",
      "remove branding",
      "add members to project",
    ],
  },
  {
    tier: 2,
    slug: "business",
    name: "business",
    subscribers: 10000,
    newslettersPerDay: 100,
    price: 29,
    priceLabel: "$29",
    description: "for established newsletters and small teams",
    features: [
      "up to 10,000 subscribers",
      "advanced analytics",
      "priority support",
      "custom domain",
      "remove branding",
      "api access",
      "team collaboration",
      "add members to project",
      "project transfer between teams",
    ],
  },
  // Enterprise is temporarily pulled from the lineup — not deleted, just
  // not offered right now. `PlanSlug` and the checkout route
  // (subscriptions-paddle.ts) still know about "enterprise" so an existing
  // enterprise account keeps working; it just can't be self-serve-selected
  // here. To bring it back, restore this entry:
  // {
  //   tier: 3,
  //   slug: "enterprise",
  //   name: "enterprise",
  //   subscribers: null,
  //   newslettersPerDay: null,
  //   price: null,
  //   priceLabel: "custom",
  //   description: "for large organizations with advanced requirements",
  //   features: [
  //     "unlimited subscribers",
  //     "advanced analytics",
  //     "dedicated support",
  //     "custom domain",
  //     "remove branding",
  //     "api access",
  //     "team collaboration",
  //     "add members to project",
  //     "project transfer between teams",
  //     "sla guarantee",
  //     "custom integrations",
  //   ],
  // },
];

/**
 * The smallest plan whose subscriber cap covers `count`. Falls back to the
 * highest-tier plan on offer if nothing else fits (business, currently —
 * see the note above `plans` about enterprise). Shared by the pricing
 * calculator on the marketing site and the subscriber-cap enforcement on
 * the server, so both always agree on where the lines are.
 */
export const getPlanForSubscriberCount = (count: number): Plan => {
  const fitting = plans.find(
    (plan) => plan.subscribers !== null && count <= plan.subscribers
  );
  return fitting ?? plans[plans.length - 1]!;
};

/** Look up a plan by its slug, falling back to hobby if unrecognized. */
export const getPlanBySlug = (slug: string | null | undefined): Plan =>
  plans.find((plan) => plan.slug === slug) ?? plans[0]!;
