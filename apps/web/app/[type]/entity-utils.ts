import {DeckLimits} from "../../components/deck/DeckContext";
import {EntityType, ScrapedEntity} from "../../lib/types";

export type MatchDisplayMode = "fade-unmatched" | "show-matches-only";

export const VALID_TYPES: (EntityType | "all")[] = ["all", "gifts", "weapons", "trinkets", "hexes", "magifishes", "effects"];

export const DEFAULT_LIMITS: DeckLimits = {
  gifts: 20,
  hexes: 3,
  magifishes: 1,
  weapons: 2,
  trinkets: 2,
};

/**
 * Resolve the requested entity type from dynamic route params.
 *
 * @param {Promise<Record<string, string>> | Record<string, string> | undefined} params - Route params, possibly a promise.
 * @returns {EntityType | "all"} Validated entity type, defaulting to "gifts".
 */
export function resolveType(
  params?: Promise<Record<string, string>> | Record<string, string>,
): EntityType | "all" {
  const rawParams = ((params as any)?.then ? undefined : params) || (params as any) || {};
  const requested = rawParams.type;
  const isValid = typeof requested === "string" && (VALID_TYPES as readonly string[]).includes(requested);
  return isValid ? (requested as EntityType | "all") : "gifts";
}

/**
 * Group entities by a resolved section key while preserving input order.
 *
 * @param {T[]} list - Entities to group.
 * @param {(item: T) => string} getKey - Key resolver used to bucket items.
 * @returns {[string, T[]][]} Tuple of category and entities.
 */
export function groupByCategory<T extends ScrapedEntity>(list: T[], getKey: (item: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of list) {
    const key = getKey(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return [...map.entries()];
}

/**
 * Collect inline entity ids from an entity's rich description.
 *
 * @param {ScrapedEntity} item - Entity to inspect.
 * @returns {string[]} Entity ids found in hrefs.
 */
export function entityIds(item: ScrapedEntity): string[] {
  const ids: string[] = [];
  for (const part of item.richDescription || []) {
    if (part.key !== "entity") continue;
    const href = part.href || "";
    const norm = href.split("?")[0];
    if (norm) ids.push(norm);
  }
  return ids;
}

/**
 * Resolve which items should be rendered for the current match display mode.
 *
 * @param {T[]} allItems - Full section list.
 * @param {T[]} matchedItems - Filtered matches for that section.
 * @param {MatchDisplayMode} mode - Rendering mode for unmatched entries.
 * @returns {T[]} Items that should be rendered in the section.
 */
export function getVisibleItems<T extends ScrapedEntity>(
  allItems: T[],
  matchedItems: T[],
  mode: MatchDisplayMode,
): T[] {
  return mode === "show-matches-only" ? matchedItems : allItems;
}
