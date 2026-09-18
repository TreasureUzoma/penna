import Link from "next/link";
import React from "react";
import Logo from "@workspace/ui/components/logo";

const navLinks = [
  {
    title: "log in",
    url: "/login",
  },
  {
    title: "docs",
    url: "/docs",
    external: true,
  },
  {
    title: "pricing",
    url: "/#pricing",
  },
];

export const Header = () => {
  return (
    <nav className="p-4 md:p-5.5 flex items-center justify-center fixed top-0 z-50 w-full bg-background/70 backdrop-blur-md">
      <div className="flex items-center justify-between w-full max-w-4xl">
        <div>
          <Link href="/">
            <Logo />
          </Link>
        </div>
        <div className="flex items-center justify-center gap-x-4 font-medium">
          {navLinks.map((link) =>
            link.external ? (
              <a
                key={link.title}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {link.title}
              </a>
            ) : (
              <Link
                key={link.title}
                href={link.url}
                className="hover:underline"
              >
                {link.title}
              </Link>
            ),
          )}
        </div>
      </div>
    </nav>
  );
};
