export type GrayImage = {
  width: number;
  height: number;
  pixels: Float32Array;
};

export type MatchResult = {
  score: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isMatch: boolean;
  scale: number;
};

export type MatchOptions = {
  threshold?: number;
  scales?: number[];
  trimBorder?: number;
  coarseStep?: number;
  refineRadius?: number;
};

type PreparedTemplate = {
  image: GrayImage;
  centeredPixels: Float32Array;
  variance: number;
};

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
 * Resizes a grayscale image with nearest-neighbor sampling.
 *
 * @param {GrayImage} image - Image to resize.
 * @param {number} scale - Scalar multiplier applied to width and height.
 * @returns {GrayImage} Scaled image.
 */
export function scaleGrayImage(image: GrayImage, scale: number): GrayImage {
  if (scale === 1) {
    return image;
  }

  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const pixels = new Float32Array(width * height);

  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(image.height - 1, Math.round(y / scale));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(image.width - 1, Math.round(x / scale));
      pixels[y * width + x] = image.pixels[sourceY * image.width + sourceX];
    }
  }

  return {width, height, pixels};
}

/**
 * Finds the strongest template match in a grayscale source image.
 *
 * @param {GrayImage} source - Larger image to search.
 * @param {GrayImage} template - Template image to locate.
 * @param {MatchOptions} [options] - Matching thresholds and scale search options.
 * @returns {MatchResult} Best match score and bounds.
 */
export function matchTemplate(source: GrayImage, template: GrayImage, options: MatchOptions = {}): MatchResult {
  const threshold = options.threshold ?? 0.85;
  const scales = options.scales ?? [0.9, 1, 1.1];
  const trimBorder = options.trimBorder ?? 2;
  const coarseStep = Math.max(1, options.coarseStep ?? 2);
  const refineRadius = Math.max(0, options.refineRadius ?? 2);
  const trimmedTemplate = trimImageBorder(template, trimBorder);

  let bestMatch: MatchResult = {
    score: 0,
    x: 0,
    y: 0,
    width: trimmedTemplate.width,
    height: trimmedTemplate.height,
    isMatch: false,
    scale: 1,
  };

  for (const scale of scales) {
    const scaledTemplate = scaleGrayImage(trimmedTemplate, scale);
    if (scaledTemplate.width > source.width || scaledTemplate.height > source.height) {
      continue;
    }

    const prepared = prepareTemplate(scaledTemplate);
    const coarseMatch = scanTemplate(source, prepared, coarseStep);
    const refineMatch = scanTemplate(
      source,
      prepared,
      1,
      Math.max(0, coarseMatch.x - refineRadius),
      Math.min(source.width - scaledTemplate.width, coarseMatch.x + refineRadius),
      Math.max(0, coarseMatch.y - refineRadius),
      Math.min(source.height - scaledTemplate.height, coarseMatch.y + refineRadius),
    );

    if (refineMatch.score > bestMatch.score) {
      bestMatch = {
        score: refineMatch.score,
        x: refineMatch.x,
        y: refineMatch.y,
        width: scaledTemplate.width,
        height: scaledTemplate.height,
        isMatch: refineMatch.score >= threshold,
        scale,
      };
    }
  }

  return {
    ...bestMatch,
    isMatch: bestMatch.score >= threshold,
  };
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

function prepareTemplate(template: GrayImage): PreparedTemplate {
  const mean = average(template.pixels);
  const centeredPixels = new Float32Array(template.pixels.length);
  let variance = 0;

  for (let index = 0; index < template.pixels.length; index += 1) {
    const centered = template.pixels[index] - mean;
    centeredPixels[index] = centered;
    variance += centered * centered;
  }

  return {
    image: template,
    centeredPixels,
    variance,
  };
}

function scanTemplate(
  source: GrayImage,
  template: PreparedTemplate,
  step: number,
  minX = 0,
  maxX = source.width - template.image.width,
  minY = 0,
  maxY = source.height - template.image.height,
): { score: number; x: number; y: number } {
  let bestScore = -1;
  let bestX = minX;
  let bestY = minY;
  const templateWidth = template.image.width;
  const templateHeight = template.image.height;

  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      const score = computeCorrelationAt(source, template, x, y);
      if (score > bestScore) {
        bestScore = score;
        bestX = x;
        bestY = y;
      }
    }
  }

  return {score: bestScore, x: bestX, y: bestY};
}

function computeCorrelationAt(source: GrayImage, template: PreparedTemplate, startX: number, startY: number): number {
  let sumSource = 0;
  let sumSourceSquares = 0;
  let sumCross = 0;
  const templateWidth = template.image.width;
  const templateHeight = template.image.height;

  for (let y = 0; y < templateHeight; y += 1) {
    const sourceRowOffset = (startY + y) * source.width + startX;
    const templateRowOffset = y * templateWidth;

    for (let x = 0; x < templateWidth; x += 1) {
      const sourcePixel = source.pixels[sourceRowOffset + x];
      sumSource += sourcePixel;
      sumSourceSquares += sourcePixel * sourcePixel;
      sumCross += sourcePixel * template.centeredPixels[templateRowOffset + x];
    }
  }

  const pixelCount = templateWidth * templateHeight;
  const sourceVariance = sumSourceSquares - (sumSource * sumSource) / pixelCount;
  if (sourceVariance <= 0 || template.variance <= 0) {
    return 0;
  }

  const correlation = sumCross / Math.sqrt(sourceVariance * template.variance);
  return (correlation + 1) / 2;
}

function average(values: Float32Array): number {
  let total = 0;

  for (let index = 0; index < values.length; index += 1) {
    total += values[index];
  }

  return total / values.length;
}
