"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";

const tabs: {href: string; label: string}[] = [
  {href: "/gifts", label: "Gifts"},
  {href: "/weapons", label: "Weapons"},
  {href: "/trinkets", label: "Trinkets"},
  {href: "/hexes", label: "Hexes"},
  {href: "/magifishes", label: "Magifish"},
  {href: "/effects", label: "Effects"},
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <header>
      <h1>Windblown Browser</h1>
      <nav className="tabs">
        {tabs.map((tab) => {
          const active = pathname?.startsWith(tab.href);
          return (
            <Link key={tab.href} className={`tab ${active ? "active" : ""}`} href={tab.href}>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
