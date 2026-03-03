"use client";

import {useEffect, useMemo, useState} from "react";
import {EntityType, ScrapedEntity} from "../../lib/types";
import {DeckLimits, useDeck} from "../../components/deck/DeckContext";
import {useLikes} from "../../components/like/LikeContext";
import EntityCard from "../../components/entity/EntityCard";
import Filters from "../../components/entity/Filters";
import {loadEntities} from "../../lib/loadEntities";

const VALID_TYPES: EntityType[] = ["gifts", "weapons", "trinkets", "hexes", "magifishes", "effects"];

export default function EntityPage({params}: { params: { type: string } }) {
  const type = (VALID_TYPES.includes(params.type as EntityType) ? params.type : "gifts") as EntityType;

  const [items, setItems] = useState<ScrapedEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<string>("");

  const deck = useDeck();
  const likes = useLikes();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loadEntities(type)
      .then((data) => {
        if (mounted) {
          setItems(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (mounted) setError(err instanceof Error ? err.message : "Failed to load data");
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [type]);

  const grouped = useMemo(() => groupByCategory(items, type), [items, type]);

  const matchesFilters = (item: ScrapedEntity) => {
    const matchSearch = !search || (item.name + " " + item.description).toLowerCase().includes(search.toLowerCase());
    const matchEntity = !selectedEntity || entityIds(item).includes(selectedEntity);
    return matchSearch && matchEntity;
  };

  const limits: DeckLimits = {
    gifts: 20,
    hexes: 3,
    magifishes: 1,
    weapons: 2,
    trinkets: 2,
  };

  return (
    <div className="page">
      <div className="body-wrapper">
        <div className="controls">
          <Filters
            items={items}
            search={search}
            onSearch={setSearch}
            selectedEntity={selectedEntity}
            onEntityChange={setSelectedEntity}
          />
          <div className="count">{items.length} total</div>
        </div>
      </div>

      {loading && <div className="status">Loading…</div>}
      {error && <div className="status error">{error}</div>}

      {!loading && !error && (
        <section className="sections body-wrapper">
          {grouped.map(([cat, list]) => {
            const filtered = list.filter(matchesFilters);
            return (
              <div className="section" key={cat}>
                <div className="section-header">
                  <h2>{cat}</h2>
                  <div className="section-sub">
                    {filtered.length}/{list.length} items
                  </div>
                </div>
                <div className="cards">
                  {list.map((item, idx) => {
                    const matched = filtered.includes(item);
                    const inDeck = deck.items.some((d) => d.id === `${type}:${item.name}`);
                    return (
                      <EntityCard
                        key={`${type}-${item.name}-${idx}`}
                        item={item}
                        type={type}
                        highlight={inDeck}
                        deck={deck}
                        likes={likes}
                        limits={limits}
                        fade={!matched}
                        inDeck={inDeck}
                        onEntityFilter={(id) => setSelectedEntity(id)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function groupByCategory(list: ScrapedEntity[], type: EntityType): [string, ScrapedEntity[]][] {
  const map = new Map<string, ScrapedEntity[]>();
  for (const item of list) {
    const fallback = type.charAt(0).toUpperCase() + type.slice(1);
    const key = (item as any).category?.trim?.() || fallback;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return [...map.entries()];
}

function entityIds(item: ScrapedEntity): string[] {
  const ids: string[] = [];
  for (const part of item.richDescription || []) {
    if (part.key !== "entity") continue;
    const href = part.href || "";
    const norm = href.split("?")[0];
    if (norm) ids.push(norm);
  }
  return ids;
}

// todo
// clicking on same entity within card should remove this filter
// deck save to local storage not working
// cleanup deck save buttons very confusing right now
// currently not clear when a deck is overritwn vs new deck
// deck list ui
// show remove on hover only
// spacing beetween items reduce
// regular saved text should be white regular color, selcted can be blue
// save decks linearly horiztonal? like nav items at top isntead of veritcal
// missing entity icons
// move section count next to header
// adjust count on filter applied
// move deck separate from header nav. make it sticky footer
// deck dashed border doesn't need to be per group of deck items. one dashed border for the whole deck is better
