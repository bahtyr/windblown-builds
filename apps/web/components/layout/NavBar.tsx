"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {EntityType} from "../../lib/types";

const tabs: { type: EntityType; label: string }[] = [
  {type: "gifts", label: "Gifts"},
  {type: "weapons", label: "Weapons"},
  {type: "trinkets", label: "Trinkets"},
  {type: "hexes", label: "Hexes"},
  {type: "magifishes", label: "Magifish"},
  {type: "effects", label: "Effects"},
] as const;

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
          {tabs.map((tab) => {
            const active = pathname?.startsWith(`/${tab.type}`);
            return (
              <Link
                key={tab.type}
                className={`tab ${active ? "is-active" : ""}`}
                href={`/${tab.type}`}>
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <button className={`deck-toggle ${deckOpen ? "is-active" : ""}`} type="button" onClick={onToggleDeck}>
          {deckOpen ? "Hide deck builder" : "Deck builder"}
        </button>
      </div>
    </header>
  );
}
