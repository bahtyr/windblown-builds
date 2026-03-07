"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useDeck} from "../../components/deck/DeckContext";
import EntityCard from "../../components/entity/EntityCard";
import Filters from "../../components/entity/Filters";
import {useLikes} from "../../components/like/LikeContext";
import {ENTITY_TYPES, loadEntities} from "../../lib/loadEntities";
import {EntityType, ScrapedEntity} from "../../lib/types";
import {
  DEFAULT_LIMITS,
  entityIds,
  getVisibleItems,
  groupByCategory,
  MatchDisplayMode,
  resolveType,
} from "./entity-utils";

type PagePropsLocal = {
  params?: Promise<Record<string, string>>;
};

type MatchNav = { above: number; below: number };
type DisplayEntity = ScrapedEntity & { entityType: EntityType };

const NAV_REFRESH_DELAY = 80;
const NAV_AFTER_SCROLL_DELAY = 200;
const MATCH_DISPLAY_MODE_STORAGE_KEY = "entityMatchDisplayMode";

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
  const [matchDisplayMode, setMatchDisplayMode] = useState<MatchDisplayMode>("fade-unmatched");

  const deck = useDeck();
  const likes = useLikes();

  useEffect(() => {
    const stored = window.localStorage.getItem(MATCH_DISPLAY_MODE_STORAGE_KEY);
    if (stored === "fade-unmatched" || stored === "show-matches-only") {
      setMatchDisplayMode(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(MATCH_DISPLAY_MODE_STORAGE_KEY, matchDisplayMode);
  }, [matchDisplayMode]);

  // normalize deck to a Set for fast lookup during renders
  const deckIds = useMemo(() => new Set(deck.items.map((item) => item.id)), [deck.items]);

  // compound filter predicate shared by counts and rendering
  const matchesFilters = useCallback(
    (item: DisplayEntity) => {
      const matchSearch = !search || (item.name + " " + item.description).toLowerCase().includes(search.toLowerCase());
      const matchEntity = !selectedEntity || entityIds(item).includes(selectedEntity);
      const liked = likes.ids.has(`${item.entityType}:${item.name}`);
      const matchLiked = !likedOnly || liked;
      const inDeck = deckIds.has(`${item.entityType}:${item.name}`);
      const matchDeck = !deckOnly || inDeck;
      return matchSearch && matchEntity && matchLiked && matchDeck;
    },
    [deckIds, deckOnly, likedOnly, likes.ids, search, selectedEntity],
  );

  // pre-group entities into sections, keeping original order inside a category
  const grouped = useMemo(
    () =>
      groupByCategory(items, (item) => {
        const fallback = capitalize(item.entityType);
        const category = item.category?.trim() ?? fallback;
        return type === "all" ? `${category} (${item.entityType})` : category;
      }),
    [items, type],
  );
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
      <div className="filters">
        <div className="filters-body body-wrapper">
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
            matchDisplayMode={matchDisplayMode}
            onMatchDisplayModeChange={setMatchDisplayMode}
          />

          <div className="scroll-hints">
            {!loading && !error && filteredCount > 0 && filteredCount < items.length && (
              matchNav.above + matchNav.below > 0 && (
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
              )
            )}
          </div>

          <div className="count">
            {filteredCount === items.length ? `${items.length} total` : `${filteredCount} of ${items.length} filtered`}
          </div>
        </div>
      </div>

      {loading && <div className="status">Loading...</div>}
      {error && <div className="status error">{error}</div>}

      {!loading && !error && (
        <section className="sections body-wrapper">
          {sections
            .filter(({filtered}) => matchDisplayMode !== "show-matches-only" || filtered.length > 0)
            .map(({category, list, filtered}) => (
              <div className="section" key={category}>
                <div className="section-header">
                  <h2 className={"section-heading " + (filtered.length === 0 ? "is-faded" : "")}>{category}</h2>
                  <span className="section-subheading">{formatSectionSubtext(filtered.length, list.length)}</span>
                </div>
                <div className="card-list">
                  {getVisibleItems(list, filtered, matchDisplayMode).map((item, idx) => {
                    const matched = filtered.includes(item);
                    const inDeck = deckIds.has(`${item.entityType}:${item.name}`);
                    return (
                      <EntityCard
                        key={`${item.entityType}-${item.name}-${idx}`}
                        item={item}
                        type={item.entityType}
                        highlight={inDeck}
                        deck={deck}
                        likes={likes}
                        limits={DEFAULT_LIMITS}
                        fade={matchDisplayMode === "fade-unmatched" && !matched}
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
function useEntityData(type: EntityType | "all") {
  const [items, setItems] = useState<DisplayEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const loader = async (): Promise<DisplayEntity[]> => {
      if (type === "all") {
        const entries = await Promise.all(ENTITY_TYPES.map(async (entityType) => [entityType, await loadEntities(entityType)] as const));
        return entries.flatMap(([entityType, data]) => data.map((item) => ({...item, entityType})));
      }
      const data = await loadEntities(type);
      return data.map((item) => ({...item, entityType: type}));
    };

    loader()
      .then((data: DisplayEntity[]) => {
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

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
      Array.from(document.querySelectorAll<HTMLElement>(".card:not(.is-faded)")).map((el) => ({
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
