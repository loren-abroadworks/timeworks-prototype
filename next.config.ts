import type { NextConfig } from "next";
import { DEMO_USER_ID } from "./src/mock/seed";

const nextConfig: NextConfig = {
  // The replica runs fully offline: no remote images, everything is served from /public.
  reactStrictMode: true,
  devIndicators: false,
  async redirects() {
    // "/" → the demo user's dashboard (same URL shape as the live app).
    return [{ source: "/", destination: `/dashboard/${DEMO_USER_ID}/my_dashboard`, permanent: false }];
  },
};

export default nextConfig;
