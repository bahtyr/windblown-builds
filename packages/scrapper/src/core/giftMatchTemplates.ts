import {readdir, writeFile} from "node:fs/promises";
import path from "node:path";

type GiftMatchTemplateSpec = {
  name: string;
  path: string;
};

const EXCLUDED_IMAGE_DIRECTORIES = new Set(["effects"]);
const GIFT_MATCH_TEMPLATES_OUTPUT = "gift-match-templates.json";

/**
 * Generates the matcher template catalog JSON used by the web app.
 *
 * @param {string} publicDir - Web public directory where the catalog should be written.
 * @returns {Promise<void>} Resolves when the JSON file has been written.
 */
export async function writeGiftMatchTemplateCatalog(publicDir: string): Promise<void> {
  const imageDirectory = path.join(publicDir, "images");
  const relativePaths = await collectTemplateImagePaths(imageDirectory);
  const specs = buildGiftMatchTemplateSpecs(relativePaths);

  await writeFile(
    path.join(publicDir, GIFT_MATCH_TEMPLATES_OUTPUT),
    JSON.stringify(specs, null, 2),
    "utf-8",
  );
}

/**
 * Converts image-relative paths into the matcher catalog format consumed by the web app.
 *
 * @param {string[]} relativePaths - Relative image paths under `public/images`.
 * @returns {GiftMatchTemplateSpec[]} Sorted template specs for the matcher.
 */
export function buildGiftMatchTemplateSpecs(relativePaths: string[]): GiftMatchTemplateSpec[] {
  return relativePaths
    .map((relativePath) => ({
      name: formatTemplateName(path.basename(relativePath)),
      path: `/images/${relativePath.split(path.sep).join("/")}`,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function collectTemplateImagePaths(directoryPath: string, relativeDirectory = ""): Promise<string[]> {
  const entries = await readdir(directoryPath, {withFileTypes: true});
  const imagePaths: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_IMAGE_DIRECTORIES.has(entry.name.toLowerCase())) {
        continue;
      }

      const nestedDirectory = path.join(directoryPath, entry.name);
      const nestedRelativeDirectory = path.join(relativeDirectory, entry.name);
      imagePaths.push(...await collectTemplateImagePaths(nestedDirectory, nestedRelativeDirectory));
      continue;
    }

    if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".png") {
      imagePaths.push(path.join(relativeDirectory, entry.name));
    }
  }

  return imagePaths;
}

function formatTemplateName(fileName: string): string {
  return fileName
    .replace(/\.png$/i, "")
    .replace(/_Icon$/i, "")
    .replace(/_/g, " ");
}
