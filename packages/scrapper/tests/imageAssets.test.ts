import {describe, expect, it} from "vitest";
import {normalizeWikiImageUrl, toPublicImagePath} from "../src/core/imageAssets.js";

describe("normalizeWikiImageUrl", () => {
  it("converts thumb image urls into direct wiki asset urls", () => {
    expect(
      normalizeWikiImageUrl("https://windblown.wiki.gg/images/thumb/a/a4/Balance_Icon.png/48px-Balance_Icon.png?abc=123"),
    ).toBe("https://windblown.wiki.gg/images/Balance_Icon.png");
  });

  it("removes size prefixes and trailing extras from non-thumb image urls", () => {
    expect(
      normalizeWikiImageUrl("https://windblown.wiki.gg/images/48px-Balance_Icon.png?format=original"),
    ).toBe("https://windblown.wiki.gg/images/Balance_Icon.png");
  });
});

describe("toPublicImagePath", () => {
  it("maps remote image urls into the entity type folder", () => {
    expect(
      toPublicImagePath("https://windblown.wiki.gg/images/thumb/a/a4/Balance_Icon.png/48px-Balance_Icon.png?abc=123", "gifts"),
    ).toBe("/images/gifts/Balance_Icon.png");
  });

  it("rewrites existing public image urls into the requested entity type folder", () => {
    expect(toPublicImagePath("/images/Balance_Icon.png", "effects")).toBe("/images/effects/Balance_Icon.png");
  });
});
