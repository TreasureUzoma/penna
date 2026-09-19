import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import { BotIdClient } from "botid/client";
import "@workspace/ui/globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";
import { defaultMetadata } from "@/lib/metadata";
import { Viewport } from "next";

const fontSans = localFont({
  src: "../public/fonts/Switzer-Variable.woff2",
  variable: "--font-sans",
  weight: "100 900",
  display: "swap",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = defaultMetadata;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Penna",
    description:
      "The newsletter platform that gets out of your way. Write, send, and grow your newsletter with subscribers, segments, analytics, and your own domain.",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      ratingCount: "1",
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <BotIdClient
          protect={[
            {
              path: "/api/v1/public/newsletters/*/subscribe",
              method: "POST",
            },
            {
              path: "/login",
              method: "GET",
            },
            {
              path: "/signup",
              method: "GET",
            },
            {
              path: "/forgot-password",
              method: "GET",
            },
          ]}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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
