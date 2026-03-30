import {CheerioAPI} from "cheerio";
import {Element} from "domhandler";
import {localizeEntityImages} from "../core/imageAssets.js";
import {fetchWikiDocument, fetchWikiVideoUrls} from "../core/wikiHtml.js";
import {parseRichDescription} from "../core/richTextParser.js";
import {getColor, normalizeUrl} from "../core/richTextParser.helpers.js";
import {Magifish} from "./types.js";

const PAGE = {
  url: "https://windblown.wiki.gg/wiki/Magifishes",
};

export async function scrapeMagifishes(): Promise<Magifish[]> {
  const document = await fetchWikiDocument(PAGE.url);
  const rows = document.$("table.wikitable").first().find("tbody tr").toArray();

  const magifishRows: Array<{ magifish: Magifish; wikiHref?: string }> = [];
  for (const row of rows) {
    const parsed = parseMagifishRow(document.$, row);
    if (parsed) {
      magifishRows.push(parsed);
    }
  }

  const magifishes = await Promise.all(magifishRows.map(async ({magifish, wikiHref}) => {
    const videos = await fetchWikiVideoUrls(wikiHref).catch(() => []);
    return videos.length > 0 ? {...magifish, videos} : magifish;
  }));

  await localizeEntityImages(magifishes, "magifishes");
  return magifishes;
}

function parseMagifishRow($: CheerioAPI, row: Element): { magifish: Magifish; wikiHref?: string } | null {
  const cells = $(row).find("td");
  if (cells.length < 3) {
    return null;
  }

  const image = normalizeUrl(cells.eq(0).find("img").first().attr("src")?.trim());
  const nameCell = cells.eq(1);
  const name = nameCell.text().trim();
  const wikiHref = normalizeUrl(nameCell.find("a").first().attr("href")?.trim());
  const nameColor = getColor(nameCell.find("[style]").first().attr("style") ?? nameCell.attr("style"));
  const descriptionCell = cells.eq(2);
  const richDescription = parseRichDescription(descriptionCell.html() ?? "");

  if (!image || !name) {
    return null;
  }

  return {
    magifish: {
      image,
      name,
      ...(nameColor ? {nameColor} : {}),
      richDescription,
    },
    wikiHref,
  };
}
