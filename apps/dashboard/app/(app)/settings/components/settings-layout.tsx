"use client";

import { Button } from "@workspace/ui/components/button";
import { User, Shield, Mail, Bell, Users } from "lucide-react";
import { Separator } from "@workspace/ui/components/separator";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();

  const sidebarItems = [
    {
      title: "Profile",
      href: "/settings",
      icon: User,
    },
    {
      title: "Security",
      href: "/settings/security",
      icon: Shield,
    },
    {
      title: "Team",
      href: "/settings/team",
      icon: Users,
    },
    {
      title: "Billing",
      href: "/settings/billing",
      icon: Mail,
    },
  ];

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account details, security settings, billing, and team
          access. Verify a domain here, then assign it to a newsletter when
          you're ready—or add one directly from a newsletter's Domains tab.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 relative">
        <aside className="lg:w-1/5 space-y-2 lg:sticky lg:top-24 h-fit">
          {sidebarItems.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2",
                pathname === item.href
                  ? "bg-muted hover:bg-muted"
                  : "hover:bg-transparent",
              )}
              asChild
            >
              <Link href={item.href}>
                <item.icon className="w-4 h-4" />
                {item.title}
              </Link>
            </Button>
          ))}
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground cursor-not-allowed"
            disabled
          >
            <Bell className="w-4 h-4" />
            Notifications
          </Button>
        </aside>

        <div className="flex-1 space-y-6 max-w-5xl">{children}</div>
      </div>
    </div>
  );
}
