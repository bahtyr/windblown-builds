/* eslint-disable @next/next/no-img-element */
"use client";

import {useEffect, useMemo, useState} from "react";
import {DeckItem, SavedDeck, SharedDeck, useDeck} from "./DeckContext";
import {useDeckUi} from "./DeckUiContext";
import {buildDeckShareUrl} from "./deck-share";
import DeckPanel from "./DeckPanel";
import EntityBrowser from "../entity/EntityBrowser";

type DrawerPhase = "opening" | "open" | "closing";
type DeckRowModel =
  | { kind: "shared"; deck: SharedDeck }
  | { kind: "saved"; deck: SavedDeck };

/**
 * Read-only saved deck library with share, duplicate, edit, and delete actions.
 *
 * @returns {JSX.Element} Saved deck library page.
 */
export default function DecksLibrary() {
  const deck = useDeck();
  const deckUi = useDeckUi();
  const [drawerMounted, setDrawerMounted] = useState(deckUi.open);
  const [drawerPhase, setDrawerPhase] = useState<DrawerPhase>(deckUi.open ? "open" : "closing");

  const rows = useMemo(() => {
    const libraryRows: DeckRowModel[] = deck.saved
      .filter((savedDeck) => savedDeck.items.length > 0)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((savedDeck) => ({kind: "saved" as const, deck: savedDeck}));

    if (deck.sharedDeck) {
      libraryRows.unshift({kind: "shared", deck: deck.sharedDeck});
    }

    return libraryRows;
  }, [deck.saved, deck.sharedDeck]);

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
    }, 300);

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

  const handleCreateNew = () => {
    deck.createDeck();
    deckUi.openDeck();
  };

  const handleCancelEditing = () => {
    deck.cancelEditing();
    deckUi.closeDeck();
  };

  return (
    <>
      <div className="page page-decks">
        <section className="decks-page body-wrapper">
          <div className="decks-page-header">
            <div>
              <h1 className="decks-page-title">Your library</h1>
              <p className="decks-page-copy">Revisit your runs and share with others.</p>
            </div>
            <div className="decks-page-header-actions">
              <button className="btn decks-page-primary-button" type="button" onClick={handleCreateNew}>Create new build</button>
            </div>
          </div>

          <div className="decks-grid">
            {rows.length > 0 ? (
              rows.map((row) => (
                <DeckRow
                  key={`${row.kind}-${row.deck.name}`}
                  row={row}
                  onDelete={() => deck.deleteDeck(row.deck.name)}
                  onDiscardShared={() => deck.discardSharedDeck()}
                  onDuplicate={() => deck.duplicateDeck(row.deck.name)}
                  onEdit={() => {
                    if (row.kind === "shared") {
                      deck.editSharedDeck();
                    } else {
                      deck.loadDeck(row.deck.name);
                    }
                    deckUi.openDeck();
                  }}
                  onSaveShared={() => deck.saveSharedDeck()}
                  onShare={() => handleShare(row.deck.name)}
                />
              ))
            ) : (
              <div className="deck-row-empty">No saved builds yet.</div>
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
              <DeckPanel onCancel={handleCancelEditing} onCommit={() => deckUi.closeDeck()}/>
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

type DeckRowProps = {
  row: DeckRowModel;
  onDelete: () => void;
  onDiscardShared: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onSaveShared: () => void;
  onShare: () => void;
};

function DeckRow({row, onDelete, onDiscardShared, onDuplicate, onEdit, onSaveShared, onShare}: DeckRowProps) {
  const isShared = row.kind === "shared";
  const meta = isShared ? "Shared link" : formatRoughDate(row.deck.createdAt);

  return (
    <article className={`deck-row ${isShared ? "deck-row-shared" : ""}`}>
      <div className="deck-row-head">
        <div className="deck-row-title-group">
          <h2 className="deck-row-title">{row.deck.name}</h2>
          <p className="deck-row-meta">{meta}</p>
        </div>
        <div className="deck-row-actions">
          {isShared ? (
            <>
              <button className="btn ghost deck-row-action" type="button" onClick={onDiscardShared}>Discard</button>
              <button className="btn ghost deck-row-action" type="button" onClick={onEdit}>Edit</button>
              <button className="btn deck-row-action" type="button" onClick={onSaveShared}>Save</button>
            </>
          ) : (
            <>
              <button className="btn ghost deck-row-action deck-row-action-auto-hide" type="button" onClick={onEdit}>Edit</button>
              <button className="btn ghost deck-row-action deck-row-action-auto-hide" type="button" onClick={onDelete}>Delete</button>
              <button className="btn ghost deck-row-action deck-row-action-auto-hide" type="button" onClick={onDuplicate}>Duplicate</button>
              <button className="btn ghost deck-row-action deck-row-action-auto-hide" type="button" onClick={onShare}>Share</button>
            </>
          )}
        </div>
      </div>

      <div className="deck-row-items">
        {row.deck.items.map((item) => (
          <DeckRowItem key={item.id} item={item}/>
        ))}
      </div>
    </article>
  );
}

function DeckRowItem({item}: { item: DeckItem }) {
  return (
    <div className="deck-row-item">
      {item.image ? <img className="deck-row-item-thumb" src={item.image} alt=""/> : <div className="deck-row-item-thumb deck-row-item-thumb-empty"/>}
      <div className="deck-row-item-copy">
        <span className="deck-row-item-name">{item.name}</span>
      </div>
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
