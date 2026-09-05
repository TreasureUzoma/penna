import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "@workspace/ui/globals.css";
import "./globals.css";
import QueryProvider from "@/providers/tanstack-query";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";

export const switzer = {
  variable: "--font-switzer",
  className: "font-switzer",
};

export const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Penna – Simplest newsletter tool you'd ever use.",
  description:
    "Penna makes newsletters effortless for developers. Write, send, and grow your audience with a minimal workflow.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${switzer.variable} ${geistMono.variable} bg-background font-[Switzer] antialiased`}
      >
        <Providers>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </Providers>
      </body>
    </html>
  );
}
