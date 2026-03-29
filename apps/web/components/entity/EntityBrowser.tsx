"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useDeck} from "../deck/DeckContext";
import {useLikes} from "../like/LikeContext";
import {ENTITY_TYPES, loadEntities} from "../../lib/loadEntities";
import {EntityType, ScrapedEntity} from "../../lib/types";
import {
  DEFAULT_LIMITS,
  entityIds,
  FILTERS_STORAGE_KEY,
  getVisibleItems,
  groupByCategory,
  MatchDisplayMode,
  parsePersistedFilters,
} from "../../app/[type]/entity-utils";
import EntityCard from "./EntityCard";
import Filters from "./Filters";

type MatchNav = { above: number; below: number };
type DisplayEntity = ScrapedEntity & { entityType: EntityType };
type EntityFilterOption = { value: string; label: string };
type Props = {
  embedded?: boolean;
};

const NAV_REFRESH_DELAY = 80;
const NAV_AFTER_SCROLL_DELAY = 200;
const MATCH_DISPLAY_MODE_STORAGE_KEY = "entityMatchDisplayMode";

/**
 * Browse all entity types together with filtering and deck helpers.
 *
 * @param {Props} props - Browser rendering options.
 * @returns {JSX.Element} Full browser page.
 */
export default function EntityBrowser({embedded = false}: Props) {
  const {items, loading, error} = useEntityData();
  const [selectedType, setSelectedType] = useState<EntityType | "all">("all");

  const [search, setSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("");
  const [likedOnly, setLikedOnly] = useState(false);
  const [deckOnly, setDeckOnly] = useState(false);
  const [matchDisplayMode, setMatchDisplayMode] = useState<MatchDisplayMode>("fade-unmatched");
  const [filtersHydrated, setFiltersHydrated] = useState(false);

  const deck = useDeck();
  const likes = useLikes();
  const visibleItems = useMemo(
    () => items.filter((item) => selectedType === "all" || item.entityType === selectedType),
    [items, selectedType],
  );

  useEffect(() => {
    const persisted = parsePersistedFilters(window.localStorage.getItem(FILTERS_STORAGE_KEY));
    if (persisted.search !== undefined) setSearch(persisted.search);
    if (persisted.selectedEntity !== undefined) setSelectedEntity(persisted.selectedEntity);
    if (persisted.likedOnly !== undefined) setLikedOnly(persisted.likedOnly);
    if (persisted.deckOnly !== undefined) setDeckOnly(persisted.deckOnly);

    if (persisted.matchDisplayMode !== undefined) {
      setMatchDisplayMode(persisted.matchDisplayMode);
    } else {
      const legacy = window.localStorage.getItem(MATCH_DISPLAY_MODE_STORAGE_KEY);
      if (legacy === "fade-unmatched" || legacy === "show-matches-only") {
        setMatchDisplayMode(legacy);
      }
    }
    setFiltersHydrated(true);
  }, []);

  useEffect(() => {
    if (!filtersHydrated) return;
    window.localStorage.setItem(
      FILTERS_STORAGE_KEY,
      JSON.stringify({search, selectedEntity, likedOnly, deckOnly, matchDisplayMode}),
    );
    window.localStorage.setItem(MATCH_DISPLAY_MODE_STORAGE_KEY, matchDisplayMode);
  }, [deckOnly, filtersHydrated, likedOnly, matchDisplayMode, search, selectedEntity]);

  const deckIds = useMemo(() => new Set(deck.items.map((item) => item.id)), [deck.items]);

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

  const grouped = useMemo(
    () =>
      groupByCategory(visibleItems, (item) => {
        const fallback = capitalize(item.entityType);
        return item.category?.trim() ?? fallback;
      }),
    [visibleItems],
  );
  const sections = useMemo(
    () =>
      grouped.map(([category, list]) => {
        const filtered = list.filter(matchesFilters);
        return {category, list, filtered};
      }),
    [grouped, matchesFilters],
  );
  const entityOptions = useMemo(() => collectEntityOptions(items), [items]);

  const filteredCount = useMemo(() => visibleItems.filter(matchesFilters).length, [matchesFilters, visibleItems]);
  const matchNavDeps = useMemo(
    () => [items, search, selectedEntity, likedOnly, deckOnly, likes.ids, deck.items],
    [items, search, selectedEntity, likedOnly, deckOnly, likes.ids, deck.items],
  );
  const {matchNav, scrollToNearest} = useMatchNavigation(!loading && !error, matchNavDeps);
  const clearFilters = useCallback(() => {
    setSearch("");
    setSelectedEntity("");
    setLikedOnly(false);
    setDeckOnly(false);
  }, []);

  return (
    <div className={`page entity-browser ${embedded ? "entity-browser-embedded" : ""}`}>
      <div className="filters">
        <div className="filters-body body-wrapper">
          <Filters
            search={search}
            onSearch={setSearch}
            onClear={clearFilters}
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
            {filteredCount === visibleItems.length ? `${visibleItems.length} total` : `${filteredCount} of ${visibleItems.length} filtered`}
          </div>
        </div>
      </div>

      {loading && <div className="status"></div>}
      {error && <div className="status error">{error}</div>}

      {!loading && !error && (
        <div className="browse-layout body-wrapper">
          <aside className="browse-sidebar">
            <div className="browse-sidebar-title">Browse</div>
            <div className="browse-sidebar-tools">
              <button
                type="button"
                className={`browse-sidebar-link ${matchDisplayMode === "show-matches-only" ? "is-active" : ""}`}
                onClick={() =>
                  setMatchDisplayMode(matchDisplayMode === "fade-unmatched" ? "show-matches-only" : "fade-unmatched")
                }
                aria-pressed={matchDisplayMode === "show-matches-only"}
              >
                Hide unmatching results
              </button>
              <button
                type="button"
                className={`browse-sidebar-link ${likedOnly ? "is-active" : ""}`}
                onClick={() => setLikedOnly(!likedOnly)}
                aria-pressed={likedOnly}
              >
                ❤️ Likes
              </button>
              <button
                type="button"
                className={`browse-sidebar-link ${deckOnly ? "is-active" : ""}`}
                onClick={() => setDeckOnly(!deckOnly)}
                aria-pressed={deckOnly}
              >
                🧩 In deck
              </button>
            </div>
            <div className="browse-sidebar-section">
              <div className="browse-sidebar-subtitle">Entities</div>
              <nav className="browse-sidebar-nav browse-sidebar-nav-entities">
                <button
                  className={`browse-sidebar-link ${selectedEntity === "" ? "is-active" : ""}`}
                  type="button"
                  onClick={() => setSelectedEntity("")}
                >
                  All entities
                </button>
                {entityOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`browse-sidebar-link ${selectedEntity === option.value ? "is-active" : ""}`}
                    type="button"
                    onClick={() => setSelectedEntity(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </nav>
            </div>
            <nav className="browse-sidebar-nav">
              <button className={`browse-sidebar-link ${selectedType === "all" ? "is-active" : ""}`} type="button" onClick={() => setSelectedType("all")}>
                All
              </button>
              {ENTITY_TYPES.map((type) => (
                <button
                  key={type}
                  className={`browse-sidebar-link ${selectedType === type ? "is-active" : ""}`}
                  type="button"
                  onClick={() => setSelectedType(type)}
                >
                  {capitalize(type)}
                </button>
              ))}
            </nav>
          </aside>
          <section className="sections">
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
 * Load entities across every supported entity type with mounted-safety and status flags.
 *
 * @returns {{items: DisplayEntity[]; loading: boolean; error: string | null}} Entity browser data state.
 */
function useEntityData() {
  const [items, setItems] = useState<DisplayEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all(ENTITY_TYPES.map(async (entityType) => [entityType, await loadEntities(entityType)] as const))
      .then((entries) => entries.flatMap(([entityType, data]) => data.map((item) => ({...item, entityType}))))
      .then((data: DisplayEntity[]) => {
        if (mounted) {
          setItems(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (mounted) setError(err instanceof Error ? err.message : "Failed to load data");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return {items, loading, error};
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function collectEntityOptions(items: ScrapedEntity[]): EntityFilterOption[] {
  const map = new Map<string, string>();
  for (const item of items) {
    for (const part of item.richDescription || []) {
      if (part.key !== "entity") continue;
      if (part.href) {
        const value = part.href.split("?")[0];
        map.set(value, displayEntityLabel(value));
      } else if (part.id) {
        map.set(part.id, displayEntityLabel(part.id));
      }
    }
  }
  return Array.from(map.entries())
    .sort(([, a], [, b]) => a.localeCompare(b))
    .map(([value, label]) => ({value, label}));
}

function displayEntityLabel(value: string): string {
  const wikiIdx = value.indexOf("/wiki/");
  if (wikiIdx !== -1) {
    return value.slice(wikiIdx + "/wiki/".length);
  }
  return value;
}

/**
 * Track number of matching cards above and below the viewport and provide smooth scroll navigation.
 *
 * @param {boolean} active - Whether the browser is ready to measure matches.
 * @param {ReadonlyArray<unknown>} deps - Inputs that should refresh navigation counts.
 * @returns {{matchNav: MatchNav; scrollToNearest: (direction: "up" | "down") => void}} Match navigation helpers.
 */
function useMatchNavigation(active: boolean, deps: ReadonlyArray<unknown>) {
  const [matchNav, setMatchNav] = useState<MatchNav>({above: 0, below: 0});
  const scrollTimer = useRef<number | null>(null);

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
  }, [active, deps, refreshMatchNav]);

  return {matchNav, scrollToNearest};
}
