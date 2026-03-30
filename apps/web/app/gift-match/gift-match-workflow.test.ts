import {describe, expect, it} from "vitest";
import {grayscaleImageData, trimImageBorder, type GrayImage, type RgbaImageLike} from "../../lib/gift-icon-matcher";
import {
  computeGiftMatchRunResult,
  isGiftMatch,
  selectGiftMatchOverlay,
} from "./gift-match-workflow";

describe("computeGiftMatchRunResult", () => {
  it("uses detected raw squares and selects the best template per square", () => {
    const result = computeGiftMatchRunResult({
      sourceImageData: buildSourceImage(),
      templates: [
        buildTemplate("Alpha", "/alpha.png", alphaPattern()),
        buildTemplate("Beta", "/beta.png", betaPattern()),
        buildTemplate("Gamma", "/gamma.png", gammaPattern()),
        buildTemplate("Delta", "/delta.png", deltaPattern()),
      ],
      now: createNow(),
    });

    expect(result.squares).toEqual([
      {x: 8, y: 6, width: 28, height: 28},
      {x: 44, y: 6, width: 28, height: 28},
    ]);
    expect(result.templateCount).toBe(4);
    expect(result.squareResults).toHaveLength(2);
    expect(result.squareResults[0].bestTemplate?.name).toBe("Alpha");
    expect(result.squareResults[1].bestTemplate?.name).toBe("Beta");
    expect(isGiftMatch(result.squareResults[0].bestTemplate?.score ?? 0)).toBe(true);
    expect(isGiftMatch(result.squareResults[1].bestTemplate?.score ?? 0)).toBe(true);
  });

  it("selects the best square per template and preserves timing fields", () => {
    const result = computeGiftMatchRunResult({
      sourceImageData: buildSourceImage(),
      templates: [
        buildTemplate("Alpha", "/alpha.png", alphaPattern()),
        buildTemplate("Beta", "/beta.png", betaPattern()),
        buildTemplate("Gamma", "/gamma.png", gammaPattern()),
      ],
      now: createNow(),
    });

    expect(result.templateResults).toEqual([
      {
        name: "Alpha",
        path: "/alpha.png",
        bestSquare: expect.objectContaining({index: 0}),
      },
      {
        name: "Beta",
        path: "/beta.png",
        bestSquare: expect.objectContaining({index: 1}),
      },
      {
        name: "Gamma",
        path: "/gamma.png",
        bestSquare: expect.any(Object),
      },
    ]);
    expect(result.phase1Milliseconds).toBeGreaterThan(0);
    expect(result.totalMilliseconds).toBeGreaterThan(result.phase1Milliseconds);
    expect(result.squareResults[0].preprocessMilliseconds).toBeGreaterThan(0);
    expect(result.squareResults[0].matchMilliseconds).toBeGreaterThan(0);
    expect(selectGiftMatchOverlay(result, 1)).toEqual({
      bounds: {x: 44, y: 6, width: 28, height: 28},
      borderColor: "#16a34a",
    });
  });
});

function buildSourceImage(): RgbaImageLike {
  const image = createImage(80, 40, [0, 0, 0, 255]);

  fillRect(image, 8, 6, 28, 28, [60, 60, 60, 255]);
  fillRect(image, 44, 6, 28, 28, [60, 60, 60, 255]);
  paintPattern(image, 14, 12, alphaPattern());
  paintPattern(image, 50, 12, betaPattern());

  return image;
}

function buildTemplate(name: string, path: string, pattern: number[][]): {name: string; path: string; image: GrayImage} {
  const image = createImage(24, 24, [0, 0, 0, 255]);
  paintPattern(image, 4, 4, pattern);

  return {
    name,
    path,
    image: trimImageBorder(grayscaleImageData(image), 4),
  };
}

function createImage(width: number, height: number, rgba: [number, number, number, number]): RgbaImageLike {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let index = 0; index < width * height; index += 1) {
    data[index * 4] = rgba[0];
    data[index * 4 + 1] = rgba[1];
    data[index * 4 + 2] = rgba[2];
    data[index * 4 + 3] = rgba[3];
  }

  return {width, height, data};
}

function fillRect(
  image: RgbaImageLike,
  startX: number,
  startY: number,
  width: number,
  height: number,
  rgba: [number, number, number, number],
) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      setPixel(image, startX + x, startY + y, rgba[0]);
    }
  }
}

function paintPattern(image: RgbaImageLike, startX: number, startY: number, pattern: number[][]) {
  for (let y = 0; y < pattern.length; y += 1) {
    for (let x = 0; x < pattern[y].length; x += 1) {
      setPixel(image, startX + x, startY + y, pattern[y][x]);
    }
  }
}

function setPixel(image: RgbaImageLike, x: number, y: number, value: number) {
  const offset = (y * image.width + x) * 4;
  image.data[offset] = value;
  image.data[offset + 1] = value;
  image.data[offset + 2] = value;
  image.data[offset + 3] = 255;
}

function alphaPattern(): number[][] {
  return buildPattern((x) => (x < 8 ? 240 : 20));
}

function betaPattern(): number[][] {
  return buildPattern((x, y) => (y < 8 ? 230 : (x < 8 ? 40 : 120)));
}

function gammaPattern(): number[][] {
  return buildPattern((x, y) => (Math.abs(x - 7.5) + Math.abs(y - 7.5) <= 4 ? 200 : 90));
}

function deltaPattern(): number[][] {
  return buildPattern((x, y) => ((x + y) % 3 === 0 ? 170 : 35));
}

function buildPattern(getValue: (x: number, y: number) => number): number[][] {
  return Array.from({length: 16}, (_, y) => Array.from({length: 16}, (_, x) => getValue(x, y)));
}

function createNow(): () => number {
  let value = 0;

  return () => {
    value += 1;
    return value;
  };
}
