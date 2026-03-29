"use client";

import {createContext, useContext, useEffect, useMemo, useState} from "react";
import {usePathname} from "next/navigation";

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
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/decks") return;
    setOpen(false);
  }, [pathname]);

  const value = useMemo(
    () => ({
      open,
      openDeck: () => setOpen(true),
      closeDeck: () => setOpen(false),
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
