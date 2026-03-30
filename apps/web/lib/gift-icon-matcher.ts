export type GrayImage = {
  width: number;
  height: number;
  pixels: Float32Array;
};

export type Rectangle = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RgbaImageLike = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export type SquareDetectionResult = {
  rawSquares: Rectangle[];
  candidateSquares: Rectangle[];
};

const RAW_SQUARE_MIN_ASPECT_RATIO = 0.90;
const RAW_SQUARE_MAX_ASPECT_RATIO = 1.15;
const FOREGROUND_DISTANCE_THRESHOLD = 60;

/**
 * Converts RGBA image data into a grayscale image buffer.
 *
 * @param {ImageData} imageData - Source browser image data.
 * @returns {GrayImage} Grayscale pixels using luminance weighting.
 */
export function grayscaleImageData(imageData: ImageData): GrayImage {
  const {width, height, data} = imageData;
  const pixels = new Float32Array(width * height);

  for (let index = 0; index < pixels.length; index += 1) {
    const offset = index * 4;
    pixels[index] = data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114;
  }

  return {width, height, pixels};
}

/**
 * Trims a uniform border from a grayscale image.
 *
 * @param {GrayImage} image - Image to crop.
 * @param {number} border - Border size in pixels.
 * @returns {GrayImage} Cropped image, or the original if trimming is invalid.
 */
export function trimImageBorder(image: GrayImage, border: number): GrayImage {
  if (border <= 0 || image.width <= border * 2 || image.height <= border * 2) {
    return image;
  }

  const width = image.width - border * 2;
  const height = image.height - border * 2;
  const pixels = new Float32Array(width * height);

  for (let y = 0; y < height; y += 1) {
    const sourceOffset = (y + border) * image.width + border;
    pixels.set(image.pixels.subarray(sourceOffset, sourceOffset + width), y * width);
  }

  return {width, height, pixels};
}

/**
 * Resizes a grayscale image to exact output dimensions.
 *
 * @param {GrayImage} image - Image to resize.
 * @param {number} width - Target width.
 * @param {number} height - Target height.
 * @returns {GrayImage} Resized image.
 */
export function resizeGrayImage(image: GrayImage, width: number, height: number): GrayImage {
  const outputWidth = Math.max(1, Math.round(width));
  const outputHeight = Math.max(1, Math.round(height));
  const pixels = new Float32Array(outputWidth * outputHeight);

  for (let y = 0; y < outputHeight; y += 1) {
    const sourceY = Math.min(image.height - 1, Math.round((y / outputHeight) * (image.height - 1)));
    for (let x = 0; x < outputWidth; x += 1) {
      const sourceX = Math.min(image.width - 1, Math.round((x / outputWidth) * (image.width - 1)));
      pixels[y * outputWidth + x] = image.pixels[sourceY * image.width + sourceX];
    }
  }

  return {width: outputWidth, height: outputHeight, pixels};
}

/**
 * Crops a rectangular region from a grayscale image.
 *
 * @param {GrayImage} image - Source image.
 * @param {Rectangle} rect - Region to crop.
 * @returns {GrayImage} Cropped grayscale image.
 */
export function cropGrayImage(image: GrayImage, rect: Rectangle): GrayImage {
  const pixels = new Float32Array(rect.width * rect.height);

  for (let y = 0; y < rect.height; y += 1) {
    const sourceOffset = (rect.y + y) * image.width + rect.x;
    pixels.set(image.pixels.subarray(sourceOffset, sourceOffset + rect.width), y * rect.width);
  }

  return {
    width: rect.width,
    height: rect.height,
    pixels,
  };
}

/**
 * Detects icon-like square regions by grouping pixels that differ from the background.
 *
 * @param {RgbaImageLike} imageData - Source color image data.
 * @returns {Rectangle[]} Square candidate bounds sorted top-to-bottom, then left-to-right.
 */
export function detectSquareRegions(imageData: RgbaImageLike): Rectangle[] {
  return detectSquareRegionsDetailed(imageData).candidateSquares;
}

/**
 * Detects raw square-like regions and the filtered candidate set used for scoring.
 *
 * @param {RgbaImageLike} imageData - Source color image data.
 * @returns {SquareDetectionResult} Raw detections plus filtered square candidates.
 */
export function detectSquareRegionsDetailed(imageData: RgbaImageLike): SquareDetectionResult {
  const background = sampleBackgroundColor(imageData);
  const visited = new Uint8Array(imageData.width * imageData.height);
  const queueX = new Int32Array(imageData.width * imageData.height);
  const queueY = new Int32Array(imageData.width * imageData.height);
  const rawSquares: Rectangle[] = [];
  const candidateSquares: Rectangle[] = [];

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const index = y * imageData.width + x;
      if (visited[index] || !isForegroundPixel(imageData, x, y, background)) {
        continue;
      }

      visited[index] = 1;
      let queueStart = 0;
      let queueEnd = 0;
      queueX[queueEnd] = x;
      queueY[queueEnd] = y;
      queueEnd += 1;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let pixelCount = 0;

      while (queueStart < queueEnd) {
        const currentX = queueX[queueStart];
        const currentY = queueY[queueStart];
        queueStart += 1;
        pixelCount += 1;

        minX = Math.min(minX, currentX);
        maxX = Math.max(maxX, currentX);
        minY = Math.min(minY, currentY);
        maxY = Math.max(maxY, currentY);

        for (const [nextX, nextY] of [
          [currentX - 1, currentY],
          [currentX + 1, currentY],
          [currentX, currentY - 1],
          [currentX, currentY + 1],
        ]) {
          if (
            nextX < 0 ||
            nextY < 0 ||
            nextX >= imageData.width ||
            nextY >= imageData.height
          ) {
            continue;
          }

          const nextIndex = nextY * imageData.width + nextX;
          if (visited[nextIndex] || !isForegroundPixel(imageData, nextX, nextY, background)) {
            continue;
          }

          visited[nextIndex] = 1;
          queueX[queueEnd] = nextX;
          queueY[queueEnd] = nextY;
          queueEnd += 1;
        }
      }

      const width = maxX - minX + 1;
      const height = maxY - minY + 1;
      const aspectRatio = width / height;
      const fillRatio = pixelCount / (width * height);

      const rectangle = {x: minX, y: minY, width, height};

      if (
        width >= 20 &&
        height >= 20 &&
        aspectRatio >= RAW_SQUARE_MIN_ASPECT_RATIO &&
        aspectRatio <= RAW_SQUARE_MAX_ASPECT_RATIO
      ) {
        rawSquares.push(rectangle);
      }

      if (
        width >= 28 &&
        height >= 28 &&
        width <= 96 &&
        height <= 96 &&
        aspectRatio >= 0.75 &&
        aspectRatio <= 1.25 &&
        fillRatio >= 0.18
      ) {
        candidateSquares.push(rectangle);
      }
    }
  }

  return {
    rawSquares: sortRectangles(dedupeRectangles(rawSquares)),
    candidateSquares: sortRectangles(dedupeRectangles(candidateSquares)),
  };
}

function sortRectangles(rectangles: Rectangle[]): Rectangle[] {
  return rectangles.sort((left, right) => {
    if (left.y === right.y) {
      return left.x - right.x;
    }

    return left.y - right.y;
  });
}

/**
 * Scores two same-sized grayscale images for similarity.
 *
 * @param {GrayImage} source - First image.
 * @param {GrayImage} template - Second image.
 * @returns {number} Similarity score between 0 and 1.
 */
export function scoreAlignedImages(source: GrayImage, template: GrayImage): number {
  if (source.width !== template.width || source.height !== template.height) {
    throw new Error("Aligned image scoring requires identical image sizes.");
  }

  const templateMean = average(template.pixels);
  let templateVariance = 0;
  let sumSource = 0;
  let sumSourceSquares = 0;
  let sumCross = 0;

  for (let index = 0; index < template.pixels.length; index += 1) {
    const centered = template.pixels[index] - templateMean;
    templateVariance += centered * centered;
    const sourcePixel = source.pixels[index];
    sumSource += sourcePixel;
    sumSourceSquares += sourcePixel * sourcePixel;
    sumCross += sourcePixel * centered;
  }

  const pixelCount = template.width * template.height;
  const sourceVariance = sumSourceSquares - (sumSource * sumSource) / pixelCount;
  if (sourceVariance <= 0 || templateVariance <= 0) {
    return 0;
  }

  const correlation = sumCross / Math.sqrt(sourceVariance * templateVariance);
  return (correlation + 1) / 2;
}

/**
 * Loads an image URL into browser image data.
 *
 * @param {string} src - Public image path or URL.
 * @returns {Promise<ImageData>} Decoded pixel data for the image.
 */
export async function loadImageData(src: string): Promise<ImageData> {
  const image = new Image();
  image.src = src;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is unavailable.");
  }

  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function average(values: Float32Array): number {
  let total = 0;

  for (let index = 0; index < values.length; index += 1) {
    total += values[index];
  }

  return total / values.length;
}

function sampleBackgroundColor(imageData: RgbaImageLike): [number, number, number] {
  let red = 0;
  let green = 0;
  let blue = 0;
  let sampleCount = 0;

  for (let y = 0; y < Math.min(6, imageData.height); y += 1) {
    for (let x = 0; x < Math.min(6, imageData.width); x += 1) {
      const offset = (y * imageData.width + x) * 4;
      red += imageData.data[offset];
      green += imageData.data[offset + 1];
      blue += imageData.data[offset + 2];
      sampleCount += 1;
    }
  }

  return [red / sampleCount, green / sampleCount, blue / sampleCount];
}

function isForegroundPixel(imageData: RgbaImageLike, x: number, y: number, background: [number, number, number]): boolean {
  const offset = (y * imageData.width + x) * 4;
  const red = imageData.data[offset];
  const green = imageData.data[offset + 1];
  const blue = imageData.data[offset + 2];

  return (
    Math.abs(red - background[0]) +
    Math.abs(green - background[1]) +
    Math.abs(blue - background[2])
  ) > FOREGROUND_DISTANCE_THRESHOLD;
}

function dedupeRectangles(rectangles: Rectangle[]): Rectangle[] {
  const sorted = [...rectangles].sort((left, right) => (right.width * right.height) - (left.width * left.height));
  const deduped: Rectangle[] = [];

  for (const rectangle of sorted) {
    const overlapsExisting = deduped.some((existing) => intersectionOverUnion(existing, rectangle) > 0.7);
    if (!overlapsExisting) {
      deduped.push(rectangle);
    }
  }

  return deduped;
}

function intersectionOverUnion(left: Rectangle, right: Rectangle): number {
  const x1 = Math.max(left.x, right.x);
  const y1 = Math.max(left.y, right.y);
  const x2 = Math.min(left.x + left.width, right.x + right.width);
  const y2 = Math.min(left.y + left.height, right.y + right.height);

  if (x2 <= x1 || y2 <= y1) {
    return 0;
  }

  const intersection = (x2 - x1) * (y2 - y1);
  const leftArea = left.width * left.height;
  const rightArea = right.width * right.height;
  return intersection / (leftArea + rightArea - intersection);
}
