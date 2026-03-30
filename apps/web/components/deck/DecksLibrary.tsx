/* eslint-disable @next/next/no-img-element */
"use client";

import {useEffect, useMemo, useState} from "react";
import {DeckItem, SavedDeck, SharedDeck, makeDeckItem, useDeck} from "./DeckContext";
import {useDeckUi} from "./DeckUiContext";
import {buildDeckShareUrl} from "./deck-share";
import DeckPanel from "./DeckPanel";
import EntityBrowser from "../entity/EntityBrowser";
import {useLikes} from "../like/LikeContext";
import {ENTITY_TYPES, loadEntities} from "../../lib/loadEntities";
import categoryImages from "../../public/category-images.json";
import {EntityType, ScrapedEntity} from "../../lib/types";

type DrawerPhase = "opening" | "open" | "closing";
type DeckRowModel =
  | { kind: "favorites"; deck: SavedDeck }
  | { kind: "shared"; deck: SharedDeck }
  | { kind: "saved"; deck: SavedDeck };

type EntityLookup = Map<string, DeckItem>;
type GiftCategoryLookup = Map<string, string>;
type DeckCategoryMeta = {
  image?: string;
  name: string;
};

/**
 * Read-only saved deck library with share, duplicate, edit, and delete actions.
 *
 * @returns {JSX.Element} Saved deck library page.
 */
export default function DecksLibrary() {
  const deck = useDeck();
  const deckUi = useDeckUi();
  const likes = useLikes();
  const [drawerMounted, setDrawerMounted] = useState(deckUi.open);
  const [drawerPhase, setDrawerPhase] = useState<DrawerPhase>(deckUi.open ? "open" : "closing");
  const [entityLookup, setEntityLookup] = useState<EntityLookup>(new Map());
  const [giftCategoryLookup, setGiftCategoryLookup] = useState<GiftCategoryLookup>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function loadEntityLookups() {
      const entityEntries = await Promise.all(
        ENTITY_TYPES.map(async (type) => ({
          type,
          entities: await loadEntities(type),
        })),
      );

      if (cancelled) return;

      const nextEntityLookup: EntityLookup = new Map();
      const nextGiftCategoryLookup: GiftCategoryLookup = new Map();

      for (const entry of entityEntries) {
        for (const entity of entry.entities) {
          const deckItem = makeDeckItem(entry.type, entity);
          nextEntityLookup.set(deckItem.id, deckItem);
          if (entry.type === "gifts" && entity.category) {
            nextGiftCategoryLookup.set(deckItem.id, entity.category);
          }
        }
      }

      setEntityLookup(nextEntityLookup);
      setGiftCategoryLookup(nextGiftCategoryLookup);
    }

    loadEntityLookups().catch(() => {
      if (!cancelled) {
        setEntityLookup(new Map());
        setGiftCategoryLookup(new Map());
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const libraryRows: DeckRowModel[] = deck.saved
      .filter((savedDeck) => savedDeck.items.length > 0)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((savedDeck) => ({kind: "saved" as const, deck: savedDeck}));

    const favoritesDeck = buildFavoritesDeck(likes.ids, entityLookup);
    if (favoritesDeck) {
      libraryRows.unshift({kind: "favorites", deck: favoritesDeck});
    }

    if (deck.sharedDeck) {
      libraryRows.unshift({kind: "shared", deck: deck.sharedDeck});
    }

    return libraryRows;
  }, [deck.saved, deck.sharedDeck, entityLookup, likes.ids]);

  useEffect(() => {
    let frameId = 0;
    let timeoutId = 0;

    if (deckUi.open) {
      setDrawerMounted(true);
      setDrawerPhase("opening");
      frameId = window.requestAnimationFrame(() => {
        setDrawerPhase("open");
      });
      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    if (!drawerMounted) return;
    setDrawerPhase("closing");
    timeoutId = window.setTimeout(() => {
      setDrawerMounted(false);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [deckUi.open, drawerMounted]);

  const handleShare = async (deckName: string) => {
    const savedDeck = deck.saved.find((entry) => entry.name === deckName);
    if (!savedDeck || typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(buildDeckShareUrl(window.location.origin, savedDeck));
    } catch {}
  };

  const handleCreateNew = () => {
    deck.createDeck();
    deckUi.openDeck();
  };

  const handleCancelEditing = () => {
    deck.cancelEditing();
    deckUi.closeDeck();
  };

  return (
    <>
      <div className="page page-decks">
        <section className="decks-page body-wrapper">
          <div className="decks-page-header">
            <div>
              <h1 className="decks-page-title">Your library</h1>
              <p className="decks-page-copy">Revisit your runs and share with others.</p>
            </div>
            <div className="decks-page-header-actions">
              <button className="btn decks-page-primary-button" type="button" onClick={handleCreateNew}>Create new build</button>
            </div>
          </div>

          <div className="decks-grid">
            {rows.length > 0 ? (
              rows.map((row) => (
                <DeckRow
                  key={`${row.kind}-${row.deck.name}`}
                  categories={buildDeckCategoryMeta(row.deck.items, giftCategoryLookup)}
                  row={row}
                  onDelete={() => deck.deleteDeck(row.deck.name)}
                  onDiscardShared={() => deck.discardSharedDeck()}
                  onDuplicate={() => deck.duplicateDeck(row.deck.name)}
                  onEdit={() => {
                    if (row.kind === "shared") {
                      deck.editSharedDeck();
                    } else {
                      deck.loadDeck(row.deck.name);
                    }
                    deckUi.openDeck();
                  }}
                  onSaveShared={() => deck.saveSharedDeck()}
                  onShare={() => handleShare(row.deck.name)}
                />
              ))
            ) : (
              <div className="deck-row-empty">No saved builds yet.</div>
            )}
          </div>
        </section>
      </div>

      {drawerMounted && (
        <div className={`deck-builder-overlay is-${drawerPhase}`}>
          <div className={`deck-builder-backdrop is-${drawerPhase}`}/>
          <button
            aria-label="Cancel changes and close build editor"
            className="deck-builder-dismiss"
            type="button"
            onClick={handleCancelEditing}
          />
          <div
            aria-label="Build editor"
            aria-modal="true"
            className={`deck-builder-drawer is-${drawerPhase}`}
            role="dialog"
          >
            <div className={`deck-builder-surface is-${drawerPhase}`}>
              <DeckPanel onCancel={handleCancelEditing} onCommit={() => deckUi.closeDeck()}/>
              <div className="deck-builder-browser">
                <EntityBrowser embedded/>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type DeckRowProps = {
  categories: DeckCategoryMeta[];
  row: DeckRowModel;
  onDelete: () => void;
  onDiscardShared: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onSaveShared: () => void;
  onShare: () => void;
};

function DeckRow({categories, row, onDelete, onDiscardShared, onDuplicate, onEdit, onSaveShared, onShare}: DeckRowProps) {
  const isShared = row.kind === "shared";
  const isFavorites = row.kind === "favorites";
  const meta = isShared || isFavorites ? null : formatRoughDate(row.deck.createdAt);

  return (
    <article className={`deck-row ${isShared ? "deck-row-shared" : ""}`}>
      <div className="deck-row-layout">
        <aside className="deck-row-side-panel" aria-label={`${row.deck.name} categories`}>
          <p className="deck-row-side-title">Gift categories</p>
          {categories.length > 0 ? (
            <div className="deck-row-category-list">
              {categories.map((category) => (
                <div key={category.name} className="deck-row-category-chip">
                  {category.image ? <img className="deck-row-category-thumb" src={category.image} alt=""/> : <div className="deck-row-category-thumb deck-row-category-thumb-empty"/>}
                  <span>{category.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="deck-row-side-empty">No gift categories</p>
          )}
        </aside>

        <div className="deck-row-main">
          <div className="deck-row-head">
            <div className="deck-row-title-group">
              <h2 className="deck-row-title">{row.deck.name}</h2>
              {meta && <p className="deck-row-meta">{meta}</p>}
              {isFavorites && <p className="deck-row-meta">Built from your current likes</p>}
            </div>
            <div className="deck-row-actions">
              {isShared ? (
                <>
                  <button className="btn ghost deck-row-action" type="button" onClick={onDiscardShared}>Discard</button>
                  <button className="btn ghost deck-row-action" type="button" onClick={onEdit}>Edit</button>
                  <button className="btn deck-row-action" type="button" onClick={onSaveShared}>Save</button>
                </>
              ) : isFavorites ? null : (
                <>
                  <button className="btn ghost deck-row-action deck-row-action-auto-hide" type="button" onClick={onEdit}>Edit</button>
                  <button className="btn ghost deck-row-action deck-row-action-auto-hide" type="button" onClick={onDelete}>Delete</button>
                  <button className="btn ghost deck-row-action deck-row-action-auto-hide" type="button" onClick={onDuplicate}>Duplicate</button>
                  <button className="btn ghost deck-row-action deck-row-action-auto-hide" type="button" onClick={onShare}>Share</button>
                </>
              )}
            </div>
          </div>

          <div className="deck-row-items">
            {row.deck.items.map((item) => (
              <DeckRowItem key={item.id} item={item}/>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function DeckRowItem({item}: { item: DeckItem }) {
  return (
    <div className="deck-row-item">
      {item.image ? <img className="deck-row-item-thumb" src={item.image} alt=""/> : <div className="deck-row-item-thumb deck-row-item-thumb-empty"/>}
      <div className="deck-row-item-copy">
        <span className="deck-row-item-name">{item.name}</span>
      </div>
    </div>
  );
}

/**
 * Convert an ISO timestamp into simple rough relative text.
 *
 * @param {string} value - ISO timestamp.
 * @returns {string} Rough relative time label.
 */
export function formatRoughDate(value: string): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Recently";

  const diffMs = Date.now() - timestamp;
  const dayMs = 24 * 60 * 60 * 1000;
  if (diffMs < dayMs) return "Today";
  if (diffMs < dayMs * 2) return "Yesterday";
  if (diffMs < dayMs * 7) return pluralize(Math.floor(diffMs / dayMs), "day");
  if (diffMs < dayMs * 30) return pluralize(Math.floor(diffMs / (dayMs * 7)), "week");
  if (diffMs < dayMs * 365) return pluralize(Math.floor(diffMs / (dayMs * 30)), "month");
  return pluralize(Math.floor(diffMs / (dayMs * 365)), "year");
}

function pluralize(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? "" : "s"} ago`;
}

/**
 * Build the derived Favorites deck from the current liked entity ids.
 *
 * @param {Set<string>} likedIds - Current liked entity ids.
 * @param {Map<string, DeckItem>} entityLookup - Loaded entity lookup by deck id.
 * @returns {SavedDeck | null} Derived favorites deck, or null when empty.
 */
export function buildFavoritesDeck(likedIds: Set<string>, entityLookup: Map<string, DeckItem>): SavedDeck | null {
  if (likedIds.size === 0 || entityLookup.size === 0) return null;

  const items = Array.from(likedIds)
    .map((id) => entityLookup.get(id))
    .filter((item): item is DeckItem => Boolean(item));

  if (items.length === 0) return null;

  return {
    name: "Favorites",
    items: sortDeckItemsByType(items),
    createdAt: new Date(0).toISOString(),
  };
}

/**
 * Build gift category metadata for a deck row.
 *
 * @param {DeckItem[]} items - Deck items shown in the row.
 * @param {Map<string, string>} giftCategoryLookup - Gift item id to category.
 * @returns {DeckCategoryMeta[]} Visible category metadata.
 */
export function buildDeckCategoryMeta(items: DeckItem[], giftCategoryLookup: Map<string, string>): DeckCategoryMeta[] {
  const categoryNames = new Set<string>();
  for (const item of items) {
    if (item.type !== "gifts") continue;
    const category = giftCategoryLookup.get(item.id);
    if (category) {
      categoryNames.add(category);
    }
  }

  return Array.from(categoryNames)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      name,
      image: categoryImages[name as keyof typeof categoryImages],
    }));
}

function sortDeckItemsByType(items: DeckItem[]): DeckItem[] {
  return [...items].sort(compareDeckItems);
}

function compareDeckItems(a: DeckItem, b: DeckItem): number {
  const typeOrder = compareTypeOrder(a.type, b.type);
  if (typeOrder !== 0) return typeOrder;
  return a.name.localeCompare(b.name);
}

function compareTypeOrder(a: EntityType, b: EntityType): number {
  return ENTITY_TYPES.indexOf(a) - ENTITY_TYPES.indexOf(b);
}
