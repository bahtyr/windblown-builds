"use client";

import "./globals.css";
import {ReactNode} from "react";
import {DeckProvider} from "../components/deck/DeckContext";
import {LikeProvider} from "../components/like/LikeContext";
import NavBar from "../components/layout/NavBar";
import DeckPanel from "../components/deck/DeckPanel";

export default function RootLayout({children}: { children: ReactNode }) {
  return (
    <html lang="en">
    <body>
    <DeckProvider>
      <LikeProvider>
        <NavBar/>
        <DeckPanel/>
        <main>{children}</main>
      </LikeProvider>
    </DeckProvider>
    </body>
    </html>
  );
}
