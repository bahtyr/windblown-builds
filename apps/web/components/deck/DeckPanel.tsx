"use client";

import {useMemo, useState} from "react";
import {useDeck, deckId} from "./DeckContext";
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
          <div className="deck-entities-title">Entities in this deck</div>
          <div className="deck-entities-list" id="deckEntities">
            {deck.items.map((item, idx) => (
              <div className="deck-entity" key={item.id}>
                <span className="muted">#{idx + 1}</span> {item.name} <span className="pill">{item.type}</span>
              </div>
            ))}
          </div>
          <div className="deck-saved">
            <div className="deck-entities-title">Saved decks</div>
            {deck.saved.length === 0 && <div className="muted">None</div>}
            {deck.saved.map((d) => (
              <button key={d.name} className="link" onClick={() => deck.loadDeck(d.name)}>
                {d.name} ({d.items.length})
              </button>
            ))}
          </div>
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
            {deck.items.map((item, idx) => (
              <div className="slot" key={item.id}>
                <div className="slot-head">
                  <div className="pill">{item.type}</div>
                  <div className="muted">#{idx + 1}</div>
                </div>
                <div className="slot-title">{item.name}</div>
                <div className="slot-actions">
                  <button className="btn ghost" onClick={() => deck.move(item.id, -1)} disabled={idx === 0}>
                    ↑
                  </button>
                  <button
                    className="btn ghost"
                    onClick={() => deck.move(item.id, 1)}
                    disabled={idx === deck.items.length - 1}
                  >
                    ↓
                  </button>
                  <button className="btn ghost" onClick={() => deck.remove(item.id)}>
                    Remove
                  </button>
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
