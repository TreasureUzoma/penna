import { meta } from "@workspace/constants/meta";
import Link from "next/link";
import { ModeToggle } from "./theme-toggle";

const footerSections = [
  {
    title: "product",
    links: [
      { name: "overview", url: "/" },
      { name: "pricing", url: "/#pricing" },
      { name: "docs", url: "/docs", external: true },
    ],
  },
  {
    title: "company",
    links: [
      { name: "about", url: "/about" },
      { name: "contact", url: "/contact" },
      { name: "privacy", url: "/privacy" },
      { name: "terms", url: "/terms" },
    ],
  },
  {
    title: "developers",
    links: [{ name: "github", url: meta.socials.github }],
  },
];

export const Footer = () => {
  return (
    <footer className="w-full border-t mt-36">
      <div className="max-w-5xl mx-auto p-6 md:py-10 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
        <div className="space-y-3">
          <h3 className="font-bold text-lg">{meta.name}</h3>
          <p className="text-muted-foreground max-w-xs leading-relaxed">
            built for developers who value speed, openness, and simplicity.
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
          &copy; {new Date().getFullYear()} {meta.name}. mit licensed.
        </p>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Link
            href={meta.developer.url}
            className="underline hover:text-muted-foreground whitespace-nowrap"
            target="_blank"
            rel="noopener noreferrer"
          >
            developer
          </Link>
          <div className="scale-80">
            <ModeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
};
