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
      ["weapons:Anchor Boom", {id: "weapons:Anchor Boom", type: "weapons" as const, name: "Anchor Boom", image: "/anchor.png"}],
      ["gifts:Abundance", {id: "gifts:Abundance", type: "gifts" as const, name: "Abundance", image: "/abundance.png"}],
    ]);

    expect(buildFavoritesDeck(new Set(["weapons:Anchor Boom", "gifts:Abundance"]), entityLookup)).toEqual({
      name: "Favorites",
      createdAt: "1970-01-01T00:00:00.000Z",
      items: [
        {id: "gifts:Abundance", type: "gifts", name: "Abundance", image: "/abundance.png"},
        {id: "weapons:Anchor Boom", type: "weapons", name: "Anchor Boom", image: "/anchor.png"},
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
      ],
      new Map([
        ["gifts:A", "Rush"],
        ["gifts:B", "General"],
        ["gifts:C", "General"],
      ]),
    );

    expect(categories.map((category) => category.name)).toEqual(["General", "Rush"]);
    expect(categories[0].image).toBeUndefined();
    expect(categories[1].image).toEqual(expect.any(String));
  });
});
