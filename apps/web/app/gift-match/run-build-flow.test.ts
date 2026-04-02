import {describe, expect, it} from "vitest";
import {
  buildMatchedDeckItems,
  buildDetectedRunName,
  buildFailedSquareCandidates,
  saveExternalDeck,
} from "./run-build-flow";

describe("buildDetectedDeckItems", () => {
  it("keeps unique successful matches and ignores boosts", () => {
    const items = buildMatchedDeckItems([
      buildSquareResult(0, {name: "Abundance", path: "/images/gifts/Abundance_Icon.png", score: 0.91}),
      buildSquareResult(1, {name: "Abundance", path: "/images/gifts/Abundance_Icon.png", score: 0.84}),
      buildSquareResult(2, {name: "Damage Boost", path: "/images/boosts/Damage_Boost_Icon.png", score: 0.95}),
      buildSquareResult(3, {name: "Anchor Boom", path: "/images/weapons/Anchor_Boom_Icon.png", score: 0.92}),
    ]);

    expect(items).toEqual([
      {id: "gifts:Abundance", type: "gifts", name: "Abundance", image: "/images/gifts/Abundance_Icon.png"},
      {id: "weapons:Anchor Boom", type: "weapons", name: "Anchor Boom", image: "/images/weapons/Anchor_Boom_Icon.png"},
    ]);
  });
});

describe("buildFailedSquareCandidates", () => {
  it("returns a unique alternate list for failed squares only", () => {
    const failedSquares = buildFailedSquareCandidates([
      buildSquareResult(0, {name: "Abundance", path: "/images/gifts/Abundance_Icon.png", score: 0.91}),
      buildSquareResult(1, {name: "Balance", path: "/images/gifts/Balance_Icon.png", score: 0.61}, [
        {name: "Balance", path: "/images/gifts/Balance_Icon.png", score: 0.61},
        {name: "Affliction Hex", path: "/images/hexes/Affliction_Hex_Icon.png", score: 0.59},
        {name: "Damage Boost", path: "/images/boosts/Damage_Boost_Icon.png", score: 0.58},
      ]),
      buildSquareResult(2, {name: "Anchor Boom", path: "/images/weapons/Anchor_Boom_Icon.png", score: 0.6}, [
        {name: "Anchor Boom", path: "/images/weapons/Anchor_Boom_Icon.png", score: 0.6},
        {name: "Abundance", path: "/images/gifts/Abundance_Icon.png", score: 0.59},
      ]),
    ]);

    expect(failedSquares).toEqual([
      {id: "hexes:Affliction Hex", type: "hexes", name: "Affliction Hex", image: "/images/hexes/Affliction_Hex_Icon.png"},
      {id: "weapons:Anchor Boom", type: "weapons", name: "Anchor Boom", image: "/images/weapons/Anchor_Boom_Icon.png"},
    ]);
  });
});

describe("saveExternalDeck", () => {
  it("creates a saved deck with a unique name", () => {
    const result = saveExternalDeck(
      [{name: "Sunday 23:30", items: [], createdAt: "2026-03-30T18:40:00.000Z"}],
      "Sunday 23:30",
      [{id: "gifts:Abundance", type: "gifts", name: "Abundance"}],
      () => "2026-03-30T18:45:00.000Z",
    );

    expect(result.savedDeck).toEqual({
      name: "Sunday 23:30 2",
      items: [{id: "gifts:Abundance", type: "gifts", name: "Abundance"}],
      createdAt: "2026-03-30T18:45:00.000Z",
    });
    expect(result.saved).toHaveLength(2);
  });
});

describe("buildDetectedRunName", () => {
  it("formats the default run name from the current time", () => {
    expect(buildDetectedRunName(new Date(2026, 2, 29, 23, 29, 31))).toBe("Sunday 23:30");
  });
});

function buildSquareResult(
  index: number,
  bestTemplate: {name: string; path: string; score: number} | null,
  topTemplates: Array<{name: string; path: string; score: number}> = bestTemplate ? [bestTemplate] : [],
) {
  return {
    index,
    bounds: {x: 0, y: 0, width: 20, height: 20},
    preprocessMilliseconds: 1,
    matchMilliseconds: 1,
    bestTemplate,
    topTemplates,
  };
}
