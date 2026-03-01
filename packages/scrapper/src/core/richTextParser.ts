import {Cheerio, CheerioAPI, load} from "cheerio";
import {Element, Node} from "domhandler";
import {RichDescriptionNode, RichTextEntityNode, RichTextTextNode} from "../pages/types.js";
import {
  getColor,
  hasBoldStyle,
  isBold,
  isTextNode,
  isTooltip,
  isTooltipText,
  mergeNeighborTextTokens,
  normalizeWhitespace,
  normalizeUrl,
  deriveEntityId,
} from "./richTextParser.helpers.js";

// Constants

const NUMBER_PATTERN = /^[+-]?\d+(?:\.\d+)?$/;

// Public API

/**
 * Parse a rich HTML fragment into a normalized list of description tokens.
 *
 * Assumptions: `html` is a fragment intended to be wrapped in a single <body>
 *
 * Side effects: none.
 *
 * @param html HTML fragment to parse as <body> contents.
 * @returns Ordered list of parsed tokens with merged adjacent text entries.
 */
export function parseRichDescription(html: string): RichDescriptionNode[] {
  const root = load(`<body>${html}</body>`);
  const tokens: RichDescriptionNode[] = [];

  root("body")
    .contents()
    .each((_, node) => parseNode(root, node, tokens, false, undefined));

  return mergeNeighborTextTokens(tokens);
}

// Parsing helpers

/**
 * Recursively traverse a node and append parsed tokens to the output array.
 *
 * Assumptions: `tokens` is mutable and shared across the traversal.
 *
 * Side effects: mutates `tokens` by appending parsed tokens.
 *
 * @param $ Cheerio API bound to the same document as `node`.
 * @param node DOM node to parse.
 * @param tokens Accumulator array for parsed tokens.
 * @param boldContext Whether surrounding context should mark text as bold.
 * @param colorContext Whether surrounding context should color text.
 * @returns Nothing; results are appended to `tokens`.
 */
function parseNode(
  $: CheerioAPI,
  node: Node,
  tokens: RichDescriptionNode[],
  boldContext: boolean,
  colorContext: string | undefined,
): void {
  if (isTextNode(node)) {
    const text = normalizeWhitespace(node.data);
    if (text.trim().length > 0) {
      const token: RichTextTextNode = {
        key: "text",
        text,
        ...(boldContext ? {bold: true} : {}),
        ...(colorContext ? {color: colorContext} : {}),
      };
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
  const style = wrapped.attr("style");
  const elementColor = getColor(style);
  const elementBold = hasBoldStyle(style);
  const nextColorContext = elementColor ?? colorContext;
  const nextBoldContext = boldContext || elementBold || tag === "strong";

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
    if (!parseNumberMaybe(wrapped, tokens, nextColorContext)) {
      wrapped.contents().each((_, child) => parseNode($, child, tokens, true, nextColorContext));
    }
    return;
  }

  wrapped.contents().each((_, child) => parseNode($, child, tokens, nextBoldContext, nextColorContext));
}

/**
 * Build a rich entity token from a tooltip container.
 *
 * Example: A tooltip containing <b><a><span>Entity</span></a></b> yields a token named "Entity".
 *
 * Assumptions: Tooltip markup follows the expected anchor/span structure.
 *
 * Side effects: none.
 *
 * @param $ Cheerio API bound to the same document as `tooltip`.
 * @param tooltip Tooltip element wrapper.
 * @returns Entity token when valid data is present, otherwise null.
 */
function parseEntity($: CheerioAPI, tooltip: Cheerio<Element>): RichTextEntityNode | null {
  const link = tooltip.find("a[href]").first();
  if (link.length === 0) {
    return null;
  }

  const hrefRaw = link.attr("href");
  if (hrefRaw === undefined) {
    return null;
  }

  const href = normalizeUrl(hrefRaw.trim());
  const image = normalizeUrl(tooltip.find("img[src]").first().attr("src")?.trim());
  const id = deriveEntityId(href);

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
    // allowed
  }

  const color =
    nameSpan.length > 0
      ? getColor(nameSpan.attr("style"))
      : undefined;

  const bold = tooltip.find("b").length > 0;

  return {
    key: "entity",
    text: name,
    ...(href !== undefined ? {href} : {}),
    ...(id ? {id} : {}),
    ...(image !== undefined ? {image: image} : {}),
    ...(color ? {color} : {}),
    ...(bold ? {bold: true} : {}),
  };
}

/**
 * Parse a bold span as a numeric text token when it matches a number pattern.
 *
 * Example: <b><span style="color: blue">12</span></b> yields a bold text token "12".
 *
 * Assumptions: Numeric values are contained in the first <span> under the bold element.
 *
 * Side effects: may append a token to `tokens`.
 *
 * @param boldElement Bold element wrapper to inspect.
 * @param tokens Accumulator array for parsed tokens.
 * @returns True when a numeric token is appended; otherwise false.
 */
function parseNumberMaybe(
  boldElement: Cheerio<Element>,
  tokens: RichDescriptionNode[],
  colorContext: string | undefined,
): boolean {
  const span = boldElement.find("span").first();
  if (span.length === 0) {
    return false;
  }

  const value = span.text().trim();
  if (!NUMBER_PATTERN.test(value)) {
    return false;
  }

  const color = getColor(span.attr("style")) ?? colorContext;
  tokens.push({key: "text", text: value, bold: true, ...(color ? {color} : {})});
  return true;
}