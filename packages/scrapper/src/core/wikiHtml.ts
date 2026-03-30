import { CheerioAPI, load } from "cheerio";
import { Element } from "domhandler";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {normalizeUrl} from "./richTextParser.helpers.js";

const execFileAsync = promisify(execFile);

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
  const html = await loadWikiHtml(buildRenderUrl(url));
  return { $: load(html), url };
}

/**
 * Fetch an entity wiki page and collect all embedded video asset URLs.
 *
 * @param {string | undefined} url - Entity page URL.
 * @returns {Promise<string[]>} Normalized video asset URLs in page order.
 */
export async function fetchWikiVideoUrls(url: string | undefined): Promise<string[]> {
  if (!url) return [];
  const renderUrl = buildRenderUrl(url);
  const html = await loadWikiHtml(renderUrl);
  const videos = extractWikiVideoUrls(html);
  if (videos.length > 0) {
    return videos;
  }

  return extractWikiVideoUrls(await loadWikiHtmlWithCurl(renderUrl));
}

/**
 * Extract normalized video URLs from wiki entity page HTML.
 *
 * @param {string} html - Raw wiki page HTML.
 * @returns {string[]} Unique normalized video URLs.
 */
export function extractWikiVideoUrls(html: string): string[] {
  const $ = load(html);
  const urls = new Set<string>();

  $(".druid-main-image video source, .druid-main-image video, .druid-main-images video source, .druid-main-images video").each((_, element) => {
    const source = normalizeUrl($(element).attr("src")?.trim());
    if (source) {
      urls.add(source.split("?")[0]);
    }
  });

  return Array.from(urls);
}

async function loadWikiHtml(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "windblown-scraper/1.0 (+https://github.com/)"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to load ${url}: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    const html = await loadWikiHtmlWithCurl(url).catch(() => null);
    if (html !== null) {
      return html;
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(`Failed to load ${url}`);
  }
}

async function loadWikiHtmlWithCurl(url: string): Promise<string> {
  const {stdout} = await execFileAsync("curl.exe", ["-L", "--silent", url], {
    maxBuffer: 20 * 1024 * 1024,
  });

  if (!stdout.trim()) {
    throw new Error(`curl returned empty html for ${url}`);
  }

  return stdout;
}

function buildRenderUrl(url: string): string {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set("action", "render");
  return nextUrl.toString();
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
