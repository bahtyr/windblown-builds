import {type DeckItem, type SavedDeck} from "../../components/deck/DeckContext";
import {type EntityType} from "../../lib/types";
import {isGiftMatch, type GiftMatchSquareResult, type GiftMatchTemplateScore} from "./gift-match-workflow";

export type MatchedDeckItem = {
  id: string;
  type: Exclude<EntityType, "effects">;
  name: string;
  image?: string;
};

export type FailedSquareCandidate = {
  id: string;
  type: Exclude<EntityType, "effects">;
  name: string;
  image?: string;
};

/**
 * Builds unique deck items from successful match results.
 *
 * @param {GiftMatchSquareResult[]} squareResults - Workflow results for every detected square.
 * @returns {MatchedDeckItem[]} Unique matched items ordered by first successful match.
 */
export function buildDetectedDeckItems(squareResults: GiftMatchSquareResult[]): MatchedDeckItem[] {
  const uniqueItems = new Map<string, MatchedDeckItem>();

  for (const square of squareResults) {
    const item = buildDeckItemFromTemplate(square.bestTemplate);
    if (item && isGiftMatch(square.bestTemplate?.score ?? 0) && !uniqueItems.has(item.id)) {
      uniqueItems.set(item.id, item);
    }
  }

  return [...uniqueItems.values()];
}

/**
 * Collects unique alternate candidates for squares that did not meet the match threshold.
 *
 * @param {GiftMatchSquareResult[]} squareResults - Workflow results for every detected square.
 * @returns {FailedSquareCandidate[]} Candidate groups for failed squares.
 */
export function buildFailedSquareCandidates(squareResults: GiftMatchSquareResult[]): FailedSquareCandidate[] {
  const foundIds = new Set(buildDetectedDeckItems(squareResults).map((item) => item.id));
  const uniqueCandidates = new Map<string, FailedSquareCandidate>();

  for (const square of squareResults) {
    if (isGiftMatch(square.bestTemplate?.score ?? 0)) {
      continue;
    }

    for (const candidate of dedupeMatchedItems(square.topTemplates.map((template) => buildDeckItemFromTemplate(template)))) {
      if (candidate.type !== "gifts" && !foundIds.has(candidate.id) && !uniqueCandidates.has(candidate.id)) {
        uniqueCandidates.set(candidate.id, candidate);
      }
    }
  }

  return [...uniqueCandidates.values()].sort(compareMatchedDeckItems);
}

/**
 * Stores an externally generated build into the saved library.
 *
 * @param {SavedDeck[]} existing - Existing saved build library.
 * @param {string} desiredName - User-entered or generated build name.
 * @param {DeckItem[]} items - Items that should be saved into the build.
 * @param {() => string} [createTimestamp] - Timestamp factory used for persistence and tests.
 * @returns {{saved: SavedDeck[]; savedDeck: SavedDeck}} Updated saved decks plus the created saved deck.
 */
export function saveExternalDeck(
  existing: SavedDeck[],
  desiredName: string,
  items: DeckItem[],
  createTimestamp: () => string = () => new Date().toISOString(),
): { saved: SavedDeck[]; savedDeck: SavedDeck } {
  const normalizedDesiredName = normalizeDeckName(desiredName);
  const targetName = ensureUniqueDeckName(existing, normalizedDesiredName);
  const savedDeck = {
    name: targetName,
    items,
    createdAt: createTimestamp(),
  };

  return {
    saved: [...existing, savedDeck],
    savedDeck,
  };
}

/**
 * Creates the default detected-run name shown when the dialog opens.
 *
 * @param {Date} [now] - Current time used for the generated label.
 * @returns {string} Default run name for the upload flow.
 */
export function buildDetectedRunName(now: Date = new Date()): string {
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  const hours = `${now.getHours()}`.padStart(2, "0");
  const minutes = `${now.getMinutes()}`.padStart(2, "0");

  return `Run ${month}${day}-${hours}${minutes}`;
}

function buildDeckItemFromTemplate(template: GiftMatchTemplateScore | null | undefined): MatchedDeckItem | null {
  if (!template) {
    return null;
  }

  const type = extractEntityTypeFromPath(template.path);
  if (!type || type === "boosts") {
    return null;
  }

  return {
    id: `${type}:${template.name}`,
    type,
    name: template.name,
    image: template.path,
  };
}

function dedupeMatchedItems(items: Array<MatchedDeckItem | null>): MatchedDeckItem[] {
  const uniqueItems = new Map<string, MatchedDeckItem>();

  for (const item of items) {
    if (item && !uniqueItems.has(item.id)) {
      uniqueItems.set(item.id, item);
    }
  }

  return [...uniqueItems.values()];
}

function extractEntityTypeFromPath(imagePath: string): Exclude<EntityType, "effects"> | null {
  const pathParts = imagePath.split("/");
  const type = pathParts[2];

  if (type === "gifts" || type === "weapons" || type === "trinkets" || type === "magifishes" || type === "hexes" || type === "boosts") {
    return type;
  }

  return null;
}

function ensureUniqueDeckName(existing: SavedDeck[], desiredName: string): string {
  if (!existing.some((deck) => deck.name === desiredName)) {
    return desiredName;
  }

  let suffix = 2;
  while (existing.some((deck) => deck.name === `${desiredName} ${suffix}`)) {
    suffix += 1;
  }

  return `${desiredName} ${suffix}`;
}

function normalizeDeckName(value?: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "Untitled deck";
}

function compareMatchedDeckItems(left: MatchedDeckItem, right: MatchedDeckItem): number {
  const typeOrder = compareTypeOrder(left.type, right.type);
  if (typeOrder !== 0) {
    return typeOrder;
  }

  return left.name.localeCompare(right.name);
}

function compareTypeOrder(left: Exclude<EntityType, "effects">, right: Exclude<EntityType, "effects">): number {
  return getTypeOrder(left) - getTypeOrder(right);
}

function getTypeOrder(type: Exclude<EntityType, "effects">): number {
  switch (type) {
    case "weapons":
      return 0;
    case "trinkets":
      return 1;
    case "magifishes":
      return 2;
    case "hexes":
      return 3;
    case "boosts":
      return 4;
    case "gifts":
      return 5;
  }
}
