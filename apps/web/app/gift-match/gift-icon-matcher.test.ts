import {describe, expect, it} from "vitest";
import {matchTemplate, trimImageBorder, type GrayImage} from "../../lib/gift-icon-matcher";

describe("trimImageBorder", () => {
  it("removes a uniform border from a grayscale image", () => {
    const image: GrayImage = {
      width: 4,
      height: 4,
      pixels: new Float32Array([
        1, 1, 1, 1,
        1, 5, 6, 1,
        1, 7, 8, 1,
        1, 1, 1, 1,
      ]),
    };

    const trimmed = trimImageBorder(image, 1);

    expect(trimmed.width).toBe(2);
    expect(trimmed.height).toBe(2);
    expect(Array.from(trimmed.pixels)).toEqual([5, 6, 7, 8]);
  });
});

describe("matchTemplate", () => {
  it("finds the best match despite a brightness shift in the source", () => {
    const source: GrayImage = {
      width: 6,
      height: 6,
      pixels: new Float32Array(36).fill(10),
    };
    const template: GrayImage = {
      width: 3,
      height: 3,
      pixels: new Float32Array([
        20, 40, 20,
        40, 90, 40,
        20, 40, 20,
      ]),
    };

    const embedded = [
      60, 80, 60,
      80, 130, 80,
      60, 80, 60,
    ];

    for (let y = 0; y < 3; y += 1) {
      for (let x = 0; x < 3; x += 1) {
        source.pixels[(y + 2) * source.width + (x + 1)] = embedded[y * 3 + x];
      }
    }

    const result = matchTemplate(source, template, {
      threshold: 0.85,
      scales: [1],
      trimBorder: 0,
      coarseStep: 1,
      refineRadius: 0,
    });

    expect(result.isMatch).toBe(true);
    expect(result.x).toBe(1);
    expect(result.y).toBe(2);
    expect(result.score).toBeGreaterThan(0.99);
  });
});
