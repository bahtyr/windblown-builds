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
};

export default function EntityCard({item, type, highlight, deck, likes, limits}: Props) {
  const inDeck = deck.items.some((x) => x.id === `${type}:${item.name}`);
  const liked = likes.ids.has(`${type}:${item.name}`);

  const handleAdd = () => {
    const res = deck.add(makeDeckItem(type, item), limits);
    if (!res.ok) {
      alert(res.reason || "Cannot add");
    }
  };

  return (
    <article className={`card ${highlight ? "highlight" : ""}`}>
      <div className="card-head">
        <div className="pill">{type}</div>
        {item.nameColor && <div className="pill color" style={{borderColor: item.nameColor, color: item.nameColor}} />}
        <button className={`like ${liked ? "liked" : ""}`} onClick={() => likes.toggle(`${type}:${item.name}`)}>
          ♥
        </button>
      </div>
      <div className="card-title">{item.name}</div>
      {item.image && <img className="card-img" src={item.image} alt={item.name} />}
      <RichText parts={item.richDescription} />
      <div className="card-actions">
        {type !== "effects" && (
          <button className="btn" onClick={handleAdd} disabled={inDeck}>
            {inDeck ? "In deck" : "Add to deck"}
          </button>
        )}
      </div>
    </article>
  );
}
