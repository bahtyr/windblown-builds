import {CheerioAPI} from "cheerio";
import {Element} from "domhandler";
import {fetchWikiDocument} from "../core/wikiHtml.js";
import {parseRichDescription} from "../core/richTextParser.js";
import {normalizeUrl} from "../core/richTextParser.helpers.js";
import {Trinket} from "./types.js";

const PAGE = {
  url: "https://windblown.wiki.gg/wiki/Trinkets",
};

export async function scrapeTrinkets(): Promise<Trinket[]> {
  const document = await fetchWikiDocument(PAGE.url);
  const rows = document.$("h1 + div table.wikitable").first().find("tbody tr").toArray();

  const trinkets: Trinket[] = [];
  for (const row of rows) {
    const parsed = parseTrinketRow(document.$, row);
    if (parsed) {
      trinkets.push(parsed);
    }
  }

  return trinkets;
}

function parseTrinketRow($: CheerioAPI, row: Element): Trinket | null {
  const cells = $(row).find("td");
  if (cells.length < 8) {
    return null;
  }

  const image = normalizeUrl(cells.eq(0).find("img").first().attr("src")?.trim());
  const name = cells.eq(1).text().trim();
  const descriptionCell = cells.eq(2);
  const description = descriptionCell.text().trim();
  const richDescription = parseRichDescription(descriptionCell.html() ?? "");
  const baseDamage = cells.eq(3).text().trim();
  const damageType = cells.eq(4).text().trim();
  const cooldown = cells.eq(5).text().trim();
  const unlockCost = cells.eq(6).text().trim();
  const unlockRequirement = cells.eq(7).text().trim();

  if (!image || !name) {
    return null;
  }

  return {
    image,
    name,
    description,
    richDescription,
    baseDamage,
    damageType,
    cooldown,
    unlockCost,
    unlockRequirement,
  };
}
