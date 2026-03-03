"use client";

import {useMemo} from "react";
import {ScrapedEntity} from "../../lib/types";

type Props = {
  items: ScrapedEntity[];
  search: string;
  onSearch: (v: string) => void;
  selectedEntity: string;
  onEntityChange: (id: string) => void;
};

export default function Filters({items, search, onSearch, selectedEntity, onEntityChange}: Props) {
  const entityOptions = useMemo(() => collectEntityOptions(items), [items]);

  return (
    <>
      <label htmlFor="entitySelect">Entities:</label>
      <select id="entitySelect" value={selectedEntity} onChange={(e) => onEntityChange(e.target.value)}>
        <option value="">No filter</option>
        {entityOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <label htmlFor="searchInput">Search:</label>
      <input
        id="searchInput"
        type="text"
        placeholder="name/category/text…"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
      <button className="btn" type="button" onClick={() => onSearch("")}>
        Clear
      </button>
    </>
  );
}

function collectEntityOptions(items: ScrapedEntity[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    for (const part of item.richDescription || []) {
      if (part.key !== "entity") continue;
      if (part.href) set.add(part.href.split("?")[0]);
      else if (part.id) set.add(part.id);
    }
  }
  return Array.from(set).sort();
}
