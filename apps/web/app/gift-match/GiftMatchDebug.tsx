"use client";

import Image from "next/image";
import {useEffect, useState} from "react";
import {
  type Rectangle,
} from "../../lib/gift-icon-matcher";
import {
  GIFT_MATCH_SOURCE_PATH,
  GIFT_MATCH_TEMPLATE_SPECS,
  isGiftMatch,
  runGiftMatchWorkflow,
  selectGiftMatchOverlay,
  type GiftMatchRunResult,
} from "./gift-match-workflow";

/**
 * Renders the source image, current matches, and an operations timing table.
 *
 * @returns {JSX.Element} Debug UI for square detection and three-image matching.
 */
export default function GiftMatchDebug(): JSX.Element {
  const [state, setState] = useState<GiftMatchRunResult | null>(null);
  const [selectedPath, setSelectedPath] = useState<string>(GIFT_MATCH_TEMPLATE_SPECS[0].path);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function runMatching() {
      try {
        const nextState = await runGiftMatchWorkflow();

        if (!cancelled) {
          setState(nextState);
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

  const selectedOverlay = state ? selectGiftMatchOverlay(state, selectedPath) : null;
  const selectedOverlayStyle = state && selectedOverlay ? buildOverlayStyle(
    selectedOverlay.bounds,
    state.sourceWidth,
    state.sourceHeight,
    selectedOverlay.borderColor,
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
                src={GIFT_MATCH_SOURCE_PATH}
                width={state.sourceWidth}
                height={state.sourceHeight}
                style={styles.image}
              />
            ) : null}
            {state?.squares.map((square, index) => (
              <div
                key={`${square.x}-${square.y}-${index}`}
                style={buildOverlayStyle(square, state.sourceWidth, state.sourceHeight, "#facc15")}
              >
                <span style={styles.overlayLabel}>{index}</span>
              </div>
            ))}
            {selectedOverlayStyle ? <div style={{...styles.selectedOverlay, ...selectedOverlayStyle}} /> : null}
          </div>
        </div>

        <div style={styles.resultsCard}>
          {state?.templateResults.map((match) => {
            const matchPassed = isGiftMatch(match.bestSquare?.score ?? 0);

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
                      ? `${matchPassed ? "Match" : "No match"} | square ${match.bestSquare.index} | ${match.bestSquare.score.toFixed(4)}`
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
            <td style={styles.tableCell}>Phase 1, identify squares and prepare square crops</td>
            <td style={styles.tableCell}>{state ? formatMilliseconds(state.phase1Milliseconds) : "Loading..."}</td>
            <td style={styles.tableCell}>{state ? `${state.squares.length} squares` : "-"}</td>
          </tr>
          {state?.squareResults.flatMap((square) => [
            <tr key={`process-${square.index}`}>
              <td style={styles.tableCell}>Square {square.index}, crop and preprocess square</td>
              <td style={styles.tableCell}>{formatMilliseconds(square.preprocessMilliseconds)}</td>
              <td style={styles.tableCell}>Prepared inner crop</td>
            </tr>,
            <tr key={`match-${square.index}`}>
              <td style={styles.tableCell}>Square {square.index}, compare against 3 reference images</td>
              <td style={styles.tableCell}>{formatMilliseconds(square.matchMilliseconds)}</td>
              <td style={styles.tableCell}>
                <div style={styles.tableResult}>
                  <span>
                    {square.bestTemplate
                      ? `${isGiftMatch(square.bestTemplate.score) ? "Found" : "Best failed"} ${square.bestTemplate.name}`
                      : "No result"}
                  </span>
                  {square.bestTemplate?.path ? (
                    <Image
                      alt={square.bestTemplate.name}
                      src={square.bestTemplate.path}
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
  overlayLabel: {
    position: "absolute",
    top: "-14px",
    left: "-3px",
    minWidth: "20px",
    padding: "1px 6px",
    borderRadius: "999px",
    background: "#facc15",
    color: "#111827",
    fontSize: "12px",
    fontWeight: 700,
    lineHeight: 1.4,
    textAlign: "center",
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
