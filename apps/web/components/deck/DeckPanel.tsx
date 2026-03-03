"use client";

import {useMemo, useState} from "react";
import {useDeck} from "./DeckContext";
import {EntityType} from "../../lib/types";

export default function DeckPanel() {
  const deck = useDeck();
  const [status, setStatus] = useState<string>("");
  const total = deck.items.length;

  const shareLink = useMemo(() => {
    const params = new URLSearchParams();
    if (deck.name.trim()) params.set("name", deck.name.trim());
    if (deck.items.length) {
      params.set(
        "deck",
        deck.items
          .map((i) => `${i.type}|${encodeURIComponent(i.name)}`)
          .join(","),
      );
    }
    return `${typeof window !== "undefined" ? window.location.origin : ""}/gifts?${params.toString()}`;
  }, [deck.items, deck.name]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setStatus("Link copied");
    } catch {
      setStatus("Copy failed");
    }
  };

  return (
    <div className="deck" id="deck">
      <div className="deck-toggle" aria-expanded="true">
        Deck ({total})
      </div>
      <div className="deck-panel" id="deckPanel">
        <div className="deck-side">
          <div className="deck-entities-title">Saved decks</div>
          {deck.saved.length === 0 && <div className="muted">None</div>}
          {deck.saved.map((d) => (
            <button key={d.name} className="link" onClick={() => deck.loadDeck(d.name)}>
              {d.name} ({d.items.length})
            </button>
          ))}
        </div>
        <div className="deck-main">
          <div className="deck-actions">
            <input
              className="deck-name"
              value={deck.name}
              onChange={(e) => deck.setName(e.target.value)}
              placeholder="Deck name"
            />
            <button className="btn" type="button" onClick={() => deck.saveDeck()}>
              Save deck
            </button>
            <button className="btn ghost" type="button" onClick={() => deck.clear()}>
              Clear
            </button>
            <button className="btn" id="copyDeckLink" type="button" onClick={handleCopy}>
              Copy share link
            </button>
            <div className="deck-status" id="deckStatus">
              {status}
            </div>
          </div>
          <div className="deck-slots" id="deckSlots">
            {groupedByType(deck.items).map(({type, list}) => (
              <div className="deck-group" key={type}>
                <div className="deck-group-title">{type}</div>
                <div className="deck-group-items">
                  {list.map((item, idx) => (
                    <DeckDraggable
                      key={item.id}
                      item={item}
                      index={idx}
                      type={type as EntityType}
                      onDrop={(from, to) => deck.moveWithinType(type as EntityType, from, to)}
                      onRemove={() => deck.remove(item.id)}
                      highlight={type === "gifts" && idx < 8}
                    />
                  ))}
                  {list.length === 0 && <div className="muted">Empty</div>}
                </div>
              </div>
            ))}
            {deck.items.length === 0 && <div className="muted">No items yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

type DragProps = {
  item: {id: string; name: string; image?: string};
  index: number;
  type: EntityType;
  onDrop: (from: number, to: number) => void;
  onRemove: () => void;
  highlight?: boolean;
};

function DeckDraggable({item, index, type, onDrop, onRemove, highlight}: DragProps) {
  return (
    <div
      className={`deck-chip ${highlight ? "highlight" : ""}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", `${index}`);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        e.preventDefault();
        const from = Number(e.dataTransfer.getData("text/plain"));
        if (!Number.isNaN(from)) {
          onDrop(from, index);
        }
      }}
      title={`${type} - ${item.name}`}
    >
      {item.image && <img src={item.image} alt="" className="deck-chip-img" />}
      <div className="deck-chip-name">{item.name}</div>
      <button className="deck-chip-remove" onClick={onRemove} aria-label="Remove">
        ×
      </button>
    </div>
  );
}

function groupedByType(items: {type: EntityType}[]) {
  const order: EntityType[] = ["gifts", "weapons", "trinkets", "hexes", "magifishes"];
  return order.map((t) => ({type: t, list: items.filter((x) => x.type === t)}));
}
