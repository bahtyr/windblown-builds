import {EntityType} from "../../lib/types";
import {type Gear, type GearCollectionEditorRow} from "./gear-types";

export const GEAR_TYPE_ORDER: EntityType[] = ["gifts", "hexes", "weapons", "trinkets", "magifishes", "boosts", "effects"];
export const SUPPORTED_GEAR_ENTITY_TYPES: ReadonlyArray<Exclude<EntityType, "effects">> = [
  "gifts",
  "hexes",
  "weapons",
  "trinkets",
  "magifishes",
  "boosts",
];

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
