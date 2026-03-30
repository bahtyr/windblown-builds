import {CheerioAPI} from "cheerio";
import {Element} from "domhandler";
import {findSectionTableRows, fetchWikiDocument} from "../core/wikiHtml.js";
import {localizeEntityImages, normalizeWikiImageUrl} from "../core/imageAssets.js";
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

  await localizeEntityImages(gifts, "gifts");
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
  return normalizeWikiImageUrl(normalizeUrl(imageUrl));
}

/**
 * Download gift image assets into the app public directory.
 *
 * @param {Gift[]} gifts - Parsed gifts with normalized image URLs.
 * @returns {Promise<void>} Resolves when all image files are written locally.
 */
export async function downloadGiftImages(gifts: Gift[]): Promise<void> {
  await localizeEntityImages(gifts, "gifts");
}
