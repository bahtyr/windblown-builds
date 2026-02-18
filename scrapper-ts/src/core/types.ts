export interface RichTextBaseNode {
  key: "text" | "entity";
  bold?: boolean;
}

export interface RichTextTextNode extends RichTextBaseNode {
  key: "text";
  text: string;
  color?: string;
}

export interface RichTextEntityNode extends RichTextBaseNode {
  key: "entity";
  text: string;
  href?: string;
  icon?: string;
  color?: string;
}

export type RichDescriptionNode = RichTextTextNode | RichTextEntityNode;

export interface Gift {
  imageUrl: string;
  name: string;
  category: string;
  description: string;
  richDescription: RichDescriptionNode[];
}
