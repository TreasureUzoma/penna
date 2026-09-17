import { Metadata } from "next";

const siteConfig = {
  name: "Penna",
  description:
    "The newsletter platform that gets out of your way. Write, send, and grow your newsletter with subscribers, segments, analytics, and your own domain. Open source alternative to Buttondown.",
  url: process.env.NEXT_PUBLIC_WEB_URL || "https://penna.dev",
  ogImage: "/opengraph-image",
  keywords: [
    "newsletter",
    "email newsletter",
    "newsletter platform",
    "email marketing",
    "buttondown alternative",
    "open source newsletter",
    "newsletter software",
    "email automation",
    "subscriber management",
    "newsletter analytics",
    "custom domain newsletter",
    "api newsletter",
    "developer newsletter",
    "self hosted newsletter",
    "newsletter tool",
    "email campaigns",
    "audience building",
    "email subscribers",
    "newsletter service",
    "markdown newsletter",
    "penna",
  ],
  creator: "Penna",
  authors: [{ name: "Penna" }],
};

export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} - Newsletter platform that gets out of your way`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: siteConfig.authors,
  creator: siteConfig.creator,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: "@pennadev", // Update with actual Twitter handle if available
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
};

export const marketingPageMetadata = (overrides?: Metadata): Metadata => ({
  ...defaultMetadata,
  ...overrides,
  openGraph: {
    ...defaultMetadata.openGraph,
    ...overrides?.openGraph,
  },
  twitter: {
    ...defaultMetadata.twitter,
    ...overrides?.twitter,
  },
});
