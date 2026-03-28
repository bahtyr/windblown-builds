"use client";

import {createContext, useContext, useEffect, useMemo, useState} from "react";

type DeckUiContextType = {
  open: boolean;
  openDeck: () => void;
  closeDeck: () => void;
  toggleDeck: () => void;
};

const DeckUiContext = createContext<DeckUiContextType | null>(null);

export function DeckUiProvider({children}: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

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
      openDeck: () => setOpen(true),
      closeDeck: () => setOpen(false),
      toggleDeck: () => setOpen((prev) => !prev),
    }),
    [open],
  );

  return <DeckUiContext.Provider value={value}>{children}</DeckUiContext.Provider>;
}

export function useDeckUi() {
  const ctx = useContext(DeckUiContext);
  if (!ctx) throw new Error("DeckUiContext missing");
  return ctx;
}
