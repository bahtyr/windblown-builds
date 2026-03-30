import {describe, expect, it} from "vitest";
import {buildGiftVideoUrl, normalizeGiftImageUrl} from "../src/pages/gifts.js";

describe("buildGiftVideoUrl", () => {
  it("maps a gift wiki URL to its webm asset", () => {
    expect(buildGiftVideoUrl("https://windblown.wiki.gg/wiki/Strong_Recovery")).toBe(
      "https://windblown.wiki.gg/images/Strong_Recovery.webm",
    );
  });

  it("returns undefined for invalid paths", () => {
    expect(buildGiftVideoUrl("https://windblown.wiki.gg/images/Strong_Recovery.webm")).toBeUndefined();
  });
});

describe("normalizeGiftImageUrl", () => {
  it("converts thumb image urls into direct wiki asset urls", () => {
    expect(
      normalizeGiftImageUrl("https://windblown.wiki.gg/images/thumb/a/a4/Balance_Icon.png/48px-Balance_Icon.png?abc=123"),
    ).toBe("https://windblown.wiki.gg/images/Balance_Icon.png");
  });

  it("removes size prefixes and trailing extras from non-thumb image urls", () => {
    expect(
      normalizeGiftImageUrl("https://windblown.wiki.gg/images/48px-Balance_Icon.png?format=original"),
    ).toBe("https://windblown.wiki.gg/images/Balance_Icon.png");
  });
});
