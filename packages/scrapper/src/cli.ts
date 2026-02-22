#!/usr/bin/env node
import {writeFile} from "fs/promises";
import {scrapeGifts} from "./pages/gifts.js";

async function main(): Promise<void> {
  try {
    const gifts = await scrapeGifts();
    const output = JSON.stringify(gifts, null, 2);
    await writeFile("../../apps/web/public/gifts.json", output, "utf-8");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    process.stderr.write(`Scraping failed: ${message}\n`);
    process.exitCode = 1;
  }
}

void main();
