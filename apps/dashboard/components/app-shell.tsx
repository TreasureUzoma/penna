"use client";

import React from "react";
import { Menu } from "lucide-react";
import AppSidebar from "./app-sidebar";
import { Footer } from "./footer";
import Logo from "@workspace/ui/components/logo";
import { Button } from "@workspace/ui/components/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  return (
    <div className="flex h-dvh bg-background overflow-hidden">
      <AppSidebar
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
      />

      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <Logo />
        </div>

        <div className="flex-1 overflow-y-auto">
          {children}
          <Footer />
        </div>
      </main>
    </div>
  );
}
