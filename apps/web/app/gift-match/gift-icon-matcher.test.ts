import {describe, expect, it} from "vitest";
import {detectSquareRegions, detectSquareRegionsDetailed, scoreAlignedImages, trimImageBorder, type GrayImage} from "../../lib/gift-icon-matcher";

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

describe("scoreAlignedImages", () => {
  it("scores aligned images highly despite a brightness shift", () => {
    const source: GrayImage = {
      width: 3,
      height: 3,
      pixels: new Float32Array([
        60, 80, 60,
        80, 130, 80,
        60, 80, 60,
      ]),
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

    const result = scoreAlignedImages(source, template);

    expect(result).toBeGreaterThan(0.99);
  });
});

describe("detectSquareRegions", () => {
  it("finds square foreground regions against a flat background", () => {
    const width = 80;
    const height = 60;
    const background = [10, 5, 20, 255];
    const image = new Uint8ClampedArray(width * height * 4);

    for (let index = 0; index < width * height; index += 1) {
      image[index * 4] = background[0];
      image[index * 4 + 1] = background[1];
      image[index * 4 + 2] = background[2];
      image[index * 4 + 3] = background[3];
    }

    fillSquare(image, width, 8, 10, 30, [130, 120, 220, 255]);
    fillSquare(image, width, 42, 12, 28, [80, 200, 240, 255]);

    const squares = detectSquareRegions({width, height, data: image});

    expect(squares).toHaveLength(2);
    expect(squares[0]).toEqual({x: 8, y: 10, width: 30, height: 30});
    expect(squares[1]).toEqual({x: 42, y: 12, width: 28, height: 28});
  });

  it("returns raw detections separately from filtered candidate squares", () => {
    const width = 100;
    const height = 70;
    const background = [10, 5, 20, 255];
    const image = new Uint8ClampedArray(width * height * 4);

    for (let index = 0; index < width * height; index += 1) {
      image[index * 4] = background[0];
      image[index * 4 + 1] = background[1];
      image[index * 4 + 2] = background[2];
      image[index * 4 + 3] = background[3];
    }

    fillSquare(image, width, 10, 10, 24, [180, 110, 200, 255]);
    fillSquare(image, width, 50, 10, 34, [110, 210, 250, 255]);

    const result = detectSquareRegionsDetailed({width, height, data: image});

    expect(result.rawSquares).toEqual([
      {x: 10, y: 10, width: 24, height: 24},
      {x: 50, y: 10, width: 34, height: 34},
    ]);
    expect(result.candidateSquares).toEqual([
      {x: 50, y: 10, width: 34, height: 34},
    ]);
  });
});

function fillSquare(
  image: Uint8ClampedArray,
  width: number,
  startX: number,
  startY: number,
  size: number,
  rgba: [number, number, number, number],
) {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = ((startY + y) * width + startX + x) * 4;
      image[offset] = rgba[0];
      image[offset + 1] = rgba[1];
      image[offset + 2] = rgba[2];
      image[offset + 3] = rgba[3];
    }
  }
}
