import {Cheerio, CheerioAPI, load} from "cheerio";
import {Element, Node, Text} from "domhandler";
import {RichDescriptionNode, RichTextEntityNode, RichTextTextNode} from "../pages/types.js";

export function isTooltip(element: Cheerio<Element>, tagName: string): boolean {
  return tagName === "span" && element.hasClass("tooltip");
}

export function isTooltipText(element: Cheerio<Element>): boolean {
  return element.hasClass("tooltiptext");
}

export function isBold(tagName: string): boolean {
  return tagName === "b";
}

export function isTextNode(node: Node): node is Text {
  return node.type === "text";
}

/**
 * Parse a style declaration string for a text color value.
 */
export function getColor(style: string | undefined): string | undefined {
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

export function normalizeWhitespace(raw: string): string {
  return raw.replace(/\s+/g, " ");
}

/**
 * Merge adjacent text tokens that share the same formatting.
 */
export function mergeNeighborTextTokens(tokens: RichDescriptionNode[]): RichDescriptionNode[] {
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
export function attrOrUndefined(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}