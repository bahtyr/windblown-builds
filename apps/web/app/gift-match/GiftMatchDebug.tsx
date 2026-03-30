"use client";

import Image from "next/image";
import {useEffect, useState} from "react";
import {
  cropGrayImage,
  detectSquareRegionsDetailed,
  grayscaleImageData,
  loadImageData,
  resizeGrayImage,
  scoreAlignedImages,
  trimImageBorder,
  type GrayImage,
  type Rectangle,
} from "../../lib/gift-icon-matcher";

const SOURCE_PATH = "/source-cropped-2.PNG";
const MATCH_THRESHOLD = 0.8;
const TEMPLATE_BORDER_TRIM = 4;
const SQUARE_INNER_TRIM = 6;
const TEMPLATE_SPECS = [
  {name: "Intense Burn", path: "/images/Intense_Burn_Icon.png"},
  {name: "Gory Flame Icon", path: "/images/Gory_Flame_Icon.png"},
  {name: "Protection Icon", path: "/images/Protection_Icon.png"},
] as const;

type SquareScore = {
  index: number;
  bounds: Rectangle;
  score: number;
};

type PreparedSquare = {
  index: number;
  bounds: Rectangle;
  image: GrayImage;
  preprocessMilliseconds: number;
};

type TemplateImage = {
  name: string;
  path: string;
  image: GrayImage;
};

type TemplateMatch = {
  name: string;
  path: string;
  bestSquare: SquareScore | null;
};

type SquareOperation = {
  squareIndex: number;
  preprocessMilliseconds: number;
  matchMilliseconds: number;
  bestMatchName: string | null;
  bestMatchPath: string | null;
  bestScore: number | null;
  isMatch: boolean;
};

type MatchState = {
  sourceWidth: number;
  sourceHeight: number;
  phase1Milliseconds: number;
  squares: Rectangle[];
  templateMatches: TemplateMatch[];
  squareOperations: SquareOperation[];
};

/**
 * Renders the source image, current matches, and an operations timing table.
 *
 * @returns {JSX.Element} Debug UI for square detection and three-image matching.
 */
export default function GiftMatchDebug(): JSX.Element {
  const [state, setState] = useState<MatchState | null>(null);
  const [selectedPath, setSelectedPath] = useState<string>(TEMPLATE_SPECS[0].path);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function runMatching() {
      try {
        const sourceImageData = await loadImageData(SOURCE_PATH);
        const sourceGray = grayscaleImageData(sourceImageData);

        const phase1Start = performance.now();
        const detectedSquares = detectSquareRegionsDetailed(sourceImageData).rawSquares;
        const preparedSquares = detectedSquares.map((square, index) => prepareSquare(sourceGray, square, index));
        const phase1Milliseconds = performance.now() - phase1Start;

        const templates = await Promise.all(
          TEMPLATE_SPECS.map(async (templateSpec) => {
            const templateImageData = await loadImageData(templateSpec.path);
            return {
              name: templateSpec.name,
              path: templateSpec.path,
              image: trimImageBorder(grayscaleImageData(templateImageData), TEMPLATE_BORDER_TRIM),
            };
          }),
        );

        const squareOperations = preparedSquares.map((square) => scoreSquareAcrossTemplates(square, templates));
        const templateMatches = templates.map((template) => ({
          name: template.name,
          path: template.path,
          bestSquare: findBestSquareForTemplate(preparedSquares, template),
        }));

        if (!cancelled) {
          setState({
            sourceWidth: sourceImageData.width,
            sourceHeight: sourceImageData.height,
            phase1Milliseconds,
            squares: detectedSquares,
            templateMatches,
            squareOperations,
          });
        }
      } catch (matchError) {
        if (!cancelled) {
          setError(matchError instanceof Error ? matchError.message : "Failed to run image matching.");
        }
      }
    }

    setState(null);
    setError(null);
    runMatching();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedMatch = state?.templateMatches.find((match) => match.path === selectedPath) ?? state?.templateMatches[0] ?? null;
  const selectedOverlay = state && selectedMatch?.bestSquare ? buildOverlayStyle(
    selectedMatch.bestSquare.bounds,
    state.sourceWidth,
    state.sourceHeight,
    selectedMatch.bestSquare.score >= MATCH_THRESHOLD ? "#16a34a" : "#dc2626",
  ) : undefined;

  return (
    <section style={styles.shell}>
      {error ? <p style={styles.error}>{error}</p> : null}

      <div style={styles.layout}>
        <div style={styles.sourceCard}>
          <div style={styles.imageFrame}>
            {state ? (
              <Image
                alt="Source screenshot"
                src={SOURCE_PATH}
                width={state.sourceWidth}
                height={state.sourceHeight}
                style={styles.image}
              />
            ) : null}
            {state?.squares.map((square, index) => (
              <div
                key={`${square.x}-${square.y}-${index}`}
                style={buildOverlayStyle(square, state.sourceWidth, state.sourceHeight, "#facc15")}
              />
            ))}
            {selectedOverlay ? <div style={{...styles.selectedOverlay, ...selectedOverlay}} /> : null}
          </div>
        </div>

        <div style={styles.resultsCard}>
          {state?.templateMatches.map((match) => {
            const isMatch = (match.bestSquare?.score ?? 0) >= MATCH_THRESHOLD;

            return (
              <button
                key={match.path}
                type="button"
                onClick={() => setSelectedPath(match.path)}
                style={{
                  ...styles.resultRow,
                  ...(selectedPath === match.path ? styles.resultRowSelected : null),
                }}
              >
                <Image alt={match.name} src={match.path} width={56} height={56} style={styles.resultImage} />
                <div style={styles.resultText}>
                  <div style={styles.resultName}>{match.name}</div>
                  <div style={styles.resultMeta}>
                    {match.bestSquare
                      ? `${isMatch ? "Match" : "No match"} | square ${match.bestSquare.index} | ${match.bestSquare.score.toFixed(4)}`
                      : "No square found"}
                  </div>
                </div>
              </button>
            );
          }) ?? <p style={styles.loadingText}>Loading...</p>}
        </div>
      </div>

      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
          <tr>
            <th style={styles.tableHeader}>Phase / Step</th>
            <th style={styles.tableHeader}>How Long</th>
            <th style={styles.tableHeader}>Result</th>
          </tr>
          </thead>
          <tbody>
          <tr>
            <td style={styles.tableCell}>Phase 1, identify squares</td>
            <td style={styles.tableCell}>{state ? formatMilliseconds(state.phase1Milliseconds) : "Loading..."}</td>
            <td style={styles.tableCell}>{state ? `${state.squares.length} squares` : "-"}</td>
          </tr>
          {state?.squareOperations.flatMap((operation) => [
            <tr key={`process-${operation.squareIndex}`}>
              <td style={styles.tableCell}>Square {operation.squareIndex}, processing/preprocessing</td>
              <td style={styles.tableCell}>{formatMilliseconds(operation.preprocessMilliseconds)}</td>
              <td style={styles.tableCell}>Prepared inner crop</td>
            </tr>,
            <tr key={`match-${operation.squareIndex}`}>
              <td style={styles.tableCell}>Square {operation.squareIndex}, try to find match</td>
              <td style={styles.tableCell}>{formatMilliseconds(operation.matchMilliseconds)}</td>
              <td style={styles.tableCell}>
                <div style={styles.tableResult}>
                  <span>
                    {operation.bestMatchName
                      ? `${operation.isMatch ? "Found" : "Best failed"} ${operation.bestMatchName}`
                      : "No result"}
                  </span>
                  {operation.bestMatchPath ? (
                    <Image
                      alt={operation.bestMatchName ?? "Match result"}
                      src={operation.bestMatchPath}
                      width={32}
                      height={32}
                      style={styles.tableImage}
                    />
                  ) : null}
                </div>
              </td>
            </tr>,
          ]) ?? null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function prepareSquare(sourceGray: GrayImage, square: Rectangle, index: number): PreparedSquare {
  const preprocessStart = performance.now();
  const trimmedSquare = trimSquareBounds(square, SQUARE_INNER_TRIM);
  const image = cropGrayImage(sourceGray, trimmedSquare);

  return {
    index,
    bounds: square,
    image,
    preprocessMilliseconds: performance.now() - preprocessStart,
  };
}

function scoreSquareAcrossTemplates(square: PreparedSquare, templates: TemplateImage[]): SquareOperation {
  const matchStart = performance.now();
  let bestMatchName: string | null = null;
  let bestMatchPath: string | null = null;
  let bestScore: number | null = null;

  for (const template of templates) {
    const resizedSquare = resizeGrayImage(square.image, template.image.width, template.image.height);
    const score = scoreAlignedImages(resizedSquare, template.image);

    if (bestScore === null || score > bestScore) {
      bestScore = score;
      bestMatchName = template.name;
      bestMatchPath = template.path;
    }
  }

  return {
    squareIndex: square.index,
    preprocessMilliseconds: square.preprocessMilliseconds,
    matchMilliseconds: performance.now() - matchStart,
    bestMatchName,
    bestMatchPath,
    bestScore,
    isMatch: (bestScore ?? 0) >= MATCH_THRESHOLD,
  };
}

function findBestSquareForTemplate(squares: PreparedSquare[], template: TemplateImage): SquareScore | null {
  let bestSquare: SquareScore | null = null;

  for (const square of squares) {
    const resizedSquare = resizeGrayImage(square.image, template.image.width, template.image.height);
    const score = scoreAlignedImages(resizedSquare, template.image);

    if (!bestSquare || score > bestSquare.score) {
      bestSquare = {
        index: square.index,
        bounds: square.bounds,
        score,
      };
    }
  }

  return bestSquare;
}

function trimSquareBounds(square: Rectangle, trim: number): Rectangle {
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

function buildOverlayStyle(square: Rectangle, sourceWidth: number, sourceHeight: number, borderColor: string): React.CSSProperties {
  return {
    ...styles.overlay,
    left: `${(square.x / sourceWidth) * 100}%`,
    top: `${(square.y / sourceHeight) * 100}%`,
    width: `${(square.width / sourceWidth) * 100}%`,
    height: `${(square.height / sourceHeight) * 100}%`,
    borderColor,
  };
}

function formatMilliseconds(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(3)}s`;
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    padding: "24px",
  },
  error: {
    margin: "0 0 16px",
    color: "#dc2626",
  },
  layout: {
    display: "grid",
    gap: "16px",
    gridTemplateColumns: "minmax(0, 1.7fr) minmax(280px, 0.9fr)",
    alignItems: "start",
  },
  sourceCard: {
    border: "1px solid #d6dce5",
    borderRadius: "16px",
    background: "#ffffff",
    padding: "16px",
  },
  imageFrame: {
    position: "relative",
    borderRadius: "12px",
    overflow: "hidden",
    background: "#111827",
  },
  image: {
    display: "block",
    width: "100%",
    height: "auto",
  },
  overlay: {
    position: "absolute",
    borderStyle: "solid",
    borderWidth: "3px",
    boxSizing: "border-box",
    pointerEvents: "none",
  },
  selectedOverlay: {
    position: "absolute",
    borderStyle: "solid",
    borderWidth: "4px",
    boxSizing: "border-box",
    pointerEvents: "none",
  },
  resultsCard: {
    border: "1px solid #d6dce5",
    borderRadius: "16px",
    background: "#ffffff",
    padding: "12px",
    display: "grid",
    gap: "10px",
  },
  resultRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    padding: "10px",
    borderRadius: "12px",
    border: "1px solid transparent",
    background: "#ffffff",
    textAlign: "left",
    cursor: "pointer",
    color: "#111827",
  },
  resultRowSelected: {
    borderColor: "#d6dce5",
    background: "#f8fafc",
  },
  resultImage: {
    display: "block",
    width: "56px",
    height: "56px",
  },
  resultText: {
    display: "grid",
    gap: "4px",
  },
  resultName: {
    fontWeight: 700,
    fontSize: "16px",
  },
  resultMeta: {
    color: "#596273",
    fontSize: "14px",
  },
  tableCard: {
    marginTop: "16px",
    border: "1px solid #d6dce5",
    borderRadius: "16px",
    background: "#ffffff",
    padding: "12px",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeader: {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "13px",
    color: "#596273",
  },
  tableCell: {
    padding: "10px 12px",
    borderBottom: "1px solid #e5e7eb",
    verticalAlign: "middle",
    fontSize: "14px",
    color: "#111827",
  },
  tableResult: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  tableImage: {
    display: "block",
    width: "32px",
    height: "32px",
  },
  loadingText: {
    margin: 0,
    color: "#596273",
  },
};
