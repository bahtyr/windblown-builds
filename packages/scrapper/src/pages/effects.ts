import {CheerioAPI} from "cheerio";
import {Element} from "domhandler";
import {localizeEntityImages} from "../core/imageAssets.js";
import {fetchWikiDocument, fetchWikiVideoUrls, findSectionTableRows} from "../core/wikiHtml.js";
import {parseRichDescription} from "../core/richTextParser.js";
import {getColor, normalizeUrl} from "../core/richTextParser.helpers.js";
import {Effect} from "./types.js";

const PAGE = {
  url: "https://windblown.wiki.gg/wiki/Effects",
  sections: ["Buffs", "Debuffs", "Mechanics", "Hit Types", "Special Attacks"],
};

export async function scrapeEffects(): Promise<Effect[]> {
  const document = await fetchWikiDocument(PAGE.url);
  const effectRows: Array<{ effect: Effect; wikiHref?: string }> = [];

  // For each section, find its table and loop through its rows to scrape effects
  for (const section of PAGE.sections) {
    const rows = findSectionTableRows(document.$, section);
    for (const row of rows) {
      const parsed = parseEffectRow(document.$, row, section);
      if (parsed) {
        effectRows.push(parsed);
      }
    }
  }

  const effects = await Promise.all(effectRows.map(async ({effect, wikiHref}) => {
    const videos = await fetchWikiVideoUrls(wikiHref).catch(() => []);
    return videos.length > 0 ? {...effect, videos} : effect;
  }));

  await localizeEntityImages(effects, "effects");
  return effects;
}

function parseEffectRow($: CheerioAPI, row: Element, category: string): { effect: Effect; wikiHref?: string } | null {
  const cells = $(row).find("td");
  if (cells.length < 5) {
    return null;
  }

  const image = normalizeUrl(cells.eq(0).find("img").first().attr("src")?.trim());
  const nameCell = cells.eq(1);
  const name = nameCell.text().trim();
  const wikiHref = normalizeUrl(nameCell.find("a").first().attr("href")?.trim());
  const nameColor = getColor(nameCell.find("[style]").first().attr("style") ?? nameCell.attr("style"));
  const descriptionCell = cells.eq(2);
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
    effect: {
      image,
      name,
      ...(nameColor ? {nameColor} : {}),
      category,
      richDescription,
      advancedDescription,
      richAdvancedDescription,
      notes,
      richNotes,
    },
    wikiHref,
  };
}
