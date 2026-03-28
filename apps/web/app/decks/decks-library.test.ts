import {describe, expect, it, vi} from "vitest";
import {formatRoughDate} from "../../components/deck/DecksLibrary";

describe("formatRoughDate", () => {
  it("formats recent dates in rough human terms", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-28T12:00:00.000Z"));

    expect(formatRoughDate("2026-03-28T09:00:00.000Z")).toBe("today");
    expect(formatRoughDate("2026-03-27T09:00:00.000Z")).toBe("yesterday");
    expect(formatRoughDate("2026-03-20T09:00:00.000Z")).toBe("1 week ago");

    vi.useRealTimers();
  });

  it("falls back for invalid timestamps", () => {
    expect(formatRoughDate("invalid")).toBe("recently");
  });
});
