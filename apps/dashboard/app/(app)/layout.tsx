import { AppShell } from "@/components/app-shell";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Penna",
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}
