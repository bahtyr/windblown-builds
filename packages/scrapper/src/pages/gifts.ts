import { CheerioAPI } from "cheerio";
import { Element } from "domhandler";
import { findSectionTableRows, fetchWikiDocument } from "../core/wikiHtml.js";
import { parseRichDescription } from "../core/richTextParser.js";
import { getColor, normalizeUrl } from "../core/richTextParser.helpers.js";
import { Gift } from "./types.js";

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
  ]
}

/**
 * Scrape gifts from the wiki and return normalized gift records.
 *
 * Assumptions: The target page follows the expected section/table layout.
 *
 * Side effects: performs network requests to fetch wiki HTML.
 *
 * @returns Array of gifts parsed from the requested sections.
 */
export async function scrapeGifts(): Promise<Gift[]> {
  const document = await fetchWikiDocument(PAGE.url);
  const gifts: Gift[] = [];

  // For each section, find its table and loop through its rows to scrape gifts
  for (const section of PAGE.sections) {
    const rows = findSectionTableRows(document.$, section);
    for (const row of rows) {
      const gift = parseGiftRow(document.$, row, section);
      if (gift) {
        gifts.push(gift);
      }
    }
  }

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

  const image = normalizeUrl(cells.eq(0).find("img").first().attr("src")?.trim());
  const nameCell = cells.eq(1);
  const name = nameCell.text().trim();
  const nameColor = getColor(nameCell.find("[style]").first().attr("style") ?? nameCell.attr("style"));
  const descriptionCell = cells.eq(2);
  const description = descriptionCell.text().trim();
  const richDescription = parseRichDescription(descriptionCell.html() ?? "");

  if (!image || !name) {
    return null;
  }

  return {
    image,
    name,
    ...(nameColor ? {nameColor} : {}),
    category: section.replace(/\s+Gifts$/, "").trim(),
    description,
    richDescription,
  };
}
