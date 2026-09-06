import { ArrowRight } from "lucide-react";

export const Hero = () => {
  return (
    <section className="p-4 md:p-5 flex items-center justify-center min-h-screen">
      <div className="max-w-3xl space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
            the newsletter platform that gets out of your way
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            write, send, and grow your newsletter from a dashboard that
            doesn't fight you — subscribers, segments, analytics, and your
            own domain, all in one place. automate any of it with a real API
            when you need to.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="/login"
            className="px-6 py-3 bg-foreground text-background rounded-lg font-semibold hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
          >
            start for free <ArrowRight size={16} />
          </a>
          <a
            href="/docs"
            className="px-6 py-3 border border-border rounded-lg font-semibold hover:bg-muted transition-colors inline-flex items-center justify-center"
          >
            read docs
          </a>
        </div>
      </div>
    </section>
  );
};
