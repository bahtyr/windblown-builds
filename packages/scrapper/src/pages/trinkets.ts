import {CheerioAPI} from "cheerio";
import {Element} from "domhandler";
import {localizeEntityImages} from "../core/imageAssets.js";
import {fetchWikiDocument, fetchWikiVideoUrls} from "../core/wikiHtml.js";
import {parseRichDescription} from "../core/richTextParser.js";
import {getColor, normalizeUrl} from "../core/richTextParser.helpers.js";
import {Trinket} from "./types.js";

const PAGE = {
  url: "https://windblown.wiki.gg/wiki/Trinkets",
};

export async function scrapeTrinkets(): Promise<Trinket[]> {
  const document = await fetchWikiDocument(PAGE.url);
  const rows = document.$("table.wikitable").first().find("tbody tr").toArray();

  const trinketRows: Array<{ trinket: Trinket; wikiHref?: string }> = [];
  for (const row of rows) {
    const parsed = parseTrinketRow(document.$, row);
    if (parsed) {
      trinketRows.push(parsed);
    }
  }

  const trinkets = await Promise.all(trinketRows.map(async ({trinket, wikiHref}) => {
    const videos = await fetchWikiVideoUrls(wikiHref).catch(() => []);
    return videos.length > 0 ? {...trinket, videos} : trinket;
  }));

  await localizeEntityImages(trinkets, "trinkets");
  return trinkets;
}

function parseTrinketRow($: CheerioAPI, row: Element): { trinket: Trinket; wikiHref?: string } | null {
  const cells = $(row).find("td");
  if (cells.length < 6) {
    return null;
  }

  const image = normalizeUrl(cells.eq(0).find("img").first().attr("src")?.trim());
  const nameCell = cells.eq(1);
  const name = nameCell.text().trim();
  const wikiHref = normalizeUrl(nameCell.find("a").first().attr("href")?.trim());
  const nameColor = getColor(nameCell.find("[style]").first().attr("style") ?? nameCell.attr("style"));
  const descriptionCell = cells.eq(2);
  const richDescription = parseRichDescription(descriptionCell.html() ?? "");
  const baseDamage = cells.eq(3).text().trim();
  const damageType = cells.eq(4).text().trim();
  const cooldown = cells.eq(5).text().trim();

  if (!image || !name) {
    return null;
  }

  return {
    trinket: {
      image,
      name,
      ...(nameColor ? {nameColor} : {}),
      richDescription,
      baseDamage,
      damageType,
      cooldown,
    },
    wikiHref,
  };
}
