"use client";

import {createContext, useContext, useEffect, useMemo, useState, useCallback} from "react";
import {loadEntities} from "../../lib/loadEntities";
import {EntityType, ScrapedEntity} from "../../lib/types";

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

type DeckContextType = {
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
  duplicateDeck: (name: string) => string | null;
  resetDeck: () => void;
};

const DeckContext = createContext<DeckContextType | null>(null);

const STORAGE_KEY = "windblown.deck.v2";
const STORAGE_SAVED = "windblown.deck.saved.v2";

export function DeckProvider({children}: { children: React.ReactNode }) {
  const [items, setItems] = useState<DeckItem[]>([]);
  const [name, setNameState] = useState<string>("Untitled Deck");
  const [saved, setSaved] = useState<SavedDeck[]>([]);
  const [selectedSaved, setSelectedSaved] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { items: DeckItem[]; name?: string };
        setItems(parsed.items || []);
        if (parsed.name) setNameState(parsed.name);
      } catch {
        // ignore
      }
    }
    const savedDecks = localStorage.getItem(STORAGE_SAVED);
    if (savedDecks) {
      try {
        const parsed = normalizeSavedDecks(JSON.parse(savedDecks) as Array<SavedDeck | { name: string; items: DeckItem[] }>);
        setSaved(parsed);
        setSelectedSaved(parsed[0]?.name ?? null);
      } catch {
        // ignore
      }
    }

    const params = new URLSearchParams(window.location.search);
    const paramDeck = params.get("deck");
    const paramName = params.get("name");
    if (paramDeck) {
      const parsed = parseDeckParam(paramDeck);
      if (parsed.length) setItems(parsed);
    }
    if (paramName) setNameState(paramName);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({items, name}));
  }, [hydrated, items, name]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    localStorage.setItem(STORAGE_SAVED, JSON.stringify(saved));
  }, [hydrated, saved]);

  useEffect(() => {
    if (!hydrated) return;
    const missingTypes = Array.from(
      new Set(items.filter((i) => !i.image).map((i) => i.type)),
    );
    if (missingTypes.length === 0) return;
    let cancelled = false;
    (async () => {
      const fetched = new Map<EntityType, ScrapedEntity[]>();
      for (const t of missingTypes) {
        try {
          fetched.set(t, await loadEntities(t));
        } catch {
          // ignore fetch errors; keep existing items
        }
      }
      if (cancelled) return;
      setItems((prev) =>
        prev.map((item) => {
          if (item.image) return item;
          const match = fetched.get(item.type)?.find((e) => e.name === item.name);
          if (match?.image) return {...item, image: match.image};
          return item;
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, items]);

  useEffect(() => {
    if (!hydrated || !selectedSaved) return;
    setSaved((prev) => {
      return upsertSaved(prev, selectedSaved, items, prev.find((deck) => deck.name === selectedSaved)?.createdAt);
    });
  }, [hydrated, items, selectedSaved]);

  const upsertSaved = (list: SavedDeck[], deckName: string, deckItems: DeckItem[], createdAt?: string): SavedDeck[] => {
    const idx = list.findIndex((d) => d.name === deckName);
    const nextDeck = {name: deckName, items: deckItems, createdAt: createdAt ?? list[idx]?.createdAt ?? createTimestamp()};
    if (idx === -1) return [...list, nextDeck];
    const next = [...list];
    next[idx] = nextDeck;
    return next;
  };

  const renameSaved = (list: SavedDeck[], from: string, to: string, deckItems: DeckItem[], createdAt?: string): SavedDeck[] => {
    const targetIdx = list.findIndex((d) => d.name === from);
    const fallbackIdx = targetIdx === -1 ? list.findIndex((d) => d.name === to) : targetIdx;
    const idx = fallbackIdx === -1 ? list.length : fallbackIdx;
    const filtered = list.filter((d) => d.name !== from && d.name !== to);
    const next = [...filtered];
    next.splice(idx, 0, {name: to, items: deckItems, createdAt: createdAt ?? list[targetIdx]?.createdAt ?? createTimestamp()});
    return next;
  };

  const ensureActiveDeck = useCallback(
    (customName?: string): string => {
      if (!hydrated) return customName ?? name;
      const baseName = name === "" ? suggestName(saved) : name;
      const targetName = customName ?? selectedSaved ?? baseName;
      setNameState(targetName);
      setSelectedSaved((prev) => prev ?? targetName);
      setSaved((prev) => upsertSaved(prev, targetName, items, prev.find((deck) => deck.name === targetName)?.createdAt));
      return targetName;
    },
    [hydrated, name, saved, selectedSaved, items],
  );

  const api: DeckContextType = useMemo(
    () => ({
      items,
      name,
      saved,
      selectedSaved,
      add: (item, limits) => {
        ensureActiveDeck();
        if (items.some((x) => x.id === item.id)) {
          return {ok: false, reason: "Duplicate not allowed"};
        }
        if (item.type === "effects") {
          return {ok: false, reason: "Effects cannot be added to deck"};
        }
        const limit = limits[item.type];
        if (limit !== undefined) {
          const count = items.filter((x) => x.type === item.type).length;
          if (count >= limit) {
            return {ok: false, reason: `Limit reached for ${item.type}`};
          }
        }
        setItems((prev) => insertByType(prev, item));
        return {ok: true};
      },
      remove: (id) => setItems((prev) => prev.filter((x) => x.id !== id)),
      moveWithinType: (type, from, to) =>
        setItems((prev) => reorderWithinType(prev, type, from, to)),
      setName: (nextName: string) => {
        const targetName = nextName === "" ? "Untitled Deck" : nextName;
        const sourceName = selectedSaved ?? name;
        setNameState(targetName);
        setSelectedSaved(targetName);
        setSaved((prev) => {
          const source = prev.find((d) => d.name === sourceName);
          const payload = source ? source.items : items;
          return renameSaved(prev, sourceName, targetName, payload, source?.createdAt);
        });
      },
      createDeck: () => {
        const newName = suggestName(saved);
        setItems([]);
        setNameState(newName);
        setSelectedSaved(newName);
        setSaved((prev) => {
          return renameSaved(prev, newName, newName, [], createTimestamp());
        });
      },
      saveDeck: (asNew?: boolean) => {
        const targetName = asNew ? suggestName(saved) : (name === "" ? "Untitled Deck" : name);
        ensureActiveDeck(targetName);
        setNameState(targetName);
        setSelectedSaved(targetName);
        setSaved((prev) => {
          return renameSaved(prev, targetName, targetName, items, prev.find((deck) => deck.name === targetName)?.createdAt);
        });
      },
      loadDeck: (deckName: string) => {
        const match = saved.find((d) => d.name === deckName);
        if (match) {
          setItems(match.items);
          setNameState(match.name);
          setSelectedSaved(deckName);
        }
      },
      deleteDeck: (deckName: string) => {
        setSaved((prev) => {
          const {saved: nextSaved, firstSaved} = selectFirstSavedAfterDelete(prev, deckName);
          setSelectedSaved(firstSaved.name);
          setItems(firstSaved.items);
          setNameState(firstSaved.name);
          return nextSaved;
        });
      },
      duplicateDeck: (deckName: string) => {
        const source = saved.find((d) => d.name === deckName);
        if (!source) return null;
        const copyName = suggestDuplicateName(saved, deckName);
        setSaved((prev) => [...prev, {name: copyName, items: [...source.items], createdAt: createTimestamp()}]);
        return copyName;
      },
      resetDeck: () => setItems([]),
    }),
    [items, name, saved, selectedSaved, ensureActiveDeck],
  );

  return <DeckContext.Provider value={api}>{children}</DeckContext.Provider>;
}

export function useDeck(): DeckContextType {
  const ctx = useContext(DeckContext);
  if (!ctx) throw new Error("DeckContext missing");
  return ctx;
}

export function deckId(type: EntityType, name: string): string {
  return `${type}:${name}`;
}

export function makeDeckItem(type: EntityType, entity: ScrapedEntity): DeckItem {
  return {type, name: entity.name, id: deckId(type, entity.name), image: entity.image};
}

function suggestName(existing: SavedDeck[]): string {
  const base = "Deck";
  let i = 1;
  while (existing.some((d) => d.name === `${base} ${i}`)) {
    i += 1;
  }
  return `${base} ${i}`;
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

const TYPE_ORDER: EntityType[] = ["gifts", "weapons", "trinkets", "magifishes", "hexes", "boosts", "effects"];

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
      insertAt = i + 1; // keep after existing of same type
    }
  }
  next.splice(insertAt, 0, item);
  return next;
}

function reorderWithinType(list: DeckItem[], type: EntityType, from: number, to: number): DeckItem[] {
  const sameType = list.filter((x) => x.type === type);
  if (from < 0 || from >= sameType.length || to < 0 || to >= sameType.length) return list;
  const movingId = sameType[from].id;

  const indices = list.map((x, idx) => (x.type === type ? idx : -1)).filter((idx) => idx !== -1);
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
 * @param {{name: string; items: DeckItem[]}[]} list - Current saved decks.
 * @param {string} deckName - Deck being removed.
 * @returns {{saved: {name: string; items: DeckItem[]}[]; firstSaved: {name: string; items: DeckItem[]}}} Remaining decks and first selectable deck.
 */
export function selectFirstSavedAfterDelete(
  list: { name: string; items: DeckItem[]; createdAt?: string }[],
  deckName: string,
): { saved: { name: string; items: DeckItem[]; createdAt: string }[]; firstSaved: { name: string; items: DeckItem[]; createdAt: string } } {
  const normalizedFiltered = normalizeSavedDecks(list.filter((d) => d.name !== deckName));
  if (normalizedFiltered.length > 0) {
    return {saved: normalizedFiltered, firstSaved: normalizedFiltered[0]};
  }
  const created = {name: suggestName(normalizedFiltered), items: [] as DeckItem[], createdAt: createTimestamp()};
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
    name: deck.name,
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
  const base = `${deckName} Copy`;
  if (!existing.some((deck) => deck.name === base)) return base;
  let i = 2;
  while (existing.some((deck) => deck.name === `${base} ${i}`)) {
    i += 1;
  }
  return `${base} ${i}`;
}

function createTimestamp(): string {
  return new Date().toISOString();
}
