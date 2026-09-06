import { meta } from "@workspace/constants/meta";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "about - penna",
};

export default function AboutPage() {
  return (
    <section className="p-4 md:p-5 pt-32 md:pt-40 pb-20 max-w-3xl mx-auto">
      <div className="flex flex-col space-y-8 md:space-y-10">
        <h1 className="text-3xl md:text-4xl font-bold">about</h1>

        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            {meta.name} is a full newsletter platform built for developers:
            write in markdown, manage subscribers and segments, track real
            analytics, and send from your own verified domain — all from one
            clean dashboard. automate any of it with a real api when you
            need to.
          </p>
          <p>
            we built it because most newsletter tools are designed for
            marketers, not engineers. {meta.name} strips out the busywork
            without stripping out the features: a dashboard that stays out
            of your way, and infrastructure that scales with you.
          </p>
          <p>
            it's{" "}
            <a
              href={meta.socials.github}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              completely open-source
            </a>
            , so you can self-host it, read the code, or contribute if
            something's missing.
          </p>
          <p>
            {meta.name} is built and maintained by{" "}
            <a
              href={meta.developer.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              {meta.developer.name}
            </a>
            . questions or feedback are always welcome at{" "}
            <a
              href={`mailto:${meta.email}`}
              className="underline hover:text-foreground"
            >
              {meta.email}
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
