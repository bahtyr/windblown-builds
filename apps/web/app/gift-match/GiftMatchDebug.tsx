"use client";

import Image from "next/image";
import {useEffect, useState} from "react";
import {type Rectangle} from "../../lib/gift-icon-matcher";
import {
  GIFT_MATCH_SOURCE_PATH,
  isGiftMatch,
  runGiftMatchWorkflow,
  selectGiftMatchOverlay,
  type GiftMatchRunResult,
  type GiftMatchTemplateSpec,
} from "./gift-match-workflow";

type GiftMatchDebugProps = {
  templateSpecs: GiftMatchTemplateSpec[];
};

/**
 * Renders the source image and the current catalog-based match table.
 *
 * @param {GiftMatchDebugProps} props - Comparison template specs for the current run.
 * @returns {JSX.Element} Debug UI for square detection and full image-catalog matching.
 */
export default function GiftMatchDebug({templateSpecs}: GiftMatchDebugProps): JSX.Element {
  const [state, setState] = useState<GiftMatchRunResult | null>(null);
  const [selectedSquareIndex, setSelectedSquareIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function runMatching() {
      try {
        const nextState = await runGiftMatchWorkflow(templateSpecs);

        if (!cancelled) {
          setState(nextState);
          setSelectedSquareIndex(nextState.squareResults[0]?.index ?? 0);
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
  }, [templateSpecs]);

  const selectedOverlay = state ? selectGiftMatchOverlay(state, selectedSquareIndex) : null;
  const selectedOverlayStyle = state && selectedOverlay ? buildOverlayStyle(
    selectedOverlay.bounds,
    state.sourceWidth,
    state.sourceHeight,
    selectedOverlay.borderColor,
  ) : undefined;

  return (
    <section style={styles.shell}>
      {error ? <p style={styles.error}>{error}</p> : null}

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
            <td style={styles.tableCell}>Whole run, load source and {templateSpecs.length} reference images, then compare all detected squares</td>
            <td style={styles.tableCell}>{state ? formatMilliseconds(state.totalMilliseconds) : "Loading..."}</td>
            <td style={styles.tableCell}>{state ? `${state.squares.length} squares x ${state.templateCount} templates` : "-"}</td>
          </tr>
          <tr>
            <td style={styles.tableCell}>Phase 1, identify squares and prepare square crops</td>
            <td style={styles.tableCell}>{state ? formatMilliseconds(state.phase1Milliseconds) : "Loading..."}</td>
            <td style={styles.tableCell}>{state ? `${state.squares.length} squares` : "-"}</td>
          </tr>
          {state?.squareResults.flatMap((square) => [
            <tr
              key={`process-${square.index}`}
              onClick={() => setSelectedSquareIndex(square.index)}
              style={selectedSquareIndex === square.index ? styles.tableRowSelected : undefined}
            >
              <td style={styles.tableCell}>Square {square.index}, crop and preprocess square</td>
              <td style={styles.tableCell}>{formatMilliseconds(square.preprocessMilliseconds)}</td>
              <td style={styles.tableCell}>Prepared inner crop</td>
            </tr>,
            <tr
              key={`match-${square.index}`}
              onClick={() => setSelectedSquareIndex(square.index)}
              style={selectedSquareIndex === square.index ? styles.tableRowSelected : undefined}
            >
              <td style={styles.tableCell}>Square {square.index}, compare against {state.templateCount} reference images</td>
              <td style={styles.tableCell}>{formatMilliseconds(square.matchMilliseconds)}</td>
              <td style={styles.tableCell}>
                <div style={styles.tableResult}>
                  <span>
                    {square.bestTemplate
                      ? `${isGiftMatch(square.bestTemplate.score) ? "Found" : "Best failed"} ${square.bestTemplate.name} | ${square.bestTemplate.score.toFixed(4)}`
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
  tableRowSelected: {
    background: "#f8fafc",
    cursor: "pointer",
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
};
