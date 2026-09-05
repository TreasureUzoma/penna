import { meta } from "@workspace/constants/meta";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "terms of service - penna",
};

const sections = [
  {
    title: "using penna",
    body: `by creating an account or using ${meta.name}, you agree to these
      terms. you must be able to form a binding contract to use the
      service, and you're responsible for keeping your account and api
      keys secure.`,
  },
  {
    title: "your content",
    body: `you own everything you write and every subscriber list you
      upload to ${meta.name}. we only use it to provide the service —
      rendering your posts, sending your newsletters, and showing you
      analytics. you're responsible for having the right to email the
      subscribers you import.`,
  },
  {
    title: "acceptable use",
    body: `don't use ${meta.name} to send spam, unsolicited email, phishing
      attempts, or content that's illegal, abusive, or violates someone
      else's rights. we may suspend or terminate accounts that abuse the
      platform or put our email deliverability at risk for other users.`,
  },
  {
    title: "billing",
    body: `paid plans are billed through paddle, our payment provider. plan
      details and pricing are shown at checkout. you can cancel at any
      time from your account settings, and cancellation takes effect at
      the end of your current billing period.`,
  },
  {
    title: "self-hosting & open source",
    body: `${meta.name} is open-source under the mit license. if you
      self-host it, you're running your own instance and these terms only
      cover the hosted service we operate — you take on responsibility for
      your own deployment.`,
  },
  {
    title: "availability",
    body: `we work to keep ${meta.name} reliable, but we don't guarantee
      uninterrupted access. we'll do our best to give notice ahead of
      planned maintenance that could cause downtime.`,
  },
  {
    title: "termination",
    body: `you can close your account at any time. we may suspend or
      terminate accounts that violate these terms, with notice where
      practical.`,
  },
  {
    title: "disclaimer",
    body: `${meta.name} is provided "as is," without warranties of any
      kind. we're not liable for indirect or consequential damages arising
      from your use of the service, to the extent permitted by law.`,
  },
  {
    title: "changes to these terms",
    body: `we may update these terms as the product evolves. if we make
      material changes, we'll update this page and, where appropriate,
      notify you by email.`,
  },
];

export default function TermsPage() {
  return (
    <section className="p-4 md:p-5 pt-32 md:pt-40 pb-20 max-w-3xl mx-auto">
      <div className="flex flex-col space-y-8 md:space-y-10">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold">terms of service</h1>
          <p className="text-sm text-muted-foreground">
            last updated: august 13, 2026
          </p>
        </div>

        <p className="text-muted-foreground leading-relaxed">
          these terms govern your use of {meta.name}. by using the service,
          you agree to them — read them carefully.
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
          <h3 className="text-xl md:text-2xl font-semibold">questions</h3>
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
