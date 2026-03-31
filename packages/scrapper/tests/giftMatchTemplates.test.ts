import {describe, expect, it} from "vitest";
import {buildGiftMatchTemplateSpecs} from "../src/core/giftMatchTemplates.js";

describe("buildGiftMatchTemplateSpecs", () => {
  it("formats and sorts matcher template specs while excluding path separators", () => {
    expect(buildGiftMatchTemplateSpecs([
      "weapons\\Anchor_Boom_Icon.png",
      "gifts\\Abundance_Icon.png",
      "hexes\\Affliction_Hex_Icon.png",
    ])).toEqual([
      {name: "Abundance", path: "/images/gifts/Abundance_Icon.png"},
      {name: "Affliction Hex", path: "/images/hexes/Affliction_Hex_Icon.png"},
      {name: "Anchor Boom", path: "/images/weapons/Anchor_Boom_Icon.png"},
    ]);
  });
});
