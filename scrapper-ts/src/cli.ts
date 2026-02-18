#!/usr/bin/env node
import { scrapeGifts } from "./pages/gifts.js";

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const pretty = args.has("--pretty");

  try {
    const gifts = await scrapeGifts();
    const output = JSON.stringify(gifts, null, pretty ? 2 : 0);
    process.stdout.write(`${output}\n`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    process.stderr.write(`Scraping failed: ${message}\n`);
    process.exitCode = 1;
  }
}

void main();
