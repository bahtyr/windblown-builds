import {EntityType, ScrapedEntity} from "../../lib/types";
import {SUPPORTED_GEAR_ENTITY_TYPES} from "./gear-order";
import {type Gear} from "./gear-types";

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
 * Parses a supported entity type from a shared asset path using the current asset folder layout.
 *
 * @param {string} imagePath - Entity image path.
 * @returns {Exclude<EntityType, "effects"> | null} Parsed entity type, or null when unsupported.
 */
export function extractEntityTypeFromAssetPath(imagePath: string): Exclude<EntityType, "effects"> | null {
  const pathParts = imagePath.split("/");
  const type = pathParts[2];

  return isSupportedGearEntityType(type) ? type : null;
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
    if (!isSupportedGearEntityType(type) || !nameEncoded) continue;
    const name = decodeURIComponent(nameEncoded);
    items.push({type, name, id: gearId(type, name)});
  }
  return items;
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

function isSupportedGearEntityType(value: unknown): value is Exclude<EntityType, "effects"> {
  return typeof value === "string" && SUPPORTED_GEAR_ENTITY_TYPES.includes(value as Exclude<EntityType, "effects">);
}
