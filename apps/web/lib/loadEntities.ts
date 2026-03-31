import {EntityType, ScrapedEntity} from "./types";

const FILES: Record<EntityType, string> = {
  gifts: "/gifts.json",
  weapons: "/weapons.json",
  trinkets: "/trinkets.json",
  magifishes: "/magifishes.json",
  hexes: "/hexes.json",
  boosts: "/boosts.json",
  effects: "/effects.json",
};

export const ENTITY_TYPES = Object.keys(FILES) as EntityType[];

const entityCache = new Map<EntityType, Promise<ScrapedEntity[]>>();

/**
 * Load one entity dataset with in-memory promise caching.
 *
 * @param {EntityType} type - Entity type dataset to load.
 * @returns {Promise<ScrapedEntity[]>} Parsed entities for that type.
 */
export async function loadEntities(type: EntityType): Promise<ScrapedEntity[]> {
  const cached = entityCache.get(type);
  if (cached) return cached;

  const path = FILES[type];
  if (!path) return [];

  const request = fetch(path, {cache: "force-cache"})
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Failed to load ${type}: ${res.status}`);
      }
      return (await res.json()) as ScrapedEntity[];
    })
    .catch((error) => {
      entityCache.delete(type);
      throw error;
    });

  entityCache.set(type, request);
  return request;
}

/**
 * Load every entity dataset while reusing the per-type cache.
 *
 * @returns {Promise<readonly [EntityType, ScrapedEntity[]][]>} Entity datasets by type.
 */
export function loadAllEntities(): Promise<readonly [EntityType, ScrapedEntity[]][]> {
  return Promise.all(ENTITY_TYPES.map(async (entityType) => [entityType, await loadEntities(entityType)] as const));
}
