import {readdir} from "node:fs/promises";
import path from "node:path";
import GiftMatchDebug from "./GiftMatchDebug";
import type {GiftMatchTemplateSpec} from "./gift-match-workflow";

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
  const entries = await readdir(imageDirectory, {withFileTypes: true});

  return entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".png")
    .map((entry) => ({
      name: formatTemplateName(entry.name),
      path: `/images/${entry.name}`,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function formatTemplateName(fileName: string): string {
  return fileName
    .replace(/\.png$/i, "")
    .replace(/_/g, " ");
}
