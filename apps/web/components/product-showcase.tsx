import { CheckCircle2, Clock3, Globe, ShieldCheck } from "lucide-react";

const chartBars = [35, 52, 40, 68, 58, 82, 74];

const DashboardMock = () => (
  <div className="p-4 space-y-4">
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-lg border border-border bg-background p-3 space-y-1">
        <p className="text-xs text-muted-foreground">subscribers</p>
        <p className="text-xl font-bold">2,481</p>
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          +12.4% this month
        </p>
      </div>
      <div className="rounded-lg border border-border bg-background p-3 space-y-1">
        <p className="text-xs text-muted-foreground">open rate</p>
        <p className="text-xl font-bold">58%</p>
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          above average
        </p>
      </div>
    </div>

    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-end justify-between gap-1.5 h-16">
        {chartBars.map((height, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-foreground/80"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  </div>
);

const MarkdownMock = () => (
  <div className="grid grid-cols-2 divide-x divide-border h-full">
    <div className="p-4 font-mono text-xs leading-relaxed space-y-1.5">
      <p className="text-muted-foreground"># weekly digest</p>
      <p>&nbsp;</p>
      <p className="text-muted-foreground">hey **friends**</p>
      <p>&nbsp;</p>
      <p className="text-muted-foreground">- shipped custom domains</p>
      <p className="text-muted-foreground">- fixed webhook retries</p>
      <p className="text-muted-foreground">- new api endpoints</p>
    </div>
    <div className="p-4 text-xs leading-relaxed space-y-1.5">
      <p className="text-sm font-bold">weekly digest</p>
      <p className="text-muted-foreground">
        hey <span className="font-semibold text-foreground">friends</span>,
      </p>
      <ul className="text-muted-foreground list-disc list-inside space-y-0.5">
        <li>shipped custom domains</li>
        <li>fixed webhook retries</li>
        <li>new api endpoints</li>
      </ul>
    </div>
  </div>
);

const subscriberRows = [
  { initials: "jd", masked: "j••••@acme.io", status: "subscribed" as const },
  { initials: "ml", masked: "m••••@gmail.com", status: "subscribed" as const },
  { initials: "rk", masked: "r••••@vercel.com", status: "pending" as const },
];

const SubscribersMock = () => (
  <div className="p-4 space-y-2">
    {subscriberRows.map((row) => (
      <div
        key={row.masked}
        className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
      >
        <div className="w-7 h-7 shrink-0 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold uppercase">
          {row.initials}
        </div>
        <span className="text-xs font-mono flex-1 truncate">{row.masked}</span>
        {row.status === "subscribed" ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        ) : (
          <Clock3 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
      </div>
    ))}
  </div>
);

const DomainMock = () => (
  <div className="p-4 space-y-2">
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
      <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-xs font-mono flex-1 truncate">
        news.yoursite.com
      </span>
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
        <CheckCircle2 className="w-2.5 h-2.5" />
        verified
      </span>
    </div>
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
      <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-xs flex-1">remove penna branding</span>
      <div className="w-8 h-4.5 rounded-full bg-foreground/80 relative shrink-0">
        <div className="absolute right-0.5 top-0.5 w-3.5 h-3.5 rounded-full bg-background" />
      </div>
    </div>
  </div>
);

const showcases = [
  {
    title: "dashboard",
    description:
      "subscriber growth, open rates, and send history — at a glance, no digging.",
    mock: <DashboardMock />,
  },
  {
    title: "markdown editor",
    description:
      "write in markdown, see the rendered preview update as you type. no wysiwyg fighting.",
    mock: <MarkdownMock />,
  },
  {
    title: "subscriber management",
    description:
      "segment, tag, and manage your list without ever leaving the dashboard.",
    mock: <SubscribersMock />,
  },
  {
    title: "your own domain",
    description:
      "verify a sending domain, drop the penna branding, and make it look entirely like you.",
    mock: <DomainMock />,
  },
];

export const ProductShowcase = () => {
  return (
    <section className="p-4 md:p-5 flex items-center justify-center">
      <div className="max-w-4xl w-full space-y-8">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl md:text-4xl font-bold">
            a full platform, not just an API
          </h2>
          <p className="text-lg text-muted-foreground">
            everything you need to run a newsletter, in one clean dashboard — no
            bloat, no busywork.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {showcases.map((showcase) => (
            <div
              key={showcase.title}
              className="border border-border rounded-xl bg-card/50 overflow-hidden flex flex-col"
            >
              <div className="p-6 pb-4 space-y-2">
                <h3 className="text-lg font-semibold">{showcase.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {showcase.description}
                </p>
              </div>

              <div className="mt-auto border-t border-border bg-muted/30">
                <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
                  <span className="w-2 h-2 rounded-full bg-border" />
                  <span className="w-2 h-2 rounded-full bg-border" />
                  <span className="w-2 h-2 rounded-full bg-border" />
                </div>
                {showcase.mock}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
