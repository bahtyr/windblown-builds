/* eslint-disable @next/next/no-img-element */
"use client";

import {useMemo, useRef, type ReactNode} from "react";
import categoryImages from "../../public/category-images.json";
import RichText from "../entity/RichText";
import EntityVideoPreview from "../entity/EntityVideoPreview";
import {getEntityStats} from "../entity/EntityCard";
import {useHoverTooltip} from "../tooltip/hoverTooltip";
import {buildGearCategorySummaries, type Gear} from "./gear-collection-utils";
import {EntityType, ScrapedEntity} from "../../lib/types";

export type GearCollectionPreviewItemMeta = {
  count: number;
  image?: string;
  itemIds: string[];
  name: string;
};

type GearCollectionPreviewItemProps = {
  item: Gear;
  details: {
    entity: ScrapedEntity;
    type: EntityType;
  } | null;
  fadeCategoryMismatch: boolean;
};

/**
 * Renders a reusable preview tile for a single gear item with tooltip details.
 *
 * @param {GearCollectionPreviewItemProps} props - Preview item state and entity details.
 * @returns {JSX.Element} Shared gear preview tile.
 */
export function GearCollectionPreviewItem({
  item,
  details,
  fadeCategoryMismatch,
}: GearCollectionPreviewItemProps) {
  const itemElementRef = useRef<HTMLDivElement | null>(null);
  const tooltipElementRef = useRef<HTMLDivElement | null>(null);
  const stats = details ? getEntityStats(details.entity, details.type) : [];
  const {
    isOpen: showTooltip,
    position: tooltipPosition,
    openTooltip,
    closeTooltip,
    updateTooltipPosition,
  } = useHoverTooltip({
    triggerRef: itemElementRef,
    tooltipRef: tooltipElementRef,
  });

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
          left: `${tooltipPosition?.left ?? 0}px`,
          top: `${tooltipPosition?.top ?? 0}px`,
          opacity: showTooltip && tooltipPosition ? undefined : 0,
          visibility: showTooltip && tooltipPosition ? undefined : "hidden",
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

type GearCategoryChipsProps = {
  categories: GearCollectionPreviewItemMeta[];
  label: string;
  activeCategory: string | null;
  onActiveCategoryChange: (category: string | null) => void;
  emptyCopy?: ReactNode;
};

/**
 * Renders the shared preview category chip list for a grouped gear collection.
 *
 * @param {GearCategoryChipsProps} props - Category metadata and active state wiring.
 * @returns {JSX.Element} Shared category chip list.
 */
export function GearCollectionCategoryChips({
  categories,
  label,
  activeCategory,
  onActiveCategoryChange,
  emptyCopy = "No gift categories",
}: GearCategoryChipsProps) {
  if (categories.length === 0) {
    return <p className="deck-row-side-empty">{emptyCopy}</p>;
  }

  return (
    <div
      className="deck-row-category-list"
      aria-label={label}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onActiveCategoryChange(null);
        }
      }}
      onMouseLeave={() => onActiveCategoryChange(null)}
    >
      {categories.map((category) => (
        <button
          key={category.name}
          aria-pressed={activeCategory === category.name}
          className={`deck-row-category-chip ${activeCategory === category.name ? "is-active" : ""}`}
          type="button"
          onMouseEnter={() => onActiveCategoryChange(category.name)}
          onFocus={() => onActiveCategoryChange(category.name)}
        >
          {category.image ? <img className="deck-row-category-thumb" decoding="async" loading="lazy" src={category.image} alt=""/> : null}
          <span>
            {category.count > 1 ? `${category.count} ` : ""}
            {category.name}
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * Builds preview metadata for visible gift categories in a gear collection.
 *
 * @param {Gear[]} items - Gear items shown in the preview.
 * @param {Map<string, string>} giftCategoryLookup - Gift item id to category.
 * @returns {GearCollectionPreviewItemMeta[]} Visible category metadata.
 */
export function buildGearCategoryMeta(items: Gear[], giftCategoryLookup: Map<string, string>): GearCollectionPreviewItemMeta[] {
  return buildGearCategorySummaries(items, giftCategoryLookup).map((category) => ({
    ...category,
    image: categoryImages[category.name as keyof typeof categoryImages],
  }));
}

/**
 * Resolves the active preview category into a set of highlighted gear ids.
 *
 * @param {GearCollectionPreviewItemMeta[]} categories - Visible category metadata.
 * @param {string | null} activeCategory - Active category name, if any.
 * @returns {Set<string>} Item ids included in the active category.
 */
export function getActivePreviewCategoryItemIds(
  categories: GearCollectionPreviewItemMeta[],
  activeCategory: string | null,
): Set<string> {
  return new Set(categories.find((category) => category.name === activeCategory)?.itemIds ?? []);
}
