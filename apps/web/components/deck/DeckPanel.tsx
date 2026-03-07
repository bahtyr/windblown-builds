/* eslint-disable @next/next/no-img-element */
"use client";

import {useEffect, useState} from "react";
import {DeckItem, useDeck} from "./DeckContext";
import {EntityType} from "../../lib/types";

export default function DeckPanel() {
  const deck = useDeck();
  const [status, setStatus] = useState<string>("");
  const total = deck.items.length;
  const [shareLink, setShareLink] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
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
    setShareLink(`${window.location.origin}/gifts?${params.toString()}`);
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
    <aside className={`deck-drawer ${open ? "open" : "collapsed"}`}>
      <div className="deck-toggle-row">
        <button className={`deck-toggle ${open ? "active" : ""}`} type="button" onClick={() => setOpen((v) => !v)}>
          {open ? "Hide deck builder" : "Deck builder"}
          {total > 0 && <span className="badge">{total}</span>}
        </button>
      </div>
      {open && (
        <div className="deck-shell">
          <div className="deck" id="deck">
            <div className="deck-panel" id="deckPanel">
              <div className="deck-side deck-entities-list">
                <div className="deck-entities-title">Deck</div>
                {deck.saved.map((d) => (
                  <div key={d.name} className={`saved-row ${deck.selectedSaved === d.name ? "active" : ""}`}>
                    <button className="link" onClick={() => deck.loadDeck(d.name)}>
                      {d.name}
                    </button>
                    <button className="icon-btn small" aria-label="Delete deck" onClick={() => deck.deleteDeck(d.name)}>
                      x
                    </button>
                  </div>
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
                  <button className="btn" type="button" onClick={() => deck.createDeck()}>
                    New deck
                  </button>
                  <button className="btn ghost" type="button" onClick={() => deck.resetDeck()}>
                    Reset deck
                  </button>
                  <button className="btn" id="copyDeckLink" type="button" onClick={handleCopy}>
                    Copy share link
                  </button>
                  <div className="deck-status" id="deckStatus">
                    {status}
                  </div>
                </div>
                <div className="deck-slots" id="deckSlots">
                  {rows(deck.items).map((groups, rowIdx) => (
                    <div className="deck-row" key={rowIdx}>
                      {groups.map(({type, list}: { type: EntityType; list: DeckItem[] }) => (
                        list.length > 0 && (
                          <div className="deck-group" key={type}>
                            <div className="deck-group-items">
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
                  {deck.items.length === 0 && <div className="muted">No items yet</div>}
                </div>
              </div>
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
      className={`deck-chip ${highlight ? "highlight" : ""}`}
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
      {item.image && <img src={item.image} alt="" className="deck-chip-img"/>}
      <div className="deck-chip-name">{item.name}</div>
      <button className="deck-chip-remove" onClick={onRemove} aria-label="Remove">
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
    [{type: "hexes" as const, list: group("hexes")}],
  ];
}
