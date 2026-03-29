"use client";

import Image from "next/image";
import {useEffect, useState} from "react";
import {grayscaleImageData, loadImageData, matchTemplate, type MatchResult} from "../../lib/gift-icon-matcher";

const SOURCE_PATH = "/source-cropped-2.png";
const MATCH_THRESHOLD = 0.80;
const MATCH_SCALES = [0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.15];
const TEMPLATE_BORDER_TRIM = 4;
const COARSE_STEP = 1;
const REFINE_RADIUS = 5;
const TEMPLATE_SPECS = [
  {name: "Intense Burn", path: "/Intense_Burn.webp", shouldFind: true},
  {name: "Gory Flame Icon", path: "/Gory_Flame_Icon.webp", shouldFind: true},
  {name: "Protection Icon", path: "/Protection_Icon.webp", shouldFind: false},
] as const;

type MatchEntry = {
  name: string;
  path: string;
  shouldFind: boolean;
  templateWidth: number;
  templateHeight: number;
  result: MatchResult;
};

type MatchState = {
  sourceWidth: number;
  sourceHeight: number;
  matches: MatchEntry[];
};

/**
 * Renders a client-side debug view for gift icon template matching.
 *
 * @returns {JSX.Element} Debug UI showing explicit found or not found results for each template.
 */
export default function GiftMatchDebug(): JSX.Element {
  const [state, setState] = useState<MatchState | null>(null);
  const [selectedPath, setSelectedPath] = useState<string>(TEMPLATE_SPECS[0].path);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function runMatch() {
      try {
        const sourceImageData = await loadImageData(SOURCE_PATH);
        const sourceGray = grayscaleImageData(sourceImageData);
        const matches = await Promise.all(
          TEMPLATE_SPECS.map(async (templateSpec) => {
            const templateImageData = await loadImageData(templateSpec.path);
            const result = matchTemplate(
              sourceGray,
              grayscaleImageData(templateImageData),
              {
                threshold: MATCH_THRESHOLD,
                scales: MATCH_SCALES,
                trimBorder: TEMPLATE_BORDER_TRIM,
                coarseStep: COARSE_STEP,
                refineRadius: REFINE_RADIUS,
              },
            );

            return {
              ...templateSpec,
              templateWidth: templateImageData.width,
              templateHeight: templateImageData.height,
              result,
            };
          }),
        );

        if (!cancelled) {
          setState({
            sourceWidth: sourceImageData.width,
            sourceHeight: sourceImageData.height,
            matches,
          });
          setSelectedPath(matches[0]?.path ?? TEMPLATE_SPECS[0].path);
        }
      } catch (matchError) {
        if (!cancelled) {
          setError(matchError instanceof Error ? matchError.message : "Failed to run template matching.");
        }
      }
    }

    runMatch();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedMatch = state?.matches.find((match) => match.path === selectedPath) ?? state?.matches[0] ?? null;
  const overlayStyle = state && selectedMatch ? {
    left: `${(selectedMatch.result.x / state.sourceWidth) * 100}%`,
    top: `${(selectedMatch.result.y / state.sourceHeight) * 100}%`,
    width: `${(selectedMatch.result.width / state.sourceWidth) * 100}%`,
    height: `${(selectedMatch.result.height / state.sourceHeight) * 100}%`,
    borderColor: selectedMatch.result.isMatch ? "#2f855a" : "#c53030",
    opacity: selectedMatch.result.isMatch ? 1 : 0.45,
  } : undefined;
  const passedCount = state?.matches.filter((match) => match.result.isMatch === match.shouldFind).length ?? 0;

  return (
    <section style={styles.shell}>
      <div style={styles.header}>
        <h1 style={styles.title}>Gift icon match debug</h1>
        <p style={styles.subtitle}>This page explicitly reports whether each template was found inside the cropped source screenshot.</p>
      </div>

      {error ? <p style={styles.error}>{error}</p> : null}

      <div style={styles.summary}>
        <div style={styles.summaryLabel}>Overall result</div>
        <div style={styles.summaryValue}>
          {state ? `${passedCount}/${state.matches.length} checks matched expectation` : "Running checks..."}
        </div>
        <div style={styles.summaryNote}>
          Threshold {MATCH_THRESHOLD}. Grayscale matching with a {TEMPLATE_BORDER_TRIM}px template border trim,
          coarse step {COARSE_STEP}, refine radius {REFINE_RADIUS}, and scale search at {MATCH_SCALES.join(", ")}.
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Source image</h2>
          <p style={styles.cardSubtitle}>
            {selectedMatch
              ? `Overlay shown for ${selectedMatch.name}: ${selectedMatch.result.isMatch ? "FOUND" : "NOT FOUND"}`
              : "Running..."}
          </p>
          <div style={styles.imageFrame}>
            <Image alt="Source screenshot" src={SOURCE_PATH} width={766} height={162} style={styles.image}/>
            {overlayStyle ? <div style={{...styles.overlay, ...overlayStyle}}/> : null}
          </div>
        </div>

        <div style={styles.resultsColumn}>
          {state?.matches.map((match) => {
            const expectationMet = match.result.isMatch === match.shouldFind;
            const statusText = match.result.isMatch ? "FOUND" : "NOT FOUND";
            const expectedText = match.shouldFind ? "Should be found" : "Should not be found";

            return (
              <button
                key={match.path}
                onClick={() => setSelectedPath(match.path)}
                style={{
                  ...styles.resultCard,
                  ...(selectedMatch?.path === match.path ? styles.resultCardSelected : null),
                }}
                type="button"
              >
                <div style={styles.resultHeader}>
                  <div style={styles.resultHeaderText}>
                    <h2 style={styles.resultTitle}>{match.name}</h2>
                    <p style={styles.resultExpected}>{expectedText}</p>
                  </div>
                  <Image alt={match.name} src={match.path} width={48} height={48} style={styles.templateImage}/>
                </div>

                <div style={styles.badgeRow}>
                  <span style={{
                    ...styles.badge,
                    ...(match.result.isMatch ? styles.badgeFound : styles.badgeNotFound),
                  }}>
                    {statusText}
                  </span>
                  <span style={{
                    ...styles.badge,
                    ...(expectationMet ? styles.badgePass : styles.badgeFail),
                  }}>
                    {expectationMet ? "EXPECTED" : "UNEXPECTED"}
                  </span>
                </div>

                <div style={styles.metrics}>
                  <Metric label="Score" value={match.result.score.toFixed(4)}/>
                  <Metric label="Position" value={`${match.result.x}, ${match.result.y}`}/>
                  <Metric label="Bounds" value={`${match.result.width} x ${match.result.height}`}/>
                  <Metric label="Scale" value={match.result.scale.toFixed(2)}/>
                </div>
              </button>
            );
          }) ?? (
            <div style={styles.resultCard}>
              <p style={styles.loadingText}>Running template checks...</p>
            </div>
          )}
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
  error: {
    margin: 0,
    color: "#c53030",
  },
  summary: {
    border: "1px solid #d6dce5",
    borderRadius: "16px",
    background: "#ffffff",
    padding: "16px 18px",
    display: "grid",
    gap: "6px",
  },
  summaryLabel: {
    fontSize: "12px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#687282",
  },
  summaryValue: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#111827",
  },
  summaryNote: {
    color: "#596273",
    fontSize: "14px",
  },
  grid: {
    display: "grid",
    gap: "16px",
    gridTemplateColumns: "minmax(0, 1.5fr) minmax(320px, 1fr)",
    alignItems: "start",
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
  overlay: {
    position: "absolute",
    borderStyle: "solid",
    borderWidth: "3px",
    boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.18)",
    pointerEvents: "none",
    boxSizing: "border-box",
  },
  resultsColumn: {
    display: "grid",
    gap: "12px",
  },
  resultCard: {
    border: "1px solid #d6dce5",
    borderRadius: "16px",
    background: "#ffffff",
    padding: "16px",
    display: "grid",
    gap: "14px",
    textAlign: "left",
    cursor: "pointer",
  },
  resultCardSelected: {
    borderColor: "#2563eb",
    boxShadow: "0 0 0 1px rgba(37, 99, 235, 0.2)",
  },
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  resultHeaderText: {
    display: "grid",
    gap: "4px",
  },
  resultTitle: {
    margin: 0,
    fontSize: "18px",
    color: "#111827",
  },
  resultExpected: {
    margin: 0,
    color: "#596273",
    fontSize: "14px",
  },
  templateImage: {
    display: "block",
    width: "48px",
    height: "48px",
  },
  badgeRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "28px",
    padding: "0 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.04em",
  },
  badgeFound: {
    background: "#dcfce7",
    color: "#166534",
  },
  badgeNotFound: {
    background: "#fee2e2",
    color: "#991b1b",
  },
  badgePass: {
    background: "#dbeafe",
    color: "#1d4ed8",
  },
  badgeFail: {
    background: "#fef3c7",
    color: "#92400e",
  },
  metrics: {
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  },
  metricCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    background: "#f8fafc",
    padding: "10px 12px",
  },
  metricLabel: {
    fontSize: "11px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#687282",
  },
  metricValue: {
    marginTop: "6px",
    fontSize: "16px",
    fontWeight: 600,
    color: "#111827",
  },
  loadingText: {
    margin: 0,
    color: "#596273",
  },
};
