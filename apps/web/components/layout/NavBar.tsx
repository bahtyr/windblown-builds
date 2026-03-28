"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";

type Props = {
  deckOpen: boolean;
  onToggleDeck: () => void;
};

export default function NavBar({deckOpen, onToggleDeck}: Props) {
  const pathname = usePathname();
  return (
    <header className="header">
      <div className="header-body body-wrapper">
        <span className="logo-text">Windblown Browser</span>
        <nav className="tabs">
          <Link className={`tab ${pathname === "/decks" ? "is-active" : ""}`} href="/decks">
            Decks
          </Link>
          <Link className={`tab ${pathname === "/browse" ? "is-active" : ""}`} href="/browse">
            Browse
          </Link>
        </nav>
        <button className={`deck-toggle ${deckOpen ? "is-active" : ""}`} type="button" onClick={onToggleDeck}>
          {deckOpen ? "Hide deck builder" : "Deck builder"}
        </button>
      </div>
    </header>
  );
}
