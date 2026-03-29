"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";

export default function NavBar() {
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
      </div>
    </header>
  );
}
