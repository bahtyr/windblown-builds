import {describe, expect, it} from "vitest";
import {buildGearCategorySummaries} from "../components/gear/gear-category-utils";
import {groupGearsForEditorRows} from "../components/gear/gear-order";
import {compareTypeOrder, getTypeOrder} from "../components/gear/gear-order";
import {extractEntityTypeFromAssetPath, normalizeCollectionName} from "../components/gear/gear-serialization";

describe("extractEntityTypeFromPath", () => {
  it("parses supported gear types from shared asset paths", () => {
    expect(extractEntityTypeFromAssetPath("images/entities/weapons/anchor-boom.webp")).toBe("weapons");
    expect(extractEntityTypeFromAssetPath("images/entities/gifts/strong-recovery.webp")).toBe("gifts");
  });

  it("returns null for unsupported asset paths", () => {
    expect(extractEntityTypeFromAssetPath("/images/entities/effects/smoke.webp")).toBeNull();
    expect(extractEntityTypeFromAssetPath("/images/other/path.webp")).toBeNull();
  });
});

describe("gear type ordering", () => {
  it("exposes the canonical shared gear ordering", () => {
    expect(getTypeOrder("weapons")).toBeLessThan(getTypeOrder("trinkets"));
    expect(getTypeOrder("gifts")).toBeLessThan(getTypeOrder("boosts"));
    expect(compareTypeOrder("hexes", "magifishes")).toBeLessThan(0);
  });
});

describe("groupGearsForEditorRows", () => {
  it("keeps the existing editor row policy", () => {
    const rows = groupGearsForEditorRows([
      {id: "boosts:Windup", type: "boosts", name: "Windup"},
      {id: "gifts:Abundance", type: "gifts", name: "Abundance"},
      {id: "weapons:Anchor Boom", type: "weapons", name: "Anchor Boom"},
      {id: "hexes:Affliction Hex", type: "hexes", name: "Affliction Hex"},
      {id: "trinkets:Bomb", type: "trinkets", name: "Bomb"},
      {id: "magifishes:Gobbling Fish", type: "magifishes", name: "Gobbling Fish"},
    ]);

    expect(rows).toEqual([
      [
        {
          type: "gifts",
          list: [{id: "gifts:Abundance", type: "gifts", name: "Abundance"}],
        },
      ],
      [
        {
          type: "hexes",
          list: [{id: "hexes:Affliction Hex", type: "hexes", name: "Affliction Hex"}],
        },
        {
          type: "weapons",
          list: [{id: "weapons:Anchor Boom", type: "weapons", name: "Anchor Boom"}],
        },
        {
          type: "trinkets",
          list: [{id: "trinkets:Bomb", type: "trinkets", name: "Bomb"}],
        },
        {
          type: "magifishes",
          list: [{id: "magifishes:Gobbling Fish", type: "magifishes", name: "Gobbling Fish"}],
        },
      ],
      [
        {
          type: "boosts",
          list: [{id: "boosts:Windup", type: "boosts", name: "Windup"}],
        },
      ],
    ]);
  });
});

describe("normalizeCollectionName", () => {
  it("trims names and falls back to the provided default", () => {
    expect(normalizeCollectionName("  My Build  ", "Untitled")).toBe("My Build");
    expect(normalizeCollectionName("   ", "Untitled")).toBe("Untitled");
    expect(normalizeCollectionName(undefined, "Untitled")).toBe("Untitled");
  });
});

describe("buildGearCategorySummaries", () => {
  it("aggregates and sorts gift categories without UI metadata", () => {
    const summaries = buildGearCategorySummaries(
      [
        {id: "gifts:Alpha", type: "gifts", name: "Alpha"},
        {id: "gifts:Beta", type: "gifts", name: "Beta"},
        {id: "gifts:Gamma", type: "gifts", name: "Gamma"},
        {id: "weapons:Anchor Boom", type: "weapons", name: "Anchor Boom"},
      ],
      new Map([
        ["gifts:Alpha", "Recovery"],
        ["gifts:Beta", "Recovery"],
        ["gifts:Gamma", "Utility"],
      ]),
    );

    expect(summaries).toEqual([
      {
        count: 2,
        itemIds: ["gifts:Alpha", "gifts:Beta"],
        name: "Recovery",
      },
      {
        count: 1,
        itemIds: ["gifts:Gamma"],
        name: "Utility",
      },
    ]);
  });
});
