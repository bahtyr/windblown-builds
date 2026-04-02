/* eslint-disable @next/next/no-img-element */
"use client";

import GearCollectionEditor from "../gear/GearCollectionEditor";
import {useDeck} from "./DeckContext";

type Props = {
  onCancel: () => void;
  onCommit: () => void;
};

/**
 * Renders the deck-specific wrapper over the shared gear collection editor.
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
    <GearCollectionEditor
      items={deck.items}
      name={deck.name}
      isEditing={isEditing}
      title={isEditing ? "Edit build" : "Create new build"}
      namePlaceholder="Deck name"
      emptyCopy="No items yet"
      commitLabel={isEditing ? "Update build" : "Save build"}
      showDelete={isEditing}
      onNameChange={deck.setName}
      onReset={deck.resetDeck}
      onDelete={handleDelete}
      onCancel={onCancel}
      onCommit={handleCommit}
      onRemove={deck.remove}
      onMoveWithinType={deck.moveWithinType}
    />
  );
}
