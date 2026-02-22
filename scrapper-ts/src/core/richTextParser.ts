import {Cheerio, CheerioAPI, load} from "cheerio";
import {Element, Node, Text} from "domhandler";
import {RichDescriptionNode, RichTextEntityNode, RichTextTextNode} from "../pages/types.js";

// Constants

const NUMBER_PATTERN = /^[+-]?\d+(?:\.\d+)?$/;

// Public API

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

  if (node.type !== "tag") {
    return;
  }

  const element = node as Element;
  const tag = element.tagName;
  const wrapped = $(element);

  if (isTooltip(wrapped, tag)) {
    const entity = parseEntity($, wrapped);
    if (entity) {
      tokens.push(entity);
    }
    return;
  }

  if (isTooltipText(wrapped)) {
    return;
  }

  if (isBold(tag)) {
    if (!parseNumberMaybe($, wrapped, tokens)) {
      wrapped.contents().each((_, child) => parseNode($, child, tokens, true));
    }
    return;
  }

  const nextBoldContext = boldContext || tag === "strong";
  wrapped.contents().each((_, child) => parseNode($, child, tokens, nextBoldContext));
}

/**
 * Extract a tooltip entity from the given wrapper, if present.
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
 * Parse bold numeric spans to preserve numeric emphasis and color.
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

// DOM helpers

function isTooltip(element: Cheerio<Element>, tagName: string): boolean {
  return tagName === "span" && element.hasClass("tooltip");
}

function isTooltipText(element: Cheerio<Element>): boolean {
  return element.hasClass("tooltiptext");
}

function isBold(tagName: string): boolean {
  return tagName === "b";
}

function isTextNode(node: Node): node is Text {
  return node.type === "text";
}

/**
 * Parse a style declaration string for a text color value.
 */
function getColor(style: string | undefined): string | undefined {
  if (!style) {
    return undefined;
  }

  for (const declaration of style.split(";")) {
    const [rawKey, rawValue] = declaration.split(":", 2);
    if (rawKey?.trim().toLowerCase() === "color" && rawValue?.trim()) {
      return rawValue.trim();
    }
  }

  return undefined;
}

// Token helpers

function normalizeWhitespace(raw: string): string {
  return raw.replace(/\s+/g, " ");
}

/**
 * Merge adjacent text tokens that share the same formatting.
 */
function mergeNeighborTextTokens(tokens: RichDescriptionNode[]): RichDescriptionNode[] {
  const merged: RichDescriptionNode[] = [];

  for (const token of tokens) {
    const previous = merged.at(-1);
    if (
      previous &&
      previous.key === "text" &&
      token.key === "text" &&
      (previous.bold ?? false) === (token.bold ?? false) &&
      (previous.color ?? "") === (token.color ?? "")
    ) {
      previous.text += token.text;
      continue;
    }

    merged.push(token);
  }

  return merged;
}

/**
 * Normalize empty or whitespace-only attribute values to undefined.
 */
function attrOrUndefined(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
