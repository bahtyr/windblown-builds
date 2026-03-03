"use client";

import {useMemo} from "react";
import {ScrapedEntity} from "../../lib/types";

type Props = {
  items: ScrapedEntity[];
  search: string;
  onSearch: (v: string) => void;
  selectedEntity: string;
  onEntityChange: (id: string) => void;
  likedOnly: boolean;
  onLikedChange: (v: boolean) => void;
};

export default function Filters({items, search, onSearch, selectedEntity, onEntityChange, likedOnly, onLikedChange}: Props) {
  const entityOptions = useMemo(() => collectEntityOptions(items), [items]);

  return (
    <>
      <label htmlFor="entitySelect">Entities:</label>
      <select id="entitySelect" value={selectedEntity} onChange={(e) => onEntityChange(e.target.value)}>
        <option value="">No filter</option>
        {entityOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
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
      <label htmlFor="likedOnly">Liked only:</label>
      <input
        id="likedOnly"
        type="checkbox"
        checked={likedOnly}
        onChange={(e) => onLikedChange(e.target.checked)}
      />
      <button
        className="btn"
        type="button"
        onClick={() => {
          onSearch("");
          onEntityChange("");
          onLikedChange(false);
        }}
      >
        Clear
      </button>
    </>
  );
}

function collectEntityOptions(items: ScrapedEntity[]): { value: string; label: string }[] {
  const map = new Map<string, string>();
  for (const item of items) {
    for (const part of item.richDescription || []) {
      if (part.key !== "entity") continue;
      if (part.href) {
        const value = part.href.split("?")[0];
        map.set(value, displayLabel(value));
      } else if (part.id) {
        map.set(part.id, displayLabel(part.id));
      }
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, label]) => ({value, label}));
}

function displayLabel(value: string): string {
  const wikiIdx = value.indexOf("/wiki/");
  if (wikiIdx !== -1) {
    return value.slice(wikiIdx + "/wiki/".length);
  }
  return value;
}
