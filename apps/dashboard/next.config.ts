import { withBotId } from "botid/next/config";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https" as const,
        hostname: process.env.R2_PUBLIC_URL || "",
      },
    ],
  },

  assetPrefix: "/dashboard-static",

  async rewrites() {
    const apiUrl = process.env.API_URL || "http://localhost:3005";
    return [
      {
        source: "/api/:path+",
        destination: `${apiUrl}/api/:path+`,
      },
    ];
  },
};

export default withBotId(nextConfig);
