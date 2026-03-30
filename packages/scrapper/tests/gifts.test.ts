import {describe, expect, it} from "vitest";
import {normalizeGiftImageUrl} from "../src/pages/gifts.js";
import {extractWikiVideoUrls} from "../src/core/wikiHtml.js";

describe("extractWikiVideoUrls", () => {
  it("collects unique normalized video asset urls from entity pages", () => {
    expect(
      extractWikiVideoUrls(`
        <div class="druid-main-image">
          <video><source src="/images/Strong_Recovery.webm?f70d80" /></video>
          <video src="/images/Strong_Recovery.webm?other=1"></video>
          <video><source src="/images/Anchor_Boom.webm" /></video>
        </div>
      `),
    ).toEqual([
      "https://windblown.wiki.gg/images/Strong_Recovery.webm",
      "https://windblown.wiki.gg/images/Anchor_Boom.webm",
    ]);
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
