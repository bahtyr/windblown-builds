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
  type Rectangle,
} from "../../lib/gift-icon-matcher";

const SOURCE_PATH = "/source-cropped-2.PNG";
const MATCH_THRESHOLD = 0.8;
const TEMPLATE_BORDER_TRIM = 4;
const SQUARE_INNER_TRIM = 6;
const TEMPLATE_SPECS = [
  {name: "Intense Burn", path: "/Intense_Burn.webp", shouldFind: true},
  {name: "Gory Flame Icon", path: "/Gory_Flame_Icon.webp", shouldFind: true},
  {name: "Protection Icon", path: "/Protection_Icon.webp", shouldFind: false},
] as const;

type SquareScore = {
  index: number;
  bounds: Rectangle;
  score: number;
};

type MatchState = {
  sourceWidth: number;
  sourceHeight: number;
  targetName: string;
  targetPath: string;
  targetWidth: number;
  targetHeight: number;
  targetTrimmedWidth: number;
  targetTrimmedHeight: number;
  squareDetectionSeconds: number;
  comparisonSeconds: number;
  rawSquares: Rectangle[];
  squares: Rectangle[];
  bestSquare: SquareScore | null;
  topSquares: SquareScore[];
};

/**
 * Renders a timed two-phase matching debug view.
 *
 * @returns {JSX.Element} Debug UI showing square detection and per-square comparison timings.
 */
export default function GiftMatchDebug(): JSX.Element {
  const [selectedPath, setSelectedPath] = useState<string>(TEMPLATE_SPECS[0].path);
  const [state, setState] = useState<MatchState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function runBreakdown() {
      try {
        const selectedTemplate = TEMPLATE_SPECS.find((template) => template.path === selectedPath) ?? TEMPLATE_SPECS[0];
        const [sourceImageData, templateImageData] = await Promise.all([
          loadImageData(SOURCE_PATH),
          loadImageData(selectedTemplate.path),
        ]);

        const sourceGray = grayscaleImageData(sourceImageData);
        const trimmedTemplate = trimImageBorder(grayscaleImageData(templateImageData), TEMPLATE_BORDER_TRIM);

        const squareDetectionStart = performance.now();
        const detection = detectSquareRegionsDetailed(sourceImageData);
        const squareDetectionSeconds = (performance.now() - squareDetectionStart) / 1000;
        const rawSquares = detection.rawSquares;
        const squares = detection.candidateSquares;

        const comparisonStart = performance.now();
        const scoredSquares = squares.map((square, index) => {
          const squareCrop = cropGrayImage(sourceGray, trimSquareBounds(square, SQUARE_INNER_TRIM));
          const resizedSquare = resizeGrayImage(squareCrop, trimmedTemplate.width, trimmedTemplate.height);

          return {
            index,
            bounds: square,
            score: scoreAlignedImages(resizedSquare, trimmedTemplate),
          };
        });
        const comparisonSeconds = (performance.now() - comparisonStart) / 1000;
        const topSquares = [...scoredSquares].sort((left, right) => right.score - left.score).slice(0, 8);
        const bestSquare = topSquares[0] ?? null;

        if (!cancelled) {
          setState({
            sourceWidth: sourceImageData.width,
            sourceHeight: sourceImageData.height,
            targetName: selectedTemplate.name,
            targetPath: selectedTemplate.path,
            targetWidth: templateImageData.width,
            targetHeight: templateImageData.height,
            targetTrimmedWidth: trimmedTemplate.width,
            targetTrimmedHeight: trimmedTemplate.height,
            squareDetectionSeconds,
            comparisonSeconds,
            rawSquares,
            squares,
            bestSquare,
            topSquares,
          });
        }
      } catch (matchError) {
        if (!cancelled) {
          setError(matchError instanceof Error ? matchError.message : "Failed to run square detection.");
        }
      }
    }

    setState(null);
    setError(null);
    runBreakdown();

    return () => {
      cancelled = true;
    };
  }, [selectedPath]);

  const bestSquare = state?.bestSquare ?? null;
  const bestSquareOverlay = state && bestSquare ? {
    left: `${(bestSquare.bounds.x / state.sourceWidth) * 100}%`,
    top: `${(bestSquare.bounds.y / state.sourceHeight) * 100}%`,
    width: `${(bestSquare.bounds.width / state.sourceWidth) * 100}%`,
    height: `${(bestSquare.bounds.height / state.sourceHeight) * 100}%`,
    borderColor: bestSquare.score >= MATCH_THRESHOLD ? "#2f855a" : "#c53030",
  } : undefined;

  return (
    <section style={styles.shell}>
      <div style={styles.header}>
        <h1 style={styles.title}>Gift icon match breakdown</h1>
        <p style={styles.subtitle}>
          Phase 1 detects square icon regions in the source. Phase 2 compares each detected square to the selected target thumb.
        </p>
      </div>

      <div style={styles.targetRow}>
        {TEMPLATE_SPECS.map((template) => (
          <button
            key={template.path}
            onClick={() => setSelectedPath(template.path)}
            style={{
              ...styles.targetButton,
              ...(selectedPath === template.path ? styles.targetButtonSelected : null),
            }}
            type="button"
          >
            <Image alt={template.name} src={template.path} width={48} height={48} style={styles.targetImage}/>
            <span>{template.name}</span>
          </button>
        ))}
      </div>

      {error ? <p style={styles.error}>{error}</p> : null}

      <div style={styles.summary}>
        <Metric label="Raw squares" value={state ? String(state.rawSquares.length) : "Running..."} />
        <Metric label="Candidate squares" value={state ? String(state.squares.length) : "Running..."} />
        <Metric label="Detect squares" value={state ? `${state.squareDetectionSeconds.toFixed(3)}s` : "Running..."} />
        <Metric label="Compare squares" value={state ? `${state.comparisonSeconds.toFixed(3)}s` : "Running..."} />
        <Metric label="Best score" value={state?.bestSquare ? state.bestSquare.score.toFixed(4) : "Running..."} />
        <Metric label="Match" value={state?.bestSquare ? (state.bestSquare.score >= MATCH_THRESHOLD ? "Yes" : "No") : "Running..."} />
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Source image</h2>
          <p style={styles.cardSubtitle}>
            {state
              ? `Phase 1 found ${state.rawSquares.length} raw squares. ${state.squares.length} remained as comparison candidates.`
              : "Running square detection..."}
          </p>
          <div style={styles.imageFrame}>
            <Image alt="Source screenshot" src={SOURCE_PATH} width={807} height={750} style={styles.image}/>
            {state?.rawSquares.map((square, index) => (
              <div
                key={`${square.x}-${square.y}-${index}`}
                style={{
                  ...styles.rawSquareOverlay,
                  left: `${(square.x / state.sourceWidth) * 100}%`,
                  top: `${(square.y / state.sourceHeight) * 100}%`,
                  width: `${(square.width / state.sourceWidth) * 100}%`,
                  height: `${(square.height / state.sourceHeight) * 100}%`,
                }}
              />
            ))}
            {state?.squares.map((square, index) => (
              <div
                key={`candidate-${square.x}-${square.y}-${index}`}
                style={{
                  ...styles.squareOverlay,
                  left: `${(square.x / state.sourceWidth) * 100}%`,
                  top: `${(square.y / state.sourceHeight) * 100}%`,
                  width: `${(square.width / state.sourceWidth) * 100}%`,
                  height: `${(square.height / state.sourceHeight) * 100}%`,
                }}
              />
            ))}
            {bestSquareOverlay ? <div style={{...styles.bestSquareOverlay, ...bestSquareOverlay}}/> : null}
          </div>
        </div>

        <div style={styles.sidebar}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Selected target</h2>
            <div style={styles.targetDetail}>
              {state ? <Image alt={state.targetName} src={state.targetPath} width={64} height={64} style={styles.targetDetailImage}/> : null}
              <div style={styles.targetDetailText}>
                <div style={styles.targetDetailTitle}>{state?.targetName ?? "Loading..."}</div>
                <div style={styles.targetDetailLine}>
                  Raw size: {state ? `${state.targetWidth} x ${state.targetHeight}` : "Running..."}
                </div>
                <div style={styles.targetDetailLine}>
                  Trimmed size: {state ? `${state.targetTrimmedWidth} x ${state.targetTrimmedHeight}` : "Running..."}
                </div>
                <div style={styles.targetDetailLine}>Square inner trim: {SQUARE_INNER_TRIM}px per side</div>
                <div style={styles.targetDetailLine}>Phase 1 yellow boxes: raw detected squares</div>
                <div style={styles.targetDetailLine}>Phase 2 blue boxes: filtered candidate squares</div>
                <div style={styles.targetDetailLine}>Threshold: {MATCH_THRESHOLD}</div>
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Top square candidates</h2>
            {state?.topSquares.length ? state.topSquares.map((square) => (
              <div key={square.index} style={styles.candidateRow}>
                <div style={styles.candidateName}>Square {square.index}</div>
                <div style={styles.candidateMeta}>
                  score {square.score.toFixed(4)} at {square.bounds.x}, {square.bounds.y} ({square.bounds.width} x {square.bounds.height})
                </div>
              </div>
            )) : <p style={styles.loadingText}>Running square comparisons...</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({label, value}: { label: string; value: string }) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
    </div>
  );
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

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: "grid",
    gap: "24px",
    padding: "24px",
  },
  header: {
    display: "grid",
    gap: "6px",
  },
  title: {
    margin: 0,
    fontSize: "32px",
  },
  subtitle: {
    margin: 0,
    color: "#596273",
  },
  targetRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  targetButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid #d6dce5",
    background: "#ffffff",
    cursor: "pointer",
    color: "#111827",
    fontWeight: 600,
  },
  targetButtonSelected: {
    borderColor: "#2563eb",
    boxShadow: "0 0 0 1px rgba(37, 99, 235, 0.18)",
  },
  targetImage: {
    display: "block",
    width: "32px",
    height: "32px",
  },
  error: {
    margin: 0,
    color: "#c53030",
  },
  summary: {
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  },
  grid: {
    display: "grid",
    gap: "16px",
    gridTemplateColumns: "minmax(0, 1.55fr) minmax(320px, 1fr)",
    alignItems: "start",
  },
  sidebar: {
    display: "grid",
    gap: "16px",
  },
  card: {
    border: "1px solid #d6dce5",
    borderRadius: "16px",
    background: "#ffffff",
    padding: "16px",
  },
  cardTitle: {
    margin: 0,
    fontSize: "18px",
  },
  cardSubtitle: {
    margin: "8px 0 12px",
    color: "#596273",
    fontSize: "14px",
  },
  imageFrame: {
    position: "relative",
    borderRadius: "12px",
    overflow: "hidden",
    border: "1px solid #d6dce5",
    background: "#eef2f7",
  },
  image: {
    display: "block",
    width: "100%",
    height: "auto",
  },
  squareOverlay: {
    position: "absolute",
    border: "1px solid rgba(37, 99, 235, 0.55)",
    background: "rgba(37, 99, 235, 0.08)",
    pointerEvents: "none",
    boxSizing: "border-box",
  },
  rawSquareOverlay: {
    position: "absolute",
    border: "2px solid rgba(245, 158, 11, 0.95)",
    background: "rgba(245, 158, 11, 0.08)",
    pointerEvents: "none",
    boxSizing: "border-box",
  },
  bestSquareOverlay: {
    position: "absolute",
    borderStyle: "solid",
    borderWidth: "3px",
    boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.14)",
    pointerEvents: "none",
    boxSizing: "border-box",
  },
  metricCard: {
    border: "1px solid #d6dce5",
    borderRadius: "12px",
    background: "#ffffff",
    padding: "14px 16px",
  },
  metricLabel: {
    fontSize: "12px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#687282",
  },
  metricValue: {
    marginTop: "6px",
    fontSize: "20px",
    fontWeight: 600,
    color: "#111827",
  },
  targetDetail: {
    display: "flex",
    gap: "14px",
    alignItems: "center",
  },
  targetDetailImage: {
    display: "block",
    width: "64px",
    height: "64px",
  },
  targetDetailText: {
    display: "grid",
    gap: "4px",
  },
  targetDetailTitle: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#111827",
  },
  targetDetailLine: {
    color: "#596273",
    fontSize: "14px",
  },
  candidateRow: {
    padding: "10px 0",
    borderTop: "1px solid #e5e7eb",
  },
  candidateName: {
    fontWeight: 700,
    color: "#111827",
  },
  candidateMeta: {
    marginTop: "4px",
    color: "#596273",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  loadingText: {
    margin: 0,
    color: "#596273",
  },
};
