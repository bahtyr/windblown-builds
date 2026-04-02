import {loadEntities} from "../../lib/loadEntities";
import {EntityType, ScrapedEntity} from "../../lib/types";

export type Gear = {
  id: string;
  type: EntityType;
  name: string;
  image?: string;
};

export type GearLimits = Partial<Record<Exclude<EntityType, "effects">, number>>;

export type GearCollectionSnapshot = {
  items: Gear[];
  name: string;
  editingCollectionName: string | null;
};

export type GearCollectionEditorRow = {
  type: EntityType;
  list: Gear[];
};

export type GearCategorySummary = {
  count: number;
  itemIds: string[];
  name: string;
};

const GEAR_TYPE_ORDER: EntityType[] = ["gifts", "hexes", "weapons", "trinkets", "magifishes", "boosts", "effects"];

/**
 * Builds a stable gear identifier from the entity type and entity name.
 *
 * @param {EntityType} type - Entity type.
 * @param {string} name - Entity name.
 * @returns {string} Stable gear identifier.
 */
export function gearId(type: EntityType, name: string): string {
  return `${type}:${name}`;
}

/**
 * Converts a scraped entity into the shared gear payload.
 *
 * @param {EntityType} type - Entity type.
 * @param {ScrapedEntity} entity - Source entity.
 * @returns {Gear} Shared gear payload.
 */
export function makeGear(type: EntityType, entity: ScrapedEntity): Gear {
  return {type, name: entity.name, id: gearId(type, entity.name), image: entity.image};
}

/**
 * Parses a supported entity type from a shared gear asset path.
 *
 * @param {string} imagePath - Entity image path.
 * @returns {Exclude<EntityType, "effects"> | null} Parsed entity type, or null when unsupported.
 */
export function extractEntityTypeFromAssetPath(imagePath: string): Exclude<EntityType, "effects"> | null {
  const pathParts = imagePath.split("/");
  const type = pathParts[2];

  if (type === "gifts" || type === "weapons" || type === "trinkets" || type === "magifishes" || type === "hexes" || type === "boosts") {
    return type;
  }

  return null;
}

/**
 * Parses a serialized collection from URL params into shared gear items.
 *
 * @param {string} raw - Raw serialized collection string.
 * @returns {Gear[]} Parsed shared gear items.
 */
export function parseGearCollectionParam(raw: string): Gear[] {
  const parts = raw.split(",");
  const items: Gear[] = [];
  for (const part of parts) {
    const [type, nameEncoded] = part.split("|");
    if (!type || !nameEncoded) continue;
    if (!["gifts", "weapons", "trinkets", "magifishes", "hexes", "boosts"].includes(type)) continue;
    const name = decodeURIComponent(nameEncoded);
    items.push({type: type as EntityType, name, id: gearId(type as EntityType, name)});
  }
  return items;
}

/**
 * Fills missing gear images from the loaded entity catalog.
 *
 * @param {Gear[]} gears - Shared gears to hydrate.
 * @returns {Promise<Gear[]>} Hydrated gears, or the original array when nothing changes.
 */
export async function hydrateGears(gears: Gear[]): Promise<Gear[]> {
  const missingTypes = Array.from(new Set(gears.filter((item) => !item.image).map((item) => item.type)));
  if (missingTypes.length === 0) return gears;

  const fetched = new Map<EntityType, ScrapedEntity[]>();
  for (const type of missingTypes) {
    try {
      fetched.set(type, await loadEntities(type));
    } catch {
      // Keep existing items when an entity type fails to load.
    }
  }

  let changed = false;
  const nextItems = gears.map((item) => {
    if (item.image) return item;
    const match = fetched.get(item.type)?.find((entity) => entity.name === item.name);
    if (!match?.image) return item;
    changed = true;
    return {...item, image: match.image};
  });

  return changed ? nextItems : gears;
}

/**
 * Groups gear items by the canonical collection order while preserving within-type order.
 *
 * @param {Gear[]} items - Flat gear list.
 * @returns {Gear[]} Reordered gear list.
 */
export function groupGearsByType(items: Gear[]): Gear[] {
  const groupedItems = new Map<EntityType, Gear[]>();

  for (const item of items) {
    groupedItems.set(item.type, [...(groupedItems.get(item.type) ?? []), item]);
  }

  return GEAR_TYPE_ORDER.flatMap((type) => groupedItems.get(type) ?? []);
}

/**
 * Compares two shared gear types using the canonical collection ordering.
 *
 * @param {Exclude<EntityType, "effects">} left - Left gear type.
 * @param {Exclude<EntityType, "effects">} right - Right gear type.
 * @returns {number} Sort comparison result.
 */
export function compareTypeOrder(left: Exclude<EntityType, "effects">, right: Exclude<EntityType, "effects">): number {
  return getTypeOrder(left) - getTypeOrder(right);
}

/**
 * Resolves the canonical ordering index for a shared gear type.
 *
 * @param {Exclude<EntityType, "effects">} type - Gear type.
 * @returns {number} Stable ordering index.
 */
export function getTypeOrder(type: Exclude<EntityType, "effects">): number {
  return GEAR_TYPE_ORDER.indexOf(type);
}

/**
 * Inserts a gear item into the canonical collection order.
 *
 * @param {Gear[]} list - Existing ordered gear list.
 * @param {Gear} item - New gear item.
 * @returns {Gear[]} Ordered list with the inserted gear.
 */
export function insertGearByType(list: Gear[], item: Gear): Gear[] {
  const order = GEAR_TYPE_ORDER.indexOf(item.type);
  if (order === -1) return [...list, item];
  const next = [...list];
  let insertAt = next.length;
  for (let i = 0; i < next.length; i++) {
    const otherOrder = GEAR_TYPE_ORDER.indexOf(next[i].type);
    if (otherOrder > order) {
      insertAt = i;
      break;
    }
    if (otherOrder === order) {
      insertAt = i + 1;
    }
  }
  next.splice(insertAt, 0, item);
  return next;
}

/**
 * Reorders gear items within a single entity type group.
 *
 * @param {Gear[]} list - Existing ordered gear list.
 * @param {EntityType} type - Type group to reorder.
 * @param {number} from - Source index within the type group.
 * @param {number} to - Target index within the type group.
 * @returns {Gear[]} Reordered gear list.
 */
export function reorderGearsWithinType(list: Gear[], type: EntityType, from: number, to: number): Gear[] {
  const sameType = list.filter((item) => item.type === type);
  if (from < 0 || from >= sameType.length || to < 0 || to >= sameType.length) return list;
  const indices = list.map((item, idx) => (item.type === type ? idx : -1)).filter((idx) => idx !== -1);
  const globalFrom = indices[from];
  const globalTo = indices[to];
  const next = [...list];
  const [item] = next.splice(globalFrom, 1);
  next.splice(globalTo, 0, item);
  return next;
}

/**
 * Groups gears into the editor row layout used by the shared collection editor.
 *
 * @param {Gear[]} items - Flat gear collection items.
 * @returns {GearCollectionEditorRow[][]} Grouped row layout for the editor.
 */
export function groupGearsForEditorRows(items: Gear[]): GearCollectionEditorRow[][] {
  const group = (type: EntityType) => items.filter((item) => item.type === type);
  return [
    [{type: "gifts" as const, list: group("gifts")}],
    [
      {type: "hexes" as const, list: group("hexes")},
      {type: "weapons" as const, list: group("weapons")},
      {type: "trinkets" as const, list: group("trinkets")},
      {type: "magifishes" as const, list: group("magifishes")},
    ],
    [{type: "boosts" as const, list: group("boosts")}],
  ];
}

/**
 * Normalizes a collection name by trimming whitespace and applying a fallback.
 *
 * @param {string | undefined} value - Raw collection name.
 * @param {string} defaultName - Fallback name when the input is empty.
 * @returns {string} Normalized collection name.
 */
export function normalizeCollectionName(value: string | undefined, defaultName: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : defaultName;
}

/**
 * Aggregates gift items into preview category summaries without UI concerns.
 *
 * @param {Gear[]} items - Gear items shown in the preview.
 * @param {Map<string, string>} giftCategoryLookup - Gift item id to category.
 * @returns {GearCategorySummary[]} Visible category summaries.
 */
export function buildGearCategorySummaries(items: Gear[], giftCategoryLookup: Map<string, string>): GearCategorySummary[] {
  const categoryItems = new Map<string, string[]>();
  for (const item of items) {
    if (item.type !== "gifts") continue;
    const category = giftCategoryLookup.get(item.id);
    if (category) {
      categoryItems.set(category, [...(categoryItems.get(category) ?? []), item.id]);
    }
  }

  return Array.from(categoryItems.entries())
    .sort(([nameA, itemIdsA], [nameB, itemIdsB]) => {
      const countA = itemIdsA.length;
      const countB = itemIdsB.length;
      if (countB !== countA) return countB - countA;
      return nameA.localeCompare(nameB);
    })
    .map(([name, itemIds]) => ({
      count: itemIds.length,
      name,
      itemIds,
    }));
}

/**
 * Restores a captured collection snapshot, or falls back to an empty collection.
 *
 * @param {GearCollectionSnapshot | null} snapshot - Previously captured collection snapshot.
 * @param {string} defaultName - Fallback name for an empty collection.
 * @returns {GearCollectionSnapshot} Restored collection snapshot.
 */
export function restoreGearCollectionSnapshot(
  snapshot: GearCollectionSnapshot | null,
  defaultName: string,
): GearCollectionSnapshot {
  if (snapshot) return snapshot;
  return {
    items: [],
    name: defaultName,
    editingCollectionName: null,
  };
}
