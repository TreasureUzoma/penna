import { meta } from "@workspace/constants/meta";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "Penna's refund policy. We offer a 30-day money-back guarantee on all paid plans. Learn more about our refund terms.",
  alternates: {
    canonical: "/refund",
  },
  openGraph: {
    title: "Refund Policy - Penna",
  },
};

const sections = [
  {
    title: "30-day money-back guarantee",
    body: `If you're not satisfied with ${meta.name}, we offer a full refund
      within 30 days of your initial purchase. This applies to your first
      subscription payment only — simply reach out to us within 30 days,
      and we'll process a full refund, no questions asked.`,
  },
  {
    title: "How refunds work",
    body: `All billing is processed through paddle, our payment provider.
      refunds are issued back to your original payment method and
      typically appear within 5-10 business days, depending on your bank
      or card provider. Once we approve a refund, paddle handles the rest
      automatically.`,
  },
  {
    title: "Cancellations vs. Refunds",
    body: `Canceling your subscription is different from requesting a
      refund. when you cancel, your subscription continues until the end
      of your current billing period — you keep access to ${meta.name} for
      the time you've already paid for. No refund is issued for a standard
      cancellation. Refunds are only available within the 30-day guarantee
      window.`,
  },
  {
    title: "Per-seat billing refunds",
    body: `${meta.name} bills per team member (per seat). if you add a
      member mid-cycle, you're charged a prorated amount for the rest of
      that billing period. If you remove a member, the adjustment is
      applied at your next renewal — we don't issue mid-cycle refunds for
      seat reductions. The 30-day guarantee applies to your initial
      subscription only, not to subsequent seat adjustments.`,
  },
  {
    title: "Plan upgrades and downgrades",
    body: `If you upgrade your plan mid-cycle, you're charged the prorated
      difference immediately. If you downgrade, the change takes effect at
      your next renewal. Refunds are not issued for plan changes — your
      account keeps access to the higher-tier plan until the end of the
      paid period.`,
  },
  {
    title: "Abuse and violations",
    body: `If your account is suspended or terminated for violating our
      terms of service (spam, abuse, illegal activity, or other misuse),
      you're not eligible for a refund. This includes suspensions that put
      our email deliverability or platform integrity at risk for other
      users.`,
  },
  {
    title: "Self-hosted installations",
    body: `${meta.name} is open-source and free to self-host. This refund
      policy only applies to the hosted service we operate. If you're
      running your own instance, there's no subscription and nothing to
      refund.`,
  },
  {
    title: "How to request a refund",
    body: `Email us at ${meta.email} within 30 days of your initial
      purchase with your account details. We'll review your request and
      process the refund within 2-3 business days. Paddle will then issue
      the refund to your original payment method.`,
  },
  {
    title: "Changes to this policy",
    body: `We may update this refund policy as the product evolves. If we
      make material changes, we'll update this page and notify active
      subscribers by email where appropriate.`,
  },
];

export default function RefundPage() {
  return (
    <section className="p-4 md:p-5 pt-32 md:pt-40 pb-20 max-w-3xl mx-auto">
      <div className="flex flex-col space-y-8 md:space-y-10">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold">Refund policy</h1>
          <p className="text-sm text-muted-foreground">
            Last updated: september 13, 2026
          </p>
        </div>

        <p className="text-muted-foreground leading-relaxed">
          We want you to be happy with {meta.name}. This policy explains how
          refunds work for our hosted subscription service.
        </p>

        {sections.map((section) => (
          <div key={section.title} className="space-y-4">
            <h3 className="text-xl md:text-2xl font-semibold">
              {section.title}
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {section.body}
            </p>
          </div>
        ))}

        <div className="space-y-4">
          <h3 className="text-xl md:text-2xl font-semibold">Questions</h3>
          <p className="text-muted-foreground leading-relaxed">
            If you have questions about refunds or need help with a refund
            request, email us at{" "}
            <a
              href={`mailto:${meta.email}`}
              className="underline hover:text-foreground"
            >
              {meta.email}
            </a>{" "}
            and we'll get back to you promptly.
          </p>
        </div>
      </div>
    </section>
  );
}
