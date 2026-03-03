import {CheerioAPI} from "cheerio";
import {Element} from "domhandler";
import {fetchWikiDocument} from "../core/wikiHtml.js";
import {parseRichDescription} from "../core/richTextParser.js";
import {normalizeUrl} from "../core/richTextParser.helpers.js";
import {Effect} from "./types.js";

const PAGE = {
  url: "https://windblown.wiki.gg/wiki/Gifts",
  sections: ["Buffs", "Debuffs", "Mechanics", "Hit Types", "Special Attacks"],
};

export async function scrapeEffects(): Promise<Effect[]> {
  const document = await fetchWikiDocument(PAGE.url);
  const effects: Effect[] = [];

  for (const section of PAGE.sections) {
    const rows = findSectionTableRowsFlexible(document.$, section);
    for (const row of rows) {
      const effect = parseEffectRow(document.$, row, section);
      if (effect) {
        effects.push(effect);
      }
    }
  }

  return effects;
}

function findSectionTableRowsFlexible($: CheerioAPI, sectionHeading: string): Element[] {
  // Try h3 first (matches existing helper)
  const h3 = $("h3 > span.mw-headline")
    .filter((_, span) => $(span).text().trim() === sectionHeading)
    .first();
  const heading = h3.length > 0 ? h3.closest("h3") : $("h2 > span.mw-headline")
    .filter((_, span) => $(span).text().trim() === sectionHeading)
    .first()
    .closest("h2");

  if (heading.length === 0) {
    return [];
  }

  const tableBody = heading.nextAll("table").first().find("tbody").first();
  if (tableBody.length === 0) {
    return [];
  }

  return tableBody.find("tr").toArray();
}

function parseEffectRow($: CheerioAPI, row: Element, category: string): Effect | null {
  const cells = $(row).find("td");
  if (cells.length < 5) {
    return null;
  }

  const image = normalizeUrl(cells.eq(0).find("img").first().attr("src")?.trim());
  const name = cells.eq(1).text().trim();
  const descriptionCell = cells.eq(2);
  const description = descriptionCell.text().trim();
  const richDescription = parseRichDescription(descriptionCell.html() ?? "");
  const advancedCell = cells.eq(3);
  const advancedDescription = advancedCell.text().trim();
  const richAdvancedDescription = parseRichDescription(advancedCell.html() ?? "");
  const notesCell = cells.eq(4);
  const notes = notesCell.text().trim();
  const richNotes = parseRichDescription(notesCell.html() ?? "");

  if (!image || !name) {
    return null;
  }

  return {
    image,
    name,
    category,
    description,
    richDescription,
    advancedDescription,
    richAdvancedDescription,
    notes,
    richNotes,
  };
}
