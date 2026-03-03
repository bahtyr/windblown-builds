"use client";

import {useEffect, useMemo, useRef, useState} from "react";
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
  const [likedOnly, setLikedOnly] = useState(false);
  const [deckOnly, setDeckOnly] = useState(false);

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
    const liked = likes.ids.has(`${type}:${item.name}`);
    const matchLiked = !likedOnly || liked;
    const inDeck = deck.items.some((d) => d.id === `${type}:${item.name}`);
    const matchDeck = !deckOnly || inDeck;
    return matchSearch && matchEntity && matchLiked && matchDeck;
  };

  const filteredCount = useMemo(
    () => items.filter(matchesFilters).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, search, selectedEntity, likedOnly, deckOnly, likes.ids, deck.items],
  );

  const [matchNav, setMatchNav] = useState<{ above: number; below: number }>({above: 0, below: 0});
  const scrollTimer = useRef<number | null>(null);

  const collectMatches = () =>
    Array.from(document.querySelectorAll<HTMLElement>(".card:not(.faded)")).map((el) => ({
      el,
      rect: el.getBoundingClientRect(),
    }));

  const refreshMatchNav = () => {
    const matches = collectMatches();
    const above = matches.filter((m) => m.rect.bottom < 0).length;
    const below = matches.filter((m) => m.rect.top > window.innerHeight).length;
    setMatchNav({above, below});
  };

  const scrollToNearest = (direction: "up" | "down") => {
    const matches = collectMatches();
    if (matches.length === 0) return;
    const candidates =
      direction === "up"
        ? matches.filter((m) => m.rect.bottom < 0).sort((a, b) => b.rect.bottom - a.rect.bottom)
        : matches.filter((m) => m.rect.top > window.innerHeight).sort((a, b) => a.rect.top - b.rect.top);
    if (candidates.length === 0) return;
    candidates[0].el.scrollIntoView({behavior: "smooth", block: "center"});
    window.clearTimeout(scrollTimer.current ?? undefined);
    scrollTimer.current = window.setTimeout(refreshMatchNav, 200);
  };

  useEffect(() => {
    if (loading || error) return;
    refreshMatchNav();
    const handler = () => {
      window.clearTimeout(scrollTimer.current ?? undefined);
      scrollTimer.current = window.setTimeout(refreshMatchNav, 80);
    };
    window.addEventListener("scroll", handler, {passive: true});
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, [loading, error, items, search, selectedEntity, likedOnly, deckOnly, likes.ids, deck.items]);

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
            likedOnly={likedOnly}
            onLikedChange={setLikedOnly}
            deckOnly={deckOnly}
            onDeckChange={setDeckOnly}
          />
          <div className="count">
            {filteredCount === items.length ? `${items.length} total` : `${filteredCount} of ${items.length} filtered`}
          </div>
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
                  <h2 className={filtered.length === 0 ? "faded" : ""}>{cat}</h2>
                  <div className="section-sub">
                    {filtered.length === list.length ? list.length + " items" :
                      filtered.length === 0 ? "" :
                        filtered.length + " of " + list.length}
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
                        onEntityFilter={(id) => setSelectedEntity((prev) => (prev === id ? "" : id))}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}
      {!loading && !error && filteredCount > 0 && filteredCount < items.length && (
        <div className="scroll-hints">
          {matchNav.above + matchNav.below > 0 && (
            <>
              <button className="pill-toggle" type="button" disabled={matchNav.above === 0}
                      onClick={() => scrollToNearest("up")}>
                Previous match {matchNav.above > 0 && <span className="badge">{matchNav.above}</span>}
              </button>
              <button className="pill-toggle" type="button" disabled={matchNav.below === 0}
                      onClick={() => scrollToNearest("down")}>
                Next match {matchNav.below > 0 && <span className="badge">{matchNav.below}</span>}
              </button>
            </>
          )}
        </div>
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

// deck better smoother draggable
// move deck separate from header nav. make it sticky footer
// automation should write simple commit message
