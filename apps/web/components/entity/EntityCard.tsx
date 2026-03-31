/* eslint-disable @next/next/no-img-element */
"use client";

import {useState} from "react";
import {EntityType, ScrapedEntity} from "../../lib/types";
import {DeckLimits, makeDeckItem, useDeck} from "../deck/DeckContext";
import {useLikes} from "../like/LikeContext";
import RichText from "./RichText";
import EntityVideoPreview from "./EntityVideoPreview";

type Props = {
  item: ScrapedEntity;
  type: EntityType;
  highlight?: boolean;
  deck: ReturnType<typeof useDeck>;
  likes: ReturnType<typeof useLikes>;
  limits: DeckLimits;
  fade?: boolean;
  inDeck?: boolean;
  onEntityFilter?: (id: string) => void;
  allowAddToDeck?: boolean;
};

type StatRow = {
  label: string;
  value: string;
};

export default function EntityCard({
  item,
  type,
  highlight,
  deck,
  likes,
  limits,
  fade,
  inDeck,
  onEntityFilter,
  allowAddToDeck = true,
}: Props) {
  const presentInDeck = inDeck ?? deck.items.some((x) => x.id === `${type}:${item.name}`);
  const liked = likes.ids.has(`${type}:${item.name}`);
  const stats = getEntityStats(item, type);
  const [showPreview, setShowPreview] = useState(false);

  const handleAdd = () => {
    const res = deck.add(makeDeckItem(type, item), limits);
    if (!res.ok) {
      alert(res.reason || "Cannot add");
    }
  };

  const handleRemove = () => {
    deck.remove(`${type}:${item.name}`);
  };

  return (
    <article
      className={`card ${highlight || presentInDeck ? "is-highlighted" : ""} ${presentInDeck ? "is-in-deck" : ""} ${
        fade ? "is-faded" : ""
      }`}
    >
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
              {item.image && <img className="card-thumb-image" src={item.image} alt=""/>}
            </button>
            {showPreview ? (
              <div className="card-image-hover-preview">
                <EntityVideoPreview entity={item} wrapperClassName="card-image-hover-preview-surface" mediaClassName="card-image-hover-preview-media"/>
              </div>
            ) : null}
          </div>
          <div className="card-title" style={item.nameColor ? {color: item.nameColor} : undefined}>
            {item.name}
          </div>
        </div>
        <div className="card-actions">
          <button
            className={`card-action-btn like ${liked ? "is-liked" : ""}`}
            aria-label={liked ? "Unheart" : "Heart"}
            onClick={(e) => {
              e.stopPropagation();
              likes.toggle(`${type}:${item.name}`);
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
                handleAdd();
              }}
            >
              +
            </button>
          )}
          {type !== "effects" && presentInDeck && (
            <button
              className="card-action-btn"
              aria-label="Remove from deck"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
            >
              ×
            </button>
          )}
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
    </article>
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
