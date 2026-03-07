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

export async function loadEntities(type: EntityType): Promise<ScrapedEntity[]> {
  const path = FILES[type];
  if (!path) return [];
  const res = await fetch(path, {cache: "no-store"});
  if (!res.ok) {
    throw new Error(`Failed to load ${type}: ${res.status}`);
  }
  return (await res.json()) as ScrapedEntity[];
}
