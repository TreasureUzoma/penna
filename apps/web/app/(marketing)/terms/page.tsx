import { meta } from "@workspace/constants/meta";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Penna's terms of service. Read our terms and conditions for using the newsletter platform.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Terms of Service - Penna",
  },
};

const sections = [
  {
    title: "Using Penna",
    body: `By creating an account or using ${meta.name}, you agree to these
      terms. You must be able to form a binding contract to use the
      service, and you're responsible for keeping your account and API
      keys secure.`,
  },
  {
    title: "Your content",
    body: `You own everything you write and every subscriber list you
      upload to ${meta.name}. We only use it to provide the service —
      rendering your posts, sending your newsletters, and showing you
      analytics. You're responsible for having the right to email the
      subscribers you import.`,
  },
  {
    title: "Acceptable use",
    body: `Don't use ${meta.name} to send spam, unsolicited email, phishing
      attempts, or content that's illegal, abusive, or violates someone
      else's rights. We may suspend or terminate accounts that abuse the
      platform or put our email deliverability at risk for other users.`,
  },
  {
    title: "Billing",
    body: `Paid plans are billed through paddle, our payment provider. Plan
      details and pricing are shown at checkout. You can cancel at any
      time from your account settings, and cancellation takes effect at
      the end of your current billing period.`,
  },
  {
    title: "Self-hosting & open source",
    body: `${meta.name} is open-source under the mit license. If you
      self-host it, you're running your own instance and these terms only
      cover the hosted service we operate — you take on responsibility for
      your own deployment.`,
  },
  {
    title: "Availability",
    body: `We work to keep ${meta.name} reliable, but we don't guarantee
      uninterrupted access. We'll do our best to give notice ahead of
      planned maintenance that could cause downtime.`,
  },
  {
    title: "Termination",
    body: `You can close your account at any time. we may suspend or
      terminate accounts that violate these terms, with notice where
      practical.`,
  },
  {
    title: "Disclaimer",
    body: `${meta.name} is provided "as is," without warranties of any
      kind. We're not liable for indirect or consequential damages arising
      from your use of the service, to the extent permitted by law.`,
  },
  {
    title: "Changes to these terms",
    body: `We may update these terms as the product evolves. If we make
      material changes, we'll update this page and, where appropriate,
      notify you by email.`,
  },
];

export default function TermsPage() {
  return (
    <section className="p-4 md:p-5 pt-32 md:pt-40 pb-20 max-w-3xl mx-auto">
      <div className="flex flex-col space-y-8 md:space-y-10">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold">Terms of service</h1>
          <p className="text-sm text-muted-foreground">
            Last updated: august 13, 2026
          </p>
        </div>

        <p className="text-muted-foreground leading-relaxed">
          These terms govern your use of {meta.name}. By using the service, you
          agree to them — read them carefully.
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
            reach out at{" "}
            <a
              href={`mailto:${meta.email}`}
              className="underline hover:text-foreground"
            >
              {meta.email}
            </a>{" "}
            if anything here is unclear.
          </p>
        </div>
      </div>
    </section>
  );
}
