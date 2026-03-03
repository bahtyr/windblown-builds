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

export default function NavBar() {
  const pathname = usePathname();
  return (
    <header className="body-wrapper">
      <h1>Windblown Browser</h1>
      <nav className="tabs">
        {tabs.map((tab) => {
          const active = pathname?.startsWith("/" + tab.type);
          return (
            <Link
              key={tab.type}
              className={`tab ${active ? "active" : ""}`}
              href={{pathname: "/[type]", query: {type: tab.type}}}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
