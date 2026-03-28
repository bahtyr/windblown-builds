import {describe, expect, it} from "vitest";
import {buildGiftVideoUrl} from "../src/pages/gifts.js";

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
