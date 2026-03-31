#!/usr/bin/env node
import {writeFile} from "fs/promises";
import {scrapeGifts} from "./pages/gifts.js";
import {scrapeWeapons} from "./pages/weapons.js";
import {scrapeTrinkets} from "./pages/trinkets.js";
import {scrapeMagifishes} from "./pages/magifishes.js";
import {scrapeHexes} from "./pages/hexes.js";
import {scrapeEffects} from "./pages/effects.js";
import {scrapeBoosts} from "./pages/boosts.js";
import {writeGiftMatchTemplateCatalog} from "./core/giftMatchTemplates.js";

const OUTPUT_DIR = "../../apps/web/public";

type ScrapeTask<T> = {
  name: string;
  scrape: () => Promise<T[]>;
};

async function main(): Promise<void> {
  try {
    const tasks: ScrapeTask<unknown>[] = [
      {name: "gifts", scrape: scrapeGifts},
      {name: "weapons", scrape: scrapeWeapons},
      {name: "trinkets", scrape: scrapeTrinkets},
      {name: "magifishes", scrape: scrapeMagifishes},
      {name: "hexes", scrape: scrapeHexes},
      {name: "boosts", scrape: scrapeBoosts},
      {name: "effects", scrape: scrapeEffects},
    ];

    for (const task of tasks) {
      const data = await task.scrape();
      const output = JSON.stringify(data, null, 2);
      await writeFile(`${OUTPUT_DIR}/${task.name}.json`, output, "utf-8");
    }

    await writeGiftMatchTemplateCatalog(OUTPUT_DIR);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    process.stderr.write(`Scraping failed: ${message}\n`);
    process.exitCode = 1;
  }
}

void main();
