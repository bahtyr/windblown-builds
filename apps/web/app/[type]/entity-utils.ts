import {DeckLimits} from "../../components/deck/DeckContext";
import {EntityType, ScrapedEntity} from "../../lib/types";

export type MatchDisplayMode = "fade-unmatched" | "show-matches-only";

export const VALID_TYPES: EntityType[] = ["gifts", "weapons", "trinkets", "hexes", "magifishes", "effects"];

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
 * @returns {EntityType} Validated entity type, defaulting to "gifts".
 */
export function resolveType(
  params?: Promise<Record<string, string>> | Record<string, string>,
): EntityType {
  const rawParams = ((params as any)?.then ? undefined : params) || (params as any) || {};
  const requested = rawParams.type;
  const isValid = typeof requested === "string" && (VALID_TYPES as readonly string[]).includes(requested);
  return isValid ? (requested as EntityType) : "gifts";
}

/**
 * Group scraped entities by their category, falling back to the capitalized type name.
 *
 * @param {ScrapedEntity[]} list - Entities to group.
 * @param {EntityType} type - Entity type used for fallback category names.
 * @returns {[string, ScrapedEntity[]][]} Tuple of category and entities.
 */
export function groupByCategory(list: ScrapedEntity[], type: EntityType): [string, ScrapedEntity[]][] {
  const map = new Map<string, ScrapedEntity[]>();
  for (const item of list) {
    const fallback = type.charAt(0).toUpperCase() + type.slice(1);
    const key = (item as any).category?.trim?.() || fallback;
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
 * @param {ScrapedEntity[]} allItems - Full section list.
 * @param {ScrapedEntity[]} matchedItems - Filtered matches for that section.
 * @param {MatchDisplayMode} mode - Rendering mode for unmatched entries.
 * @returns {ScrapedEntity[]} Items that should be rendered in the section.
 */
export function getVisibleItems(
  allItems: ScrapedEntity[],
  matchedItems: ScrapedEntity[],
  mode: MatchDisplayMode,
): ScrapedEntity[] {
  return mode === "show-matches-only" ? matchedItems : allItems;
}
