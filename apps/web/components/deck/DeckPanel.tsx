/* eslint-disable @next/next/no-img-element */
"use client";

import {DeckItem, useDeck} from "./DeckContext";
import {EntityType} from "../../lib/types";

type Props = {
  onCancel: () => void;
  onCommit: () => void;
};

/**
 * Render the active deck editor controls and current item list.
 *
 * @param {Props} props - Deck editor callbacks.
 * @returns {JSX.Element} Deck editor content.
 */
export default function DeckPanel({onCancel, onCommit}: Props) {
  const deck = useDeck();
  const isEditing = deck.mode === "editing";

  const handleCommit = () => {
    deck.saveDeck();
    onCommit();
  };

  const handleDelete = () => {
    deck.deleteDeck(deck.editingDeckName ?? deck.name);
    onCommit();
  };

  return (
    <div className="deck">
      <div className="deck-manager">
        <div className="deck-builder-title-group">
          <h2 className="deck-builder-title">{isEditing ? "Edit build" : "Create new build"}</h2>
        </div>
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
          {isEditing && (
            <button className="btn ghost" type="button" onClick={handleDelete}>
              Delete
            </button>
          )}
          <button className="btn ghost" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn" type="button" onClick={handleCommit}>
            {isEditing ? "Update build" : "Save build"}
          </button>
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
