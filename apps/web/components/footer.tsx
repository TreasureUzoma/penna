import { meta } from "@workspace/constants/meta";
import Link from "next/link";
import { ModeToggle } from "./theme-toggle";

const footerSections = [
  {
    title: "Product",
    links: [
      { name: "Overview", url: "/" },
      { name: "Pricing", url: "/#pricing" },
      { name: "Docs", url: "/docs", external: true },
      { name: "AI integrations", url: "/docs/integrations/mcp", external: true },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About", url: "/about" },
      { name: "Contact", url: "/contact" },
      { name: "Privacy", url: "/privacy" },
      { name: "Terms", url: "/terms" },
      { name: "Refunds", url: "/refund" },
    ],
  },
  {
    title: "Developers",
    links: [{ name: "GitHub", url: meta.socials.github }],
  },
];

export const Footer = () => {
  return (
    <footer className="w-full border-t mt-36">
      <div className="max-w-5xl mx-auto p-6 md:py-10 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
        <div className="space-y-3">
          <h3 className="font-bold text-lg">{meta.name}</h3>
          <p className="text-muted-foreground max-w-xs leading-relaxed">
            Built for developers who value speed, openness, and simplicity.
          </p>
        </div>

        {footerSections.map((section) => (
          <div key={section.title} className="space-y-3">
            <h4 className="font-semibold text-base">{section.title}</h4>
            <ul className="space-y-2">
              {section.links.map((link) => (
                <li key={link.name}>
                  {link.external ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline hover:text-muted-foreground"
                    >
                      {link.name}
                    </a>
                  ) : (
                    <Link
                      href={link.url}
                      className="hover:underline hover:text-muted-foreground"
                    >
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="text-[11px] sm:text-sm py-4 px-4 sm:px-6 flex flex-nowrap items-center justify-between gap-2 max-w-5xl mx-auto">
        <p className="text-muted-foreground whitespace-nowrap truncate">
          &copy; {new Date().getFullYear()} {meta.name}. MIT License.
        </p>

        <p>
          Built with ❤️ by{" "}
          <a
            href={meta.developer.url}
            className="underline hover:text-muted-foreground whitespace-nowrap"
            target="_blank"
            rel="noopener noreferrer"
          >
            {meta.developer.name} ({meta.developer.nickname})
          </a>
        </p>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="scale-80">
            <ModeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
};
