import { CheerioAPI, load } from "cheerio";
import { Element } from "domhandler";

export interface WikiHtmlDocument {
  $: CheerioAPI;
  url: string;
}

export async function fetchWikiDocument(url: string): Promise<WikiHtmlDocument> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "windblown-scraper/1.0 (+https://github.com/)"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return { $: load(html), url };
}

export function findSectionTableRows(
  $: CheerioAPI,
  sectionHeading: string,
): Element[] {
  const headingSpan = $("h3 > span.mw-headline")
    .filter((_, span) => $(span).text().trim() === sectionHeading)
    .first();

  if (headingSpan.length === 0) {
    return [];
  }

  const tableBody = headingSpan.closest("h3").nextAll("table").first().find("tbody").first();
  if (tableBody.length === 0) {
    return [];
  }

  return tableBody.find("tr").toArray();
}
