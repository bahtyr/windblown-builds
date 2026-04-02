import {type EntityType} from "../../lib/types";
import {isGiftMatch, type GiftMatchSquareResult, type GiftMatchTemplateScore} from "../../app/gift-match/gift-match-workflow";
import {compareTypeOrder, extractEntityTypeFromPath, type Gear} from "./gear-collection-utils";

export type MatchedGear = Gear & {
  type: Exclude<EntityType, "effects">;
};

export type FailedGearCandidate = MatchedGear;

/**
 * Builds unique gear items from successful match results.
 *
 * @param {GiftMatchSquareResult[]} squareResults - Workflow results for every detected square.
 * @returns {MatchedGear[]} Unique matched gears ordered by first successful match.
 */
export function buildDetectedGears(squareResults: GiftMatchSquareResult[]): MatchedGear[] {
  const uniqueItems = new Map<string, MatchedGear>();

  for (const square of squareResults) {
    const item = buildGearFromTemplate(square.bestTemplate);
    if (item && isGiftMatch(square.bestTemplate?.score ?? 0) && !uniqueItems.has(item.id)) {
      uniqueItems.set(item.id, item);
    }
  }

  return [...uniqueItems.values()];
}

/**
 * Builds a unique gear list from successful square matches for user-facing flows.
 *
 * @param {GiftMatchSquareResult[]} squareResults - Workflow results for every detected square.
 * @returns {MatchedGear[]} Unique matched gears ordered by first successful match.
 */
export function buildMatchedGears(squareResults: GiftMatchSquareResult[]): MatchedGear[] {
  return buildDetectedGears(squareResults);
}

/**
 * Collects unique alternate candidates for squares that did not meet the match threshold.
 *
 * @param {GiftMatchSquareResult[]} squareResults - Workflow results for every detected square.
 * @returns {FailedGearCandidate[]} Candidate groups for failed squares.
 */
export function buildFailedGearCandidates(squareResults: GiftMatchSquareResult[]): FailedGearCandidate[] {
  const foundIds = new Set(buildDetectedGears(squareResults).map((item) => item.id));
  const uniqueCandidates = new Map<string, FailedGearCandidate>();

  for (const square of squareResults) {
    if (isGiftMatch(square.bestTemplate?.score ?? 0)) {
      continue;
    }

    for (const candidate of dedupeMatchedGears(square.topTemplates.map((template) => buildGearFromTemplate(template)))) {
      if (candidate.type !== "gifts" && !foundIds.has(candidate.id) && !uniqueCandidates.has(candidate.id)) {
        uniqueCandidates.set(candidate.id, candidate);
      }
    }
  }

  return [...uniqueCandidates.values()].sort(compareMatchedGears);
}

/**
 * Converts a matched template into a shared gear payload.
 *
 * @param {GiftMatchTemplateScore | null | undefined} template - Template score result.
 * @returns {MatchedGear | null} Shared matched gear payload, or null when unsupported.
 */
export function buildGearFromTemplate(template: GiftMatchTemplateScore | null | undefined): MatchedGear | null {
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

/**
 * Removes duplicate matched gears while preserving first occurrence order.
 *
 * @param {Array<MatchedGear | null>} items - Potentially duplicated matched gears.
 * @returns {MatchedGear[]} Unique matched gears.
 */
export function dedupeMatchedGears(items: Array<MatchedGear | null>): MatchedGear[] {
  const uniqueItems = new Map<string, MatchedGear>();

  for (const item of items) {
    if (item && !uniqueItems.has(item.id)) {
      uniqueItems.set(item.id, item);
    }
  }

  return [...uniqueItems.values()];
}

/**
 * Compares matched gears using the current collection preview ordering.
 *
 * @param {MatchedGear} left - Left matched gear.
 * @param {MatchedGear} right - Right matched gear.
 * @returns {number} Sort comparison result.
 */
export function compareMatchedGears(left: MatchedGear, right: MatchedGear): number {
  const typeOrder = compareTypeOrder(left.type, right.type);
  if (typeOrder !== 0) {
    return typeOrder;
  }

  return left.name.localeCompare(right.name);
}
