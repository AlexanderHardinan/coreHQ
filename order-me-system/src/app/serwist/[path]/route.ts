import {
  spawnSync,
} from "node:child_process";

import {
  createSerwistRoute,
} from "@serwist/turbopack";

// =========================================================
// OFFLINE DOCUMENT REVISION
// =========================================================
//
// Prefer Vercel's deployment Git SHA in production.
//
// Local development falls back to the current Git commit.
// If neither is available, use a stable local fallback.
// =========================================================

function getOfflineRevision():
  string {
  const vercelRevision =
    process.env
      .VERCEL_GIT_COMMIT_SHA
      ?.trim();

  if (
    vercelRevision
  ) {
    return vercelRevision;
  }

  const gitRevision =
    spawnSync(
      "git",
      [
        "rev-parse",
        "HEAD",
      ],
      {
        encoding:
          "utf-8",
      }
    )
      .stdout
      ?.trim();

  if (
    gitRevision
  ) {
    return gitRevision;
  }

  return "forza-offline-v1";
}

const revision =
  getOfflineRevision();

// =========================================================
// SERWIST SERVICE WORKER ROUTE
// =========================================================
//
// Service worker source:
//
//   src/app/sw.ts
//
// Public worker URL:
//
//   /serwist/sw.js
//
// The offline document is explicitly included in the
// precache and versioned per deployment.
// =========================================================

export const {
  dynamic,
  dynamicParams,
  revalidate,
  generateStaticParams,
  GET,
} =
  createSerwistRoute({
    swSrc:
      "src/app/sw.ts",

    additionalPrecacheEntries: [
      {
        url:
          "/~offline",

        revision,
      },
    ],

    useNativeEsbuild:
      true,
  });