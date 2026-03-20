import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate photo manifest from photos directory
 * This script scans the assets/photos directory and creates a manifest file
 */

const PHOTOS_DIR = path.join(__dirname, "..", "assets", "photos");
const MANIFEST_PATH = path.join(
  __dirname,
  "..",
  "assets",
  "photo-manifest.json",
);

const SUPPORTED_FORMATS = [".jpg", ".jpeg", ".png", ".webp"];

function generateManifest() {
  try {
    // Create photos directory if it doesn't exist
    if (!fs.existsSync(PHOTOS_DIR)) {
      fs.mkdirSync(PHOTOS_DIR, { recursive: true });
      console.log("Created photos directory:", PHOTOS_DIR);
    }

    // Read photos directory
    const files = fs.readdirSync(PHOTOS_DIR);
    const photoFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return SUPPORTED_FORMATS.includes(ext);
    });

    console.log(`Found ${photoFiles.length} photo files`);

    // Generate manifest entries
    const photos = photoFiles.map((filename, index) => {
      const ext = path.extname(filename);
      const name = path.basename(filename, ext);

      return {
        id: `photo_${index + 1}_${name}`,
        path: `./assets/photos/${filename}`,
        metadata: {
          title: formatTitle(name),
          description: `Professional photograph: ${formatTitle(name)}`,
          date: new Date().toISOString().split("T")[0],
          camera: "Unknown",
          settings: {
            aperture: "Unknown",
            shutter: "Unknown",
            iso: "Unknown",
          },
          tags: generateTags(name),
        },
      };
    });

    // Create manifest object
    const manifest = {
      version: "1.0",
      generated: new Date().toISOString(),
      count: photos.length,
      photos: photos,
    };

    // Write manifest file
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(`Generated manifest with ${photos.length} photos`);
    console.log("Manifest saved to:", MANIFEST_PATH);

    return manifest;
  } catch (error) {
    console.error("Error generating manifest:", error);
    process.exit(1);
  }
}

function formatTitle(filename) {
  return filename
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .trim();
}

function generateTags(filename) {
  const tags = [];
  const name = filename.toLowerCase();

  // Basic tag generation based on filename
  if (
    name.includes("landscape") ||
    name.includes("mountain") ||
    name.includes("nature")
  ) {
    tags.push("landscape", "nature");
  }
  if (
    name.includes("portrait") ||
    name.includes("person") ||
    name.includes("people")
  ) {
    tags.push("portrait", "people");
  }
  if (
    name.includes("architecture") ||
    name.includes("building") ||
    name.includes("city")
  ) {
    tags.push("architecture", "urban");
  }
  if (name.includes("abstract") || name.includes("art")) {
    tags.push("abstract", "artistic");
  }
  if (name.includes("street")) {
    tags.push("street", "urban");
  }

  return tags.length > 0 ? tags : ["photography"];
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateManifest();
}

export { generateManifest };
