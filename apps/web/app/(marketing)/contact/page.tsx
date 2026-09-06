import { meta } from "@workspace/constants/meta";
import { Metadata } from "next";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "contact - penna",
};

export default function ContactPage() {
  return (
    <section className="p-4 md:p-5 pt-32 md:pt-40 pb-20 max-w-3xl mx-auto">
      <div className="flex flex-col space-y-8 md:space-y-10">
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold">contact</h1>
          <p className="text-muted-foreground leading-relaxed">
            got a question, ran into a bug, or want to talk about something
            you're building with {meta.name}? reach out — we read everything.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl md:text-2xl font-semibold">general & support</h3>
          <p className="text-muted-foreground leading-relaxed">
            for anything product-related, bugs, or feedback, email us at{" "}
            <a
              href={`mailto:${meta.email}`}
              className="underline hover:text-foreground"
            >
              {meta.email}
            </a>
            .
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl md:text-2xl font-semibold">sales</h3>
          <p className="text-muted-foreground leading-relaxed">
            questions about pricing or plans for your team? email{" "}
            <a
              href={`mailto:${meta.salesEmail}`}
              className="underline hover:text-foreground"
            >
              {meta.salesEmail}
            </a>
            .
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl md:text-2xl font-semibold">github</h3>
          <p className="text-muted-foreground leading-relaxed">
            found a bug or want to contribute? open an issue or pull request
            on{" "}
            <a
              href={meta.socials.github}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              github
            </a>
            .
          </p>
        </div>

        <a
          href={`mailto:${meta.email}`}
          className="px-6 py-3 bg-foreground text-background rounded-lg font-semibold hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2 w-fit"
        >
          send us an email <ArrowRight size={16} />
        </a>
      </div>
    </section>
  );
}
