/* eslint-disable @next/next/no-img-element */
"use client";

import {useMemo} from "react";
import {useDeck} from "./DeckContext";
import {useDeckUi} from "./DeckUiContext";
import {buildDeckShareUrl} from "./deck-share";

/**
 * Read-only saved deck library with share, duplicate, and delete actions.
 *
 * @returns {JSX.Element} Saved deck library page.
 */
export default function DecksLibrary() {
  const deck = useDeck();
  const deckUi = useDeckUi();

  const rows = useMemo(
    () => deck.saved.filter((savedDeck) => savedDeck.items.length > 0).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [deck.saved],
  );

  const handleShare = async (deckName: string) => {
    const savedDeck = deck.saved.find((entry) => entry.name === deckName);
    if (!savedDeck || typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(buildDeckShareUrl(window.location.origin, savedDeck));
    } catch {}
  };

  const handleDuplicate = (deckName: string) => {
    deck.duplicateDeck(deckName);
  };

  const handleDelete = (deckName: string) => {
    deck.deleteDeck(deckName);
  };

  const handleEdit = (deckName: string) => {
    deck.loadDeck(deckName);
    deckUi.openDeck();
  };

  const handleCreateNew = () => {
    deck.createDeck();
    deckUi.openDeck();
  };

  return (
    <div className="page page-decks">
      <section className="decks-page body-wrapper">
        <div className="decks-page-header">
          <div>
            <h1 className="decks-page-title">Saved builds</h1>
            <p className="decks-page-copy">Keep your favorite runs handy, revisit the item mix at a glance, and share a build when you want to send it to someone else.</p>
          </div>
          <div className="decks-page-header-actions">
            <button className="btn decks-page-primary-button" type="button" onClick={handleCreateNew}>Create new build</button>
          </div>
        </div>

        <div className="decks-grid">
          {rows.length > 0 ? (
            rows.map((savedDeck) => (
              <article className="deck-row" key={savedDeck.name}>
                <div className="deck-row-head">
                  <div>
                    <h2 className="deck-row-title">{savedDeck.name}</h2>
                    <p className="deck-row-meta">{formatRoughDate(savedDeck.createdAt)}</p>
                  </div>
                  <div className="deck-row-actions">
                    <button className="btn ghost deck-row-action deck-row-action-secondary" type="button" onClick={() => handleEdit(savedDeck.name)}>Edit</button>
                    <button className="btn ghost deck-row-action deck-row-action-secondary" type="button" onClick={() => handleDelete(savedDeck.name)}>Delete</button>
                    <button className="btn ghost deck-row-action deck-row-action-secondary" type="button" onClick={() => handleDuplicate(savedDeck.name)}>Duplicate</button>
                    <button className="btn ghost deck-row-action" type="button" onClick={() => handleShare(savedDeck.name)}>Share</button>
                  </div>
                </div>

                <div className="deck-row-items">
                  {savedDeck.items.map((item) => (
                    <div className="deck-row-item" key={item.id}>
                      {item.image ? <img className="deck-row-item-thumb" src={item.image} alt=""/> : <div className="deck-row-item-thumb deck-row-item-thumb-empty"/>}
                      <div className="deck-row-item-copy">
                        <span className="deck-row-item-name">{item.name}</span>
                        <span className="deck-row-item-type">{formatItemTypeLabel(item.type)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <div className="deck-row-empty">No saved builds yet.</div>
          )}
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

function formatItemTypeLabel(value: string): string {
  if (value === "magifishes") return "magifish";
  if (value.endsWith("s")) return value.slice(0, -1);
  return value;
}
