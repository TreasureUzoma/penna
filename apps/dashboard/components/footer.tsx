import React from "react";
import Link from "next/link";
import Logo from "@workspace/ui/components/logo";
import { ModeToggle } from "./theme-toggle";

export const Footer = () => {
  return (
    <footer className="w-full border-t p-2 px-4 md:px-[5rem] text-sm font-medium">
      <div className="max-w-screen-xl mx-auto flex flex-row items-center justify-between gap-4">
        <div className="space-x-4 flex items-center">
          <Link href="/" className="font-semibold text-primary">
            <Logo />
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-5 md:gap-7 justify-center">
          <Link
            href="/contact"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Contact Us
          </Link>
        </div>
        <div>
          <div className="scale-80">
            <ModeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
};
