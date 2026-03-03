"use client";

import {ScrapedEntity, EntityType} from "../../lib/types";
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
};

export default function EntityCard({item, type, highlight, deck, likes, limits, fade, inDeck}: Props) {
  const presentInDeck = inDeck ?? deck.items.some((x) => x.id === `${type}:${item.name}`);
  const liked = likes.ids.has(`${type}:${item.name}`);

  const handleAdd = () => {
    const res = deck.add(makeDeckItem(type, item), limits);
    if (!res.ok) {
      alert(res.reason || "Cannot add");
    }
  };

  return (
    <article
      className={`card ${highlight || presentInDeck ? "highlight" : ""} ${presentInDeck ? "in-deck" : ""} ${fade ? "faded" : ""}`}
      onClick={() => {
        if (!presentInDeck && type !== "effects") handleAdd();
      }}
    >
      <div className="card-head">
        <button
          className={`like ${liked ? "liked" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            likes.toggle(`${type}:${item.name}`);
          }}
        >
          ♥
        </button>
      </div>
      <div className="card-title" style={item.nameColor ? {color: item.nameColor} : undefined}>
        {item.name}
      </div>
      {item.image && <img className="card-img" src={item.image} alt={item.name} />}
      <RichText
        parts={item.richDescription}
        onEntityClick={() => {
          if (!presentInDeck && type !== "effects") handleAdd();
        }}
      />
      <div className="card-actions">
        {type !== "effects" && !presentInDeck && (
          <button
            className="btn add-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleAdd();
            }}
          >
            Add to deck
          </button>
        )}
        {type !== "effects" && presentInDeck && (
          <button
            className="btn ghost add-btn"
            onClick={(e) => {
              e.stopPropagation();
              deck.remove(`${type}:${item.name}`);
            }}
          >
            Remove
          </button>
        )}
      </div>
    </article>
  );
}
