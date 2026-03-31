import {describe, expect, it, vi} from "vitest";
import {buildDeckCategoryMeta, buildFavoritesDeck, formatRoughDate} from "../../components/deck/DecksLibrary";

describe("formatRoughDate", () => {
  it("formats recent dates in rough human terms", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-28T12:00:00.000Z"));

    expect(formatRoughDate("2026-03-28T09:00:00.000Z")).toBe("Today");
    expect(formatRoughDate("2026-03-27T09:00:00.000Z")).toBe("Yesterday");
    expect(formatRoughDate("2026-03-20T09:00:00.000Z")).toBe("1 week ago");

    vi.useRealTimers();
  });

  it("falls back for invalid timestamps", () => {
    expect(formatRoughDate("invalid")).toBe("Recently");
  });
});

describe("buildFavoritesDeck", () => {
  it("returns a sorted derived favorites deck from liked ids", () => {
    const entityLookup = new Map([
      ["weapons:Anchor Boom", {
        type: "weapons" as const,
        entity: {name: "Anchor Boom", image: "/anchor.png", description: "", richDescription: []},
        card: {id: "weapons:Anchor Boom", type: "weapons" as const, name: "Anchor Boom", image: "/anchor.png"},
      }],
      ["weapons:Beatbolt", {
        type: "weapons" as const,
        entity: {name: "Beatbolt", image: "/beatbolt.png", description: "", richDescription: []},
        card: {id: "weapons:Beatbolt", type: "weapons" as const, name: "Beatbolt", image: "/beatbolt.png"},
      }],
      ["gifts:Abundance", {
        type: "gifts" as const,
        entity: {name: "Abundance", image: "/abundance.png", description: "", richDescription: []},
        card: {id: "gifts:Abundance", type: "gifts" as const, name: "Abundance", image: "/abundance.png"},
      }],
      ["hexes:Affliction Hex", {
        type: "hexes" as const,
        entity: {name: "Affliction Hex", image: "/affliction-hex.png", description: "", richDescription: []},
        card: {id: "hexes:Affliction Hex", type: "hexes" as const, name: "Affliction Hex", image: "/affliction-hex.png"},
      }],
      ["trinkets:Bomb", {
        type: "trinkets" as const,
        entity: {name: "Bomb", image: "/bomb.png", description: "", richDescription: []},
        card: {id: "trinkets:Bomb", type: "trinkets" as const, name: "Bomb", image: "/bomb.png"},
      }],
      ["magifishes:Gobbling Fish", {
        type: "magifishes" as const,
        entity: {name: "Gobbling Fish", image: "/gobbling-fish.png", description: "", richDescription: []},
        card: {id: "magifishes:Gobbling Fish", type: "magifishes" as const, name: "Gobbling Fish", image: "/gobbling-fish.png"},
      }],
    ]);

    expect(buildFavoritesDeck(new Set([
      "trinkets:Bomb",
      "magifishes:Gobbling Fish",
      "weapons:Anchor Boom",
      "weapons:Beatbolt",
      "gifts:Abundance",
      "hexes:Affliction Hex",
    ]), entityLookup)).toEqual({
      name: "Favorites",
      createdAt: "1970-01-01T00:00:00.000Z",
      items: [
        {id: "gifts:Abundance", type: "gifts", name: "Abundance", image: "/abundance.png"},
        {id: "hexes:Affliction Hex", type: "hexes", name: "Affliction Hex", image: "/affliction-hex.png"},
        {id: "weapons:Anchor Boom", type: "weapons", name: "Anchor Boom", image: "/anchor.png"},
        {id: "weapons:Beatbolt", type: "weapons", name: "Beatbolt", image: "/beatbolt.png"},
        {id: "trinkets:Bomb", type: "trinkets", name: "Bomb", image: "/bomb.png"},
        {id: "magifishes:Gobbling Fish", type: "magifishes", name: "Gobbling Fish", image: "/gobbling-fish.png"},
      ],
    });
  });

  it("hides favorites when no liked entities resolve", () => {
    expect(buildFavoritesDeck(new Set(["gifts:Missing"]), new Map())).toBeNull();
  });
});

describe("buildDeckCategoryMeta", () => {
  it("returns unique sorted gift categories for a deck", () => {
    const categories = buildDeckCategoryMeta(
      [
        {id: "gifts:B", type: "gifts", name: "B"},
        {id: "weapons:Anchor Boom", type: "weapons", name: "Anchor Boom"},
        {id: "gifts:A", type: "gifts", name: "A"},
        {id: "gifts:C", type: "gifts", name: "C"},
        {id: "gifts:D", type: "gifts", name: "D"},
      ],
      new Map([
        ["gifts:A", "Rush"],
        ["gifts:B", "General"],
        ["gifts:C", "General"],
        ["gifts:D", "Rush"],
      ]),
    );

    expect(categories.map((category) => category.name)).toEqual(["General", "Rush"]);
    expect(categories.map((category) => category.count)).toEqual([2, 2]);
    expect(categories[0].image).toBeUndefined();
    expect(categories[1].image).toEqual(expect.any(String));
    expect(categories[0].itemIds).toEqual(["gifts:B", "gifts:C"]);
    expect(categories[1].itemIds).toEqual(["gifts:A", "gifts:D"]);
  });

  it("orders categories by count descending before name", () => {
    const categories = buildDeckCategoryMeta(
      [
        {id: "gifts:A", type: "gifts", name: "A"},
        {id: "gifts:B", type: "gifts", name: "B"},
        {id: "gifts:C", type: "gifts", name: "C"},
      ],
      new Map([
        ["gifts:A", "Rush"],
        ["gifts:B", "General"],
        ["gifts:C", "Rush"],
      ]),
    );

    expect(categories.map((category) => `${category.count} ${category.name}`)).toEqual(["2 Rush", "1 General"]);
  });
});
