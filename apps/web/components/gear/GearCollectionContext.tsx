"use client";

import {createContext, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction} from "react";
import {
  type Gear,
  type GearCollectionSnapshot,
  type GearLimits,
  hydrateGears,
  insertGearByType,
  reorderGearsWithinType,
  restoreGearCollectionSnapshot,
} from "./gear-collection-utils";

type GearCollectionMode = "new" | "editing";

export type GearCollectionContextType = {
  items: Gear[];
  name: string;
  editingCollectionName: string | null;
  mode: GearCollectionMode;
  add: (item: Gear, limits: GearLimits) => { ok: boolean; reason?: string };
  remove: (id: string) => void;
  moveWithinType: (type: Gear["type"], from: number, to: number) => void;
  setName: (name: string) => void;
  setItems: Dispatch<SetStateAction<Gear[]>>;
  setEditingCollectionName: Dispatch<SetStateAction<string | null>>;
  captureSnapshot: () => GearCollectionSnapshot;
  restoreSnapshot: (snapshot: GearCollectionSnapshot | null) => void;
  resetGearCollection: () => void;
};

type GearCollectionProviderProps = {
  children: ReactNode;
  defaultName: string;
  storageKey: string;
};

const GearCollectionContext = createContext<GearCollectionContextType | null>(null);

/**
 * Provides the active editable gear collection state and core mutations.
 *
 * @param {GearCollectionProviderProps} props - Provider children and persistence options.
 * @returns {JSX.Element} Shared gear collection context provider.
 */
export function GearCollectionProvider({children, defaultName, storageKey}: GearCollectionProviderProps) {
  const [items, setItems] = useState<Gear[]>([]);
  const [name, setNameState] = useState<string>(defaultName);
  const [editingCollectionName, setEditingCollectionName] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as {
          items?: Gear[];
          name?: string;
          editingCollectionName?: string | null;
          editingDeckName?: string | null;
        };
        setItems(parsed.items || []);
        setNameState(normalizeCollectionName(parsed.name, defaultName));
        setEditingCollectionName(
          typeof parsed.editingCollectionName === "string"
            ? parsed.editingCollectionName
            : (typeof parsed.editingDeckName === "string" ? parsed.editingDeckName : null),
        );
      } catch {
        // Ignore invalid persisted collection state.
      }
    }

    setHydrated(true);
  }, [defaultName, storageKey]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    localStorage.setItem(storageKey, JSON.stringify({items, name, editingCollectionName}));
  }, [editingCollectionName, hydrated, items, name, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    hydrateGears(items).then((nextItems) => {
      if (!cancelled && nextItems !== items) {
        setItems(nextItems);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hydrated, items]);

  const mode: GearCollectionMode = editingCollectionName ? "editing" : "new";

  const value = useMemo<GearCollectionContextType>(
    () => ({
      items,
      name,
      editingCollectionName,
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
        setItems((prev) => insertGearByType(prev, item));
        return {ok: true};
      },
      remove: (id) => setItems((prev) => prev.filter((item) => item.id !== id)),
      moveWithinType: (type, from, to) => setItems((prev) => reorderGearsWithinType(prev, type, from, to)),
      setName: (nextName) => setNameState(normalizeCollectionName(nextName, defaultName)),
      setItems,
      setEditingCollectionName,
      captureSnapshot: () => ({items, name, editingCollectionName}),
      restoreSnapshot: (snapshot) => {
        const restored = restoreGearCollectionSnapshot(snapshot, defaultName);
        setItems(restored.items);
        setNameState(restored.name);
        setEditingCollectionName(restored.editingCollectionName);
      },
      resetGearCollection: () => setItems([]),
    }),
    [defaultName, editingCollectionName, items, mode, name],
  );

  return <GearCollectionContext.Provider value={value}>{children}</GearCollectionContext.Provider>;
}

/**
 * Reads the active editable gear collection state and mutations.
 *
 * @returns {GearCollectionContextType} Shared gear collection API.
 */
export function useGearCollection(): GearCollectionContextType {
  const ctx = useContext(GearCollectionContext);
  if (!ctx) throw new Error("GearCollectionContext missing");
  return ctx;
}

function normalizeCollectionName(value: string | undefined, defaultName: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : defaultName;
}
