"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useDeck} from "../../components/deck/DeckContext";
import EntityCard from "../../components/entity/EntityCard";
import Filters from "../../components/entity/Filters";
import {useLikes} from "../../components/like/LikeContext";
import {loadEntities} from "../../lib/loadEntities";
import {EntityType, ScrapedEntity} from "../../lib/types";
import {DEFAULT_LIMITS, entityIds, groupByCategory, resolveType} from "./entity-utils";

type PagePropsLocal = {
  params?: Promise<Record<string, string>>;
};

type MatchNav = {above: number; below: number};

const NAV_REFRESH_DELAY = 80;
const NAV_AFTER_SCROLL_DELAY = 200;

/**
 * Client page for browsing entities of a given type with filtering and deck helpers.
 *
 * @param {PagePropsLocal} props - Route params from Next.js dynamic segment.
 */
export default function EntityPage({params}: PagePropsLocal) {
  const type = resolveType(params);
  const {items, loading, error} = useEntityData(type); // data load gated by type

  // filter state controlled by Filters component
  const [search, setSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("");
  const [likedOnly, setLikedOnly] = useState(false);
  const [deckOnly, setDeckOnly] = useState(false);

  const deck = useDeck();
  const likes = useLikes();

  // normalize deck to a Set for fast lookup during renders
  const deckIds = useMemo(() => new Set(deck.items.map((item) => item.id)), [deck.items]);

  // compound filter predicate shared by counts and rendering
  const matchesFilters = useCallback(
    (item: ScrapedEntity) => {
      const matchSearch = !search || (item.name + " " + item.description).toLowerCase().includes(search.toLowerCase());
      const matchEntity = !selectedEntity || entityIds(item).includes(selectedEntity);
      const liked = likes.ids.has(`${type}:${item.name}`);
      const matchLiked = !likedOnly || liked;
      const inDeck = deckIds.has(`${type}:${item.name}`);
      const matchDeck = !deckOnly || inDeck;
      return matchSearch && matchEntity && matchLiked && matchDeck;
    },
    [deckIds, deckOnly, likedOnly, likes.ids, search, selectedEntity, type],
  );

  // pre-group entities into sections, keeping original order inside a category
  const grouped = useMemo(() => groupByCategory(items, type), [items, type]);
  const sections = useMemo(
    () =>
      grouped.map(([category, list]) => {
        const filtered = list.filter(matchesFilters);
        return {category, list, filtered};
      }),
    [grouped, matchesFilters],
  );

  const filteredCount = useMemo(() => items.filter(matchesFilters).length, [items, matchesFilters]);

  // collect dependencies so match navigation effect can re-run safely
  const matchNavDeps = useMemo(
    () => [items, search, selectedEntity, likedOnly, deckOnly, likes.ids, deck.items],
    [items, search, selectedEntity, likedOnly, deckOnly, likes.ids, deck.items],
  );
  const {matchNav, scrollToNearest} = useMatchNavigation(!loading && !error, matchNavDeps);

  return (
    <div className="page">
      <div className="body-wrapper filters-shell">
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

      {loading && <div className="status">Loading...</div>}
      {error && <div className="status error">{error}</div>}

      {!loading && !error && (
        <section className="sections body-wrapper">
          {sections.map(({category, list, filtered}) => (
            <div className="section" key={category}>
              <div className="section-header">
                <h2 className={filtered.length === 0 ? "faded" : ""}>{category}</h2>
                <div className="section-sub">{formatSectionSubtext(filtered.length, list.length)}</div>
              </div>
              <div className="cards">
                {list.map((item, idx) => {
                  const matched = filtered.includes(item);
                  const inDeck = deckIds.has(`${type}:${item.name}`);
                  return (
                    <EntityCard
                      key={`${type}-${item.name}-${idx}`}
                      item={item}
                      type={type}
                      highlight={inDeck}
                      deck={deck}
                      likes={likes}
                      limits={DEFAULT_LIMITS}
                      fade={!matched}
                      inDeck={inDeck}
                      onEntityFilter={(id) => setSelectedEntity((prev) => (prev === id ? "" : id))}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}
      {!loading && !error && filteredCount > 0 && filteredCount < items.length && (
        <div className="scroll-hints">
          {matchNav.above + matchNav.below > 0 && (
            <>
              <button
                className="pill-toggle"
                type="button"
                disabled={matchNav.above === 0}
                onClick={() => scrollToNearest("up")}
              >
                Previous match {matchNav.above > 0 && <span className="badge">{matchNav.above}</span>}
              </button>
              <button
                className="pill-toggle"
                type="button"
                disabled={matchNav.below === 0}
                onClick={() => scrollToNearest("down")}
              >
                Next match {matchNav.below > 0 && <span className="badge">{matchNav.below}</span>}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function formatSectionSubtext(filteredCount: number, totalCount: number): string {
  if (filteredCount === totalCount) return `${totalCount} items`;
  if (filteredCount === 0) return "";
  return `${filteredCount} of ${totalCount}`;
}

/**
 * Load entities for a given type with mounted-safety and status flags.
 */
function useEntityData(type: EntityType) {
  const [items, setItems] = useState<ScrapedEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return {items, loading, error};
}

/**
 * Track number of matching cards above/below viewport and provide smooth scroll navigation.
 */
function useMatchNavigation(active: boolean, deps: ReadonlyArray<unknown>) {
  const [matchNav, setMatchNav] = useState<MatchNav>({above: 0, below: 0});
  const scrollTimer = useRef<number | null>(null);

  // snapshot DOM cards that remain visible (not faded) to drive counts and scroll
  const collectMatches = useCallback(
    () =>
      Array.from(document.querySelectorAll<HTMLElement>(".card:not(.faded)")).map((el) => ({
        el,
        rect: el.getBoundingClientRect(),
      })),
    [],
  );

  const refreshMatchNav = useCallback(() => {
    const matches = collectMatches();
    const above = matches.filter((m) => m.rect.bottom < 0).length;
    const below = matches.filter((m) => m.rect.top > window.innerHeight).length;
    setMatchNav({above, below});
  }, [collectMatches]);

  // smooth-scroll to the nearest match in the requested direction
  const scrollToNearest = useCallback(
    (direction: "up" | "down") => {
      const matches = collectMatches();
      if (matches.length === 0) return;
      const candidates =
        direction === "up"
          ? matches.filter((m) => m.rect.bottom < 0).sort((a, b) => b.rect.bottom - a.rect.bottom)
          : matches.filter((m) => m.rect.top > window.innerHeight).sort((a, b) => a.rect.top - b.rect.top);
      if (candidates.length === 0) return;
      candidates[0].el.scrollIntoView({behavior: "smooth", block: "center"});
      window.clearTimeout(scrollTimer.current ?? undefined);
      scrollTimer.current = window.setTimeout(refreshMatchNav, NAV_AFTER_SCROLL_DELAY);
    },
    [collectMatches, refreshMatchNav],
  );

  useEffect(() => {
    if (!active) return;
    refreshMatchNav();
    // debounce on scroll/resize to avoid thrashing layout reads
    const handler = () => {
      window.clearTimeout(scrollTimer.current ?? undefined);
      scrollTimer.current = window.setTimeout(refreshMatchNav, NAV_REFRESH_DELAY);
    };
    window.addEventListener("scroll", handler, {passive: true});
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, refreshMatchNav, ...deps]);

  return {matchNav, scrollToNearest};
}
