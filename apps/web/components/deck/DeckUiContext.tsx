"use client";

import {type ReactNode} from "react";
import {
  GearCollectionEditorUiProvider,
  type GearCollectionEditorUiContextType,
  useGearCollectionEditorUi,
} from "../gear/GearCollectionEditorUiContext";

export type DeckUiContextType = {
  open: boolean;
  openDeck: () => void;
  closeDeck: () => void;
};

/**
 * Provides the legacy deck editor UI wrapper around the shared editor UI state.
 *
 * @param {{ children: React.ReactNode }} props - Provider children.
 * @returns {JSX.Element} Context provider.
 */
export function DeckUiProvider({children}: { children: ReactNode }) {
  return <GearCollectionEditorUiProvider keepOpenPathname="/decks">{children}</GearCollectionEditorUiProvider>;
}

/**
 * Reads deck builder drawer UI state from the shared editor UI context.
 *
 * @returns {DeckUiContextType} Drawer UI actions and state.
 */
export function useDeckUi(): DeckUiContextType {
  const ctx = useGearCollectionEditorUi();
  return {
    open: ctx.open,
    openDeck: ctx.openGearCollectionEditor,
    closeDeck: ctx.closeGearCollectionEditor,
  };
}

export type {GearCollectionEditorUiContextType};
