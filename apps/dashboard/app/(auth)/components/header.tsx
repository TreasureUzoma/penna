import Link from "next/link";
import React from "react";
import Logo from "@workspace/ui/components/logo";

export const AuthHeader = () => {
  return (
    <nav className="p-4 md:p-5.5 flex items-center justify-center fixed w-full">
      <div className="flex items-center justify-between w-full max-w-4xl">
        <div>
          <Link href="/" className="font-bold">
            <Logo />
          </Link>
        </div>
      </div>
    </nav>
  );
};
