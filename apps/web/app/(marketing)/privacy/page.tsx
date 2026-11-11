import { meta } from "@workspace/constants/meta";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Penna's privacy policy. Learn how we collect, use, and protect your data when you use our newsletter platform.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Policy - Penna",
  },
};

const sections = [
  {
    title: "What we collect",
    body: `When you create an account, we collect your name, email address, and
      password. when you use ${meta.name} to send newsletters, we also
      process the content you write, your subscriber lists, and delivery
      data (opens, clicks, bounces, and unsubscribes) so those features can
      work. billing details are collected and processed by our payment
      provider, paddle — we never see or store your card details directly.`,
  },
  {
    title: "How we use it",
    body: `We use your data to run the product: authenticate you, send your
      newsletters, show you analytics, process payments, provide support,
      and protect platform integrity. When you send newsletters via the api,
      we analyze the content with ai to detect spam, phishing, and abuse
      that could harm deliverability. We don't sell your data, and we don't
      use your subscriber lists or content for any purpose other than
      delivering the service you signed up for.`,
  },
  {
    title: "Cookies",
    body: `We use a small number of cookies for authentication and to
      remember preferences like light or dark mode. We don't use
      third-party advertising or tracking cookies.`,
  },
  {
    title: "Third-party services",
    body: `We rely on a few trusted providers to run ${meta.name}: hosting
      and infrastructure providers (Neon for database, Upstash for redis),
      AWS SES for email delivery, Paddle for billing, and Groq for ai-based
      content moderation. each only receives the data it needs to do its job.`,
  },
  {
    title: "AI content moderation",
    body: `When you send a newsletter, we analyze the subject line
      and content using Groq (an ai service) to detect spam, phishing,
      scams, and other abuse that could harm deliverability for all users.
      this check happens before sending and takes a few seconds. The content
      is only sent to groq for moderation — It's not stored, trained on, or
      used for any other purpose. If you self-host ${meta.name}, you can
      disable this by not setting the Groq API key, and moderation will be
      skipped entirely.`,
  },
  {
    title: "Data retention",
    body: `We keep your data for as long as your account is active. if you
      delete your account, we remove your personal data and content within
      a reasonable period, except where we're required to keep records for
      legal or billing reasons.`,
  },
  {
    title: "Self-hosting",
    body: `${meta.name} is open-source. If you self-host it, this policy
      doesn't apply — you and your infrastructure provider are responsible
      for how data is stored and processed.`,
  },
  {
    title: "Your rights",
    body: `You can access, update, export, or delete your data at any time
      from your account settings. If you need help with any of this,
      email us and we'll sort it out.`,
  },
  {
    title: "Changes to this policy",
    body: `If we make meaningful changes to this policy, we'll update this
      page and, where appropriate, notify you by email.`,
  },
];

export default function PrivacyPage() {
  return (
    <section className="p-4 md:p-5 pt-32 md:pt-40 pb-20 max-w-3xl mx-auto">
      <div className="flex flex-col space-y-8 md:space-y-10">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold">Privacy policy</h1>
          <p className="text-sm text-muted-foreground">
            Last updated: september 13, 2026
          </p>
        </div>

        <p className="text-muted-foreground leading-relaxed">
          This policy explains what data {meta.name} collects, why, and how it's
          used. It applies to the hosted version of {meta.name} — if you're
          self-hosting, see the note below.
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
            Reach out at{" "}
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
