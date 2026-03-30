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
  squareIndex: number;
  bounds: GiftMatchSquareResult["bounds"];
  candidates: MatchedDeckItem[];
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
 * Collects alternate candidates for squares that did not meet the match threshold.
 *
 * @param {GiftMatchSquareResult[]} squareResults - Workflow results for every detected square.
 * @returns {FailedSquareCandidate[]} Candidate groups for failed squares.
 */
export function buildFailedSquareCandidates(squareResults: GiftMatchSquareResult[]): FailedSquareCandidate[] {
  return squareResults
    .filter((square) => !isGiftMatch(square.bestTemplate?.score ?? 0))
    .map((square) => ({
      squareIndex: square.index,
      bounds: square.bounds,
      candidates: dedupeMatchedItems(square.topTemplates.map((template) => buildDeckItemFromTemplate(template))),
    }))
    .filter((square) => square.candidates.length > 0);
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

  return `Detected Run ${month}${day}-${hours}${minutes}`;
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
