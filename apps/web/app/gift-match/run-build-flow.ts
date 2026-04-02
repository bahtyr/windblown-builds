import {type SavedDeck} from "../../components/deck/DeckContext";
import {
  buildMatchedGears,
  buildFailedGearCandidates,
  type FailedGearCandidate,
  type MatchedGear,
} from "../../components/gear/gear-detection";
import {type Gear} from "../../components/gear/gear-types";

export type MatchedDeckItem = MatchedGear;
export type FailedSquareCandidate = FailedGearCandidate;

export const buildMatchedDeckItems = buildMatchedGears;
export const buildFailedSquareCandidates = buildFailedGearCandidates;

/**
 * Stores an externally generated build into the saved library.
 *
 * @param {SavedDeck[]} existing - Existing saved build library.
 * @param {string} desiredName - User-entered or generated build name.
 * @param {Gear[]} items - Items that should be saved into the build.
 * @param {() => string} [createTimestamp] - Timestamp factory used for persistence and tests.
 * @returns {{saved: SavedDeck[]; savedDeck: SavedDeck}} Updated saved decks plus the created saved deck.
 */
export function saveExternalDeck(
  existing: SavedDeck[],
  desiredName: string,
  items: Gear[],
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
  const rounded = new Date(now);
  if (rounded.getSeconds() >= 30 || rounded.getMilliseconds() >= 500) {
    rounded.setMinutes(rounded.getMinutes() + 1);
  }
  rounded.setSeconds(0, 0);

  const weekday = new Intl.DateTimeFormat("en-US", {weekday: "long"}).format(rounded);
  const hours = `${rounded.getHours()}`.padStart(2, "0");
  const minutes = `${rounded.getMinutes()}`.padStart(2, "0");

  return `${weekday} ${hours}:${minutes}`;
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
