import {DeckItem, SavedDeck} from "./DeckContext";

/**
 * Build a share URL for a saved deck.
 *
 * @param {string} origin - Current site origin.
 * @param {{name: string; items: DeckItem[]}} deck - Deck payload to serialize.
 * @returns {string} Shareable browse URL.
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
  return `${origin}/browse?${params.toString()}`;
}
