export interface RichTextBaseNode {
  key: "text" | "entity";
  bold?: boolean;
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
  icon?: string;
}

export type RichDescriptionNode = RichTextTextNode | RichTextEntityNode;

export interface Gift {
  imageUrl: string;
  name: string;
  category: string;
  description: string;
  richDescription: RichDescriptionNode[];
}
