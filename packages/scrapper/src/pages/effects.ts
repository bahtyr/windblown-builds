import {CheerioAPI} from "cheerio";
import {Element} from "domhandler";
import {fetchWikiDocument, findSectionTableRows} from "../core/wikiHtml.js";
import {parseRichDescription} from "../core/richTextParser.js";
import {getColor, normalizeUrl} from "../core/richTextParser.helpers.js";
import {Effect} from "./types.js";

const PAGE = {
  url: "https://windblown.wiki.gg/wiki/Effects",
  sections: ["Buffs", "Debuffs", "Mechanics", "Hit Types", "Special Attacks"],
};

export async function scrapeEffects(): Promise<Effect[]> {
  const document = await fetchWikiDocument(PAGE.url);
  const effects: Effect[] = [];

  // For each section, find its table and loop through its rows to scrape effects
  for (const section of PAGE.sections) {
    const rows = findSectionTableRows(document.$, section);
    for (const row of rows) {
      const effect = parseEffectRow(document.$, row, section);
      if (effect) {
        effects.push(effect);
      }
    }
  }

  return effects;
}

function parseEffectRow($: CheerioAPI, row: Element, category: string): Effect | null {
  const cells = $(row).find("td");
  if (cells.length < 5) {
    return null;
  }

  const image = normalizeUrl(cells.eq(0).find("img").first().attr("src")?.trim());
  const nameCell = cells.eq(1);
  const name = nameCell.text().trim();
  const nameColor = getColor(nameCell.find("[style]").first().attr("style") ?? nameCell.attr("style"));
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
    ...(nameColor ? {nameColor} : {}),
    category,
    description,
    richDescription,
    advancedDescription,
    richAdvancedDescription,
    notes,
    richNotes,
  };
}
