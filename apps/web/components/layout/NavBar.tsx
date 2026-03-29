"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="header">
      <div className="header-body body-wrapper">
        <span className="logo-text">Windblown Browser</span>
        <div className="header-nav">
          <nav className="tabs">
            <Link className={`tab ${pathname === "/decks" ? "is-active" : ""}`} href="/decks">
              Decks
            </Link>
            <Link className={`tab ${pathname === "/browse" ? "is-active" : ""}`} href="/browse">
              Browse
            </Link>
          </nav>
          <nav className="tabs tabs-secondary" aria-label="Community links">
            <Link className="tab tab-secondary" href="https://windblown.wiki.gg/" rel="noreferrer" target="_blank">
              Wiki ↗
            </Link>
            <Link className="tab tab-secondary" href="https://www.reddit.com/r/WindblownGame/" rel="noreferrer" target="_blank">
              Reddit ↗
            </Link>
            <Link className="tab tab-secondary" href="https://discord.com/invite/v4S6Vsarkx" rel="noreferrer" target="_blank">
              Discord ↗
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
