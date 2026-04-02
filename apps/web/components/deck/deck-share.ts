import {type SavedDeck} from "./DeckContext";
import {type Gear} from "../gear/gear-types";

/**
 * Build a share URL for a saved deck.
 *
 * @param {string} origin - Current site origin.
 * @param {{name: string; items: Gear[]}} deck - Deck payload to serialize.
 * @returns {string} Shareable decks URL.
 */
export function buildDeckShareUrl(origin: string, deck: Pick<SavedDeck, "name" | "items">): string {
  const params = new URLSearchParams();
  if (deck.name.trim()) params.set("name", deck.name.trim());
  if (deck.items.length) {
    params.set(
      "deck",
      deck.items
        .map((item) => `${item.type}|${encodeURIComponent(item.name)}`)
        .join(","),
    );
  }
  return `${origin}/decks?${params.toString()}`;
}
