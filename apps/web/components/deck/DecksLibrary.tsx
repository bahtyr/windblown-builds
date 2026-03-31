/* eslint-disable @next/next/no-img-element */
"use client";

import {useEffect, useMemo, useRef, useState, type TransitionEvent} from "react";
import {DeckItem, SavedDeck, SharedDeck, groupDeckItemsByType, makeDeckItem, useDeck} from "./DeckContext";
import {useRunBuildUi} from "./RunBuildUiContext";
import {useDeckUi} from "./DeckUiContext";
import {buildDeckShareUrl} from "./deck-share";
import DeckPanel from "./DeckPanel";
import EntityBrowser from "../entity/EntityBrowser";
import {useLikes} from "../like/LikeContext";
import {loadAllEntities} from "../../lib/loadEntities";
import categoryImages from "../../public/category-images.json";
import {EntityType, ScrapedEntity} from "../../lib/types";
import RichText from "../entity/RichText";
import {getEntityStats} from "../entity/EntityCard";
import EntityVideoPreview from "../entity/EntityVideoPreview";

type DrawerPhase = "opening" | "open" | "closing";
type LibraryTab = "favorites" | "saved-builds" | "recent-runs";
type DeckRowModel =
  | { kind: "favorites"; deck: SavedDeck }
  | { kind: "shared"; deck: SharedDeck }
  | { kind: "saved"; deck: SavedDeck };

type LoadedDeckEntity = {
  card: DeckItem;
  entity: ScrapedEntity;
  type: EntityType;
};

type EntityLookup = Map<string, LoadedDeckEntity>;
type GiftCategoryLookup = Map<string, string>;
type DeckCategoryMeta = {
  count: number;
  image?: string;
  itemIds: string[];
  name: string;
};

type DeckTooltipPosition = {
  left: number;
  top: number;
};

type TooltipCoordinateSpace = {
  leftOffset: number;
  topOffset: number;
};

const DRAWER_OPENING_DELAY_MS = 24;

/**
 * Collect scrollable ancestors that can move a tooltip trigger without moving the viewport.
 *
 * @param {HTMLElement | null} element - Trigger or tooltip element inside the layout.
 * @returns {(HTMLElement | Window)[]} Scroll event targets that should refresh tooltip placement.
 */
function getTooltipScrollParents(element: HTMLElement | null): Array<HTMLElement | Window> {
  if (typeof window === "undefined") return [];

  const parents: Array<HTMLElement | Window> = [window];
  let current = element?.parentElement ?? null;

  while (current) {
    const {overflowY, overflow} = window.getComputedStyle(current);
    if (/(auto|scroll|overlay)/.test(`${overflowY} ${overflow}`)) {
      parents.push(current);
    }
    current = current.parentElement;
  }

  return parents;
}

function getTooltipSafeTop(gap: number, viewportPadding: number): number {
  const blockers = [
    document.querySelector<HTMLElement>(".header"),
    document.querySelector<HTMLElement>(".filters-body"),
    document.querySelector<HTMLElement>(".decks-page-top"),
    document.querySelector<HTMLElement>(".deck-builder-surface"),
  ].filter((element): element is HTMLElement => Boolean(element));

  const blockerBottom = blockers.reduce((maxBottom, element) => {
    const rect = element.getBoundingClientRect();
    if (element.classList.contains("deck-builder-surface")) {
      return Math.max(maxBottom, rect.top);
    }
    return Math.max(maxBottom, rect.bottom);
  }, 0);

  return Math.max(viewportPadding, blockerBottom + gap);
}

function getHoverAnchorLeft(
  triggerRect: DOMRect,
  tooltipWidth: number,
  viewportPadding: number,
  preferRightEdge: boolean,
): number {
  const minLeft = viewportPadding;
  const maxLeft = Math.max(viewportPadding, window.innerWidth - tooltipWidth - viewportPadding);
  const leftAligned = triggerRect.left;
  const rightAligned = triggerRect.right - tooltipWidth;

  const preferred = preferRightEdge ? rightAligned : leftAligned;
  const fallback = preferRightEdge ? leftAligned : rightAligned;

  if (preferred >= minLeft && preferred <= maxLeft) return preferred;
  if (fallback >= minLeft && fallback <= maxLeft) return fallback;
  return Math.min(Math.max(preferred, minLeft), maxLeft);
}

function rectsIntersect(
  left: number,
  top: number,
  width: number,
  height: number,
  triggerRect: DOMRect,
): boolean {
  const right = left + width;
  const bottom = top + height;

  return !(
    right <= triggerRect.left ||
    left >= triggerRect.right ||
    bottom <= triggerRect.top ||
    top >= triggerRect.bottom
  );
}

/**
 * Resolve local tooltip offsets for surfaces that create their own fixed-position containing block.
 *
 * @param {HTMLElement | null} tooltipElement - Tooltip element being positioned.
 * @returns {TooltipCoordinateSpace} Coordinate offsets for the tooltip's containing block.
 */
function getTooltipCoordinateSpace(tooltipElement: HTMLElement | null): TooltipCoordinateSpace {
  const deckBuilderSurface = tooltipElement?.closest<HTMLElement>(".deck-builder-surface");
  if (!deckBuilderSurface) {
    return {leftOffset: 0, topOffset: 0};
  }

  const rect = deckBuilderSurface.getBoundingClientRect();
  return {
    leftOffset: rect.left - deckBuilderSurface.scrollLeft,
    topOffset: rect.top - deckBuilderSurface.scrollTop,
  };
}

/**
 * Read-only saved deck library with share, duplicate, edit, and delete actions.
 *
 * @returns {JSX.Element} Saved deck library page.
 */
export default function DecksLibrary() {
  const deck = useDeck();
  const deckUi = useDeckUi();
  const runBuildUi = useRunBuildUi();
  const likes = useLikes();
  const cancelEditOnCloseRef = useRef(false);
  const [activeTab, setActiveTab] = useState<LibraryTab>("recent-runs");
  const [drawerMounted, setDrawerMounted] = useState(deckUi.open);
  const [drawerPhase, setDrawerPhase] = useState<DrawerPhase>(deckUi.open ? "open" : "closing");
  const [entityLookup, setEntityLookup] = useState<EntityLookup>(new Map());
  const [giftCategoryLookup, setGiftCategoryLookup] = useState<GiftCategoryLookup>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function loadEntityLookups() {
      const entityEntries = await loadAllEntities();

      if (cancelled) return;

      const nextEntityLookup: EntityLookup = new Map();
      const nextGiftCategoryLookup: GiftCategoryLookup = new Map();

      for (const [type, entities] of entityEntries) {
        for (const entity of entities) {
          const deckItem = makeDeckItem(type, entity);
          nextEntityLookup.set(deckItem.id, {card: deckItem, entity, type});
          if (type === "gifts" && entity.category) {
            nextGiftCategoryLookup.set(deckItem.id, entity.category);
          }
        }
      }

      setEntityLookup(nextEntityLookup);
      setGiftCategoryLookup(nextGiftCategoryLookup);
    }

    loadEntityLookups().catch(() => {
      if (!cancelled) {
        setEntityLookup(new Map());
        setGiftCategoryLookup(new Map());
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const favoritesRow = useMemo(() => {
    const favoritesDeck = buildFavoritesDeck(likes.ids, entityLookup);
    return favoritesDeck ? {kind: "favorites" as const, deck: favoritesDeck} : null;
  }, [entityLookup, likes.ids]);

  const rows = useMemo(() => {
    const libraryRows: DeckRowModel[] = deck.saved
      .filter((savedDeck) => savedDeck.items.length > 0)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((savedDeck) => ({kind: "saved" as const, deck: savedDeck}));

    if (deck.sharedDeck) {
      libraryRows.unshift({kind: "shared", deck: deck.sharedDeck});
    }

    return libraryRows;
  }, [deck.saved, deck.sharedDeck]);

  useEffect(() => {
    let firstFrameId = 0;
    let secondFrameId = 0;
    let openTimerId = 0;

    if (deckUi.open) {
      setDrawerMounted(true);
      setDrawerPhase("opening");
      firstFrameId = window.requestAnimationFrame(() => {
        secondFrameId = window.requestAnimationFrame(() => {
          openTimerId = window.setTimeout(() => {
            setDrawerPhase("open");
          }, DRAWER_OPENING_DELAY_MS);
        });
      });
      return () => {
        window.cancelAnimationFrame(firstFrameId);
        window.cancelAnimationFrame(secondFrameId);
        window.clearTimeout(openTimerId);
      };
    }

    if (!drawerMounted) return;
    setDrawerPhase("closing");
    return;
  }, [deck.cancelEditing, deckUi.open, drawerMounted]);

  const handleShare = async (deckName: string) => {
    const savedDeck = deck.saved.find((entry) => entry.name === deckName);
    if (!savedDeck || typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(buildDeckShareUrl(window.location.origin, savedDeck));
    } catch {}
  };

  const handleCreateNew = () => {
    cancelEditOnCloseRef.current = false;
    deck.createDeck();
    deckUi.openDeck();
  };

  const handleCancelEditing = () => {
    cancelEditOnCloseRef.current = true;
    deckUi.closeDeck();
  };

  const handleDrawerSurfaceTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== "transform") return;
    if (deckUi.open || drawerPhase !== "closing") return;

    setDrawerMounted(false);
    if (cancelEditOnCloseRef.current) {
      cancelEditOnCloseRef.current = false;
      deck.cancelEditing();
    }
  };

  const tabCopy = {
    "favorites": "Quick access to everything you have liked.",
    "saved-builds": "Saved builds will appear here.",
    "recent-runs": "Revisit your runs and share with others.",
  } satisfies Record<LibraryTab, string>;

  return (
    <>
      <div className="page page-decks">
        <section className="decks-page">
          <div className="decks-page-top">
            <div className="decks-page-top-inner body-wrapper">
              <div className="decks-page-header">
                <div>
                  <h1 className="decks-page-title">Your library</h1>
                  <p className="decks-page-copy">{tabCopy[activeTab]}</p>
                </div>
                <div className="decks-page-header-actions">
                  <button className="btn decks-page-primary-button" type="button" onClick={() => runBuildUi.openRunBuildDialog()}>New run</button>
                  <button className="btn decks-page-primary-button" type="button" onClick={handleCreateNew}>Create new build</button>
                </div>
              </div>

              <div aria-label="Build library sections" className="decks-page-tabs" role="tablist">
                <button
                  aria-selected={activeTab === "favorites"}
                  className={`decks-page-tab ${activeTab === "favorites" ? "is-active" : ""}`}
                  id="decks-tab-favorites"
                  role="tab"
                  type="button"
                  onClick={() => setActiveTab("favorites")}
                >
                  Favorites
                </button>
                <button
                  aria-selected={activeTab === "recent-runs"}
                  className={`decks-page-tab ${activeTab === "recent-runs" ? "is-active" : ""}`}
                  id="decks-tab-recent-runs"
                  role="tab"
                  type="button"
                  onClick={() => setActiveTab("recent-runs")}
                >
                  Recent Runs
                </button>
                <button
                  aria-selected={activeTab === "saved-builds"}
                  className={`decks-page-tab ${activeTab === "saved-builds" ? "is-active" : ""}`}
                  id="decks-tab-saved-builds"
                  role="tab"
                  type="button"
                  onClick={() => setActiveTab("saved-builds")}
                >
                  Saved Builds
                </button>
              </div>
            </div>
          </div>

          <div className="decks-page-content body-wrapper">
            {activeTab === "favorites" ? (
              <div aria-labelledby="decks-tab-favorites" className="decks-grid decks-grid-favorites" role="tabpanel">
                {favoritesRow ? (
                  <DeckRow
                    key={`${favoritesRow.kind}-${favoritesRow.deck.name}`}
                    categories={buildDeckCategoryMeta(favoritesRow.deck.items, giftCategoryLookup)}
                    entityLookup={entityLookup}
                    row={favoritesRow}
                    onDelete={() => {}}
                    onDiscardShared={() => {}}
                    onDuplicate={() => {}}
                    onEdit={() => {}}
                    onSaveShared={() => {}}
                    onShare={() => {}}
                  />
                ) : (
                  <div className="deck-row-empty">No favorites yet.</div>
                )}
              </div>
            ) : null}

            {activeTab === "saved-builds" ? (
              <div aria-labelledby="decks-tab-saved-builds" className="decks-grid" role="tabpanel">
                <div className="deck-row-empty">No saved builds yet.</div>
              </div>
            ) : null}

            {activeTab === "recent-runs" ? (
              <div aria-labelledby="decks-tab-recent-runs" className="decks-grid" role="tabpanel">
                {rows.length > 0 ? (
                  rows.map((row) => (
                    <DeckRow
                      key={`${row.kind}-${row.deck.name}`}
                      categories={buildDeckCategoryMeta(row.deck.items, giftCategoryLookup)}
                      entityLookup={entityLookup}
                      row={row}
                      onDelete={() => deck.deleteDeck(row.deck.name)}
                      onDiscardShared={() => deck.discardSharedDeck()}
                      onDuplicate={() => deck.duplicateDeck(row.deck.name)}
                      onEdit={() => {
                        cancelEditOnCloseRef.current = false;
                        if (row.kind === "shared") {
                          deck.editSharedDeck();
                        } else {
                          deck.loadDeck(row.deck.name);
                        }
                        deckUi.openDeck();
                      }}
                      onSaveShared={() => deck.saveSharedDeck()}
                      onShare={() => handleShare(row.deck.name)}
                    />
                  ))
                ) : (
                  <div className="deck-row-empty">No recent runs yet.</div>
                )}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {drawerMounted && (
        <div className={`deck-builder-overlay is-${drawerPhase}`}>
          <div className={`deck-builder-backdrop is-${drawerPhase}`}/>
          <button
            aria-label="Cancel changes and close build editor"
            className="deck-builder-dismiss"
            type="button"
            onClick={handleCancelEditing}
          />
          <div
            aria-label="Build editor"
            aria-modal="true"
            className={`deck-builder-drawer is-${drawerPhase}`}
            role="dialog"
          >
            <div
              className={`deck-builder-surface is-${drawerPhase}`}
              onTransitionEnd={handleDrawerSurfaceTransitionEnd}
            >
              <DeckPanel onCancel={handleCancelEditing} onCommit={() => deckUi.closeDeck()}/>
              <div className="deck-builder-browser">
                <EntityBrowser embedded/>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type DeckRowProps = {
  categories: DeckCategoryMeta[];
  entityLookup: EntityLookup;
  row: DeckRowModel;
  onDelete: () => void;
  onDiscardShared: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onSaveShared: () => void;
  onShare: () => void;
};

function DeckRow({categories, entityLookup, row, onDelete, onDiscardShared, onDuplicate, onEdit, onSaveShared, onShare}: DeckRowProps) {
  const isShared = row.kind === "shared";
  const isFavorites = row.kind === "favorites";
  const meta = isShared || isFavorites ? null : formatRoughDate(row.deck.createdAt);
  const title = isFavorites ? "\u2665 Favorites" : row.deck.name;
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const activeCategoryItemIds = useMemo(
    () => new Set(categories.find((category) => category.name === activeCategory)?.itemIds ?? []),
    [activeCategory, categories],
  );

  return (
    <article className={`deck-row ${isShared ? "deck-row-shared" : ""}`}>
      <div className="deck-row-layout">
        <div className="deck-row-main">
          <div className="deck-row-head">
            <div className="deck-row-title-group">
              <h2 className="deck-row-meta">{title}</h2>
              {/*{meta && <p className="deck-row-meta">{meta}</p>}*/}
            </div>
            <div className="deck-row-actions">
              {isShared ? (
                <>
                  <button className="btn ghost deck-row-action" type="button" onClick={onDiscardShared}>Discard</button>
                  <button className="btn ghost deck-row-action" type="button" onClick={onEdit}>Edit</button>
                  <button className="btn deck-row-action" type="button" onClick={onSaveShared}>Save</button>
                </>
              ) : isFavorites ? null : (
                <>
                  <button className="btn ghost deck-row-action deck-row-action-auto-hide" type="button" onClick={onEdit}>Edit</button>
                  <button className="btn ghost deck-row-action deck-row-action-auto-hide" type="button" onClick={onDelete}>Delete</button>
                  <button className="btn ghost deck-row-action deck-row-action-auto-hide" type="button" onClick={onDuplicate}>Duplicate</button>
                  <button className="btn ghost deck-row-action deck-row-action-auto-hide" type="button" onClick={onShare}>Share</button>
                </>
              )}
            </div>
          </div>

          <div className="deck-row-content">
            <div className="deck-row-items-meta">
              {categories.length > 0 ? (
                <div
                  className="deck-row-category-list"
                  aria-label={`${row.deck.name} categories`}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setActiveCategory(null);
                    }
                  }}
                  onMouseLeave={() => setActiveCategory(null)}
                >
                  {categories.map((category) => (
                    <button
                      key={category.name}
                      aria-pressed={activeCategory === category.name}
                      className={`deck-row-category-chip ${activeCategory === category.name ? "is-active" : ""}`}
                      type="button"
                      onMouseEnter={() => setActiveCategory(category.name)}
                      onFocus={() => setActiveCategory(category.name)}
                    >
                      {category.image ? <img className="deck-row-category-thumb" decoding="async" loading="lazy" src={category.image} alt=""/> : null}
                      <span>
                        {category.count > 1 ? `${category.count} ` : ""}
                        {category.name}
                      </span>
                    </button>
                  ))}
                  {activeCategory ? (
                    <button
                      className="btn ghost deck-row-category-reset"
                      type="button"
                      onClick={() => {
                        setActiveCategory(null);
                      }}
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="deck-row-side-empty">No gift categories</p>
              )}
            </div>

            <div className="deck-row-items">
              {row.deck.items.map((item) => (
                <DeckRowItem
                  key={item.id}
                  item={item}
                  details={entityLookup.get(item.id) ?? null}
                  fadeCategoryMismatch={activeCategoryItemIds.size > 0 && !activeCategoryItemIds.has(item.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function DeckRowItem({
  item,
  details,
  fadeCategoryMismatch,
}: {
  item: DeckItem;
  details: LoadedDeckEntity | null;
  fadeCategoryMismatch: boolean;
}) {
  const itemElementRef = useRef<HTMLDivElement | null>(null);
  const tooltipElementRef = useRef<HTMLDivElement | null>(null);
  const stats = details ? getEntityStats(details.entity, details.type) : [];
  const tooltipFrameRef = useRef<number | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<DeckTooltipPosition>({left: 0, top: 0});

  const updateTooltipPosition = () => {
    if (typeof window === "undefined") return;

    const itemElement = itemElementRef.current;
    const tooltipElement = tooltipElementRef.current;
    if (!tooltipElement) return;
    if (!itemElement) return;

    const viewportPadding = 12;
    const gap = 8;
    const minTop = getTooltipSafeTop(gap, viewportPadding);
    const itemRect = itemElement.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();
    const coordinateSpace = getTooltipCoordinateSpace(tooltipElement);
    const rightAlignedLeft = itemRect.right + gap;
    const leftAlignedLeft = itemRect.left - tooltipRect.width - gap;
    const canPlaceRight = rightAlignedLeft + tooltipRect.width <= window.innerWidth - viewportPadding;
    const canPlaceLeft = leftAlignedLeft >= viewportPadding;
    const belowTop = itemRect.bottom + gap;
    const aboveTop = itemRect.top - tooltipRect.height - gap;
    const maxTop = Math.max(minTop, window.innerHeight - tooltipRect.height - viewportPadding);
    const moreRoomOnRight = (window.innerWidth - viewportPadding) - itemRect.left >= itemRect.right - viewportPadding;
    const hasSidePlacement = canPlaceRight || canPlaceLeft;
    let left = 0;
    let top = 0;

    if (hasSidePlacement) {
      left = canPlaceRight ? rightAlignedLeft : leftAlignedLeft;
      top = Math.min(Math.max(itemRect.top, minTop), maxTop);
    } else {
      left = getHoverAnchorLeft(
        itemRect,
        tooltipRect.width,
        viewportPadding,
        belowTop + tooltipRect.height > window.innerHeight - viewportPadding ? moreRoomOnRight : !moreRoomOnRight,
      );
      top = belowTop + tooltipRect.height > window.innerHeight - viewportPadding && aboveTop >= minTop ? aboveTop : belowTop;

      left = Math.floor(left);
      top = Math.floor(Math.min(Math.max(top, minTop), maxTop));

      if (rectsIntersect(left, top, tooltipRect.width, tooltipRect.height, itemRect)) {
        top = Math.floor(Math.min(Math.max(aboveTop, minTop), maxTop));
      }
    }

    left = Math.floor(left);
    top = Math.floor(Math.min(Math.max(top, minTop), maxTop));

    setTooltipPosition({
      left: left - coordinateSpace.leftOffset,
      top: top - coordinateSpace.topOffset,
    });
  };

  const closeTooltip = () => {
    if (tooltipFrameRef.current !== null) {
      window.cancelAnimationFrame(tooltipFrameRef.current);
      tooltipFrameRef.current = null;
    }
    setShowTooltip(false);
  };

  const openTooltip = (itemElement: HTMLDivElement | null) => {
    itemElementRef.current = itemElement;
    setShowTooltip(true);
    if (tooltipFrameRef.current !== null) {
      window.cancelAnimationFrame(tooltipFrameRef.current);
    }
    tooltipFrameRef.current = window.requestAnimationFrame(() => {
      updateTooltipPosition();
      tooltipFrameRef.current = null;
    });
  };

  useEffect(() => {
    if (!showTooltip || typeof window === "undefined") return;

    const tooltipElement = tooltipElementRef.current;
    const itemElement = itemElementRef.current;
    if (!tooltipElement || !itemElement) return;

    const observer = new ResizeObserver(() => {
      updateTooltipPosition();
    });
    observer.observe(tooltipElement);

    const handleViewportChange = () => updateTooltipPosition();
    const scrollParents = getTooltipScrollParents(itemElement);
    window.addEventListener("resize", handleViewportChange);
    scrollParents.forEach((parent) => parent.addEventListener("scroll", handleViewportChange, {passive: true}));

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleViewportChange);
      scrollParents.forEach((parent) => parent.removeEventListener("scroll", handleViewportChange));
    };
  }, [showTooltip]);

  return (
    <div
      className={`deck-row-item ${fadeCategoryMismatch ? "is-category-mismatch" : ""}`}
      ref={itemElementRef}
      tabIndex={0}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          closeTooltip();
        }
      }}
      onFocus={(event) => openTooltip(event.currentTarget)}
      onMouseEnter={(event) => openTooltip(event.currentTarget)}
      onMouseLeave={closeTooltip}
    >
      {item.image ? <img className="deck-row-item-thumb" decoding="async" loading="lazy" src={item.image} alt=""/> : <div className="deck-row-item-thumb deck-row-item-thumb-empty"/>}
      <div
        className="deck-row-item-hover"
        ref={tooltipElementRef}
        role="tooltip"
        style={{
          left: `${tooltipPosition.left}px`,
          top: `${tooltipPosition.top}px`,
        }}
      >
        {showTooltip ? (
          <>
            <div className="deck-row-item-hover-head">
              <div className="deck-row-item-name">{item.name}</div>
            </div>
            {stats.length > 0 && (
              <div className="deck-row-item-stats">
                {stats.map((stat) => (
                  <div className="deck-row-item-stat" key={stat.label}>
                    <span className="deck-row-item-stat-value">{stat.value}</span>
                    <span className="deck-row-item-stat-label">{stat.label}</span>
                  </div>
                ))}
              </div>
            )}
            {details ? <RichText parts={details.entity.richDescription}/> : null}
            {details ? <EntityVideoPreview active={showTooltip} entity={details.entity} onMediaReady={updateTooltipPosition} preload="metadata" wrapperClassName="deck-row-item-video"/> : null}
          </>
        ) : (
          <div className="deck-row-item-hover-head">
            <div className="deck-row-item-name">{item.name}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Convert an ISO timestamp into simple rough relative text.
 *
 * @param {string} value - ISO timestamp.
 * @returns {string} Rough relative time label.
 */
export function formatRoughDate(value: string): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Recently";

  const diffMs = Date.now() - timestamp;
  const dayMs = 24 * 60 * 60 * 1000;
  if (diffMs < dayMs) return "Today";
  if (diffMs < dayMs * 2) return "Yesterday";
  if (diffMs < dayMs * 7) return pluralize(Math.floor(diffMs / dayMs), "day");
  if (diffMs < dayMs * 30) return pluralize(Math.floor(diffMs / (dayMs * 7)), "week");
  if (diffMs < dayMs * 365) return pluralize(Math.floor(diffMs / (dayMs * 30)), "month");
  return pluralize(Math.floor(diffMs / (dayMs * 365)), "year");
}

function pluralize(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? "" : "s"} ago`;
}

/**
 * Build the derived Favorites deck from the current liked entity ids.
 *
 * @param {Set<string>} likedIds - Current liked entity ids.
 * @param {Map<string, DeckItem>} entityLookup - Loaded entity lookup by deck id.
 * @returns {SavedDeck | null} Derived favorites deck, or null when empty.
 */
export function buildFavoritesDeck(likedIds: Set<string>, entityLookup: Map<string, LoadedDeckEntity>): SavedDeck | null {
  if (likedIds.size === 0 || entityLookup.size === 0) return null;

  const items = Array.from(likedIds)
    .map((id) => entityLookup.get(id)?.card)
    .filter((item): item is DeckItem => Boolean(item));

  if (items.length === 0) return null;

  return {
    name: "Favorites",
    items: sortDeckItemsByType(items),
    createdAt: new Date(0).toISOString(),
  };
}

/**
 * Build gift category metadata for a deck row.
 *
 * @param {DeckItem[]} items - Deck items shown in the row.
 * @param {Map<string, string>} giftCategoryLookup - Gift item id to category.
 * @returns {DeckCategoryMeta[]} Visible category metadata.
 */
export function buildDeckCategoryMeta(items: DeckItem[], giftCategoryLookup: Map<string, string>): DeckCategoryMeta[] {
  const categoryItems = new Map<string, string[]>();
  for (const item of items) {
    if (item.type !== "gifts") continue;
    const category = giftCategoryLookup.get(item.id);
    if (category) {
      categoryItems.set(category, [...(categoryItems.get(category) ?? []), item.id]);
    }
  }

  return Array.from(categoryItems.entries())
    .sort(([nameA, itemIdsA], [nameB, itemIdsB]) => {
      const countA = itemIdsA.length;
      const countB = itemIdsB.length;
      if (countB !== countA) return countB - countA;
      return nameA.localeCompare(nameB);
    })
    .map(([name, itemIds]) => ({
      count: itemIds.length,
      name,
      image: categoryImages[name as keyof typeof categoryImages],
      itemIds,
    }));
}

function sortDeckItemsByType(items: DeckItem[]): DeckItem[] {
  return groupDeckItemsByType(items);
}
