"use client";

import "./globals.css";
import {ReactNode, useEffect, useState} from "react";
import {DeckProvider} from "../components/deck/DeckContext";
import {LikeProvider} from "../components/like/LikeContext";
import NavBar from "../components/layout/NavBar";
import DeckPanel from "../components/deck/DeckPanel";

export default function RootLayout({children}: { children: ReactNode }) {
  const [deckOpen, setDeckOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const shouldOpenBuilder = ["/decks", "/browse"].includes(window.location.pathname) && params.get("builder") === "open";
    if (shouldOpenBuilder) {
      setDeckOpen(true);
    }
  }, []);

  return (
    <html lang="en">
    <body>
    <DeckProvider>
      <LikeProvider>
        <NavBar deckOpen={deckOpen} onToggleDeck={() => setDeckOpen((v) => !v)}/>
        <div className="app-shell">
          <DeckPanel open={deckOpen}/>
          <main className="app-main">{children}</main>
        </div>
      </LikeProvider>
    </DeckProvider>
    </body>
    </html>
  );
}
