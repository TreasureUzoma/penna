import { Geist, Geist_Mono } from "next/font/google";

import "@workspace/ui/globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";
import { Metadata } from "next";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "penna - opensoure alternative to buttondown",
};

// No Header/Footer here — those are marketing-site chrome and only belong
// on the marketing pages (see app/(marketing)/layout.tsx). Public newsletter
// pages (app/[slug]) render bare, with just their own small "Powered by
// Penna" line, since a subscriber's own newsletter page shouldn't be
// wrapped in Penna's nav and sitemap footer.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased has-grain`}
      >
        <Providers>
          <main>{children}</main>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
