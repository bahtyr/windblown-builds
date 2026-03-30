import {CheerioAPI} from "cheerio";
import {Element} from "domhandler";
import {localizeEntityImages} from "../core/imageAssets.js";
import {fetchWikiDocument} from "../core/wikiHtml.js";
import {parseRichDescription} from "../core/richTextParser.js";
import {getColor, normalizeUrl} from "../core/richTextParser.helpers.js";
import {Weapon} from "./types.js";

const PAGE = {
  url: "https://windblown.wiki.gg/wiki/Weapons",
};

export async function scrapeWeapons(): Promise<Weapon[]> {
  const document = await fetchWikiDocument(PAGE.url);
  const rows = document.$("h1 + div table.wikitable").first().find("tbody tr").toArray();

  const weapons: Weapon[] = [];
  for (const row of rows) {
    const parsed = parseWeaponRow(document.$, row);
    if (parsed) {
      weapons.push(parsed);
    }
  }

  await localizeEntityImages(weapons, "weapons");
  return weapons;
}

function parseWeaponRow($: CheerioAPI, row: Element): Weapon | null {
  const cells = $(row).find("td");
  if (cells.length < 8) {
    return null;
  }

  const image = normalizeUrl(cells.eq(0).find("img").first().attr("src")?.trim());
  const nameCell = cells.eq(1);
  const name = nameCell.text().trim();
  const nameColor = getColor(nameCell.find("[style]").first().attr("style") ?? nameCell.attr("style"));
  const descriptionCell = cells.eq(2);
  const richDescription = parseRichDescription(descriptionCell.html() ?? "");
  const baseDamage = cells.eq(3).text().trim();
  const damageType = cells.eq(4).text().trim();
  const alterattackBonus = cells.eq(5).text().trim();

  if (!image || !name) {
    return null;
  }

  return {
    image,
    name,
    ...(nameColor ? {nameColor} : {}),
    richDescription,
    baseDamage,
    damageType,
    alterattackBonus,
  };
}
