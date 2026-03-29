"use client";

import "./globals.css";
import {ReactNode} from "react";
import {DeckProvider} from "../components/deck/DeckContext";
import {DeckUiProvider} from "../components/deck/DeckUiContext";
import {LikeProvider} from "../components/like/LikeContext";
import NavBar from "../components/layout/NavBar";

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
  return (
    <>
      <NavBar/>
      <div className="app-shell">
        <main className="app-main">{children}</main>
      </div>
    </>
  );
}
