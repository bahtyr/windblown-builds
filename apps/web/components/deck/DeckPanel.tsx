/* eslint-disable @next/next/no-img-element */
"use client";

import {useEffect, useState} from "react";
import {DeckItem, useDeck} from "./DeckContext";
import {EntityType} from "../../lib/types";
import {buildDeckShareUrl} from "./deck-share";

type Props = {
  open: boolean;
};

export default function DeckPanel({open}: Props) {
  const deck = useDeck();
  const [status, setStatus] = useState<string>("");
  const total = deck.items.length;
  const [shareLink, setShareLink] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShareLink(buildDeckShareUrl(window.location.origin, {name: deck.name, items: deck.items}));
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
    <aside className={`deck-drawer ${open ? "is-open" : "is-collapsed"}`}>
      {open && (
        <div className="deck">
          <button className="btn deck-new-button" type="button" onClick={() => deck.createDeck()}>Start a new deck
          </button>
          <div className="deck-saved-list">
            {deck.saved.map((d) => (
              <button key={d.name}
                      className={`link deck-saved-item ${deck.selectedSaved === d.name ? "is-active" : ""}`}
                      onClick={() => deck.loadDeck(d.name)}>
                {d.name}
              </button>
            ))}
          </div>
          <div className="deck-manager">
            <div className="deck-actions">
              <input
                className="deck-name-input"
                value={deck.name}
                onChange={(e) => deck.setName(e.target.value)}
                placeholder="Deck name"
              />
              <button className="btn ghost" type="button" onClick={() => deck.resetDeck()}>
                Reset
              </button>
              <button className="btn ghost" type="button" onClick={() => deck.deleteDeck(deck.name)}>
                Delete
              </button>
              <button className="btn ghost deck-share-button" id="copyDeckLink" type="button" onClick={handleCopy}>
                🔗 Copy share link
              </button>
              {/* update the share button color/text when {status} - only briefly then reset */}
            </div>
            <div className="deck-content">
              {deck.items.length === 0 && <div className="muted">No items yet</div>}
              {rows(deck.items).map((groups, rowIdx) => (
                <div className="deck-groups" key={rowIdx}>
                  {groups.map(({type, list}: { type: EntityType; list: DeckItem[] }) => (
                    list.length > 0 && (
                      <div className="deck-group" key={type}>
                        <div className="deck-items">
                          {list.map((item, idx) => (
                            <DeckDraggable
                              key={item.id}
                              item={item}
                              index={idx}
                              type={type}
                              onDrop={(from, to) => deck.moveWithinType(type, from, to)}
                              onRemove={() => deck.remove(item.id)}
                              highlight={type === "gifts" && idx < 8}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

type DragProps = {
  item: DeckItem;
  index: number;
  type: EntityType;
  onDrop: (from: number, to: number) => void;
  onRemove: () => void;
  highlight?: boolean;
};

function DeckDraggable({item, index, type, onDrop, onRemove, highlight}: DragProps) {
  return (
    <div
      className={`deck-item ${highlight ? "is-highlighted" : ""}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", `${index}`);
        e.dataTransfer.effectAllowed = "move";
        e.currentTarget.classList.add("dragging");
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
      onDragEnd={(e) => e.currentTarget.classList.remove("dragging")}
      title={`${type} - ${item.name}`}
    >
      {item.image && <img src={item.image} alt="" className="deck-item-img"/>}
      <div className="deck-chip-name">{item.name}</div>
      <button className="deck-item-remove" onClick={onRemove} aria-label="Remove">
        x
      </button>
    </div>
  );
}

function rows(items: DeckItem[]): { type: EntityType; list: DeckItem[] }[][] {
  const group = (type: EntityType) => items.filter((x) => x.type === type);
  return [
    [{type: "gifts" as const, list: group("gifts")}],
    [
      {type: "weapons" as const, list: group("weapons")},
      {type: "trinkets" as const, list: group("trinkets")},
      {type: "magifishes" as const, list: group("magifishes")},
    ],
    [
      {type: "hexes" as const, list: group("hexes")},
      {type: "boosts" as const, list: group("boosts")},
    ],
  ];
}
