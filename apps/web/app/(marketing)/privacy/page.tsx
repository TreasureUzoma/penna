import { meta } from "@workspace/constants/meta";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "privacy policy - penna",
};

const sections = [
  {
    title: "what we collect",
    body: `when you create an account, we collect your name, email address, and
      password. when you use ${meta.name} to send newsletters, we also
      process the content you write, your subscriber lists, and delivery
      data (opens, clicks, bounces, and unsubscribes) so those features can
      work. billing details are collected and processed by our payment
      provider, paddle — we never see or store your card details directly.`,
  },
  {
    title: "how we use it",
    body: `we use your data to run the product: authenticate you, send your
      newsletters, show you analytics, process payments, and provide
      support. we don't sell your data, and we don't use your subscriber
      lists or content for anything other than delivering the service you
      signed up for.`,
  },
  {
    title: "cookies",
    body: `we use a small number of cookies for authentication and to
      remember preferences like light or dark mode. we don't use
      third-party advertising or tracking cookies.`,
  },
  {
    title: "third-party services",
    body: `we rely on a few trusted providers to run ${meta.name}: hosting
      and infrastructure providers, an email delivery provider to send
      newsletters on your behalf, and paddle for billing. each only
      receives the data it needs to do its job.`,
  },
  {
    title: "data retention",
    body: `we keep your data for as long as your account is active. if you
      delete your account, we remove your personal data and content within
      a reasonable period, except where we're required to keep records for
      legal or billing reasons.`,
  },
  {
    title: "self-hosting",
    body: `${meta.name} is open-source. if you self-host it, this policy
      doesn't apply — you and your infrastructure provider are responsible
      for how data is stored and processed.`,
  },
  {
    title: "your rights",
    body: `you can access, update, export, or delete your data at any time
      from your account settings. if you need help with any of this,
      email us and we'll sort it out.`,
  },
  {
    title: "changes to this policy",
    body: `if we make meaningful changes to this policy, we'll update this
      page and, where appropriate, notify you by email.`,
  },
];

export default function PrivacyPage() {
  return (
    <section className="p-4 md:p-5 pt-32 md:pt-40 pb-20 max-w-3xl mx-auto">
      <div className="flex flex-col space-y-8 md:space-y-10">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold">privacy policy</h1>
          <p className="text-sm text-muted-foreground">
            last updated: august 13, 2026
          </p>
        </div>

        <p className="text-muted-foreground leading-relaxed">
          this policy explains what data {meta.name} collects, why, and how
          it's used. it applies to the hosted version of {meta.name} — if
          you're self-hosting, see the note below.
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
            if you have any questions about this policy.
          </p>
        </div>
      </div>
    </section>
  );
}
