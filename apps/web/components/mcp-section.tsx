import Link from "next/link";
import { ArrowRight, LockKeyhole, MessageSquareCode, Workflow } from "lucide-react";

const benefits = [
  {
    icon: LockKeyhole,
    title: "Sign in with Penna",
    description: "Connect through OAuth and approve access in your Penna account. No API key to copy or manage.",
  },
  {
    icon: MessageSquareCode,
    title: "Ask, inspect, and update",
    description: "Read newsletter, subscriber, email, team, domain, and analytics data, then make changes from your assistant.",
  },
  {
    icon: Workflow,
    title: "Keep your account rules",
    description: "MCP requests use your existing team and newsletter permissions. Sending email and other lasting changes remain explicit actions.",
  },
];

export function McpSection() {
  return (
    <section id="mcp" className="scroll-mt-24 px-4 md:px-5">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-border bg-card">
        <div className="grid gap-10 p-7 md:grid-cols-[1.1fr_0.9fr] md:p-12">
          <div className="flex flex-col justify-center gap-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Penna + MCP</p>
            <h2 className="text-3xl font-bold leading-tight md:text-4xl">Your newsletter can work with your AI tools.</h2>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
              Connect an MCP-compatible assistant to the real Penna dashboard. Ask it to find campaign results, review subscribers, or prepare a change, all through your signed-in account.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <Link href="/docs/integrations/mcp" className="inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-3 font-semibold text-background transition-opacity hover:opacity-90">
                Set up MCP <ArrowRight size={16} />
              </Link>
              <span className="text-sm text-muted-foreground">Hosted. OAuth sign-in. No API key.</span>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-3">
            {benefits.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-4 rounded-2xl border border-border bg-background/70 p-4">
                <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-border bg-muted/40 px-7 py-4 text-sm sm:flex-row sm:items-center sm:justify-between md:px-12">
          <span className="text-muted-foreground">MCP server endpoint</span>
          <code className="overflow-x-auto font-mono">https://api.penna.dev/api/v1/mcp</code>
        </div>
      </div>
    </section>
  );
}
