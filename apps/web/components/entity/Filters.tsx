"use client";

import {useMemo} from "react";
import {ScrapedEntity} from "../../lib/types";
import {MatchDisplayMode} from "../../app/[type]/entity-utils";

type Props = {
  items: ScrapedEntity[];
  search: string;
  onSearch: (v: string) => void;
  selectedEntity: string;
  onEntityChange: (id: string) => void;
  likedOnly: boolean;
  onLikedChange: (v: boolean) => void;
  deckOnly: boolean;
  onDeckChange: (v: boolean) => void;
  matchDisplayMode: MatchDisplayMode;
  onMatchDisplayModeChange: (mode: MatchDisplayMode) => void;
};

export default function Filters({
  items,
  search,
  onSearch,
  selectedEntity,
  onEntityChange,
  likedOnly,
  onLikedChange,
  deckOnly,
  onDeckChange,
  matchDisplayMode,
  onMatchDisplayModeChange,
}: Props) {
  const entityOptions = useMemo(() => collectEntityOptions(items), [items]);

  return (
    <>
      <button
        className="btn"
        type="button"
        onClick={() => {
          onSearch("");
          onEntityChange("");
          onLikedChange(false);
          onDeckChange(false);
        }}
      >
        Clear
      </button>
      <button
        type="button"
        className={`pill-toggle ${likedOnly ? "is-active" : ""}`}
        onClick={() => onLikedChange(!likedOnly)}
        aria-pressed={likedOnly}
      >
        ❤️ Liked
      </button>
      <button
        type="button"
        className={`pill-toggle ${deckOnly ? "is-active" : ""}`}
        onClick={() => onDeckChange(!deckOnly)}
        aria-pressed={deckOnly}
      >
        🧩 In deck
      </button>
      <select id="entitySelect" value={selectedEntity} onChange={(e) => onEntityChange(e.target.value)}>
        <option value="">Entities</option>
        {entityOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <input
        id="searchInput"
        type="text"
        placeholder="Search name/category/text…"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
      <button
        type="button"
        className={`pill-toggle ${matchDisplayMode === "show-matches-only" ? "is-active" : ""}`}
        onClick={() =>
          onMatchDisplayModeChange(matchDisplayMode === "fade-unmatched" ? "show-matches-only" : "fade-unmatched")
        }
        aria-pressed={matchDisplayMode === "show-matches-only"}
      >
        {/*{matchDisplayMode === "fade-unmatched" ? "Hide unmatched result" : "Unmatched: Hidden"}*/}
        {matchDisplayMode === "fade-unmatched" ? "Fade matching results" : "Show only matching results"}
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
