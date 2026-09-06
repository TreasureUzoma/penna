"use client";

import { Button } from "@workspace/ui/components/button";
import { User, Shield, Mail, Bell } from "lucide-react";
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
      title: "Billing",
      href: "/settings/billing",
      icon: Mail,
    },
  ];

  return (
    <div className="min-h-screen  px-4 py-7">
      <div className="space-y-0.5">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
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
