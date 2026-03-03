import {CheerioAPI} from "cheerio";
import {Element} from "domhandler";
import {fetchWikiDocument} from "../core/wikiHtml.js";
import {parseRichDescription} from "../core/richTextParser.js";
import {normalizeUrl} from "../core/richTextParser.helpers.js";
import {Hex} from "./types.js";

const PAGE = {
  url: "https://windblown.wiki.gg/wiki/Hexes",
};

export async function scrapeHexes(): Promise<Hex[]> {
  const document = await fetchWikiDocument(PAGE.url);
  const rows = document.$("h1 + div table.wikitable").first().find("tbody tr").toArray();

  const hexes: Hex[] = [];
  for (const row of rows) {
    const parsed = parseHexRow(document.$, row);
    if (parsed) {
      hexes.push(parsed);
    }
  }

  return hexes;
}

function parseHexRow($: CheerioAPI, row: Element): Hex | null {
  const cells = $(row).find("td");
  if (cells.length < 5) {
    return null;
  }

  const image = normalizeUrl(cells.eq(0).find("img").first().attr("src")?.trim());
  const name = cells.eq(1).text().trim();
  const descriptionCell = cells.eq(2);
  const description = descriptionCell.text().trim();
  const richDescription = parseRichDescription(descriptionCell.html() ?? "");
  const unlockCost = cells.eq(3).text().trim();
  const unlockRequirement = cells.eq(4).text().trim();

  if (!image || !name) {
    return null;
  }

  return {
    image,
    name,
    description,
    richDescription,
    unlockCost,
    unlockRequirement,
  };
}
