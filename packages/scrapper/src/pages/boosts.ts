import {CheerioAPI} from "cheerio";
import {Element} from "domhandler";
import {fetchWikiDocument} from "../core/wikiHtml.js";
import {parseRichDescription} from "../core/richTextParser.js";
import {normalizeUrl} from "../core/richTextParser.helpers.js";
import {Boost} from "./types.js";

const PAGE = {
  url: "https://windblown.wiki.gg/wiki/Boosts",
};

/**
 * Scrape boosts from the wiki single-table layout.
 */
export async function scrapeBoosts(): Promise<Boost[]> {
  const document = await fetchWikiDocument(PAGE.url);
  const rows = document.$("h1 + div table.wikitable").first().find("tbody tr").toArray();

  const boosts: Boost[] = [];
  for (const row of rows) {
    const parsed = parseBoostRow(document.$, row);
    if (parsed) {
      boosts.push(parsed);
    }
  }

  return boosts;
}

/**
 * Parse a table row into a Boost record.
 */
function parseBoostRow($: CheerioAPI, row: Element): Boost | null {
  const cells = $(row).find("td");
  if (cells.length < 4) {
    return null;
  }

  const image = normalizeUrl(cells.eq(0).find("img").first().attr("src")?.trim());
  const name = cells.eq(1).text().trim();
  const descriptionCell = cells.eq(2);
  const description = descriptionCell.text().trim();
  const richDescription = parseRichDescription(descriptionCell.html() ?? "");
  const healthBonus = cells.eq(3).text().trim();

  if (!image || !name) {
    return null;
  }

  return {
    image,
    name,
    description,
    richDescription,
    ...(healthBonus ? {healthBonus} : {}),
  };
}
