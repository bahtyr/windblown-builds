import {describe, expect, it} from "vitest";
import {buildDeckShareUrl} from "../components/deck/deck-share";

describe("buildDeckShareUrl", () => {
  it("creates a share link to the decks page", () => {
    const url = buildDeckShareUrl("https://example.com", {
      name: "Shared Build",
      items: [
        {id: "gifts:Strong Recovery", type: "gifts", name: "Strong Recovery"},
        {id: "weapons:Anchor", type: "weapons", name: "Anchor"},
      ],
    });

    expect(url).toBe("https://example.com/decks?name=Shared+Build&deck=gifts%7CStrong%2520Recovery%2Cweapons%7CAnchor");
  });
});
