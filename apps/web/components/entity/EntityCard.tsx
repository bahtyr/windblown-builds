/* eslint-disable @next/next/no-img-element */
"use client";

import {EntityType, ScrapedEntity} from "../../lib/types";
import {DeckLimits, makeDeckItem, useDeck} from "../deck/DeckContext";
import {useLikes} from "../like/LikeContext";
import RichText from "./RichText";

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
};

export default function EntityCard({item, type, highlight, deck, likes, limits, fade, inDeck, onEntityFilter}: Props) {
  const presentInDeck = inDeck ?? deck.items.some((x) => x.id === `${type}:${item.name}`);
  const liked = likes.ids.has(`${type}:${item.name}`);

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
      className={`card ${highlight || presentInDeck ? "highlight" : ""} ${presentInDeck ? "in-deck" : ""} ${
        fade ? "faded" : ""
      }`}
      onClick={() => {
        if (!presentInDeck && type !== "effects") handleAdd();
      }}
    >
      <div className="card-head">
        <div className="card-title-wrap">
          {item.image && <img className="card-thumb" src={item.image} alt=""/>}
          <div className="card-title" style={item.nameColor ? {color: item.nameColor} : undefined}>
            {item.name}
          </div>
        </div>
        <div className="card-icons">
          <button
            className={`icon-btn like ${liked ? "liked" : ""}`}
            aria-label={liked ? "Unheart" : "Heart"}
            onClick={(e) => {
              e.stopPropagation();
              likes.toggle(`${type}:${item.name}`);
            }}
          >
            ♥
          </button>
          {type !== "effects" && !presentInDeck && (
            <button
              className="icon-btn"
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
              className="icon-btn"
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
      <RichText
        parts={item.richDescription}
        onEntityFilter={onEntityFilter}
      />
    </article>
  );
}
