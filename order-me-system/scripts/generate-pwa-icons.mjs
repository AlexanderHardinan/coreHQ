import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import sharp from "sharp";

// =========================================================
// ORDER ME SYSTEM BY FORZA
// PWA ICON GENERATOR
// =========================================================
//
// Official source logo:
//
//   public/forzalogo.png
//
// Generated files:
//
//   public/icons/forza-192x192.png
//   public/icons/forza-512x512.png
//   public/icons/forza-maskable-192x192.png
//   public/icons/forza-maskable-512x512.png
//   public/apple-touch-icon.png
//   src/app/icon.png
//
// The source logo itself is never modified.
// =========================================================

// =========================================================
// PATHS
// =========================================================

const PROJECT_ROOT =
  process.cwd();

const SOURCE_LOGO =
  path.join(
    PROJECT_ROOT,
    "public",
    "forzalogo.png"
  );

const ICONS_DIRECTORY =
  path.join(
    PROJECT_ROOT,
    "public",
    "icons"
  );

const APP_DIRECTORY =
  path.join(
    PROJECT_ROOT,
    "src",
    "app"
  );

const STANDARD_192 =
  path.join(
    ICONS_DIRECTORY,
    "forza-192x192.png"
  );

const STANDARD_512 =
  path.join(
    ICONS_DIRECTORY,
    "forza-512x512.png"
  );

const MASKABLE_192 =
  path.join(
    ICONS_DIRECTORY,
    "forza-maskable-192x192.png"
  );

const MASKABLE_512 =
  path.join(
    ICONS_DIRECTORY,
    "forza-maskable-512x512.png"
  );

const APPLE_TOUCH_ICON =
  path.join(
    PROJECT_ROOT,
    "public",
    "apple-touch-icon.png"
  );

const NEXT_APP_ICON =
  path.join(
    APP_DIRECTORY,
    "icon.png"
  );

// =========================================================
// BRAND / BACKGROUND
// =========================================================

const TRANSPARENT_BACKGROUND = {
  r: 255,
  g: 255,
  b: 255,
  alpha: 0,
};

const SOLID_BACKGROUND = {
  r: 255,
  g: 255,
  b: 255,
  alpha: 1,
};

// =========================================================
// FILE VALIDATION
// =========================================================

async function assertSourceLogoExists() {
  try {
    const stats =
      await fs.stat(
        SOURCE_LOGO
      );

    if (
      !stats.isFile()
    ) {
      throw new Error(
        "forzalogo.png is not a file."
      );
    }
  } catch {
    throw new Error(
      `Official Forza logo not found at:\n${SOURCE_LOGO}`
    );
  }
}

// =========================================================
// DIRECTORY SETUP
// =========================================================

async function ensureDirectories() {
  await Promise.all([
    fs.mkdir(
      ICONS_DIRECTORY,
      {
        recursive:
          true,
      }
    ),

    fs.mkdir(
      APP_DIRECTORY,
      {
        recursive:
          true,
      }
    ),
  ]);
}

// =========================================================
// STANDARD PWA ICON
// =========================================================
//
// Transparent square canvas.
//
// The official logo is fitted inside without cropping,
// distortion, recoloring, or redesign.
// =========================================================

async function generateStandardIcon(
  size,
  outputPath
) {
  await sharp(
    SOURCE_LOGO
  )
    .resize(
      size,
      size,
      {
        fit:
          "contain",

        position:
          "centre",

        background:
          TRANSPARENT_BACKGROUND,

        withoutEnlargement:
          false,
      }
    )
    .png({
      compressionLevel:
        9,

      adaptiveFiltering:
        true,
    })
    .toFile(
      outputPath
    );
}

// =========================================================
// MASKABLE PWA ICON
// =========================================================
//
// Android maskable icons may be cropped into:
//
//   circle
//   rounded square
//   squircle
//   other launcher shapes
//
// Keep the official logo inside a conservative safe area
// and place it on a solid white background.
// =========================================================

async function generateMaskableIcon(
  size,
  outputPath
) {
  const safeLogoSize =
    Math.round(
      size *
        0.68
    );

  const logoBuffer =
    await sharp(
      SOURCE_LOGO
    )
      .resize(
        safeLogoSize,
        safeLogoSize,
        {
          fit:
            "contain",

          position:
            "centre",

          background:
            TRANSPARENT_BACKGROUND,
        }
      )
      .png()
      .toBuffer();

  await sharp({
    create: {
      width:
        size,

      height:
        size,

      channels:
        4,

      background:
        SOLID_BACKGROUND,
    },
  })
    .composite([
      {
        input:
          logoBuffer,

        gravity:
          "centre",
      },
    ])
    .png({
      compressionLevel:
        9,

      adaptiveFiltering:
        true,
    })
    .toFile(
      outputPath
    );
}

// =========================================================
// APPLE TOUCH ICON
// =========================================================
//
// Apple recommends a solid-background touch icon.
//
// iOS applies its own rounded-corner treatment.
// Do not pre-round the source image.
// =========================================================

async function generateAppleTouchIcon() {
  const size =
    180;

  const safeLogoSize =
    132;

  const logoBuffer =
    await sharp(
      SOURCE_LOGO
    )
      .resize(
        safeLogoSize,
        safeLogoSize,
        {
          fit:
            "contain",

          position:
            "centre",

          background:
            TRANSPARENT_BACKGROUND,
        }
      )
      .png()
      .toBuffer();

  await sharp({
    create: {
      width:
        size,

      height:
        size,

      channels:
        4,

      background:
        SOLID_BACKGROUND,
    },
  })
    .composite([
      {
        input:
          logoBuffer,

        gravity:
          "centre",
      },
    ])
    .png({
      compressionLevel:
        9,

      adaptiveFiltering:
        true,
    })
    .toFile(
      APPLE_TOUCH_ICON
    );
}

// =========================================================
// NEXT.JS APP ICON
// =========================================================
//
// Next.js automatically detects:
//
//   src/app/icon.png
//
// This supplies browser/app metadata without modifying the
// visual application layout.
// =========================================================

async function generateNextAppIcon() {
  await sharp(
    SOURCE_LOGO
  )
    .resize(
      512,
      512,
      {
        fit:
          "contain",

        position:
          "centre",

        background:
          SOLID_BACKGROUND,
      }
    )
    .png({
      compressionLevel:
        9,

      adaptiveFiltering:
        true,
    })
    .toFile(
      NEXT_APP_ICON
    );
}

// =========================================================
// VALIDATE OUTPUT
// =========================================================

async function validateGeneratedIcon(
  filePath,
  expectedWidth,
  expectedHeight
) {
  const metadata =
    await sharp(
      filePath
    ).metadata();

  if (
    metadata.width !==
      expectedWidth ||
    metadata.height !==
      expectedHeight
  ) {
    throw new Error(
      `Invalid generated icon size for ${filePath}. Expected ${expectedWidth}x${expectedHeight}, received ${metadata.width ?? "unknown"}x${metadata.height ?? "unknown"}.`
    );
  }

  if (
    metadata.format !==
    "png"
  ) {
    throw new Error(
      `Generated icon is not PNG: ${filePath}`
    );
  }
}

// =========================================================
// MAIN
// =========================================================

async function main() {
  console.log(
    "Generating Forza PWA icons..."
  );

  await assertSourceLogoExists();

  await ensureDirectories();

  await Promise.all([
    generateStandardIcon(
      192,
      STANDARD_192
    ),

    generateStandardIcon(
      512,
      STANDARD_512
    ),

    generateMaskableIcon(
      192,
      MASKABLE_192
    ),

    generateMaskableIcon(
      512,
      MASKABLE_512
    ),

    generateAppleTouchIcon(),

    generateNextAppIcon(),
  ]);

  await Promise.all([
    validateGeneratedIcon(
      STANDARD_192,
      192,
      192
    ),

    validateGeneratedIcon(
      STANDARD_512,
      512,
      512
    ),

    validateGeneratedIcon(
      MASKABLE_192,
      192,
      192
    ),

    validateGeneratedIcon(
      MASKABLE_512,
      512,
      512
    ),

    validateGeneratedIcon(
      APPLE_TOUCH_ICON,
      180,
      180
    ),

    validateGeneratedIcon(
      NEXT_APP_ICON,
      512,
      512
    ),
  ]);

  console.log(
    ""
  );

  console.log(
    "Forza PWA icons generated successfully:"
  );

  console.log(
    "  public/icons/forza-192x192.png"
  );

  console.log(
    "  public/icons/forza-512x512.png"
  );

  console.log(
    "  public/icons/forza-maskable-192x192.png"
  );

  console.log(
    "  public/icons/forza-maskable-512x512.png"
  );

  console.log(
    "  public/apple-touch-icon.png"
  );

  console.log(
    "  src/app/icon.png"
  );
}

// =========================================================
// EXECUTE
// =========================================================

main().catch(
  (
    error
  ) => {
    console.error(
      ""
    );

    console.error(
      "Unable to generate Forza PWA icons."
    );

    console.error(
      error instanceof Error
        ? error.message
        : error
    );

    process.exitCode =
      1;
  }
);