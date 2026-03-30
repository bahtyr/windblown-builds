import {describe, expect, it} from "vitest";
import {
  isEditingDeckSession,
  normalizeSavedDecks,
  resolveSharedDeckFromLocation,
  restoreDeckSession,
  selectFirstSavedAfterDelete,
  suggestDuplicateName,
} from "../components/deck/DeckContext";

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

    expect(state.saved).toHaveLength(1);
    expect(state.saved[0]).toMatchObject({name: "Untitled deck", items: []});
    expect(state.saved[0].createdAt).toEqual(expect.any(String));
    expect(state.firstSaved).toMatchObject({name: "Untitled deck", items: []});
    expect(state.firstSaved.createdAt).toEqual(expect.any(String));
  });

  it("creates a new empty deck when deleting from an empty list", () => {
    const state = selectFirstSavedAfterDelete([], "Deck 1");
    expect(state.saved).toHaveLength(1);
    expect(state.saved[0]).toMatchObject({name: "Untitled deck", items: []});
    expect(state.saved[0].createdAt).toEqual(expect.any(String));
    expect(state.firstSaved).toMatchObject({name: "Untitled deck", items: []});
    expect(state.firstSaved.createdAt).toEqual(expect.any(String));
  });
});

describe("normalizeSavedDecks", () => {
  it("adds createdAt to legacy saved decks", () => {
    const normalized = normalizeSavedDecks([{name: "Deck 1", items: []}]);
    expect(normalized[0]).toMatchObject({name: "Deck 1", items: []});
    expect(normalized[0].createdAt).toEqual(expect.any(String));
  });
});

describe("suggestDuplicateName", () => {
  it("creates an incremented copy name when needed", () => {
    const decks = normalizeSavedDecks([
      {name: "Deck 1", items: []},
      {name: "Deck 1 (copy)", items: []},
    ]);
    expect(suggestDuplicateName(decks, "Deck 1")).toBe("Deck 1 (copy) 2");
  });
});

describe("restoreDeckSession", () => {
  it("restores the captured editing session when available", () => {
    expect(
      restoreDeckSession({
        items: [{id: "gifts:One", type: "gifts", name: "One"}],
        name: "Deck 1",
        editingDeckName: "Deck 1",
      }),
    ).toEqual({
      items: [{id: "gifts:One", type: "gifts", name: "One"}],
      name: "Deck 1",
      editingDeckName: "Deck 1",
    });
  });

  it("falls back to an empty untitled deck when no session exists", () => {
    expect(restoreDeckSession(null)).toEqual({
      items: [],
      name: "Untitled deck",
      editingDeckName: null,
    });
  });
});

describe("isEditingDeckSession", () => {
  it("treats shared edits as editing sessions", () => {
    expect(isEditingDeckSession(null, "shared")).toBe(true);
  });

  it("returns false for a fresh unsaved build", () => {
    expect(isEditingDeckSession(null, null)).toBe(false);
  });
});

describe("resolveSharedDeckFromLocation", () => {
  it("creates a transient shared deck only for the decks page", () => {
    const shared = resolveSharedDeckFromLocation("/decks", "?name=Shared%20Build&deck=gifts|Strong_Recovery,weapons|Anchor");
    expect(shared).toMatchObject({
      source: "shared",
      name: "Shared Build (shared)",
    });
    expect(shared?.items).toEqual([
      {id: "gifts:Strong_Recovery", type: "gifts", name: "Strong_Recovery"},
      {id: "weapons:Anchor", type: "weapons", name: "Anchor"},
    ]);
  });

  it("ignores shared params outside the decks page", () => {
    expect(resolveSharedDeckFromLocation("/browse", "?name=Shared%20Build&deck=gifts|Strong_Recovery")).toBeNull();
  });
});
