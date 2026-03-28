/* eslint-disable @next/next/no-img-element */
"use client";

import {useMemo, useState} from "react";
import {useDeck} from "./DeckContext";
import {buildDeckShareUrl} from "./deck-share";

/**
 * Read-only saved deck library with share, duplicate, and delete actions.
 *
 * @returns {JSX.Element} Saved deck library page.
 */
export default function DecksLibrary() {
  const deck = useDeck();
  const [status, setStatus] = useState<string>("");

  const rows = useMemo(
    () => [...deck.saved].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [deck.saved],
  );

  const handleShare = async (deckName: string) => {
    const savedDeck = deck.saved.find((entry) => entry.name === deckName);
    if (!savedDeck || typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(buildDeckShareUrl(window.location.origin, savedDeck));
      setStatus(`Copied share link for ${deckName}`);
    } catch {
      setStatus(`Copy failed for ${deckName}`);
    }
  };

  const handleDuplicate = (deckName: string) => {
    const duplicatedName = deck.duplicateDeck(deckName);
    setStatus(duplicatedName ? `Duplicated as ${duplicatedName}` : `Duplicate failed for ${deckName}`);
  };

  const handleDelete = (deckName: string) => {
    deck.deleteDeck(deckName);
    setStatus(`Deleted ${deckName}`);
  };

  return (
    <div className="page page-decks">
      <section className="decks-page body-wrapper">
        <div className="decks-page-header">
          <div>
            <h1 className="decks-page-title">Decks</h1>
            <p className="decks-page-copy">Saved decks, read-only here. Creation flow stays in the builder for now.</p>
          </div>
          {status && <div className="decks-page-status">{status}</div>}
        </div>

        <div className="decks-grid">
          {rows.map((savedDeck) => (
            <article className="deck-row" key={savedDeck.name}>
              <div className="deck-row-head">
                <div>
                  <h2 className="deck-row-title">{savedDeck.name}</h2>
                  <p className="deck-row-meta">Created {formatRoughDate(savedDeck.createdAt)}</p>
                </div>
                <div className="deck-row-actions">
                  <button className="btn ghost" type="button" onClick={() => handleShare(savedDeck.name)}>Share</button>
                  <button className="btn ghost" type="button" onClick={() => handleDuplicate(savedDeck.name)}>Duplicate</button>
                  <button className="btn ghost" type="button" onClick={() => handleDelete(savedDeck.name)}>Delete</button>
                </div>
              </div>

              <div className="deck-row-items">
                {savedDeck.items.length > 0 ? (
                  savedDeck.items.map((item) => (
                    <div className="deck-row-item" key={item.id}>
                      {item.image ? <img className="deck-row-item-thumb" src={item.image} alt=""/> : <div className="deck-row-item-thumb deck-row-item-thumb-empty"/>}
                      <div className="deck-row-item-copy">
                        <span className="deck-row-item-name">{item.name}</span>
                        <span className="deck-row-item-type">{item.type}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="deck-row-empty">No items saved yet</div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
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
  if (Number.isNaN(timestamp)) return "recently";

  const diffMs = Date.now() - timestamp;
  const dayMs = 24 * 60 * 60 * 1000;
  if (diffMs < dayMs) return "today";
  if (diffMs < dayMs * 2) return "yesterday";
  if (diffMs < dayMs * 7) return pluralize(Math.floor(diffMs / dayMs), "day");
  if (diffMs < dayMs * 30) return pluralize(Math.floor(diffMs / (dayMs * 7)), "week");
  if (diffMs < dayMs * 365) return pluralize(Math.floor(diffMs / (dayMs * 30)), "month");
  return pluralize(Math.floor(diffMs / (dayMs * 365)), "year");
}

function pluralize(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? "" : "s"} ago`;
}
