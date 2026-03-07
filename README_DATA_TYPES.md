# Windblown Builds Data Type Structures

This document lists the main TypeScript data structures used across the monorepo.

## 1) Shared Entity Domain Types (Web App)
Source: `apps/web/lib/types.ts`

### `EntityType`
```ts
"gifts" | "boosts" | "hexes" | "magifishes" | "trinkets" | "weapons" | "effects"
```

### `RichTextBaseNode`
```ts
{
  key: "text" | "entity";
  newLine?: boolean;
  bold?: boolean;
  italic?: boolean;
  color?: string;
}
```

### `RichTextTextNode`
```ts
RichTextBaseNode & {
  key: "text";
  text: string;
}
```

### `RichTextEntityNode`
```ts
RichTextBaseNode & {
  key: "entity";
  text: string;
  id?: string;
  href?: string;
  image?: string;
}
```

### `RichDescriptionNode`
```ts
RichTextTextNode | RichTextEntityNode
```

### `ScrapedEntity` (web representation)
```ts
{
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
```

## 2) Scraper Domain Types
Source: `packages/scrapper/src/pages/types.ts`

### Rich text nodes
The scraper defines the same rich text node model as the web app:
- `RichTextBaseNode`
- `RichTextTextNode`
- `RichTextEntityNode`
- `RichDescriptionNode`

### `ScrapedEntity` (scraper base)
```ts
{
  image: string;
  name: string;
  nameColor?: string;
  description: string;
  richDescription: RichDescriptionNode[];
}
```

### Specialized scraped entities
```ts
Gift extends ScrapedEntity {
  category: string;
}
```

```ts
Effect extends ScrapedEntity {
  category: string;
  advancedDescription: string;
  richAdvancedDescription: RichDescriptionNode[];
  notes: string;
  richNotes: RichDescriptionNode[];
}
```

```ts
Boost extends ScrapedEntity {
  healthBonus?: string;
}
```

```ts
Hex extends ScrapedEntity {
  unlockCost: string;
  unlockRequirement: string;
}
```

```ts
Magifish extends ScrapedEntity {
  unlockCost: string;
  unlockRequirement: string;
}
```

```ts
Trinket extends ScrapedEntity {
  baseDamage: string;
  damageType: string;
  cooldown: string;
  unlockCost: string;
  unlockRequirement: string;
}
```

```ts
Weapon extends ScrapedEntity {
  baseDamage: string;
  damageType: string;
  alterattackBonus: string;
  unlockCost: string;
  unlockRequirement: string;
}
```

## 3) Deck State Types
Source: `apps/web/components/deck/DeckContext.tsx`

### `DeckItem`
```ts
{
  id: string;       // `${type}:${name}`
  type: EntityType;
  name: string;
  image?: string;
}
```

### `DeckLimits`
```ts
Partial<Record<Exclude<EntityType, "effects">, number>>
```

### `SavedDeck`
```ts
{
  name: string;
  items: DeckItem[];
}
```

### `DeckContextType`
```ts
{
  items: DeckItem[];
  name: string;
  saved: SavedDeck[];
  selectedSaved: string | null;
  add: (item: DeckItem, limits: DeckLimits) => { ok: boolean; reason?: string };
  remove: (id: string) => void;
  moveWithinType: (type: EntityType, from: number, to: number) => void;
  setName: (name: string) => void;
  saveDeck: (asNew?: boolean) => void;
  createDeck: () => void;
  loadDeck: (name: string) => void;
  deleteDeck: (name: string) => void;
  resetDeck: () => void;
}
```

## 4) Likes State Types
Source: `apps/web/components/like/LikeContext.tsx`

### `LikeCtx`
```ts
{
  ids: Set<string>;         // entity ids in `${type}:${name}` format
  toggle: (id: string) => void;
}
```

## 5) Entity Page Types
Sources:
- `apps/web/app/[type]/entity-utils.ts`
- `apps/web/app/[type]/page.tsx`

### `MatchDisplayMode`
```ts
"fade-unmatched" | "show-matches-only"
```

### `PagePropsLocal`
```ts
{
  params?: Promise<Record<string, string>>;
}
```

### `MatchNav`
```ts
{
  above: number;
  below: number;
}
```

### `DisplayEntity`
```ts
ScrapedEntity & { entityType: EntityType }
```

## 6) UI Component Prop/Data Types
Sources:
- `apps/web/components/deck/DeckPanel.tsx`
- `apps/web/components/entity/EntityCard.tsx`
- `apps/web/components/entity/Filters.tsx`
- `apps/web/components/entity/RichText.tsx`
- `apps/web/components/layout/NavBar.tsx`

### `DeckPanel` types
```ts
Props = { open: boolean }
```

```ts
DragProps = {
  item: DeckItem;
  index: number;
  type: EntityType;
  onDrop: (from: number, to: number) => void;
  onRemove: () => void;
  highlight?: boolean;
}
```

### `EntityCard` types
```ts
Props = {
  item: ScrapedEntity;
  type: EntityType;
  highlight?: boolean;
  deck: ReturnType<typeof useDeck>;
  likes: ReturnType<typeof useLikes>;
  limits: DeckLimits;
  fade?: boolean;
  inDeck?: boolean;
  onEntityFilter?: (id: string) => void;
}
```

```ts
StatRow = {
  label: string;
  value: string;
}
```

### `Filters` types
```ts
Props = {
  items: ScrapedEntity[];
  search: string;
  onSearch: (v: string) => void;
  selectedEntity: string;
  onEntityChange: (id: string) => void;
  likedOnly: boolean;
  onLikedChange: (v: boolean) => void;
  deckOnly: boolean;
  onDeckChange: (v: boolean) => void;
  matchDisplayMode: MatchDisplayMode;
  onMatchDisplayModeChange: (mode: MatchDisplayMode) => void;
}
```

### `RichText` types
```ts
Props = {
  parts: RichDescriptionNode[];
  onEntityFilter?: (id: string) => void;
}
```

### `NavBar` types
```ts
tabs: { type: EntityType | "all"; label: string }[]
```

```ts
Props = {
  deckOpen: boolean;
  onToggleDeck: () => void;
}
```

## 7) Scraper Core/CLI Types
Sources:
- `packages/scrapper/src/core/wikiHtml.ts`
- `packages/scrapper/src/cli.ts`

### `WikiHtmlDocument`
```ts
{
  $: CheerioAPI;
  url: string;
}
```

### `ScrapeTask<T>`
```ts
{
  name: string;
  scrape: () => Promise<T[]>;
}
```

