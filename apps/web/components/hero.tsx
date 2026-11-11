import { ArrowRight } from "lucide-react";

export const Hero = () => {
  return (
    <section className="p-4 md:p-5 flex items-center justify-center min-h-screen">
      <div className="max-w-3xl space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
            Your newsletter, your workflow.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Write, send, and grow from one calm dashboard. Manage subscribers,
            segments, analytics, and your own domain, then bring Penna into your
            AI workspace with a secure, sign-in-based MCP connection.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="/login"
            className="px-6 py-3 bg-foreground text-background rounded-lg font-semibold hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
          >
            Start for free <ArrowRight size={16} />
          </a>
          <a
            href="#mcp"
            className="px-6 py-3 border border-border rounded-lg font-semibold hover:bg-muted transition-colors inline-flex items-center justify-center"
          >
            Connect your AI tools
          </a>
        </div>
      </div>
    </section>
  );
};
