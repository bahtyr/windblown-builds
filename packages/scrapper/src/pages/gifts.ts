import { CheerioAPI } from "cheerio";
import { Element } from "domhandler";
import { findSectionTableRows, fetchWikiDocument } from "../core/wikiHtml.js";
import { parseRichDescription } from "../core/richTextParser.js";
import { Gift } from "./types.js";

export const GIFTS_PAGE_URL = "https://windblown.wiki.gg/wiki/Gifts";

export const GIFT_SECTIONS = [
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
] as const;

export interface GiftsScrapeOptions {
  url?: string;
  sections?: readonly string[];
}

export async function scrapeGifts(options: GiftsScrapeOptions = {}): Promise<Gift[]> {
  const url = options.url ?? GIFTS_PAGE_URL;
  const sections = options.sections ?? GIFT_SECTIONS;

  const document = await fetchWikiDocument(url);
  const gifts: Gift[] = [];

  for (const section of sections) {
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

function parseGiftRow($: CheerioAPI, row: Element, section: string): Gift | null {
  const cells = $(row).find("td");
  if (cells.length < 3) {
    return null;
  }

  const imageUrl = cells.eq(0).find("img").first().attr("src")?.trim();
  const name = cells.eq(1).text().trim();
  const descriptionCell = cells.eq(2);
  const description = descriptionCell.text().trim();

  if (!imageUrl || !name) {
    return null;
  }

  return {
    imageUrl,
    name,
    category: section.replace(/\s+Gifts$/, "").trim(),
    description,
    richDescription: parseRichDescription(descriptionCell.html() ?? ""),
  };
}
