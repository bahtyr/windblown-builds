/* eslint-disable @next/next/no-img-element */
"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {EntityType, ScrapedEntity} from "../../lib/types";
import {DeckLimits, makeDeckItem, useDeck} from "../deck/DeckContext";
import {useLikes} from "../like/LikeContext";
import RichText from "./RichText";
import EntityVideoPreview from "./EntityVideoPreview";

type CardViewMode = "details" | "thumbs";

type Props = {
  item: ScrapedEntity;
  type: EntityType;
  cardRef?: (element: HTMLElement | null) => void;
  highlight?: boolean;
  deck: ReturnType<typeof useDeck>;
  likes: ReturnType<typeof useLikes>;
  limits: DeckLimits;
  fade?: boolean;
  inDeck?: boolean;
  onEntityFilter?: (id: string) => void;
  allowAddToDeck?: boolean;
  showDeckState?: boolean;
  viewMode?: CardViewMode;
};

type StatRow = {
  label: string;
  value: string;
};

type TooltipPosition = {
  left: number;
  top: number;
};

type TooltipCoordinateSpace = {
  leftOffset: number;
  topOffset: number;
};

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

export default function EntityCard({
  item,
  type,
  cardRef,
  highlight,
  deck,
  likes,
  limits,
  fade,
  inDeck,
  onEntityFilter,
  allowAddToDeck = true,
  showDeckState = true,
  viewMode = "details",
}: Props) {
  const cardElementRef = useRef<HTMLElement | null>(null);
  const thumbsTooltipRef = useRef<HTMLDivElement | null>(null);
  const thumbsMediaRef = useRef<HTMLDivElement | null>(null);
  const presentInDeck = showDeckState && (inDeck ?? deck.items.some((x) => x.id === `${type}:${item.name}`));
  const liked = likes.ids.has(`${type}:${item.name}`);
  const stats = getEntityStats(item, type);
  const [showPreview, setShowPreview] = useState(false);
  const thumbsPositionFrame = useRef<number | null>(null);
  const [showThumbsHover, setShowThumbsHover] = useState(false);
  const [thumbsTooltipPosition, setThumbsTooltipPosition] = useState<TooltipPosition | null>(null);

  const handleAdd = () => {
    const res = deck.add(makeDeckItem(type, item), limits);
    if (!res.ok) {
      alert(res.reason || "Cannot add");
    }
  };

  const handleRemove = () => {
    deck.remove(`${type}:${item.name}`);
  };

  const updateThumbsTooltipPosition = useCallback(() => {
    if (typeof window === "undefined") return;

    const tooltipElement = thumbsTooltipRef.current;
    const mediaElement = thumbsMediaRef.current;
    if (!tooltipElement || !mediaElement) return;

    const viewportPadding = 12;
    const gap = 8;
    const minTop = getTooltipSafeTop(gap, viewportPadding);
    const mediaRect = mediaElement.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();
    const coordinateSpace = getTooltipCoordinateSpace(tooltipElement);
    const rightAlignedLeft = mediaRect.right + gap;
    const leftAlignedLeft = mediaRect.left - tooltipRect.width - gap;
    const canPlaceRight = rightAlignedLeft + tooltipRect.width <= window.innerWidth - viewportPadding;
    const canPlaceLeft = leftAlignedLeft >= viewportPadding;
    const aboveTop = mediaRect.top - tooltipRect.height - gap;
    const belowTop = mediaRect.bottom + gap;
    const maxTop = Math.max(minTop, window.innerHeight - tooltipRect.height - viewportPadding);
    const moreRoomOnRight = (window.innerWidth - viewportPadding) - mediaRect.left >= mediaRect.right - viewportPadding;
    const hasSidePlacement = canPlaceRight || canPlaceLeft;
    let left = 0;
    let top = 0;

    if (hasSidePlacement) {
      left = canPlaceRight ? rightAlignedLeft : leftAlignedLeft;
      top = Math.min(Math.max(mediaRect.top, minTop), maxTop);
    } else {
      left = getHoverAnchorLeft(mediaRect, tooltipRect.width, viewportPadding, aboveTop >= minTop ? moreRoomOnRight : !moreRoomOnRight);
      top = aboveTop >= minTop ? aboveTop : belowTop;

      left = Math.floor(left);
      top = Math.floor(Math.min(Math.max(top, minTop), maxTop));

      if (rectsIntersect(left, top, tooltipRect.width, tooltipRect.height, mediaRect)) {
        top = Math.floor(Math.min(Math.max(belowTop, minTop), maxTop));
      }
    }

    left = Math.floor(left);
    top = Math.floor(Math.min(Math.max(top, minTop), maxTop));

    setThumbsTooltipPosition({
      left: left - coordinateSpace.leftOffset,
      top: top - coordinateSpace.topOffset,
    });
  }, []);

  const closeThumbsHover = useCallback(() => {
    if (thumbsPositionFrame.current !== null) {
      window.cancelAnimationFrame(thumbsPositionFrame.current);
      thumbsPositionFrame.current = null;
    }
    setShowThumbsHover(false);
    setThumbsTooltipPosition(null);
  }, []);

  const openThumbsHover = useCallback((cardElement: HTMLElement | null) => {
    cardElementRef.current = cardElement;
    setShowThumbsHover(true);

    if (thumbsPositionFrame.current !== null) {
      window.cancelAnimationFrame(thumbsPositionFrame.current);
    }

    thumbsPositionFrame.current = window.requestAnimationFrame(() => {
      updateThumbsTooltipPosition();
      thumbsPositionFrame.current = null;
    });
  }, [updateThumbsTooltipPosition]);

  useEffect(() => {
    if (!showThumbsHover || typeof window === "undefined") return;

    const tooltipElement = thumbsTooltipRef.current;
    const mediaElement = thumbsMediaRef.current;
    if (!tooltipElement || !mediaElement) return;

    const observer = new ResizeObserver(() => {
      updateThumbsTooltipPosition();
    });
    observer.observe(tooltipElement);

    const handleViewportChange = () => updateThumbsTooltipPosition();
    const scrollParents = getTooltipScrollParents(mediaElement);
    window.addEventListener("resize", handleViewportChange);
    scrollParents.forEach((parent) => parent.addEventListener("scroll", handleViewportChange, {passive: true}));

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleViewportChange);
      scrollParents.forEach((parent) => parent.removeEventListener("scroll", handleViewportChange));
    };
  }, [showThumbsHover, updateThumbsTooltipPosition]);

  const cardClasses = `card ${viewMode === "thumbs" ? "card-thumbs" : "card-details"} ${
    highlight || presentInDeck ? "is-highlighted" : ""
  } ${presentInDeck ? "is-in-deck" : ""} ${fade ? "is-faded" : ""}`;

  return (
    <article
      className={cardClasses}
      ref={(element) => {
        cardElementRef.current = element;
        cardRef?.(element);
      }}
      tabIndex={viewMode === "thumbs" ? 0 : undefined}
      onBlur={(event) => {
        if (viewMode === "thumbs" && !event.currentTarget.contains(event.relatedTarget as Node | null)) {
          closeThumbsHover();
        }
      }}
      onFocus={(event) => {
        if (viewMode === "thumbs") {
          openThumbsHover(event.currentTarget);
        }
      }}
      onMouseLeave={() => {
        if (viewMode === "thumbs") {
          closeThumbsHover();
        }
      }}
      onMouseEnter={(event) => {
        if (viewMode === "thumbs") {
          openThumbsHover(event.currentTarget);
        }
      }}
    >
      {viewMode === "thumbs" ? (
        <>
          <div className="card-thumbs-media-wrap" ref={thumbsMediaRef}>
            {item.image ? (
              <img className="card-thumbs-image" decoding="async" loading="lazy" src={item.image} alt=""/>
            ) : (
              <div className="card-thumbs-image card-thumbs-image-empty"/>
            )}
            <div className="card-thumbs-actions card-actions">
              <CardActionButtons
                allowAddToDeck={allowAddToDeck}
                itemName={item.name}
                liked={liked}
                likes={likes}
                onAdd={handleAdd}
                onRemove={handleRemove}
                presentInDeck={presentInDeck}
                type={type}
              />
            </div>
          </div>
          <div
            className="card-thumbs-hover"
            ref={thumbsTooltipRef}
            role="tooltip"
            style={{
              left: `${thumbsTooltipPosition?.left ?? 0}px`,
              top: `${thumbsTooltipPosition?.top ?? 0}px`,
              opacity: showThumbsHover && thumbsTooltipPosition ? undefined : 0,
              visibility: showThumbsHover && thumbsTooltipPosition ? undefined : "hidden",
            }}
          >
            {showThumbsHover ? (
              <>
                <div className="card-thumbs-hover-head">
                  <div className="card-title" style={item.nameColor ? {color: item.nameColor} : undefined}>
                    {item.name}
                  </div>
                </div>
                {stats.length > 0 && (
                  <div className="card-thumbs-hover-stats card-stats">
                    {stats.map((stat) => (
                      <div className="card-stat" key={stat.label}>
                        <span className="card-stat-value">{stat.value}</span>
                        <span className="card-stat-label">{stat.label}</span>
                      </div>
                    ))}
                  </div>
                )}
                <RichText
                  parts={item.richDescription}
                  onEntityFilter={onEntityFilter}
                />
                <EntityVideoPreview
                  active={showThumbsHover}
                  entity={item}
                  onMediaReady={updateThumbsTooltipPosition}
                  preload="metadata"
                  wrapperClassName="card-thumbs-hover-video"
                />
              </>
            ) : (
              <div className="card-thumbs-hover-head">
                <div className="card-title" style={item.nameColor ? {color: item.nameColor} : undefined}>
                  {item.name}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="card-head">
            <div className="card-title-wrap">
              <div className="card-thumb-wrap">
                <button
                  aria-label={`Preview ${item.name}`}
                  className="card-thumb-preview-trigger"
                  type="button"
                  onBlur={() => setShowPreview(false)}
                  onFocus={() => setShowPreview(true)}
                  onMouseEnter={() => setShowPreview(true)}
                  onMouseLeave={() => setShowPreview(false)}
                >
                  {item.image && <img className="card-thumb-image" decoding="async" loading="lazy" src={item.image} alt=""/>}
                </button>
                {showPreview ? (
                  <div className="card-image-hover-preview">
                    <EntityVideoPreview
                      active={showPreview}
                      entity={item}
                      wrapperClassName="card-image-hover-preview-surface"
                      mediaClassName="card-image-hover-preview-media"
                      preload="metadata"
                    />
                  </div>
                ) : null}
              </div>
              <div className="card-title" style={item.nameColor ? {color: item.nameColor} : undefined}>
                {item.name}
              </div>
            </div>
            <div className="card-actions">
              <CardActionButtons
                allowAddToDeck={allowAddToDeck}
                itemName={item.name}
                liked={liked}
                likes={likes}
                onAdd={handleAdd}
                onRemove={handleRemove}
                presentInDeck={presentInDeck}
                type={type}
              />
            </div>
          </div>
          {stats.length > 0 && (
            <div className="card-stats">
              {stats.map((stat) => (
                <div className="card-stat" key={stat.label}>
                  <span className="card-stat-value">{stat.value}</span>
                  <span className="card-stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          )}
          <RichText
            parts={item.richDescription}
            onEntityFilter={onEntityFilter}
          />
        </>
      )}
    </article>
  );
}

type CardActionButtonsProps = {
  allowAddToDeck: boolean;
  itemName: string;
  liked: boolean;
  likes: ReturnType<typeof useLikes>;
  onAdd: () => void;
  onRemove: () => void;
  presentInDeck: boolean;
  type: EntityType;
};

function CardActionButtons({
  allowAddToDeck,
  itemName,
  liked,
  likes,
  onAdd,
  onRemove,
  presentInDeck,
  type,
}: CardActionButtonsProps) {
  return (
    <>
      <button
        className={`card-action-btn like ${liked ? "is-liked" : ""}`}
        aria-label={liked ? "Unheart" : "Heart"}
        onClick={(e) => {
          e.stopPropagation();
          likes.toggle(`${type}:${itemName}`);
        }}
      >
        ♥
      </button>
      {type !== "effects" && !presentInDeck && allowAddToDeck && (
        <button
          className="card-action-btn"
          aria-label="Add to deck"
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
        >
          +
        </button>
      )}
      {type !== "effects" && presentInDeck && allowAddToDeck && (
        <button
          className="card-action-btn"
          aria-label="Remove from deck"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ×
        </button>
      )}
    </>
  );
}

/**
 * Build the stat rows shown for an entity card.
 *
 * @param {ScrapedEntity} item - Entity payload.
 * @param {EntityType} type - Entity type.
 * @returns {StatRow[]} Visible stat rows for the entity.
 */
export function getEntityStats(item: ScrapedEntity, type: EntityType): StatRow[] {
  if (type === "weapons") {
    return [
      asStat("DMG", item.baseDamage),
      asStat("Alter Attack DMG", item.alterattackBonus),
    ].filter((stat): stat is StatRow => stat !== null);
  }

  if (type === "trinkets") {
    return [
      asStat("DMG", item.baseDamage),
      asStat("Cooldown", item.cooldown),
    ].filter((stat): stat is StatRow => stat !== null);
  }

  return [];
}

function asStat(label: string, value: string | undefined): StatRow | null {
  const clean = value?.trim();
  if (!clean) return null;
  return {label, value: clean};
}
