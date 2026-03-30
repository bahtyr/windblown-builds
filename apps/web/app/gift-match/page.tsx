import {readdir} from "node:fs/promises";
import path from "node:path";
import GiftMatchDebug from "./GiftMatchDebug";
import type {GiftMatchTemplateSpec} from "./gift-match-workflow";

const EXCLUDED_IMAGE_DIRECTORIES = new Set(["effects"]);

/**
 * Loads the image catalog for the gift-match debug page.
 *
 * @returns {Promise<JSX.Element>} Gift-match debug page with the server-generated template list.
 */
export default async function GiftMatchPage(): Promise<JSX.Element> {
  const templateSpecs = await loadGiftMatchTemplateSpecs();

  return <GiftMatchDebug templateSpecs={templateSpecs}/>;
}

/**
 * Reads public image assets and exposes them as comparison template specs.
 *
 * @returns {Promise<GiftMatchTemplateSpec[]>} Sorted template specs for browser-side matching.
 */
async function loadGiftMatchTemplateSpecs(): Promise<GiftMatchTemplateSpec[]> {
  const imageDirectory = path.join(process.cwd(), "public", "images");
  const relativePaths = await collectTemplateImagePaths(imageDirectory);

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
