/* eslint-disable @next/next/no-img-element */
"use client";

import {useEffect, useMemo, useState} from "react";
import {useDeck} from "./DeckContext";
import {useDeckUi} from "./DeckUiContext";
import {buildDeckShareUrl} from "./deck-share";
import DeckPanel from "./DeckPanel";
import EntityBrowser from "../entity/EntityBrowser";

/**
 * Read-only saved deck library with share, duplicate, edit, and delete actions.
 *
 * @returns {JSX.Element} Saved deck library page.
 */
export default function DecksLibrary() {
  const deck = useDeck();
  const deckUi = useDeckUi();
  const [drawerMounted, setDrawerMounted] = useState(deckUi.open);
  const [drawerPhase, setDrawerPhase] = useState<"opening" | "open" | "closing">(deckUi.open ? "open" : "closing");

  const rows = useMemo(
    () => deck.saved.filter((savedDeck) => savedDeck.items.length > 0).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [deck.saved],
  );

  useEffect(() => {
    let frameId = 0;
    let timeoutId = 0;

    if (deckUi.open) {
      setDrawerMounted(true);
      setDrawerPhase("opening");
      frameId = window.requestAnimationFrame(() => {
        setDrawerPhase("open");
      });
      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    if (!drawerMounted) return;
    setDrawerPhase("closing");
    timeoutId = window.setTimeout(() => {
      setDrawerMounted(false);
    }, 220);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [deckUi.open, drawerMounted]);

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

  const handleEditShared = () => {
    deck.editSharedDeck();
    deckUi.openDeck();
  };

  const handleSaveShared = () => {
    deck.saveSharedDeck();
  };

  const handleDiscardShared = () => {
    deck.discardSharedDeck();
  };

  const handleCreateNew = () => {
    deck.createDeck();
    deckUi.openDeck();
  };

  const handleCancelEditing = () => {
    deck.cancelEditing();
    deckUi.closeDeck();
  };

  const handleCommitEditing = () => {
    deckUi.closeDeck();
  };

  return (
    <>
      <div className="page page-decks">
        <section className="decks-page body-wrapper">
          <div className="decks-page-header">
            <div>
              <h1 className="decks-page-title">Saved builds</h1>
              <p className="decks-page-copy">Start a new build, reopen an old favorite, or share a setup once it feels worth keeping.</p>
            </div>
            <div className="decks-page-header-actions">
              <button className="btn decks-page-primary-button" type="button" onClick={handleCreateNew}>Create new build</button>
            </div>
          </div>

          <div className="decks-grid">
            {deck.sharedDeck && (
              <article className="deck-row deck-row-shared" key={`shared-${deck.sharedDeck.name}`}>
                <div className="deck-row-head">
                  <div className="deck-row-title-group">
                    <h2 className="deck-row-title">{deck.sharedDeck.name}</h2>
                    <p className="deck-row-meta">Shared link</p>
                  </div>
                  <div className="deck-row-actions">
                    <button className="btn ghost deck-row-action" type="button" onClick={handleDiscardShared}>Discard</button>
                    <button className="btn ghost deck-row-action" type="button" onClick={handleEditShared}>Edit</button>
                    <button className="btn deck-row-action" type="button" onClick={handleSaveShared}>Save</button>
                  </div>
                </div>

                <div className="deck-row-items">
                  {deck.sharedDeck.items.map((item) => (
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
            )}

            {rows.length > 0 ? (
              rows.map((savedDeck) => (
                <article className="deck-row" key={savedDeck.name}>
                  <div className="deck-row-head">
                    <div className="deck-row-title-group">
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
              !deck.sharedDeck && (
              <div className="deck-row-empty">No saved builds yet.</div>
              )
            )}
          </div>
        </section>
      </div>

      {drawerMounted && (
        <div className={`deck-builder-overlay is-${drawerPhase}`}>
          <div className={`deck-builder-backdrop is-${drawerPhase}`}/>
          <button
            aria-label="Cancel changes and close build editor"
            className="deck-builder-dismiss"
            type="button"
            onClick={handleCancelEditing}
          />
          <div
            aria-label="Build editor"
            aria-modal="true"
            className={`deck-builder-drawer is-${drawerPhase}`}
            role="dialog"
          >
            <div className={`deck-builder-surface is-${drawerPhase}`}>
              <DeckPanel onCancel={handleCancelEditing} onCommit={handleCommitEditing}/>
              <div className="deck-builder-browser">
                <EntityBrowser embedded/>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
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
