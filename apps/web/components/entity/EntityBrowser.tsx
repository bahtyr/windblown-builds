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

type MatchNav = { above: number; below: number };
type DisplayEntity = ScrapedEntity & { entityType: EntityType };
type SidebarOption = { value: string; label: string };
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
  const deck = useDeck();
  const likes = useLikes();

  const [selectedType, setSelectedType] = useState<EntityType | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("");
  const [likedOnly, setLikedOnly] = useState(false);
  const [deckOnly, setDeckOnly] = useState(false);
  const [matchDisplayMode, setMatchDisplayMode] = useState<MatchDisplayMode>("fade-unmatched");
  const [filtersHydrated, setFiltersHydrated] = useState(false);

  const visibleItems = useMemo(
    () => items.filter((item) => selectedType === "all" || item.entityType === selectedType),
    [items, selectedType],
  );
  const deckIds = useMemo(() => new Set(deck.items.map((item) => item.id)), [deck.items]);

  useEffect(() => {
    if (embedded) {
      setSearch("");
      setSelectedEntity("");
      setLikedOnly(false);
      setDeckOnly(deck.mode === "editing");
      setMatchDisplayMode(deck.mode === "editing" ? "show-matches-only" : "fade-unmatched");
      setFiltersHydrated(true);
      return;
    }

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
  }, [deck.mode, embedded]);

  useEffect(() => {
    if (!filtersHydrated || embedded) return;

    window.localStorage.setItem(
      FILTERS_STORAGE_KEY,
      JSON.stringify({search, selectedEntity, likedOnly, deckOnly, matchDisplayMode}),
    );
    window.localStorage.setItem(MATCH_DISPLAY_MODE_STORAGE_KEY, matchDisplayMode);
  }, [deckOnly, embedded, filtersHydrated, likedOnly, matchDisplayMode, search, selectedEntity]);

  const matchesFilters = useCallback(
    (item: DisplayEntity) => {
      const matchSearch = !search || buildSearchText(item).includes(search.toLowerCase());
      const matchEntity = !selectedEntity || entityIds(item).includes(selectedEntity);
      const liked = likes.ids.has(`${item.entityType}:${item.name}`);
      const inDeck = deckIds.has(`${item.entityType}:${item.name}`);
      return matchSearch && matchEntity && (!likedOnly || liked) && (!deckOnly || inDeck);
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
      grouped.map(([category, list]) => ({
        category,
        list,
        filtered: list.filter(matchesFilters),
      })),
    [grouped, matchesFilters],
  );
  const entityOptions = useMemo(() => collectEntityOptions(items), [items]);
  const categoryOptions = useMemo<SidebarOption[]>(
    () => [{value: "all", label: "All"}, ...ENTITY_TYPES.map((type) => ({value: type, label: capitalize(type)}))],
    [],
  );
  const hasActiveFilters = search.trim().length > 0 || selectedEntity !== "" || likedOnly || deckOnly;
  const filteredCount = useMemo(() => visibleItems.filter(matchesFilters).length, [matchesFilters, visibleItems]);
  const matchNavDeps = useMemo(
    () => [items, search, selectedEntity, likedOnly, deckOnly, likes.ids, deck.items],
    [items, search, selectedEntity, likedOnly, deckOnly, likes.ids, deck.items],
  );
  const {matchNav, scrollToNearest} = useMatchNavigation(
    !loading && !error && matchDisplayMode === "fade-unmatched",
    matchNavDeps,
  );

  const resetFilters = useCallback(() => {
    setSearch("");
    setSelectedEntity("");
    setLikedOnly(false);
    setDeckOnly(false);
  }, []);

  return (
    <div className={`page entity-browser ${embedded ? "entity-browser-embedded" : ""}`}>
      <div className="filters">
        <div className="filters-body body-wrapper">
          <div className="scroll-hints">
            <button
              aria-hidden="true"
              className="pill-toggle scroll-hints-placeholder"
              tabIndex={-1}
              type="button"
            >
              Previous match
            </button>
            {!loading &&
              !error &&
              matchDisplayMode === "fade-unmatched" &&
              filteredCount > 0 &&
              filteredCount < items.length &&
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
              )}
          </div>

          <div className="count">
            {filteredCount === visibleItems.length ? `${visibleItems.length} total` : (filteredCount === 1 ? `1 result` : `${filteredCount} results`)}
          </div>
        </div>
      </div>

      {loading && <div className="status"></div>}
      {error && <div className="status error">{error}</div>}

      {!loading && !error && (
        <div className="browse-layout body-wrapper">
          <aside className="browse-sidebar">
            <SidebarSearch
              hasActiveFilters={hasActiveFilters}
              search={search}
              onReset={resetFilters}
              onSearchChange={setSearch}
            />
            <SidebarActions
              deckOnly={deckOnly}
              embedded={embedded}
              likedOnly={likedOnly}
              matchDisplayMode={matchDisplayMode}
              onDeckOnlyChange={setDeckOnly}
              onLikedOnlyChange={setLikedOnly}
              onMatchDisplayModeChange={setMatchDisplayMode}
            />
            <SidebarSection
              subtitle="Entities"
              navClassName="browse-sidebar-nav browse-sidebar-nav-entities"
              options={[{value: "", label: "All entities"}, ...entityOptions]}
              selectedValue={selectedEntity}
              onSelect={setSelectedEntity}
            />
            <SidebarSection
              subtitle="Category"
              options={categoryOptions}
              selectedValue={selectedType}
              onSelect={(value) => setSelectedType(value as EntityType | "all")}
            />
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

type SidebarSearchProps = {
  hasActiveFilters: boolean;
  search: string;
  onReset: () => void;
  onSearchChange: (value: string) => void;
};

function SidebarSearch({hasActiveFilters, search, onReset, onSearchChange}: SidebarSearchProps) {
  return (
    <div className="browse-sidebar-section browse-sidebar-section-search">
      <button
        className={`btn ghost browse-sidebar-reset ${hasActiveFilters ? "is-active" : ""}`}
        type="button"
        onClick={onReset}
      >
        Reset filters
      </button>
      <input
        className="browse-sidebar-search"
        id="searchInput"
        type="text"
        placeholder="Search text..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
}

type SidebarActionsProps = {
  deckOnly: boolean;
  embedded: boolean;
  likedOnly: boolean;
  matchDisplayMode: MatchDisplayMode;
  onDeckOnlyChange: (value: boolean) => void;
  onLikedOnlyChange: (value: boolean) => void;
  onMatchDisplayModeChange: (value: MatchDisplayMode) => void;
};

function SidebarActions({
  deckOnly,
  embedded,
  likedOnly,
  matchDisplayMode,
  onDeckOnlyChange,
  onLikedOnlyChange,
  onMatchDisplayModeChange,
}: SidebarActionsProps) {
  return (
    <div className="browse-sidebar-section browse-sidebar-tools">
      <button
        type="button"
        className={`browse-sidebar-link ${matchDisplayMode === "show-matches-only" ? "is-active" : ""}`}
        onClick={() =>
          onMatchDisplayModeChange(matchDisplayMode === "fade-unmatched" ? "show-matches-only" : "fade-unmatched")
        }
        aria-pressed={matchDisplayMode === "show-matches-only"}
      >
        Hide unmatching results
      </button>
      {embedded && (
        <button
          type="button"
          className={`browse-sidebar-link ${deckOnly ? "is-active" : ""}`}
          onClick={() => onDeckOnlyChange(!deckOnly)}
          aria-pressed={deckOnly}
        >
          🧩 In deck
        </button>
      )}
      <button
        type="button"
        className={`browse-sidebar-link ${likedOnly ? "is-active" : ""}`}
        onClick={() => onLikedOnlyChange(!likedOnly)}
        aria-pressed={likedOnly}
      >
        ❤️ Likes
      </button>
    </div>
  );
}

type SidebarSectionProps = {
  subtitle: string;
  options: SidebarOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  navClassName?: string;
};

function SidebarSection({subtitle, options, selectedValue, onSelect, navClassName = "browse-sidebar-nav"}: SidebarSectionProps) {
  return (
    <div className="browse-sidebar-section">
      <div className="browse-sidebar-subtitle">{subtitle}</div>
      <nav className={navClassName}>
        {options.map((option) => (
          <button
            key={option.value}
            className={`browse-sidebar-link ${selectedValue === option.value ? "is-active" : ""}`}
            type="button"
            onClick={() => onSelect(option.value)}
          >
            {option.label}
          </button>
        ))}
      </nav>
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

/**
 * Collect entity-link targets from rich descriptions for the sidebar filter list.
 *
 * @param {ScrapedEntity[]} items - Loaded entity data.
 * @returns {SidebarOption[]} Sorted entity filter options.
 */
function collectEntityOptions(items: ScrapedEntity[]): SidebarOption[] {
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
 * Build plain searchable text from card-visible fields and rich inline content.
 *
 * @param {DisplayEntity} item - Entity record to search against.
 * @returns {string} Lower-cased search source text.
 */
function buildSearchText(item: DisplayEntity): string {
  const richText = item.richDescription.map((part) => part.text).join(" ");
  return [item.name, item.category ?? "", item.description, richText].join(" ").toLowerCase();
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
    const above = matches.filter((match) => match.rect.bottom < 0).length;
    const below = matches.filter((match) => match.rect.top > window.innerHeight).length;
    setMatchNav({above, below});
  }, [collectMatches]);

  const scrollToNearest = useCallback(
    (direction: "up" | "down") => {
      const matches = collectMatches();
      if (matches.length === 0) return;

      const candidates =
        direction === "up"
          ? matches.filter((match) => match.rect.bottom < 0).sort((a, b) => b.rect.bottom - a.rect.bottom)
          : matches.filter((match) => match.rect.top > window.innerHeight).sort((a, b) => a.rect.top - b.rect.top);

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
