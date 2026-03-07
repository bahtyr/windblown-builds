import {describe, expect, it} from "vitest";
import {selectFirstSavedAfterDelete} from "../components/deck/DeckContext";

describe("selectFirstSavedAfterDelete", () => {
  it("selects the first remaining deck after deletion", () => {
    const one = {name: "Deck 1", items: [{id: "gifts:One", type: "gifts" as const, name: "One"}]};
    const two = {name: "Deck 2", items: [{id: "gifts:Two", type: "gifts" as const, name: "Two"}]};
    const three = {name: "Deck 3", items: [{id: "gifts:Three", type: "gifts" as const, name: "Three"}]};
    const state = selectFirstSavedAfterDelete([one, two, three], "Deck 2");

    expect(state.saved.map((d) => d.name)).toEqual(["Deck 1", "Deck 3"]);
    expect(state.firstSaved?.name).toBe("Deck 1");
  });

  it("returns null selection when no decks remain before auto-create", () => {
    const one = {name: "Deck 1", items: [{id: "gifts:One", type: "gifts" as const, name: "One"}]};
    const state = selectFirstSavedAfterDelete([one], "Deck 1");

    expect(state.saved).toEqual([{name: "Deck 1", items: []}]);
    expect(state.firstSaved).toEqual({name: "Deck 1", items: []});
  });

  it("creates a new empty deck when deleting from an empty list", () => {
    const state = selectFirstSavedAfterDelete([], "Deck 1");
    expect(state.saved).toEqual([{name: "Deck 1", items: []}]);
    expect(state.firstSaved).toEqual({name: "Deck 1", items: []});
  });
});
