/** @type {import('next').NextConfig} */

import { withBotId } from "botid/next/config";

const DOCS_SITE = process.env.DOCS_SITE || "http://localhost:3006";
const DASHBOARD_SITE = process.env.DASHBOARD_SITE || "http://localhost:3001";
const API_URL = process.env.API_URL || "http://localhost:3005";

const nextConfig = {
  transpilePackages: ["@workspace/ui"],

  images: {
    remotePatterns: process.env.R2_PUBLIC_URL
      ? [
          {
            protocol: "https",
            hostname: new URL(process.env.R2_PUBLIC_URL).hostname,
          },
        ]
      : [],
  },

  async rewrites() {
    const dashboardRoutes = [
      "login",
      "signup",
      "forgot-password",
      "reset-password",
      "verify-email",
      "accept-invite",
      "dashboard",
      "new",
      "new/:path+",
      "newsletters",
      "newsletters/:path+",
      "settings",
      "settings/:path+",
      "activity",
      "onboarding",
      "onboarding/:path+",
      "billings",
      "billings/:path+",
      "domains",
      "domains/:path+",
      "subscribe/confirm",
      "unsubscribe/confirm",
    ];

    const staticRoutes = [
      {
        source: "/api/:path+",
        destination: `${API_URL}/api/:path+`,
      },
      {
        source: "/docs",
        destination: `${DOCS_SITE}/docs`,
      },
      {
        source: "/docs/:path+",
        destination: `${DOCS_SITE}/docs/:path+`,
      },
      {
        source: "/docs-static/:path+",
        destination: `${DOCS_SITE}/docs-static/:path+`,
      },
      {
        source: "/dashboard-static/:path+",
        destination: `${DASHBOARD_SITE}/dashboard-static/:path+`,
      },
    ];

    const rewrites = [
      ...dashboardRoutes.map((route) => ({
        source: `/${route}`,
        destination: `${DASHBOARD_SITE}/${route}`,
      })),
      ...staticRoutes,
    ];

    console.log("🔄 Rewrites being applied:");
    console.log(DASHBOARD_SITE);
    rewrites.forEach((r) => {
      console.log(`   ${r.source} -> ${r.destination}`);
    });

    return rewrites;
  },
};

export default withBotId(nextConfig);
