"use client";

import "./globals.css";
import {ReactNode} from "react";
import {DeckProvider} from "../components/deck/DeckContext";
import {DeckUiProvider, useDeckUi} from "../components/deck/DeckUiContext";
import {LikeProvider} from "../components/like/LikeContext";
import NavBar from "../components/layout/NavBar";
import DeckPanel from "../components/deck/DeckPanel";

export default function RootLayout({children}: { children: ReactNode }) {
  return (
    <html lang="en">
    <body>
    <DeckProvider>
      <DeckUiProvider>
        <LikeProvider>
          <AppChrome>{children}</AppChrome>
        </LikeProvider>
      </DeckUiProvider>
    </DeckProvider>
    </body>
    </html>
  );
}

function AppChrome({children}: { children: ReactNode }) {
  const deckUi = useDeckUi();

  return (
    <>
      <NavBar deckOpen={deckUi.open} onToggleDeck={deckUi.toggleDeck}/>
      <div className="app-shell">
        <DeckPanel open={deckUi.open}/>
        <main className="app-main">{children}</main>
      </div>
    </>
  );
}
