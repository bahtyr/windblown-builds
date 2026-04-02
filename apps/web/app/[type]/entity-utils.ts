import {type GearLimits} from "../../components/gear/gear-types";
import {EntityType, ScrapedEntity} from "../../lib/types";

export type MatchDisplayMode = "fade-unmatched" | "show-matches-only";
export type PersistedFilters = {
  search: string;
  selectedEntity: string;
  likedOnly: boolean;
  deckOnly: boolean;
  matchDisplayMode: MatchDisplayMode;
};

export const FILTERS_STORAGE_KEY = "entityFilters.v1";

export const VALID_TYPES: (EntityType | "all")[] = ["all", "gifts", "weapons", "trinkets", "magifishes", "hexes", "boosts", "effects"];

export const DEFAULT_LIMITS: GearLimits = {
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

/**
 * Resolve embedded browser defaults for build-edit sessions.
 *
 * @param {boolean} isEditingBuild - Whether the builder is editing an existing build.
 * @returns {{deckOnly: boolean; matchDisplayMode: MatchDisplayMode}} Embedded filter defaults.
 */
export function resolveEmbeddedBrowserFilters(isEditingBuild: boolean): {
  deckOnly: boolean;
  matchDisplayMode: MatchDisplayMode;
} {
  return {
    deckOnly: isEditingBuild,
    matchDisplayMode: isEditingBuild ? "show-matches-only" : "fade-unmatched",
  };
}

/**
 * Parse persisted filter JSON while validating known keys and value types.
 *
 * @param {string | null} raw - Serialized persisted filter payload.
 * @returns {Partial<PersistedFilters>} Valid filter fields found in storage.
 */
export function parsePersistedFilters(raw: string | null): Partial<PersistedFilters> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next: Partial<PersistedFilters> = {};
    if (typeof parsed.search === "string") next.search = parsed.search;
    if (typeof parsed.selectedEntity === "string") next.selectedEntity = parsed.selectedEntity;
    if (typeof parsed.likedOnly === "boolean") next.likedOnly = parsed.likedOnly;
    if (typeof parsed.deckOnly === "boolean") next.deckOnly = parsed.deckOnly;
    if (parsed.matchDisplayMode === "fade-unmatched" || parsed.matchDisplayMode === "show-matches-only") {
      next.matchDisplayMode = parsed.matchDisplayMode;
    }
    return next;
  } catch {
    return {};
  }
}
