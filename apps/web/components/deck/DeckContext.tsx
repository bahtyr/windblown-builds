"use client";

import {createContext, useContext, useEffect, useMemo, useState, type ReactNode} from "react";
import {saveExternalDeck} from "../../app/gift-match/run-build-flow";
import {
  GearCollectionProvider,
  type GearCollectionContextType,
  useGearCollection,
} from "../gear/GearCollectionContext";
import {
  type Gear,
  type GearCollectionSnapshot,
  type GearLimits,
  gearId,
  groupGearsByType,
  hydrateGears,
  makeGear,
  parseGearCollectionParam,
  restoreGearCollectionSnapshot,
} from "../gear/gear-collection-utils";

export type DeckItem = Gear;
export type DeckLimits = GearLimits;

export type SavedDeck = {
  name: string;
  items: Gear[];
  createdAt: string;
};

export type SharedDeck = SavedDeck & {
  source: "shared";
};

type DeckMode = "new" | "editing";
type EditingSource = "saved" | "shared" | null;

export type DeckSessionSnapshot = {
  items: Gear[];
  name: string;
  editingDeckName: string | null;
};

export type DeckContextType = {
  items: Gear[];
  name: string;
  saved: SavedDeck[];
  sharedDeck: SharedDeck | null;
  editingDeckName: string | null;
  isEditingBuild: boolean;
  mode: DeckMode;
  add: (item: Gear, limits: GearLimits) => { ok: boolean; reason?: string };
  remove: (id: string) => void;
  moveWithinType: GearCollectionContextType["moveWithinType"];
  setName: (name: string) => void;
  saveDeck: (asNew?: boolean) => void;
  saveImportedDeck: (name: string, items: Gear[]) => string;
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
 * Provides the legacy deck context API backed by the shared gear collection provider.
 *
 * @param {{ children: React.ReactNode }} props - Provider children.
 * @returns {JSX.Element} Context provider.
 */
export function DeckProvider({children}: { children: ReactNode }) {
  return (
    <GearCollectionProvider
      defaultName={DEFAULT_DECK_NAME}
      storageKey={STORAGE_KEY}
      storageMigration={migrateDeckCollectionStorage}
      messages={{
        disallowedType: () => "Effects cannot be added to deck",
      }}
    >
      <DeckProviderContent>{children}</DeckProviderContent>
    </GearCollectionProvider>
  );
}

function DeckProviderContent({children}: { children: ReactNode }) {
  const gearCollection = useGearCollection();
  const [saved, setSaved] = useState<SavedDeck[]>([]);
  const [sharedDeck, setSharedDeck] = useState<SharedDeck | null>(null);
  const [sessionStart, setSessionStart] = useState<DeckSessionSnapshot | null>(null);
  const [editingSource, setEditingSource] = useState<EditingSource>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedDecks = localStorage.getItem(STORAGE_SAVED);
    if (savedDecks) {
      try {
        const parsed = normalizeSavedDecks(JSON.parse(savedDecks) as Array<SavedDeck | { name: string; items: Gear[] }>);
        setSaved(parsed);
      } catch {
        // Ignore invalid persisted saved deck state.
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
    localStorage.setItem(STORAGE_SAVED, JSON.stringify(saved));
  }, [hydrated, saved]);

  useEffect(() => {
    if (!hydrated || !sharedDeck) return;
    let cancelled = false;

    hydrateGears(sharedDeck.items).then((nextItems) => {
      if (!cancelled && nextItems !== sharedDeck.items) {
        setSharedDeck((prev) => (prev ? {...prev, items: nextItems} : prev));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hydrated, sharedDeck]);

  const editingDeckName = gearCollection.editingCollectionName;
  const mode: DeckMode = gearCollection.mode;
  const isEditingBuild = isEditingDeckSession(editingDeckName, editingSource);

  const api = useMemo<DeckContextType>(
    () => ({
      items: gearCollection.items,
      name: gearCollection.name,
      saved,
      sharedDeck,
      editingDeckName,
      isEditingBuild,
      mode,
      add: gearCollection.add,
      remove: gearCollection.remove,
      moveWithinType: gearCollection.moveWithinType,
      setName: gearCollection.renameCollection,
      saveDeck: (asNew) => {
        const desiredName = normalizeDeckName(gearCollection.name);
        if (mode === "editing" && !asNew && editingDeckName) {
          setSaved((prev) => updateSavedDeck(prev, editingDeckName, desiredName, gearCollection.items));
          gearCollection.setEditingCollectionName(desiredName);
          gearCollection.renameCollection(desiredName);
          setSessionStart(null);
          setEditingSource("saved");
          return;
        }

        const targetName = ensureUniqueDeckName(saved, desiredName);
        setSaved((prev) => [...prev, {name: targetName, items: gearCollection.items, createdAt: createTimestamp()}]);
        gearCollection.setEditingCollectionName(targetName);
        gearCollection.renameCollection(targetName);
        setSessionStart(null);
        if (editingSource === "shared") {
          setSharedDeck(null);
          clearSharedDeckUrl();
        }
        setEditingSource("saved");
      },
      saveImportedDeck: (deckName, nextItems) => {
        const orderedItems = groupGearsByType(nextItems);
        const persisted = saveExternalDeck(saved, deckName, orderedItems);
        setSaved(persisted.saved);
        gearCollection.replaceCollection(persisted.savedDeck.items);
        gearCollection.setEditingCollectionName(persisted.savedDeck.name);
        gearCollection.renameCollection(persisted.savedDeck.name);
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
        setSessionStart(captureDeckSessionSnapshot(gearCollection));
        gearCollection.clearCollection();
        gearCollection.renameCollection(DEFAULT_DECK_NAME);
        gearCollection.setEditingCollectionName(null);
        setEditingSource(null);
      },
      loadDeck: (deckName) => {
        const match = saved.find((deck) => deck.name === deckName);
        if (!match) return;
        setSessionStart(captureDeckSessionSnapshot(gearCollection));
        gearCollection.loadCollection({
          items: match.items,
          name: match.name,
          editingCollectionName: match.name,
        });
        setEditingSource("saved");
      },
      editSharedDeck: () => {
        if (!sharedDeck) return;
        setSessionStart(captureDeckSessionSnapshot(gearCollection));
        gearCollection.loadCollection({
          items: sharedDeck.items,
          name: sharedDeck.name,
          editingCollectionName: null,
        });
        setEditingSource("shared");
      },
      cancelEditing: () => {
        gearCollection.restoreSnapshot(toGearCollectionSnapshot(restoreDeckSession(sessionStart)));
        setSessionStart(null);
        setEditingSource(null);
      },
      deleteDeck: (deckName) => {
        setSaved((prev) => prev.filter((deck) => deck.name !== deckName));
        if (editingDeckName === deckName) {
          gearCollection.loadCollection({
            items: [],
            name: DEFAULT_DECK_NAME,
            editingCollectionName: null,
          });
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
      resetDeck: gearCollection.clearCollection,
    }),
    [editingDeckName, editingSource, gearCollection, isEditingBuild, mode, saved, sessionStart, sharedDeck],
  );

  return <DeckContext.Provider value={api}>{children}</DeckContext.Provider>;
}

/**
 * Reads active deck state and actions from the compatibility wrapper context.
 *
 * @returns {DeckContextType} Deck state and mutations.
 */
export function useDeck(): DeckContextType {
  const ctx = useContext(DeckContext);
  if (!ctx) throw new Error("DeckContext missing");
  return ctx;
}

/**
 * Builds a stable deck item identifier from the entity type and entity name.
 *
 * @param {Gear["type"]} type - Entity type.
 * @param {string} name - Entity name.
 * @returns {string} Deck item identifier.
 */
export const deckId = gearId;

/**
 * Converts a scraped entity into the deck item format used by the legacy deck builder.
 *
 * @param {Gear["type"]} type - Entity type.
 * @param {Parameters<typeof makeGear>[1]} entity - Source entity.
 * @returns {DeckItem} Deck item payload.
 */
export const makeDeckItem = makeGear;

/**
 * Groups deck items by the canonical deck display order while preserving arrival order inside each group.
 *
 * @param {DeckItem[]} items - Flat deck item list.
 * @returns {DeckItem[]} Reordered deck items with stable within-group order.
 */
export const groupDeckItemsByType = groupGearsByType;

/**
 * Removes a deck and returns the first remaining saved deck, or a default empty one.
 *
 * @param {{name: string; items: Gear[]; createdAt?: string}[]} list - Current saved decks.
 * @param {string} deckName - Deck being removed.
 * @returns {{saved: {name: string; items: Gear[]; createdAt: string}[]; firstSaved: {name: string; items: Gear[]; createdAt: string}}} Remaining decks and first selectable deck.
 */
export function selectFirstSavedAfterDelete(
  list: { name: string; items: Gear[]; createdAt?: string }[],
  deckName: string,
): { saved: { name: string; items: Gear[]; createdAt: string }[]; firstSaved: { name: string; items: Gear[]; createdAt: string } } {
  const normalizedFiltered = normalizeSavedDecks(list.filter((deck) => deck.name !== deckName));
  if (normalizedFiltered.length > 0) {
    return {saved: normalizedFiltered, firstSaved: normalizedFiltered[0]};
  }
  const created = {name: DEFAULT_DECK_NAME, items: [] as Gear[], createdAt: createTimestamp()};
  return {saved: [created], firstSaved: created};
}

/**
 * Normalizes persisted decks so older payloads gain creation timestamps.
 *
 * @param {Array<SavedDeck | { name: string; items: Gear[] }>} list - Raw saved decks from storage.
 * @returns {SavedDeck[]} Normalized saved deck list.
 */
export function normalizeSavedDecks(list: Array<SavedDeck | { name: string; items: Gear[] }>): SavedDeck[] {
  return list.map((deck) => ({
    name: normalizeDeckName(deck.name),
    items: deck.items,
    createdAt: "createdAt" in deck && typeof deck.createdAt === "string" ? deck.createdAt : createTimestamp(),
  }));
}

/**
 * Builds a unique copy name for a duplicated deck.
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

function updateSavedDeck(list: SavedDeck[], sourceName: string, targetName: string, items: Gear[]): SavedDeck[] {
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
 * Resolves the state that should be restored when a deck edit session is cancelled.
 *
 * @param {DeckSessionSnapshot | null} snapshot - Starting state captured when the session opened.
 * @returns {DeckSessionSnapshot} Restored state for the editor.
 */
export function restoreDeckSession(snapshot: DeckSessionSnapshot | null): DeckSessionSnapshot {
  const restored = restoreGearCollectionSnapshot(
    snapshot
      ? {
          items: snapshot.items,
          name: snapshot.name,
          editingCollectionName: snapshot.editingDeckName,
        }
      : null,
    DEFAULT_DECK_NAME,
  );
  return {
    items: restored.items,
    name: restored.name,
    editingDeckName: restored.editingCollectionName,
  };
}

/**
 * Determines whether the builder is currently editing an existing saved or shared build.
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
 * Parses a transient shared deck from the current `/decks` URL.
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
  const items = parseGearCollectionParam(rawDeck);
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
 * Removes transient shared deck params from the current URL.
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

function migrateDeckCollectionStorage(parsed: unknown): {
  items?: Gear[];
  name?: string;
  editingCollectionName?: string | null;
} {
  if (!parsed || typeof parsed !== "object") {
    return {};
  }

  const value = parsed as {
    items?: Gear[];
    name?: string;
    editingCollectionName?: string | null;
    editingDeckName?: string | null;
  };

  return {
    items: value.items,
    name: value.name,
    editingCollectionName:
      typeof value.editingCollectionName === "string"
        ? value.editingCollectionName
        : (typeof value.editingDeckName === "string" ? value.editingDeckName : null),
  };
}

function captureDeckSessionSnapshot(gearCollection: GearCollectionContextType): DeckSessionSnapshot {
  const snapshot = gearCollection.captureSnapshot();
  return {
    items: snapshot.items,
    name: snapshot.name,
    editingDeckName: snapshot.editingCollectionName,
  };
}

function toGearCollectionSnapshot(snapshot: DeckSessionSnapshot): GearCollectionSnapshot {
  return {
    items: snapshot.items,
    name: snapshot.name,
    editingCollectionName: snapshot.editingDeckName,
  };
}
