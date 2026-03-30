import {CheerioAPI} from "cheerio";
import {Element} from "domhandler";
import {access, mkdir, writeFile} from "fs/promises";
import path from "path";
import {fileURLToPath} from "url";
import {findSectionTableRows, fetchWikiDocument} from "../core/wikiHtml.js";
import {parseRichDescription} from "../core/richTextParser.js";
import {getColor, normalizeUrl} from "../core/richTextParser.helpers.js";
import {Gift} from "./types.js";

const PAGE = {
  url: "https://windblown.wiki.gg/wiki/Gifts",
  sections: [
    "General Gifts",
    "Alterattack Gifts",
    "Blast Gifts",
    "Bleed Gifts",
    "Brutality Gifts",
    "Burn Gifts",
    "Corrosive Gifts",
    "Crystallize Gifts",
    "Curse Gifts",
    "Echo Gifts",
    "Freeze Gifts",
    "Goo Gifts",
    "Mark Gifts",
    "Overwhelm Gifts",
    "Rush Gifts",
    "Scythe Gifts",
  ],
};

const IMAGE_EXTENSION_PATTERN = /\.(png|webp|jpe?g|gif|svg)$/i;
const GIFTS_IMAGE_OUTPUT_DIR = fileURLToPath(new URL("../../../../apps/web/public/images", import.meta.url));
const IMAGE_DOWNLOAD_MAX_ATTEMPTS = 4;
const IMAGE_DOWNLOAD_RETRY_DELAY_MS = 1500;

/**
 * Scrape gifts from the wiki and return normalized gift records.
 *
 * Assumptions: The target page follows the expected section/table layout.
 *
 * Side effects: performs network requests to fetch wiki HTML and image assets.
 *
 * @returns Array of gifts parsed from the requested sections.
 */
export async function scrapeGifts(): Promise<Gift[]> {
  const document = await fetchWikiDocument(PAGE.url);
  const gifts: Gift[] = [];

  // For each section, find its table and loop through its rows to scrape gifts.
  for (const section of PAGE.sections) {
    const rows = findSectionTableRows(document.$, section);
    for (const row of rows) {
      const gift = parseGiftRow(document.$, row, section);
      if (gift) {
        gifts.push(gift);
      }
    }
  }

  await downloadGiftImages(gifts);
  return gifts;
}

/**
 * Parse a table row element into a gift record when the required fields exist.
 *
 * Assumptions: The row has at least three cells: image, name, description.
 *
 * Side effects: none.
 *
 * @param $ Cheerio API bound to the document containing the row.
 * @param row Table row element to parse.
 * @param section Section heading used to derive the gift category.
 * @returns Parsed gift record or null when data is incomplete.
 */
function parseGiftRow($: CheerioAPI, row: Element, section: string): Gift | null {
  const cells = $(row).find("td");
  if (cells.length < 3) {
    return null;
  }

  const image = normalizeGiftImageUrl(cells.eq(0).find("img").first().attr("src")?.trim());
  const nameCell = cells.eq(1);
  const name = nameCell.text().trim();
  const nameColor = getColor(nameCell.find("[style]").first().attr("style") ?? nameCell.attr("style"));
  const wikiHref = normalizeUrl(nameCell.find("a").first().attr("href")?.trim());
  const descriptionCell = cells.eq(2);
  const richDescription = parseRichDescription(descriptionCell.html() ?? "");

  if (!image || !name) {
    return null;
  }

  return {
    image,
    name,
    ...(nameColor ? {nameColor} : {}),
    ...(buildGiftVideoUrl(wikiHref) ? {video: buildGiftVideoUrl(wikiHref)} : {}),
    category: section.replace(/\s+Gifts$/, "").trim(),
    richDescription,
  };
}

/**
 * Convert a gift wiki URL into the corresponding `.webm` asset URL.
 *
 * @param {string | undefined} wikiHref - Gift wiki URL.
 * @returns {string | undefined} Derived video URL when the wiki path is valid.
 */
export function buildGiftVideoUrl(wikiHref?: string): string | undefined {
  if (!wikiHref) return undefined;
  const match = wikiHref.match(/\/wiki\/([^/?#]+)/);
  if (!match) return undefined;
  return `https://windblown.wiki.gg/images/${match[1]}.webm`;
}

/**
 * Normalize a gift image URL to the direct wiki image asset URL.
 *
 * @param {string | undefined} imageUrl - Raw image URL from the wiki table row.
 * @returns {string | undefined} Direct image asset URL without thumb sizing or trailing extras.
 */
export function normalizeGiftImageUrl(imageUrl?: string): string | undefined {
  const normalized = normalizeUrl(imageUrl);
  if (!normalized) {
    return normalized;
  }

  const url = new URL(normalized);
  const segments = url.pathname.split("/").filter(Boolean);
  const thumbIndex = segments.indexOf("thumb");

  if (thumbIndex !== -1) {
    const directSegment = segments
      .slice(thumbIndex + 1)
      .find((segment) => IMAGE_EXTENSION_PATTERN.test(segment) && !/^\d+px-/i.test(segment));

    if (directSegment) {
      return `${url.origin}/images/${decodeURIComponent(directSegment)}`;
    }
  }

  const fileSegment = [...segments]
    .reverse()
    .find((segment) => IMAGE_EXTENSION_PATTERN.test(segment));
  if (!fileSegment) {
    return normalized;
  }

  const normalizedFileName = decodeURIComponent(fileSegment).replace(/^\d+px-/i, "");
  return `${url.origin}/images/${normalizedFileName}`;
}

/**
 * Download gift image assets into the app public directory.
 *
 * @param {Gift[]} gifts - Parsed gifts with normalized image URLs.
 * @returns {Promise<void>} Resolves when all image files are written locally.
 */
export async function downloadGiftImages(gifts: Gift[]): Promise<void> {
  await mkdir(GIFTS_IMAGE_OUTPUT_DIR, {recursive: true});

  for (const gift of gifts) {
    const imageUrl = normalizeGiftImageUrl(gift.image);
    if (!imageUrl) {
      continue;
    }

    const fileName = path.basename(new URL(imageUrl).pathname);
    const outputPath = path.join(GIFTS_IMAGE_OUTPUT_DIR, fileName);
    if (await fileExists(outputPath)) {
      continue;
    }

    const response = await fetchGiftImageWithRetry(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(outputPath, buffer);
  }
}

async function fetchGiftImageWithRetry(imageUrl: string): Promise<Response> {
  for (let attempt = 1; attempt <= IMAGE_DOWNLOAD_MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch(imageUrl);
    if (response.ok) {
      return response;
    }

    if (response.status !== 429 || attempt === IMAGE_DOWNLOAD_MAX_ATTEMPTS) {
      throw new Error(`Failed to download gift image: ${imageUrl} (${response.status})`);
    }

    await delay(IMAGE_DOWNLOAD_RETRY_DELAY_MS * attempt);
  }

  throw new Error(`Failed to download gift image: ${imageUrl}`);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
