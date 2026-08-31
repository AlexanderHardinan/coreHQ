/// <reference lib="esnext" />
/// <reference lib="webworker" />

import {
  defaultCache,
} from "@serwist/turbopack/worker";

import type {
  PrecacheEntry,
  RuntimeCaching,
  SerwistGlobalConfig,
} from "serwist";

import {
  NetworkOnly,
  Serwist,
} from "serwist";

// =========================================================
// SERVICE WORKER GLOBAL
// =========================================================

declare global {
  interface WorkerGlobalScope
    extends SerwistGlobalConfig {
    __SW_MANIFEST:
      | (
          | PrecacheEntry
          | string
        )[]
      | undefined;
  }
}

declare const self:
  ServiceWorkerGlobalScope;

// =========================================================
// OFFLINE FALLBACK
// =========================================================

const OFFLINE_URL =
  "/~offline";

// =========================================================
// COMMERCIAL DATA-SAFETY RULES
// =========================================================
//
// Order Me System contains live operational data:
//
//   Products
//   Categories
//   Recipes
//   Inventory
//   Normal Orders
//   Production Orders
//   Dashboard metrics
//   Authentication
//   Operational location session
//
// These responses must remain network authoritative.
//
// Static application assets may be cached, but stale
// operational information must never be presented as though
// it were current data.
// =========================================================

const operationalNetworkOnly:
  RuntimeCaching[] = [
    // =====================================================
    // SAME-ORIGIN API
    // =====================================================

    {
      matcher: ({
        sameOrigin,
        url,
      }) =>
        sameOrigin &&
        url.pathname.startsWith(
          "/api/"
        ),

      method:
        "GET",

      handler:
        new NetworkOnly(),
    },

    // =====================================================
    // SUPABASE HTTP TRAFFIC
    // =====================================================
    //
    // Prevent REST, Auth, and Storage GET responses from
    // being served from the PWA runtime cache.
    //
    // Supabase Realtime WebSocket traffic does not use the
    // HTTP service-worker cache.
    // =====================================================

    {
      matcher: ({
        url,
      }) =>
        url.hostname ===
          "supabase.co" ||
        url.hostname.endsWith(
          ".supabase.co"
        ),

      method:
        "GET",

      handler:
        new NetworkOnly(),
    },

    // =====================================================
    // NEXT.JS REACT SERVER COMPONENT DATA
    // =====================================================
    //
    // RSC responses may contain current database values.
    //
    // They must never fall back to an old cached response.
    // =====================================================

    {
      matcher: ({
        request,
        sameOrigin,
      }) =>
        sameOrigin &&
        request.headers.get(
          "RSC"
        ) ===
          "1",

      method:
        "GET",

      handler:
        new NetworkOnly(),
    },

    // =====================================================
    // APPLICATION NAVIGATION
    // =====================================================
    //
    // All page navigations remain network authoritative.
    //
    // When navigation genuinely fails because the device is
    // offline, Serwist's document fallback below displays
    // /~offline instead of stale operational pages.
    // =====================================================

    {
      matcher: ({
        request,
        sameOrigin,
      }) =>
        sameOrigin &&
        request.mode ===
          "navigate",

      method:
        "GET",

      handler:
        new NetworkOnly(),
    },
  ];

// =========================================================
// SERWIST
// =========================================================

const serwist =
  new Serwist({
    // =====================================================
    // BUILD PRECACHE
    // =====================================================
    //
    // @serwist/turbopack injects the generated Next.js
    // assets plus additionalPrecacheEntries configured in:
    //
    //   src/app/serwist/[path]/route.ts
    //
    // That route also versions /~offline per deployment.
    // =====================================================

    precacheEntries:
      self.__SW_MANIFEST,

    // =====================================================
    // CACHE IDENTITY
    // =====================================================

    cacheId:
      "forza-order-me",

    // =====================================================
    // REMOVE OUTDATED PRECACHES
    // =====================================================

    precacheOptions: {
      cleanupOutdatedCaches:
        true,
    },

    // =====================================================
    // SERVICE-WORKER ACTIVATION
    // =====================================================

    skipWaiting:
      true,

    clientsClaim:
      true,

    // =====================================================
    // NAVIGATION PERFORMANCE
    // =====================================================

    navigationPreload:
      true,

    // =====================================================
    // PRODUCTION LOGGING
    // =====================================================

    disableDevLogs:
      true,

    // =====================================================
    // RUNTIME CACHING
    // =====================================================
    //
    // Rule order is deliberate.
    //
    // Our commercial NetworkOnly rules come first.
    //
    // Serwist's defaultCache may then manage safe assets
    // including:
    //
    //   Next.js JavaScript
    //   CSS
    //   fonts
    //   images
    //   PWA icons
    //   other static resources
    // =====================================================

    runtimeCaching: [
      ...operationalNetworkOnly,
      ...defaultCache,
    ],

    // =====================================================
    // SAFE DOCUMENT FALLBACK
    // =====================================================
    //
    // /~offline is already versioned and added to the
    // precache by the Serwist route handler.
    //
    // Only failed DOCUMENT requests receive this fallback.
    //
    // Failed:
    //
    //   API
    //   Supabase
    //   RSC
    //   image
    //   font
    //
    // requests are not disguised with an offline document.
    // =====================================================

    fallbacks: {
      entries: [
        {
          url:
            OFFLINE_URL,

          matcher({
            request,
          }) {
            return (
              request.destination ===
              "document"
            );
          },
        },
      ],
    },
  });

// =========================================================
// REGISTER SERVICE-WORKER EVENTS
// =========================================================

serwist.addEventListeners();