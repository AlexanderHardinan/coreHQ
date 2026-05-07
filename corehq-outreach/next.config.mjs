import nextPWA from "next-pwa";

const isDev = process.env.NODE_ENV === "development";

const withPWA = nextPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: isDev, // disable PWA in dev, enable in production
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);