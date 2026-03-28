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
  video?: string;
  richDescription: RichDescriptionNode[];
}

export interface Gift extends ScrapedEntity {
  category: string;
}

export interface Effect extends ScrapedEntity {
  category: string;
  advancedDescription: string;
  richAdvancedDescription: RichDescriptionNode[];
  notes: string;
  richNotes: RichDescriptionNode[];
}

export interface Boost extends ScrapedEntity {
  healthBonus?: string;
}

export interface Hex extends ScrapedEntity {
}

export interface Magifish extends ScrapedEntity {
}

export interface Trinket extends ScrapedEntity {
  baseDamage: string;
  damageType: string;
  cooldown: string;
}

export interface Weapon extends ScrapedEntity {
  baseDamage: string;
  damageType: string;
  alterattackBonus: string;
}
