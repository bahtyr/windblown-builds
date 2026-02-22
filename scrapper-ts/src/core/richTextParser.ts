import {Cheerio, CheerioAPI, load} from "cheerio";
import {Element, Node} from "domhandler";
import {RichDescriptionNode, RichTextEntityNode, RichTextTextNode} from "../pages/types.js";
import {
  attrOrUndefined,
  getColor,
  isBold,
  isTextNode,
  isTooltip,
  isTooltipText,
  mergeNeighborTextTokens,
  normalizeWhitespace
} from "./richTextParser.helpers.js";

// Constants

const NUMBER_PATTERN = /^[+-]?\d+(?:\.\d+)?$/;

// Public API

/**
 * Parse a rich HTML fragment into a normalized list of description tokens.
 * @param $ Cheerio API instance (not used by this function).
 * @param html HTML fragment to parse as <body> contents.
 * @returns Ordered list of parsed tokens with merged adjacent text entries.
 * Assumptions: `html` is a fragment intended to be wrapped in a single <body>; `$` may be any Cheerio API.
 * Side effects: none.
 */
export function parseRichDescription($: CheerioAPI, html: string): RichDescriptionNode[] {
  void $;
  const root = load(`<body>${html}</body>`);
  const tokens: RichDescriptionNode[] = [];

  root("body")
    .contents()
    .each((_, node) => parseNode(root, node, tokens, false));

  return mergeNeighborTextTokens(tokens);
}

// Parsing helpers

/**
 * Recursively traverse a node and append parsed tokens to the output array.
 * @param $ Cheerio API bound to the same document as `node`.
 * @param node DOM node to parse.
 * @param tokens Accumulator array for parsed tokens.
 * @param boldContext Whether surrounding context should mark text as bold.
 * @returns Nothing; results are appended to `tokens`.
 * Assumptions: `tokens` is mutable and shared across the traversal.
 * Side effects: mutates `tokens` by appending parsed tokens.
 */
function parseNode(
  $: CheerioAPI,
  node: Node,
  tokens: RichDescriptionNode[],
  boldContext: boolean,
): void {
  if (isTextNode(node)) {
    const text = normalizeWhitespace(node.data);
    if (text.trim().length > 0) {
      const token: RichTextTextNode = {key: "text", text, ...(boldContext ? {bold: true} : {})};
      tokens.push(token);
    }
    return;
  }

  // Only element nodes can contain nested structure that affects parsing.
  if (node.type !== "tag") {
    return;
  }

  const element = node as Element;
  const tag = element.tagName;
  const wrapped = $(element);

  // Tooltip containers are parsed into a single entity token.
  if (isTooltip(tag, wrapped)) {
    const entity = parseEntity($, wrapped);
    if (entity) {
      tokens.push(entity);
    }
    return;
  }

  // Tooltip text is nested metadata that should not surface as tokens.
  if (isTooltipText(wrapped)) {
    return;
  }

  if (isBold(tag)) {
    // Bold wrappers may represent numeric values that should be emitted as text.
    if (!parseNumberMaybe($, wrapped, tokens)) {
      wrapped.contents().each((_, child) => parseNode($, child, tokens, true));
    }
    return;
  }

  const nextBoldContext = boldContext || tag === "strong";
  wrapped.contents().each((_, child) => parseNode($, child, tokens, nextBoldContext));
}

/**
 * Build a rich entity token from a tooltip container.
 * @param $ Cheerio API bound to the same document as `tooltip`.
 * @param tooltip Tooltip element wrapper.
 * @returns Entity token when valid data is present, otherwise null.
 * Assumptions: Tooltip markup follows the expected anchor/span structure.
 * Side effects: none.
 * Example: A tooltip containing <b><a><span>Entity</span></a></b> yields a token named "Entity".
 */
function parseEntity($: CheerioAPI, tooltip: Cheerio<Element>): RichTextEntityNode | null {
  const link = tooltip.find("a[href]").first();
  if (link.length === 0) {
    return null;
  }

  const href = attrOrUndefined(link.attr("href"));
  const icon = attrOrUndefined(tooltip.find("img[src]").first().attr("src"));

  const nameSpan = tooltip.find("b a span").first();
  const nameLink = tooltip.find("b a").first();
  const fallback = link.text().trim();

  // Prefer the most specific name source, falling back to the link text.
  const name =
    nameSpan.length > 0
      ? nameSpan.text().trim()
      : nameLink.length > 0
        ? nameLink.text().trim()
        : fallback;

  if (name.length === 0) {
    return null;
  }

  const color =
    nameSpan.length > 0
      ? getColor(nameSpan.attr("style"))
      : undefined;

  const bold = tooltip.find("b").length > 0;

  return {
    key: "entity",
    text: name,
    ...(href ? {href} : {}),
    ...(icon ? {icon} : {}),
    ...(color ? {color} : {}),
    ...(bold ? {bold: true} : {}),
  };
}

/**
 * Parse a bold span as a numeric text token when it matches a number pattern.
 * @param $ Cheerio API bound to the same document as `boldElement`.
 * @param boldElement Bold element wrapper to inspect.
 * @param tokens Accumulator array for parsed tokens.
 * @returns True when a numeric token is appended; otherwise false.
 * Assumptions: Numeric values are contained in the first <span> under the bold element.
 * Side effects: may append a token to `tokens`.
 * Example: <b><span style="color: red">12</span></b> yields a bold text token "12".
 */
function parseNumberMaybe(
  $: CheerioAPI,
  boldElement: Cheerio<Element>,
  tokens: RichDescriptionNode[],
): boolean {
  const span = boldElement.find("span").first();
  if (span.length === 0) {
    return false;
  }

  const value = span.text().trim();
  if (!NUMBER_PATTERN.test(value)) {
    return false;
  }

  const color = getColor(span.attr("style"));
  tokens.push({key: "text", text: value, bold: true, ...(color ? {color} : {})});
  return true;
}
