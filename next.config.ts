import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  reactStrictMode: true, // <-- Next.js option goes here, not inside withPWA
};

const pwaConfig = {
  dest: "public",      // service worker output
  register: true,      // auto-register SW
  skipWaiting: true,   // activate new SW immediately
};

export default withPWA(pwaConfig)(nextConfig); // <-- apply PWA wrapper correctly
