import {
  SerwistProvider,
} from "@serwist/turbopack/react";

import type {
  Metadata,
  Viewport,
} from "next";

import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import {
  ToastProvider,
} from "@/components/toast-provider";

import "./globals.css";

// =========================================================
// APP IDENTITY
// =========================================================

const APP_NAME =
  "Order Me System by Forza";

const APP_SHORT_NAME =
  "Order Me";

const APP_DESCRIPTION =
  "Order Me System by Forza — Human and Technology System. Commercial ordering, production, product, recipe, and hospitality operations management.";

const APP_URL =
  "https://forza.kitchen";

// =========================================================
// FONTS
// =========================================================

const geistSans =
  Geist({
    variable:
      "--font-geist-sans",

    subsets: [
      "latin",
    ],
  });

const geistMono =
  Geist_Mono({
    variable:
      "--font-geist-mono",

    subsets: [
      "latin",
    ],
  });

// =========================================================
// METADATA
// =========================================================

export const metadata:
  Metadata = {
  // =======================================================
  // OFFICIAL PRODUCTION DOMAIN
  // =======================================================

  metadataBase:
    new URL(
      APP_URL
    ),

  // =======================================================
  // APPLICATION IDENTITY
  // =======================================================

  applicationName:
    APP_NAME,

  title: {
    default:
      APP_NAME,

    template:
      `%s | ${APP_SHORT_NAME}`,
  },

  description:
    APP_DESCRIPTION,

  creator:
    "Chef Alex",

  publisher:
    "Forza Kitchen",

  // =======================================================
  // CANONICAL DOMAIN
  // =======================================================

  alternates: {
    canonical:
      "/",
  },

  // =======================================================
  // PWA MANIFEST
  // =======================================================

  manifest:
    "/manifest.webmanifest",

  // =======================================================
  // ICONS
  // =======================================================
  //
  // All icons are generated from:
  //
  //   public/forzalogo.png
  //
  // =======================================================

  icons: {
    icon: [
      {
        url:
          "/icons/forza-192x192.png",

        sizes:
          "192x192",

        type:
          "image/png",
      },

      {
        url:
          "/icons/forza-512x512.png",

        sizes:
          "512x512",

        type:
          "image/png",
      },
    ],

    shortcut: [
      {
        url:
          "/icons/forza-192x192.png",

        type:
          "image/png",
      },
    ],

    apple: [
      {
        url:
          "/apple-touch-icon.png",

        sizes:
          "180x180",

        type:
          "image/png",
      },
    ],
  },

  // =======================================================
  // APPLE / IOS / IPADOS PWA
  // =======================================================

  appleWebApp: {
    capable:
      true,

    title:
      APP_SHORT_NAME,

    statusBarStyle:
      "default",
  },

  // =======================================================
  // MOBILE FORMAT CONTROL
  // =======================================================

  formatDetection: {
    telephone:
      false,

    email:
      false,

    address:
      false,
  },

  // =======================================================
  // OPEN GRAPH
  // =======================================================

  openGraph: {
    type:
      "website",

    url:
      APP_URL,

    siteName:
      APP_NAME,

    title:
      APP_NAME,

    description:
      APP_DESCRIPTION,

    images: [
      {
        url:
          "/forzalogo.png",

        alt:
          "Forza Kitchen",

        type:
          "image/png",
      },
    ],
  },

  // =======================================================
  // SOCIAL / SHARE METADATA
  // =======================================================

  twitter: {
    card:
      "summary",

    title:
      APP_NAME,

    description:
      APP_DESCRIPTION,

    images: [
      "/forzalogo.png",
    ],
  },
};

// =========================================================
// VIEWPORT / DEVICE THEME
// =========================================================
//
// Next.js 16 requires themeColor to live in viewport rather
// than Metadata.
// =========================================================

export const viewport:
  Viewport = {
  width:
    "device-width",

  initialScale:
    1,

  themeColor:
    "#18181b",

  colorScheme:
    "light",
};

// =========================================================
// ROOT LAYOUT
// =========================================================

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SerwistProvider
          swUrl="/serwist/sw.js"
        >
          <ToastProvider>
            {children}
          </ToastProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}