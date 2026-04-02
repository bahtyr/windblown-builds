"use client";

import {createContext, useContext, useEffect, useMemo, useState, type ReactNode} from "react";
import {
  type Gear,
  type GearCollectionSnapshot,
  type GearLimits,
  groupGearsByType,
  hydrateGears,
  insertGearByType,
  normalizeCollectionName,
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
  renameCollection: (name: string) => void;
  replaceCollection: (items: Gear[]) => void;
  setEditingCollectionName: (name: string | null) => void;
  loadCollection: (snapshot: GearCollectionSnapshot) => void;
  captureSnapshot: () => GearCollectionSnapshot;
  restoreSnapshot: (snapshot: GearCollectionSnapshot | null) => void;
  clearCollection: () => void;
};

type GearCollectionProviderProps = {
  children: ReactNode;
  defaultName: string;
  storageKey: string;
  storageMigration?: (parsed: unknown) => {
    items?: Gear[];
    name?: string;
    editingCollectionName?: string | null;
  };
  messages?: {
    duplicateNotAllowed?: string;
    disallowedType?: (type: Gear["type"]) => string;
    limitReached?: (type: Gear["type"]) => string;
  };
};

const GearCollectionContext = createContext<GearCollectionContextType | null>(null);

/**
 * Provides the active editable gear collection state and core mutations.
 *
 * @param {GearCollectionProviderProps} props - Provider children and persistence options.
 * @returns {JSX.Element} Shared gear collection context provider.
 */
export function GearCollectionProvider({
  children,
  defaultName,
  storageKey,
  storageMigration,
  messages,
}: GearCollectionProviderProps) {
  const [items, setItems] = useState<Gear[]>([]);
  const [name, setNameState] = useState<string>(defaultName);
  const [editingCollectionName, setEditingCollectionName] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = storageMigration
          ? storageMigration(JSON.parse(stored))
          : (JSON.parse(stored) as {
            items?: Gear[];
            name?: string;
            editingCollectionName?: string | null;
          });
        setItems(parsed.items || []);
        setNameState(normalizeCollectionName(parsed.name, defaultName));
        setEditingCollectionName(typeof parsed.editingCollectionName === "string" ? parsed.editingCollectionName : null);
      } catch {
        // Ignore invalid persisted collection state.
      }
    }

    setHydrated(true);
  }, [defaultName, storageKey, storageMigration]);

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
          return {ok: false, reason: messages?.duplicateNotAllowed ?? "Duplicate not allowed"};
        }
        if (item.type === "effects") {
          return {ok: false, reason: messages?.disallowedType?.(item.type) ?? `Items of type "${item.type}" cannot be added`};
        }
        const limit = limits[item.type];
        if (limit !== undefined) {
          const count = items.filter((current) => current.type === item.type).length;
          if (count >= limit) {
            return {ok: false, reason: messages?.limitReached?.(item.type) ?? `Limit reached for ${item.type}`};
          }
        }
        setItems((prev) => insertGearByType(prev, item));
        return {ok: true};
      },
      remove: (id) => setItems((prev) => prev.filter((item) => item.id !== id)),
      moveWithinType: (type, from, to) => setItems((prev) => reorderGearsWithinType(prev, type, from, to)),
      renameCollection: (nextName) => setNameState(normalizeCollectionName(nextName, defaultName)),
      replaceCollection: (nextItems) => setItems(groupGearsByType(nextItems)),
      setEditingCollectionName: (nextName) => setEditingCollectionName(nextName),
      loadCollection: (snapshot) => {
        setItems(groupGearsByType(snapshot.items));
        setNameState(normalizeCollectionName(snapshot.name, defaultName));
        setEditingCollectionName(snapshot.editingCollectionName);
      },
      captureSnapshot: () => ({items, name, editingCollectionName}),
      restoreSnapshot: (snapshot) => {
        const restored = restoreGearCollectionSnapshot(snapshot, defaultName);
        setItems(groupGearsByType(restored.items));
        setNameState(normalizeCollectionName(restored.name, defaultName));
        setEditingCollectionName(restored.editingCollectionName);
      },
      clearCollection: () => setItems([]),
    }),
    [defaultName, editingCollectionName, items, messages, mode, name],
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
