import {
  cropGrayImage,
  detectSquareRegionsDetailed,
  grayscaleImageData,
  loadImageData,
  resizeGrayImage,
  scoreAlignedImages,
  SQUARE_DETECTION_CONFIG,
  trimImageBorder,
  type GrayImage,
  type Rectangle,
  type RgbaImageLike,
} from "../../lib/gift-icon-matcher";

export const GIFT_MATCH_SOURCE_PATH = "/source-cropped-2.PNG";

export const GIFT_MATCH_TEMPLATE_SPECS = [
  {name: "Intense Burn", path: "/images/Intense_Burn_Icon.png"},
  {name: "Gory Flame Icon", path: "/images/Gory_Flame_Icon.png"},
  {name: "Protection Icon", path: "/images/Protection_Icon.png"},
] as const;

export const GIFT_MATCH_WORKFLOW_CONFIG = {
  matchThreshold: 0.8,
  templateBorderTrim: 4,
  squareInnerTrim: 6,
  matchBorderColor: "#16a34a",
  noMatchBorderColor: "#dc2626",
  squareDetection: SQUARE_DETECTION_CONFIG,
} as const;

export type GiftMatchTemplateSpec = {
  name: string;
  path: string;
};

export type GiftMatchTemplateScore = {
  name: string;
  path: string;
  score: number;
};

export type GiftMatchSquareScore = {
  index: number;
  bounds: Rectangle;
  score: number;
};

export type GiftMatchSquareResult = {
  index: number;
  bounds: Rectangle;
  preprocessMilliseconds: number;
  matchMilliseconds: number;
  bestTemplate: GiftMatchTemplateScore | null;
};

export type GiftMatchTemplateResult = {
  name: string;
  path: string;
  bestSquare: GiftMatchSquareScore | null;
};

export type GiftMatchOverlayResult = {
  bounds: Rectangle;
  borderColor: string;
};

export type GiftMatchRunResult = {
  sourceWidth: number;
  sourceHeight: number;
  phase1Milliseconds: number;
  squares: Rectangle[];
  squareResults: GiftMatchSquareResult[];
  templateResults: GiftMatchTemplateResult[];
};

type GiftMatchPreparedSquare = {
  index: number;
  bounds: Rectangle;
  image: GrayImage;
  preprocessMilliseconds: number;
};

type GiftMatchPreparedTemplate = {
  name: string;
  path: string;
  image: GrayImage;
};

/**
 * Loads the source image and templates, then runs the active gift-match workflow.
 *
 * @returns {Promise<GiftMatchRunResult>} Shared run result for the debug page.
 */
export async function runGiftMatchWorkflow(): Promise<GiftMatchRunResult> {
  const sourceImageData = await loadImageData(GIFT_MATCH_SOURCE_PATH);
  const templates = await Promise.all(
    GIFT_MATCH_TEMPLATE_SPECS.map(async (templateSpec) => {
      const templateImageData = await loadImageData(templateSpec.path);

      return {
        name: templateSpec.name,
        path: templateSpec.path,
        image: trimImageBorder(
          grayscaleImageData(templateImageData),
          GIFT_MATCH_WORKFLOW_CONFIG.templateBorderTrim,
        ),
      };
    }),
  );

  return computeGiftMatchRunResult({
    sourceImageData,
    templates,
  });
}

/**
 * Computes one full gift-match run from detected source squares and prepared templates.
 *
 * @param {object} input - Source image and prepared templates for a single run.
 * @param {RgbaImageLike} input.sourceImageData - Source image used for square detection.
 * @param {GiftMatchPreparedTemplate[]} input.templates - Prepared templates used for scoring.
 * @param {() => number} [input.now] - Clock used for timing measurements.
 * @returns {GiftMatchRunResult} Shared run model for UI rendering and tests.
 */
export function computeGiftMatchRunResult(input: {
  sourceImageData: RgbaImageLike;
  templates: GiftMatchPreparedTemplate[];
  now?: () => number;
}): GiftMatchRunResult {
  const now = input.now ?? (() => performance.now());
  const sourceGray = grayscaleImageData(input.sourceImageData);

  const phase1Start = now();
  const detectedSquares = detectSquareRegionsDetailed(input.sourceImageData).rawSquares;
  const preparedSquares = detectedSquares.map((square, index) => prepareSquare(sourceGray, square, index, now));
  const phase1Milliseconds = now() - phase1Start;

  const templateResults: GiftMatchTemplateResult[] = input.templates.map((template) => ({
    name: template.name,
    path: template.path,
    bestSquare: null,
  }));

  const squareResults = preparedSquares.map((square) => {
    const matchStart = now();
    let bestTemplate: GiftMatchTemplateScore | null = null;

    for (const [templateIndex, template] of input.templates.entries()) {
      const resizedSquare = resizeGrayImage(square.image, template.image.width, template.image.height);
      const score = scoreAlignedImages(resizedSquare, template.image);

      if (!bestTemplate || score > bestTemplate.score) {
        bestTemplate = {
          name: template.name,
          path: template.path,
          score,
        };
      }

      const existingBestSquare = templateResults[templateIndex].bestSquare;
      if (!existingBestSquare || score > existingBestSquare.score) {
        templateResults[templateIndex].bestSquare = {
          index: square.index,
          bounds: square.bounds,
          score,
        };
      }
    }

    return {
      index: square.index,
      bounds: square.bounds,
      preprocessMilliseconds: square.preprocessMilliseconds,
      matchMilliseconds: now() - matchStart,
      bestTemplate,
    };
  });

  return {
    sourceWidth: input.sourceImageData.width,
    sourceHeight: input.sourceImageData.height,
    phase1Milliseconds,
    squares: detectedSquares,
    squareResults,
    templateResults,
  };
}

/**
 * Selects the current overlay rectangle and color for the chosen template row.
 *
 * @param {GiftMatchRunResult} result - Shared run result from the workflow.
 * @param {string} selectedPath - Currently selected template image path.
 * @returns {GiftMatchOverlayResult | null} Overlay bounds and color, if a best square exists.
 */
export function selectGiftMatchOverlay(
  result: GiftMatchRunResult,
  selectedPath: string,
): GiftMatchOverlayResult | null {
  const selectedMatch = result.templateResults.find((match) => match.path === selectedPath) ?? result.templateResults[0] ?? null;

  if (!selectedMatch?.bestSquare) {
    return null;
  }

  return {
    bounds: selectedMatch.bestSquare.bounds,
    borderColor: selectedMatch.bestSquare.score >= GIFT_MATCH_WORKFLOW_CONFIG.matchThreshold
      ? GIFT_MATCH_WORKFLOW_CONFIG.matchBorderColor
      : GIFT_MATCH_WORKFLOW_CONFIG.noMatchBorderColor,
  };
}

/**
 * Returns whether a template score meets the workflow threshold.
 *
 * @param {number} score - Similarity score to evaluate.
 * @returns {boolean} True when the score counts as a match.
 */
export function isGiftMatch(score: number): boolean {
  return score >= GIFT_MATCH_WORKFLOW_CONFIG.matchThreshold;
}

/**
 * Trims the inside of a detected square before it is resized for scoring.
 *
 * @param {Rectangle} square - Detected square bounds.
 * @returns {Rectangle} Inner bounds used for the square crop.
 */
export function trimSquareBounds(square: Rectangle): Rectangle {
  const trim = GIFT_MATCH_WORKFLOW_CONFIG.squareInnerTrim;
  const safeTrim = Math.max(0, Math.min(trim, Math.floor((Math.min(square.width, square.height) - 1) / 2)));
  const width = Math.max(1, square.width - safeTrim * 2);
  const height = Math.max(1, square.height - safeTrim * 2);

  return {
    x: square.x + safeTrim,
    y: square.y + safeTrim,
    width,
    height,
  };
}

/**
 * Builds a prepared square crop and captures its preprocessing time.
 *
 * @param {GrayImage} sourceGray - Full grayscale source image.
 * @param {Rectangle} square - Detected square bounds.
 * @param {number} index - Display index for the square.
 * @param {() => number} now - Clock used for timing.
 * @returns {GiftMatchPreparedSquare} Prepared square data for scoring.
 */
function prepareSquare(
  sourceGray: GrayImage,
  square: Rectangle,
  index: number,
  now: () => number,
): GiftMatchPreparedSquare {
  const preprocessStart = now();
  const image = cropGrayImage(sourceGray, trimSquareBounds(square));

  return {
    index,
    bounds: square,
    image,
    preprocessMilliseconds: now() - preprocessStart,
  };
}
