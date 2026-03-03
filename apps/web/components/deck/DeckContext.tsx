"use client";

import {createContext, useContext, useEffect, useMemo, useState} from "react";
import {ScrapedEntity, EntityType} from "../../lib/types";

export type DeckItem = {
  id: string;
  type: EntityType;
  name: string;
  image?: string;
};

export type DeckLimits = Partial<Record<Exclude<EntityType, "effects">, number>>;

type SavedDeck = {name: string; items: DeckItem[]};

type DeckContextType = {
  items: DeckItem[];
  name: string;
  saved: SavedDeck[];
  add: (item: DeckItem, limits: DeckLimits) => {ok: boolean; reason?: string};
  remove: (id: string) => void;
  move: (id: string, delta: number) => void;
  setName: (name: string) => void;
  saveDeck: () => void;
  loadDeck: (name: string) => void;
  clear: () => void;
};

const DeckContext = createContext<DeckContextType | null>(null);

const STORAGE_KEY = "windblown.deck.v2";
const STORAGE_SAVED = "windblown.deck.saved.v2";

export function DeckProvider({children}: {children: React.ReactNode}) {
  const [items, setItems] = useState<DeckItem[]>([]);
  const [name, setName] = useState<string>("Untitled Deck");
  const [saved, setSaved] = useState<SavedDeck[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as {items: DeckItem[]; name?: string};
        setItems(parsed.items || []);
        if (parsed.name) setName(parsed.name);
      } catch {
        // ignore
      }
    }
    const savedDecks = localStorage.getItem(STORAGE_SAVED);
    if (savedDecks) {
      try {
        setSaved(JSON.parse(savedDecks) as SavedDeck[]);
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
    if (paramName) setName(paramName);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({items, name}));
  }, [items, name]);

  useEffect(() => {
    localStorage.setItem(STORAGE_SAVED, JSON.stringify(saved));
  }, [saved]);

  const api: DeckContextType = useMemo(
    () => ({
      items,
      name,
      saved,
      add: (item, limits) => {
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
        setItems((prev) => [...prev, item]);
        return {ok: true};
      },
      remove: (id) => setItems((prev) => prev.filter((x) => x.id !== id)),
      move: (id, delta) =>
        setItems((prev) => {
          const idx = prev.findIndex((x) => x.id === id);
          if (idx === -1) return prev;
          const next = [...prev];
          const newIdx = Math.max(0, Math.min(prev.length - 1, idx + delta));
          const [item] = next.splice(idx, 1);
          next.splice(newIdx, 0, item);
          return next;
        }),
      setName,
      saveDeck: () => {
        if (!name.trim()) return;
        setSaved((prev) => {
          const others = prev.filter((d) => d.name !== name.trim());
          return [...others, {name: name.trim(), items}];
        });
      },
      loadDeck: (deckName: string) => {
        const match = saved.find((d) => d.name === deckName);
        if (match) {
          setItems(match.items);
          setName(match.name);
        }
      },
      clear: () => setItems([]),
    }),
    [items, name, saved],
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

function parseDeckParam(raw: string): DeckItem[] {
  const parts = raw.split(",");
  const items: DeckItem[] = [];
  for (const part of parts) {
    const [type, nameEncoded] = part.split("|");
    if (!type || !nameEncoded) continue;
    if (!["gifts", "hexes", "magifishes", "trinkets", "weapons", "boosts"].includes(type)) continue;
    const name = decodeURIComponent(nameEncoded);
    items.push({type: type as EntityType, name, id: deckId(type as EntityType, name)});
  }
  return items;
}
