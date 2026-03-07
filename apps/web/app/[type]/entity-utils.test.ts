import {describe, expect, it} from "vitest";
import {ScrapedEntity} from "../../lib/types";
import {DEFAULT_LIMITS, entityIds, getVisibleItems, groupByCategory, resolveType, VALID_TYPES} from "./entity-utils";

const baseEntity: ScrapedEntity = {
  image: "img",
  name: "Alpha",
  description: "Alpha desc",
  richDescription: [],
};

describe("resolveType", () => {
  it("returns default when params missing", () => {
    expect(resolveType(undefined)).toBe("gifts");
    expect(resolveType({})).toBe("gifts");
  });

  it("returns validated type when present", () => {
    VALID_TYPES.forEach((type) => {
      expect(resolveType({type})).toBe(type);
    });
  });

  it("falls back when type is invalid", () => {
    expect(resolveType({type: "invalid" as unknown as "all"})).toBe("gifts");
  });

  it("ignores promised params", () => {
    const promiseParams = Promise.resolve({type: "weapons"});
    expect(resolveType(promiseParams)).toBe("gifts");
  });
});

describe("groupByCategory", () => {
  it("groups by explicit category with trimming", () => {
    const list = [
      {...baseEntity, name: "One", category: " Cat "},
      {...baseEntity, name: "Two", category: "Cat"},
    ];
    const grouped = groupByCategory(list, (item) => (item.category || "").trim());
    expect(grouped).toHaveLength(1);
    expect(grouped[0][0]).toBe("Cat");
    expect(grouped[0][1].map((e) => e.name)).toEqual(["One", "Two"]);
  });

  it("falls back to capitalized type when category missing", () => {
    const list: ScrapedEntity[] = [{...baseEntity, name: "NoCat", category: undefined}];
    const grouped = groupByCategory(list, (item) => item.category ?? "Hexes");
    expect(grouped[0][0]).toBe("Hexes");
    expect(grouped[0][1][0].name).toBe("NoCat");
  });

  it("separates sections by entity type in all view", () => {
    const list = [
      {...baseEntity, name: "Weapon One", category: "Damage", entityType: "weapons"},
      {...baseEntity, name: "Trinket One", category: "Damage", entityType: "trinkets"},
      {...baseEntity, name: "Hex One", category: "Control", entityType: "hexes"},
    ];
    const grouped = groupByCategory(list, (item) => `${item.category} (${item.entityType})`);
    expect(grouped.map(([key]) => key)).toEqual(["Damage (weapons)", "Damage (trinkets)", "Control (hexes)"]);
  });
});

describe("entityIds", () => {
  it("extracts ids from entity hrefs without query strings", () => {
    const entity: ScrapedEntity = {
      ...baseEntity,
      richDescription: [
        {key: "entity", text: "Link", href: "foo?id=123"},
        {key: "entity", text: "Other", href: "bar"},
      ],
    };
    expect(entityIds(entity)).toEqual(["foo", "bar"]);
  });

  it("ignores non-entity rich description nodes", () => {
    const entity: ScrapedEntity = {
      ...baseEntity,
      richDescription: [
        {key: "text", text: "plain text"},
        {key: "entity", text: "Link", href: ""},
      ],
    };
    expect(entityIds(entity)).toEqual([]);
  });
});

describe("DEFAULT_LIMITS", () => {
  it("defines limits for decked types", () => {
    expect(DEFAULT_LIMITS.gifts).toBe(20);
    expect(DEFAULT_LIMITS.weapons).toBe(2);
    expect(DEFAULT_LIMITS.trinkets).toBe(2);
    expect(DEFAULT_LIMITS.hexes).toBe(3);
    expect(DEFAULT_LIMITS.magifishes).toBe(1);
  });
});

describe("getVisibleItems", () => {
  it("returns all items when mode is fade-unmatched", () => {
    const all = [{...baseEntity, name: "One"}, {...baseEntity, name: "Two"}];
    const matched = [all[1]];
    expect(getVisibleItems(all, matched, "fade-unmatched")).toEqual(all);
  });

  it("returns only matches when mode is show-matches-only", () => {
    const all = [{...baseEntity, name: "One"}, {...baseEntity, name: "Two"}];
    const matched = [all[1]];
    expect(getVisibleItems(all, matched, "show-matches-only")).toEqual(matched);
  });
});
