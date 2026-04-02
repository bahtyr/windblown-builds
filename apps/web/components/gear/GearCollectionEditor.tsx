/* eslint-disable @next/next/no-img-element */
"use client";

import {groupGearsForEditorRows, type Gear} from "./gear-collection-utils";
import {EntityType} from "../../lib/types";

type GearCollectionEditorProps = {
  items: Gear[];
  name: string;
  isEditing: boolean;
  title: string;
  namePlaceholder: string;
  emptyCopy: string;
  commitLabel: string;
  showDelete: boolean;
  onNameChange: (name: string) => void;
  onReset: () => void;
  onDelete?: () => void;
  onCancel: () => void;
  onCommit: () => void;
  onRemove: (id: string) => void;
  onMoveWithinType: (type: EntityType, from: number, to: number) => void;
};

/**
 * Renders the shared editable gear collection UI with grouped items and reorder controls.
 *
 * @param {GearCollectionEditorProps} props - Editor state and user actions.
 * @returns {JSX.Element} Shared gear collection editor content.
 */
export default function GearCollectionEditor({
  items,
  name,
  isEditing,
  title,
  namePlaceholder,
  emptyCopy,
  commitLabel,
  showDelete,
  onNameChange,
  onReset,
  onDelete,
  onCancel,
  onCommit,
  onRemove,
  onMoveWithinType,
}: GearCollectionEditorProps) {
  return (
    <div className="deck">
      <div className="deck-manager">
        <div className="deck-manager-top">
          <div className="deck-builder-title-group">
            <h2 className="deck-builder-title">{title}</h2>
          </div>
          <div className="deck-actions">
            <input
              className="deck-name-input"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder={namePlaceholder}
            />

            <button className="btn ghost" type="button" onClick={onReset}>
              Reset
            </button>
            {showDelete && onDelete && (
              <button className="btn ghost" type="button" onClick={onDelete}>
                Delete
              </button>
            )}
            <button className="btn ghost" type="button" onClick={onCancel}>
              Cancel
            </button>
            <button className="btn" type="button" onClick={onCommit}>
              {commitLabel}
            </button>
          </div>
        </div>
        <div className="deck-content">
          {items.length === 0 && <div className="muted">{emptyCopy}</div>}
          {groupGearsForEditorRows(items).map((groups, rowIdx) => (
            <div className="deck-groups" key={rowIdx}>
              {groups.map(({type, list}) => (
                list.length > 0 && (
                  <div className="deck-group" key={type}>
                    <div className="deck-items">
                      {list.map((item, idx) => (
                        <DraggableGearChip
                          key={item.id}
                          item={item}
                          index={idx}
                          type={type}
                          onDrop={(from, to) => onMoveWithinType(type, from, to)}
                          onRemove={() => onRemove(item.id)}
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
  item: Gear;
  index: number;
  type: EntityType;
  onDrop: (from: number, to: number) => void;
  onRemove: () => void;
  highlight?: boolean;
};

function DraggableGearChip({item, index, type, onDrop, onRemove, highlight}: DragProps) {
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
