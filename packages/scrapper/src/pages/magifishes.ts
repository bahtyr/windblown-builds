import {CheerioAPI} from "cheerio";
import {Element} from "domhandler";
import {fetchWikiDocument} from "../core/wikiHtml.js";
import {parseRichDescription} from "../core/richTextParser.js";
import {getColor, normalizeUrl} from "../core/richTextParser.helpers.js";
import {Magifish} from "./types.js";

const PAGE = {
  url: "https://windblown.wiki.gg/wiki/Magifishes",
};

export async function scrapeMagifishes(): Promise<Magifish[]> {
  const document = await fetchWikiDocument(PAGE.url);
  const rows = document.$("h1 + div table.wikitable").first().find("tbody tr").toArray();

  const magifishes: Magifish[] = [];
  for (const row of rows) {
    const parsed = parseMagifishRow(document.$, row);
    if (parsed) {
      magifishes.push(parsed);
    }
  }

  return magifishes;
}

function parseMagifishRow($: CheerioAPI, row: Element): Magifish | null {
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
  const unlockCost = cells.eq(3).text().trim();
  const unlockRequirement = cells.eq(4).text().trim();

  if (!image || !name) {
    return null;
  }

  return {
    image,
    name,
    ...(nameColor ? {nameColor} : {}),
    description,
    richDescription,
    unlockCost,
    unlockRequirement,
  };
}
