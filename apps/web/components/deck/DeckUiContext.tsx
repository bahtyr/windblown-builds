"use client";

import {createContext, useContext, useEffect, useMemo, useState} from "react";

type DeckUiContextType = {
  open: boolean;
  openDeck: () => void;
  closeDeck: () => void;
};

const DeckUiContext = createContext<DeckUiContextType | null>(null);

/**
 * Provide local UI state for the deck builder drawer.
 *
 * @param {{ children: React.ReactNode }} props - Provider children.
 * @returns {JSX.Element} Context provider.
 */
export function DeckUiProvider({children}: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const setDrawerOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.pathname !== "/decks") return;
    if (nextOpen) {
      url.searchParams.set("builder", "open");
    } else {
      url.searchParams.delete("builder");
    }
    window.history.replaceState(null, "", url);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("builder") === "open") {
      setOpen(true);
    }
  }, []);

  const value = useMemo(
    () => ({
      open,
      openDeck: () => setDrawerOpen(true),
      closeDeck: () => setDrawerOpen(false),
    }),
    [open],
  );

  return <DeckUiContext.Provider value={value}>{children}</DeckUiContext.Provider>;
}

/**
 * Read deck builder drawer UI state from context.
 *
 * @returns {DeckUiContextType} Drawer UI actions and state.
 */
export function useDeckUi() {
  const ctx = useContext(DeckUiContext);
  if (!ctx) throw new Error("DeckUiContext missing");
  return ctx;
}
