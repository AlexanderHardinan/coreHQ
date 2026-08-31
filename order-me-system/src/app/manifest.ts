import type {
  MetadataRoute,
} from "next";

// =========================================================
// ORDER ME SYSTEM BY FORZA
// PRODUCTION PWA MANIFEST
// =========================================================

export default function manifest():
  MetadataRoute.Manifest {
  return {
    id:
      "/",

    name:
      "Order Me System by Forza",

    short_name:
      "Order Me",

    description:
      "Order Me System by Forza — Human and Technology System. Commercial ordering, production, product, recipe, and hospitality operations management.",

    start_url:
      "/",

    scope:
      "/",

    display:
      "standalone",

    orientation:
      "any",

    background_color:
      "#ffffff",

    theme_color:
      "#18181b",

    lang:
      "en",

    dir:
      "ltr",

    categories: [
      "business",
      "productivity",
      "food",
    ],

    icons: [
      {
        src:
          "/icons/forza-192x192.png",

        sizes:
          "192x192",

        type:
          "image/png",

        purpose:
          "any",
      },

      {
        src:
          "/icons/forza-512x512.png",

        sizes:
          "512x512",

        type:
          "image/png",

        purpose:
          "any",
      },

      {
        src:
          "/icons/forza-maskable-192x192.png",

        sizes:
          "192x192",

        type:
          "image/png",

        purpose:
          "maskable",
      },

      {
        src:
          "/icons/forza-maskable-512x512.png",

        sizes:
          "512x512",

        type:
          "image/png",

        purpose:
          "maskable",
      },
    ],
  };
}