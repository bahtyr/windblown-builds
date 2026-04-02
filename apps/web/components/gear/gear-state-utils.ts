import {loadEntities} from "../../lib/loadEntities";
import {EntityType, ScrapedEntity} from "../../lib/types";
import {type GearCollectionSnapshot, type Gear} from "./gear-types";

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
