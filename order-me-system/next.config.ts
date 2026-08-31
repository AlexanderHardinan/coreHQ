import {
  withSerwist,
} from "@serwist/turbopack";

import type {
  NextConfig,
} from "next";

const nextConfig:
  NextConfig = {
  /* Existing Next.js configuration remains here. */
};

export default withSerwist(
  nextConfig
);