import {EntityType} from "../../lib/types";

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
