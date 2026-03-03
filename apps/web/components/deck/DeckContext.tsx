"use client";

import {createContext, useContext, useEffect, useMemo, useState} from "react";
import {EntityType, ScrapedEntity} from "../../lib/types";

export type DeckItem = {
  id: string;
  type: EntityType;
  name: string;
  image?: string;
};

export type DeckLimits = Partial<Record<Exclude<EntityType, "effects">, number>>;

type SavedDeck = { name: string; items: DeckItem[] };

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
        const parsed = JSON.parse(savedDecks) as SavedDeck[];
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
    if (!hydrated || !selectedSaved) return;
    setSaved((prev) => {
      const others = prev.filter((d) => d.name !== selectedSaved);
      return [...others, {name, items}];
    });
  }, [hydrated, items, selectedSaved]);

  const ensureActiveDeck = (customName?: string): string => {
    if (!hydrated) return customName?.trim() || name;
    const targetName = customName?.trim() || selectedSaved || name.trim() || suggestName(saved);
    setNameState(targetName);
    setSelectedSaved((prev) => prev ?? targetName);
    setSaved((prev) => {
      const key = selectedSaved ?? targetName;
      const others = prev.filter((d) => d.name !== key && d.name !== targetName);
      return [...others, {name: targetName, items}];
    });
    return targetName;
  };

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
        const targetName = nextName.trim() || "Untitled Deck";
        ensureActiveDeck(targetName);
        setNameState(targetName);
        setSelectedSaved(targetName);
        setSaved((prev) => {
          const others = prev.filter((d) => d.name !== targetName);
          return [...others, {name: targetName, items}];
        });
      },
      createDeck: () => {
        const newName = suggestName(saved);
        setItems([]);
        setNameState(newName);
        setSelectedSaved(newName);
        setSaved((prev) => {
          const others = prev.filter((d) => d.name !== newName);
          return [...others, {name: newName, items: []}];
        });
      },
      saveDeck: (asNew?: boolean) => {
        const targetName = asNew ? suggestName(saved) : name.trim() || "Untitled Deck";
        ensureActiveDeck(targetName);
        setNameState(targetName);
        setSelectedSaved(targetName);
        setSaved((prev) => {
          const others = prev.filter((d) => d.name !== targetName);
          return [...others, {name: targetName, items}];
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
        setSaved((prev) => prev.filter((d) => d.name !== deckName));
        if (selectedSaved === deckName) {
          setSelectedSaved(null);
          setItems([]);
          setNameState("Untitled Deck");
        }
      },
      resetDeck: () => setItems([]),
    }),
    [items, name, saved, selectedSaved],
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
    const [type, nameEncoded, imageEncoded] = part.split("|");
    if (!type || !nameEncoded) continue;
    if (!["gifts", "hexes", "magifishes", "trinkets", "weapons", "boosts"].includes(type)) continue;
    const name = decodeURIComponent(nameEncoded);
    const image = imageEncoded ? decodeURIComponent(imageEncoded) : undefined;
    items.push({type: type as EntityType, name, id: deckId(type as EntityType, name), image: image || undefined});
  }
  return items;
}

const TYPE_ORDER: EntityType[] = ["gifts", "weapons", "trinkets", "hexes", "magifishes", "boosts", "effects"];

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
