/** @type {import('next').NextConfig} */

const DOCS_SITE = process.env.DOCS_SITE || "http://localhost:3006";
const DASHBOARD_SITE = process.env.DASHBOARD_SITE || "http://localhost:3001";
const API_URL = process.env.API_URL || "http://localhost:3005";

const nextConfig = {
  transpilePackages: ["@workspace/ui"],

  async rewrites() {
    const dashboardRoutes = [
      "login",
      "signup",
      "forgot-password",
      "reset-password",
      "verify-email",
      "dashboard",
      "new",
      "new/:path+",
      "projects",
      "projects/:path+",
      "settings",
      "settings/:path+",
      "activity",
      "username",
      "username/:path+",
      "onboarding",
      "onboarding/:path+",
      "billings",
      "billings/:path+",
      "domains",
      "domains/:path+",
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

export default nextConfig;
