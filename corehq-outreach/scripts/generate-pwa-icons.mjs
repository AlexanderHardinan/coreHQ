import sharp from "sharp";
import fs from "fs";
import path from "path";

const input = path.resolve("public/coreHQ.png");
const outputDir = path.resolve("public/icons");

// ensure output dir exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generate() {
  try {
    console.log("Generating PWA icons...");

    await sharp(input)
      .resize(192, 192)
      .png()
      .toFile(path.join(outputDir, "icon-192.png"));

    await sharp(input)
      .resize(512, 512)
      .png()
      .toFile(path.join(outputDir, "icon-512.png"));

    console.log("PWA icons generated successfully.");
  } catch (err) {
    console.error("Error generating icons:", err);
    process.exit(1);
  }
}

generate();