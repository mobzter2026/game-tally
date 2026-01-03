import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  reactStrictMode: true, // keep any other options you already had
  /* other config options here */
};

// Wrap with PWA
export default withPWA({
  ...nextConfig,
  dest: "public",
  register: true,
  skipWaiting: true,
});
