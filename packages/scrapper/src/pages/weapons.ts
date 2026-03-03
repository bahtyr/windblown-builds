import {CheerioAPI} from "cheerio";
import {Element} from "domhandler";
import {fetchWikiDocument} from "../core/wikiHtml.js";
import {parseRichDescription} from "../core/richTextParser.js";
import {Weapon} from "./types.js";

const PAGE = {
  url: "https://windblown.wiki.gg/wiki/Weapons",
};

export async function scrapeWeapons(): Promise<Weapon[]> {
  const document = await fetchWikiDocument(PAGE.url);
  const rows = document.$("table").first().find("tbody tr").toArray();

  const weapons: Weapon[] = [];
  for (const row of rows) {
    const parsed = parseWeaponRow(document.$, row);
    if (parsed) {
      weapons.push(parsed);
    }
  }

  return weapons;
}

function parseWeaponRow($: CheerioAPI, row: Element): Weapon | null {
  const cells = $(row).find("td");
  if (cells.length < 8) {
    return null;
  }

  const image = cells.eq(0).find("img").first().attr("src")?.trim();
  const name = cells.eq(1).text().trim();
  const descriptionCell = cells.eq(2);
  const description = descriptionCell.text().trim();
  const richDescription = parseRichDescription(descriptionCell.html() ?? "");
  const baseDamage = cells.eq(3).text().trim();
  const damageType = cells.eq(4).text().trim();
  const alterattackBonus = cells.eq(5).text().trim();
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
    alterattackBonus,
    unlockCost,
    unlockRequirement,
  };
}
