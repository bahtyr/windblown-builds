"use client";

import {createContext, useContext, useEffect, useMemo, useState} from "react";
import {loadEntities} from "../../lib/loadEntities";
import {EntityType, ScrapedEntity} from "../../lib/types";
import {saveExternalDeck} from "../../app/gift-match/run-build-flow";

export type DeckItem = {
  id: string;
  type: EntityType;
  name: string;
  image?: string;
};

export type DeckLimits = Partial<Record<Exclude<EntityType, "effects">, number>>;

export type SavedDeck = {
  name: string;
  items: DeckItem[];
  createdAt: string;
};

export type SharedDeck = SavedDeck & {
  source: "shared";
};

type DeckMode = "new" | "editing";
export type DeckSessionSnapshot = {
  items: DeckItem[];
  name: string;
  editingDeckName: string | null;
};
type EditingSource = "saved" | "shared" | null;

type DeckContextType = {
  items: DeckItem[];
  name: string;
  saved: SavedDeck[];
  sharedDeck: SharedDeck | null;
  editingDeckName: string | null;
  isEditingBuild: boolean;
  mode: DeckMode;
  add: (item: DeckItem, limits: DeckLimits) => { ok: boolean; reason?: string };
  remove: (id: string) => void;
  moveWithinType: (type: EntityType, from: number, to: number) => void;
  setName: (name: string) => void;
  saveDeck: (asNew?: boolean) => void;
  saveImportedDeck: (name: string, items: DeckItem[]) => string;
  saveSharedDeck: () => void;
  discardSharedDeck: () => void;
  createDeck: () => void;
  loadDeck: (name: string) => void;
  editSharedDeck: () => void;
  cancelEditing: () => void;
  deleteDeck: (name: string) => void;
  duplicateDeck: (name: string) => string | null;
  resetDeck: () => void;
};

const DeckContext = createContext<DeckContextType | null>(null);

const STORAGE_KEY = "windblown.deck.v3";
const STORAGE_SAVED = "windblown.deck.saved.v3";
const DEFAULT_DECK_NAME = "Untitled deck";

/**
 * Provide active deck state, saved decks, and editing actions.
 *
 * @param {{ children: React.ReactNode }} props - Provider children.
 * @returns {JSX.Element} Context provider.
 */
export function DeckProvider({children}: { children: React.ReactNode }) {
  const [items, setItems] = useState<DeckItem[]>([]);
  const [name, setNameState] = useState<string>(DEFAULT_DECK_NAME);
  const [saved, setSaved] = useState<SavedDeck[]>([]);
  const [sharedDeck, setSharedDeck] = useState<SharedDeck | null>(null);
  const [editingDeckName, setEditingDeckName] = useState<string | null>(null);
  const [sessionStart, setSessionStart] = useState<DeckSessionSnapshot | null>(null);
  const [editingSource, setEditingSource] = useState<EditingSource>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { items?: DeckItem[]; name?: string; editingDeckName?: string | null };
        setItems(parsed.items || []);
        setNameState(normalizeDeckName(parsed.name));
        setEditingDeckName(typeof parsed.editingDeckName === "string" ? parsed.editingDeckName : null);
      } catch {
        // ignore
      }
    }

    const savedDecks = localStorage.getItem(STORAGE_SAVED);
    if (savedDecks) {
      try {
        const parsed = normalizeSavedDecks(JSON.parse(savedDecks) as Array<SavedDeck | { name: string; items: DeckItem[] }>);
        setSaved(parsed);
      } catch {
        // ignore
      }
    }

    const sharedFromUrl = resolveSharedDeckFromLocation(window.location.pathname, window.location.search);
    if (sharedFromUrl) {
      setSharedDeck(sharedFromUrl);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({items, name, editingDeckName}));
  }, [editingDeckName, hydrated, items, name]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    localStorage.setItem(STORAGE_SAVED, JSON.stringify(saved));
  }, [hydrated, saved]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    hydrateDeckItems(items).then((nextItems) => {
      if (!cancelled && nextItems !== items) {
        setItems(nextItems);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hydrated, items]);

  useEffect(() => {
    if (!hydrated || !sharedDeck) return;
    let cancelled = false;

    hydrateDeckItems(sharedDeck.items).then((nextItems) => {
      if (!cancelled && nextItems !== sharedDeck.items) {
        setSharedDeck((prev) => (prev ? {...prev, items: nextItems} : prev));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hydrated, sharedDeck]);

  const mode: DeckMode = editingDeckName ? "editing" : "new";
  const isEditingBuild = isEditingDeckSession(editingDeckName, editingSource);

  const api: DeckContextType = useMemo(
    () => ({
      items,
      name,
      saved,
      sharedDeck,
      editingDeckName,
      isEditingBuild,
      mode,
      add: (item, limits) => {
        if (items.some((current) => current.id === item.id)) {
          return {ok: false, reason: "Duplicate not allowed"};
        }
        if (item.type === "effects") {
          return {ok: false, reason: "Effects cannot be added to deck"};
        }
        const limit = limits[item.type];
        if (limit !== undefined) {
          const count = items.filter((current) => current.type === item.type).length;
          if (count >= limit) {
            return {ok: false, reason: `Limit reached for ${item.type}`};
          }
        }
        setItems((prev) => insertByType(prev, item));
        return {ok: true};
      },
      remove: (id) => setItems((prev) => prev.filter((item) => item.id !== id)),
      moveWithinType: (type, from, to) => setItems((prev) => reorderWithinType(prev, type, from, to)),
      setName: (nextName) => setNameState(normalizeDeckName(nextName)),
      saveDeck: (asNew) => {
        const desiredName = normalizeDeckName(name);
        if (mode === "editing" && !asNew && editingDeckName) {
          setSaved((prev) => updateSavedDeck(prev, editingDeckName, desiredName, items));
          setEditingDeckName(desiredName);
          setNameState(desiredName);
          setSessionStart(null);
          setEditingSource("saved");
          return;
        }

        const targetName = ensureUniqueDeckName(saved, desiredName);
        setSaved((prev) => [...prev, {name: targetName, items, createdAt: createTimestamp()}]);
        setEditingDeckName(targetName);
        setNameState(targetName);
        setSessionStart(null);
        if (editingSource === "shared") {
          setSharedDeck(null);
          clearSharedDeckUrl();
        }
        setEditingSource("saved");
      },
      saveImportedDeck: (deckName, nextItems) => {
        const orderedItems = groupDeckItemsByType(nextItems);
        const persisted = saveExternalDeck(saved, deckName, orderedItems);
        setSaved(persisted.saved);
        setItems(persisted.savedDeck.items);
        setEditingDeckName(persisted.savedDeck.name);
        setNameState(persisted.savedDeck.name);
        setSessionStart(null);
        setEditingSource("saved");
        return persisted.savedDeck.name;
      },
      saveSharedDeck: () => {
        if (!sharedDeck) return;
        const targetName = ensureUniqueDeckName(saved, sharedDeck.name);
        setSaved((prev) => [...prev, {name: targetName, items: sharedDeck.items, createdAt: sharedDeck.createdAt}]);
        setSharedDeck(null);
        setEditingSource(null);
        clearSharedDeckUrl();
      },
      discardSharedDeck: () => {
        setSharedDeck(null);
        setEditingSource(null);
        clearSharedDeckUrl();
      },
      createDeck: () => {
        setSessionStart({items, name, editingDeckName});
        setItems([]);
        setNameState(DEFAULT_DECK_NAME);
        setEditingDeckName(null);
        setEditingSource(null);
      },
      loadDeck: (deckName) => {
        const match = saved.find((deck) => deck.name === deckName);
        if (!match) return;
        setSessionStart({items, name, editingDeckName});
        setItems(match.items);
        setNameState(match.name);
        setEditingDeckName(match.name);
        setEditingSource("saved");
      },
      editSharedDeck: () => {
        if (!sharedDeck) return;
        setSessionStart({items, name, editingDeckName});
        setItems(sharedDeck.items);
        setNameState(sharedDeck.name);
        setEditingDeckName(null);
        setEditingSource("shared");
      },
      cancelEditing: () => {
        if (editingSource === "shared") {
          const restored = restoreDeckSession(sessionStart);
          setItems(restored.items);
          setNameState(restored.name);
          setEditingDeckName(restored.editingDeckName);
          setSessionStart(null);
          setEditingSource(null);
          return;
        }
        const restored = restoreDeckSession(sessionStart);
        setItems(restored.items);
        setNameState(restored.name);
        setEditingDeckName(restored.editingDeckName);
        setSessionStart(null);
        setEditingSource(null);
      },
      deleteDeck: (deckName) => {
        setSaved((prev) => prev.filter((deck) => deck.name !== deckName));
        if (editingDeckName === deckName) {
          setItems([]);
          setNameState(DEFAULT_DECK_NAME);
          setEditingDeckName(null);
        }
        setSessionStart(null);
        setEditingSource(null);
      },
      duplicateDeck: (deckName) => {
        const source = saved.find((deck) => deck.name === deckName);
        if (!source) return null;
        const copyName = suggestDuplicateName(saved, deckName);
        setSaved((prev) => [...prev, {name: copyName, items: [...source.items], createdAt: createTimestamp()}]);
        return copyName;
      },
      resetDeck: () => setItems([]),
    }),
    [editingSource, editingDeckName, isEditingBuild, items, mode, name, saved, sessionStart, sharedDeck],
  );

  return <DeckContext.Provider value={api}>{children}</DeckContext.Provider>;
}

/**
 * Read active deck state and actions from context.
 *
 * @returns {DeckContextType} Deck state and mutations.
 */
export function useDeck(): DeckContextType {
  const ctx = useContext(DeckContext);
  if (!ctx) throw new Error("DeckContext missing");
  return ctx;
}

/**
 * Build a stable deck item identifier from entity type and name.
 *
 * @param {EntityType} type - Entity type.
 * @param {string} name - Entity name.
 * @returns {string} Deck item identifier.
 */
export function deckId(type: EntityType, name: string): string {
  return `${type}:${name}`;
}

/**
 * Convert a scraped entity into the deck item format used by the builder.
 *
 * @param {EntityType} type - Entity type.
 * @param {ScrapedEntity} entity - Source entity.
 * @returns {DeckItem} Deck item payload.
 */
export function makeDeckItem(type: EntityType, entity: ScrapedEntity): DeckItem {
  return {type, name: entity.name, id: deckId(type, entity.name), image: entity.image};
}

function parseDeckParam(raw: string): DeckItem[] {
  const parts = raw.split(",");
  const items: DeckItem[] = [];
  for (const part of parts) {
    const [type, nameEncoded] = part.split("|");
    if (!type || !nameEncoded) continue;
    if (!["gifts", "weapons", "trinkets", "magifishes", "hexes", "boosts"].includes(type)) continue;
    const name = decodeURIComponent(nameEncoded);
    items.push({type: type as EntityType, name, id: deckId(type as EntityType, name)});
  }
  return items;
}

async function hydrateDeckItems(deckItems: DeckItem[]): Promise<DeckItem[]> {
  const missingTypes = Array.from(new Set(deckItems.filter((item) => !item.image).map((item) => item.type)));
  if (missingTypes.length === 0) return deckItems;

  const fetched = new Map<EntityType, ScrapedEntity[]>();
  for (const type of missingTypes) {
    try {
      fetched.set(type, await loadEntities(type));
    } catch {
      // ignore fetch errors; keep existing items
    }
  }

  let changed = false;
  const nextItems = deckItems.map((item) => {
    if (item.image) return item;
    const match = fetched.get(item.type)?.find((entity) => entity.name === item.name);
    if (!match?.image) return item;
    changed = true;
    return {...item, image: match.image};
  });

  return changed ? nextItems : deckItems;
}

const TYPE_ORDER: EntityType[] = ["gifts", "hexes", "weapons", "trinkets", "magifishes", "boosts", "effects"];

/**
 * Groups deck items by the canonical deck display order while preserving arrival order inside each group.
 *
 * @param {DeckItem[]} items - Flat deck item list.
 * @returns {DeckItem[]} Reordered deck items with stable within-group order.
 */
export function groupDeckItemsByType(items: DeckItem[]): DeckItem[] {
  const groupedItems = new Map<EntityType, DeckItem[]>();

  for (const item of items) {
    groupedItems.set(item.type, [...(groupedItems.get(item.type) ?? []), item]);
  }

  return TYPE_ORDER.flatMap((type) => groupedItems.get(type) ?? []);
}

function insertByType(list: DeckItem[], item: DeckItem): DeckItem[] {
  const order = TYPE_ORDER.indexOf(item.type);
  if (order === -1) return [...list, item];
  const next = [...list];
  let insertAt = next.length;
  for (let i = 0; i < next.length; i++) {
    const otherOrder = TYPE_ORDER.indexOf(next[i].type);
    if (otherOrder > order) {
      insertAt = i;
      break;
    }
    if (otherOrder === order) {
      insertAt = i + 1;
    }
  }
  next.splice(insertAt, 0, item);
  return next;
}

function reorderWithinType(list: DeckItem[], type: EntityType, from: number, to: number): DeckItem[] {
  const sameType = list.filter((item) => item.type === type);
  if (from < 0 || from >= sameType.length || to < 0 || to >= sameType.length) return list;
  const indices = list.map((item, idx) => (item.type === type ? idx : -1)).filter((idx) => idx !== -1);
  const globalFrom = indices[from];
  const globalTo = indices[to];
  const next = [...list];
  const [item] = next.splice(globalFrom, 1);
  next.splice(globalTo, 0, item);
  return next;
}

/**
 * Remove a deck and pick the first remaining saved deck.
 *
 * @param {{name: string; items: DeckItem[]; createdAt?: string}[]} list - Current saved decks.
 * @param {string} deckName - Deck being removed.
 * @returns {{saved: {name: string; items: DeckItem[]; createdAt: string}[]; firstSaved: {name: string; items: DeckItem[]; createdAt: string}}} Remaining decks and first selectable deck.
 */
export function selectFirstSavedAfterDelete(
  list: { name: string; items: DeckItem[]; createdAt?: string }[],
  deckName: string,
): { saved: { name: string; items: DeckItem[]; createdAt: string }[]; firstSaved: { name: string; items: DeckItem[]; createdAt: string } } {
  const normalizedFiltered = normalizeSavedDecks(list.filter((deck) => deck.name !== deckName));
  if (normalizedFiltered.length > 0) {
    return {saved: normalizedFiltered, firstSaved: normalizedFiltered[0]};
  }
  const created = {name: DEFAULT_DECK_NAME, items: [] as DeckItem[], createdAt: createTimestamp()};
  return {saved: [created], firstSaved: created};
}

/**
 * Normalize persisted decks so older saved payloads gain creation timestamps.
 *
 * @param {Array<SavedDeck | { name: string; items: DeckItem[] }>} list - Raw saved decks from storage.
 * @returns {SavedDeck[]} Normalized saved deck list.
 */
export function normalizeSavedDecks(list: Array<SavedDeck | { name: string; items: DeckItem[] }>): SavedDeck[] {
  return list.map((deck) => ({
    name: normalizeDeckName(deck.name),
    items: deck.items,
    createdAt: "createdAt" in deck && typeof deck.createdAt === "string" ? deck.createdAt : createTimestamp(),
  }));
}

/**
 * Build a unique copy name for a duplicated deck.
 *
 * @param {SavedDeck[]} existing - Existing saved decks.
 * @param {string} deckName - Original deck name.
 * @returns {string} Unique duplicate name.
 */
export function suggestDuplicateName(existing: SavedDeck[], deckName: string): string {
  const normalizedName = normalizeDeckName(deckName);
  const base = `${normalizedName} (copy)`;
  if (!existing.some((deck) => deck.name === base)) return base;
  let i = 2;
  while (existing.some((deck) => deck.name === `${base} ${i}`)) {
    i += 1;
  }
  return `${base} ${i}`;
}

function updateSavedDeck(list: SavedDeck[], sourceName: string, targetName: string, items: DeckItem[]): SavedDeck[] {
  const next = [...list];
  const idx = next.findIndex((deck) => deck.name === sourceName);
  if (idx === -1) {
    return [...list, {name: ensureUniqueDeckName(list, targetName), items, createdAt: createTimestamp()}];
  }
  next[idx] = {
    ...next[idx],
    name: targetName,
    items,
  };
  return dedupeDeckNames(next, idx);
}

function dedupeDeckNames(list: SavedDeck[], preferredIdx: number): SavedDeck[] {
  const next = [...list];
  const preferred = next[preferredIdx];
  const duplicates = next.filter((deck, idx) => idx !== preferredIdx && deck.name === preferred.name);
  if (duplicates.length === 0) return next;
  next[preferredIdx] = {...preferred, name: ensureUniqueDeckName(next.filter((_, idx) => idx !== preferredIdx), preferred.name)};
  return next;
}

function ensureUniqueDeckName(existing: SavedDeck[], desiredName: string): string {
  const normalizedDesiredName = normalizeDeckName(desiredName);
  if (!existing.some((deck) => deck.name === normalizedDesiredName)) return normalizedDesiredName;
  let i = 2;
  while (existing.some((deck) => deck.name === `${normalizedDesiredName} ${i}`)) {
    i += 1;
  }
  return `${normalizedDesiredName} ${i}`;
}

function normalizeDeckName(value?: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : DEFAULT_DECK_NAME;
}

/**
 * Resolve the state that should be restored when a deck edit session is cancelled.
 *
 * @param {DeckSessionSnapshot | null} snapshot - Starting state captured when the session opened.
 * @returns {DeckSessionSnapshot} Restored state for the editor.
 */
export function restoreDeckSession(snapshot: DeckSessionSnapshot | null): DeckSessionSnapshot {
  if (snapshot) return snapshot;
  return {
    items: [],
    name: DEFAULT_DECK_NAME,
    editingDeckName: null,
  };
}

/**
 * Determine whether the builder is currently editing an existing saved or shared build.
 *
 * @param {string | null} editingDeckName - Saved deck currently being edited, if any.
 * @param {"saved" | "shared" | null} editingSource - Source for the current editing session.
 * @returns {boolean} True when editing an existing build.
 */
export function isEditingDeckSession(
  editingDeckName: string | null,
  editingSource: "saved" | "shared" | null,
): boolean {
  return editingDeckName !== null || editingSource === "shared";
}

/**
 * Parse a shared deck row from the current `/decks` URL.
 *
 * @param {string} pathname - Current pathname.
 * @param {string} search - Current search string.
 * @returns {SharedDeck | null} Transient shared deck row.
 */
export function resolveSharedDeckFromLocation(pathname: string, search: string): SharedDeck | null {
  if (pathname !== "/decks") return null;
  const params = new URLSearchParams(search);
  const rawDeck = params.get("deck");
  if (!rawDeck) return null;
  const items = parseDeckParam(rawDeck);
  if (items.length === 0) return null;
  const sharedName = `${normalizeDeckName(params.get("name") ?? undefined)} (shared)`;
  return {
    source: "shared",
    name: sharedName,
    items,
    createdAt: createTimestamp(),
  };
}

/**
 * Remove transient shared-deck params from the current URL.
 */
export function clearSharedDeckUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("deck");
  url.searchParams.delete("name");
  window.history.replaceState(null, "", url);
}

function createTimestamp(): string {
  return new Date().toISOString();
}
