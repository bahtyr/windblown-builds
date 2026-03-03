import { CheerioAPI, load } from "cheerio";
import { Element } from "domhandler";

export interface WikiHtmlDocument {
  $: CheerioAPI;
  url: string;
}

/**
 * Fetch a wiki page and return a parsed Cheerio document wrapper.
 *
 * Assumptions: `url` points to an HTML page that can be parsed by Cheerio.
 *
 * Side effects: performs a network request.
 *
 * @param url Page URL to fetch.
 * @returns Parsed document and the original URL.
 */
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

/**
 * Locate the first table under a given H3 section and return its row elements.
 *
 * Assumptions: Section headings use `h3 > span.mw-headline` and tables follow the heading.
 *
 * Side effects: none.
 *
 * @param $ Cheerio API bound to the target document.
 * @param sectionHeading Heading text to match exactly after trimming.
 * @returns Array of row elements from the first matching table, or empty when not found.
 */
export function findSectionTableRows(
  $: CheerioAPI,
  sectionHeading: string,
): Element[] {
  const headingSpan = $("h3 > span.mw-headline, h2 > span.mw-headline")
    .filter((_, span) => $(span).text().trim() === sectionHeading)
    .first();

  if (headingSpan.length === 0) {
    return [];
  }

  const tableBody = headingSpan.closest("h3, h2").nextAll("table").first().find("tbody").first();
  if (tableBody.length === 0) {
    return [];
  }

  return tableBody.find("tr").toArray();
}
