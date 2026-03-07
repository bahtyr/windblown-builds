export type EntityType = "gifts" | "weapons" | "trinkets" | "magifishes" | "hexes" | "boosts" | "effects";

export interface RichTextBaseNode {
  key: "text" | "entity";
  newLine?: boolean;
  bold?: boolean;
  italic?: boolean;
  color?: string;
}

export interface RichTextTextNode extends RichTextBaseNode {
  key: "text";
  text: string;
}

export interface RichTextEntityNode extends RichTextBaseNode {
  key: "entity";
  text: string;
  id?: string;
  href?: string;
  image?: string;
}

export type RichDescriptionNode = RichTextTextNode | RichTextEntityNode;

export interface ScrapedEntity {
  image: string;
  name: string;
  nameColor?: string;
  description: string;
  richDescription: RichDescriptionNode[];
  category?: string;
  baseDamage?: string;
  damageType?: string;
  cooldown?: string;
  alterattackBonus?: string;
  unlockCost?: string;
  unlockRequirement?: string;
}
