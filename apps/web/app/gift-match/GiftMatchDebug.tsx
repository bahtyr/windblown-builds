/* eslint-disable @next/next/no-img-element */
"use client";

import Image from "next/image";
import {type ChangeEvent, useEffect, useMemo, useRef, useState} from "react";
import {buildDeckShareUrl} from "../../components/deck/deck-share";
import {type Rectangle} from "../../lib/gift-icon-matcher";
import {
  isGiftMatch,
  runGiftMatchWorkflow,
  type GiftMatchRunResult,
  type GiftMatchSquareResult,
  type GiftMatchTemplateSpec,
} from "./gift-match-workflow";
import {buildDetectedDeckItems} from "./run-build-flow";

type GiftMatchDebugProps = {
  templateSpecs: GiftMatchTemplateSpec[];
};

/**
 * Renders the source image and the current catalog-based match results.
 *
 * @param {GiftMatchDebugProps} props - Comparison template specs for the current run.
 * @returns {JSX.Element} Debug UI for square detection and full image-catalog matching.
 */
export default function GiftMatchDebug({templateSpecs}: GiftMatchDebugProps): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [state, setState] = useState<GiftMatchRunResult | null>(null);
  const [selectedSquareIndex, setSelectedSquareIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [sourceSrc, setSourceSrc] = useState<string | null>(null);

  useEffect(() => () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
  }, []);

  const matchedDeckItems = useMemo(() => buildDetectedDeckItems(state?.squareResults ?? []), [state?.squareResults]);

  async function handleStart() {
    if (!sourceSrc) {
      setError("Upload a build screenshot before running detection.");
      return;
    }

    try {
      setIsRunning(true);
      setError(null);
      setState(null);
      setSelectedSquareIndex(null);

      const nextState = await runGiftMatchWorkflow(templateSpecs, sourceSrc);
      setState(nextState);
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : "Failed to run image matching.");
    } finally {
      setIsRunning(false);
    }
  }

  function handleReplaceSource(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const nextObjectUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextObjectUrl;
    setSourceSrc(nextObjectUrl);
    setState(null);
    setError(null);
    setSelectedSquareIndex(null);
    event.target.value = "";
  }

  function handleSaveToDeck() {
    if (!matchedDeckItems.length || typeof window === "undefined") {
      return;
    }

    const deckName = `Detected Build ${buildShortTimestamp()}`;
    const url = buildDeckShareUrl(window.location.origin, {
      name: deckName,
      items: matchedDeckItems,
    });

    window.location.assign(url);
  }

  return (
    <section style={styles.shell}>
      <div style={styles.heroCard}>
        <div style={styles.heroCopy}>
          <h1 style={styles.title}>Turn a screenshot into a draft build.</h1>
          <p style={styles.subtitle}>
            Load a source image, run detection, review every square, then save the matched gifts into a deck.
          </p>
        </div>

        <div style={styles.actions}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isRunning}
            style={styles.primaryButton}
          >
            Upload Build Screenshot
          </button>
          <button
            type="button"
            onClick={() => void handleStart()}
            disabled={isRunning || !sourceSrc}
            style={styles.secondaryButton}
          >
            {isRunning ? "Detecting..." : "Detect Build"}
          </button>
          <button
            type="button"
            onClick={handleSaveToDeck}
            disabled={!matchedDeckItems.length}
            style={styles.secondaryButton}
          >
            Save Deck
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleReplaceSource}
            style={styles.hiddenInput}
          />
        </div>

        {sourceSrc ? <div style={styles.heroMeta}>{state ? `${state.squares.length} detected squares` : "Screenshot selected and ready."}</div> : null}
      </div>

      {error ? <p style={styles.error}>{error}</p> : null}

      <div style={styles.inlinePanels}>
        <div style={styles.panelCard}>
          <div style={styles.panelHeader}>
            <h2 style={styles.sectionTitle}>Source Image</h2>
            {state ? <p style={styles.sectionMeta}>Squares turn green or red after detection. Click any result card to highlight that square in yellow.</p> : null}
          </div>

          <div style={styles.imageFrame}>
            {sourceSrc ? <img alt="Source screenshot" src={sourceSrc} style={styles.sourceImage}/> : <div style={styles.emptySource}>Upload a build screenshot to begin.</div>}
            {state ? state.squareResults.map((square) => (
              <div
                key={`${square.bounds.x}-${square.bounds.y}-${square.index}`}
                style={buildOverlayStyle(
                  square.bounds,
                  state.sourceWidth,
                  state.sourceHeight,
                  square.index === selectedSquareIndex ? "#facc15" : getSquareBorderColor(square),
                )}
              >
                <span style={styles.overlayLabel}>{square.index}</span>
              </div>
            )) : null}
          </div>
        </div>

        <div style={styles.panelCard}>
          <div style={styles.panelHeader}>
            <h2 style={styles.sectionTitle}>Detected Matches</h2>
            <p style={styles.sectionMeta}>
              {state
                ? `Total processing time: ${formatMilliseconds(state.totalMilliseconds)}`
                : isRunning
                  ? "Processing screenshot..."
                  : "Run detection to see matched images for each square."}
            </p>
          </div>

          <div style={styles.resultsGrid}>
            {state?.squareResults.length ? state.squareResults.map((square) => (
              <button
                key={square.index}
                type="button"
                onClick={() => setSelectedSquareIndex(square.index)}
                style={{
                  ...styles.resultTile,
                  ...(selectedSquareIndex === square.index ? styles.resultTileSelected : null),
                }}
              >
                <div style={styles.resultTileHeader}>
                  <span>Square {square.index}</span>
                  <span style={isSuccessfulSquare(square) ? styles.matchStatusFound : styles.matchStatusFailed}>
                    {isSuccessfulSquare(square) ? "Found" : "Failed"}
                  </span>
                </div>

                {isSuccessfulSquare(square) ? (
                  <div style={styles.singleResult}>
                    {square.bestTemplate?.path ? (
                      <Image
                        alt={square.bestTemplate.name}
                        src={square.bestTemplate.path}
                        width={40}
                        height={40}
                        style={styles.resultImage}
                      />
                    ) : null}
                    <div style={styles.resultName}>{square.bestTemplate?.name ?? "No result"}</div>
                    <div style={styles.resultMeta}>{square.bestTemplate?.score.toFixed(4)}</div>
                  </div>
                ) : (
                  <div style={styles.failedResults}>
                    {square.topTemplates.map((template) => (
                      <div key={`${square.index}-${template.path}`} style={styles.failedResultItem}>
                        <Image alt={template.name} src={template.path} width={32} height={32} style={styles.smallResultImage}/>
                        <div style={styles.failedResultName}>{template.name}</div>
                        <div style={styles.failedResultScore}>{template.score.toFixed(4)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            )) : (
              <p style={styles.emptyText}>{isRunning ? "Processing screenshot..." : "No results yet."}</p>
            )}
          </div>
        </div>
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

function isSuccessfulSquare(square: GiftMatchSquareResult): boolean {
  return Boolean(square.bestTemplate && isGiftMatch(square.bestTemplate.score));
}

function getSquareBorderColor(square: GiftMatchSquareResult): string {
  return isSuccessfulSquare(square) ? "#16a34a" : "#dc2626";
}

function buildShortTimestamp(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  const hours = `${now.getHours()}`.padStart(2, "0");
  const minutes = `${now.getMinutes()}`.padStart(2, "0");

  return `${month}${day}-${hours}${minutes}`;
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    padding: "24px",
    display: "grid",
    gap: "18px",
  },
  heroCard: {
    border: "1px solid #d6dce5",
    borderRadius: "20px",
    background: "linear-gradient(135deg, #fffef6 0%, #ffffff 52%, #f7fbff 100%)",
    padding: "20px",
    display: "grid",
    gap: "16px",
  },
  heroCopy: {
    display: "grid",
    gap: "8px",
  },
  title: {
    margin: 0,
    fontSize: "32px",
    lineHeight: 1.1,
    color: "#111827",
  },
  subtitle: {
    margin: 0,
    maxWidth: "760px",
    color: "#4b5563",
    fontSize: "16px",
    lineHeight: 1.5,
  },
  error: {
    margin: 0,
    color: "#dc2626",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  primaryButton: {
    border: "1px solid #111827",
    borderRadius: "999px",
    background: "#111827",
    color: "#ffffff",
    padding: "11px 18px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #d6dce5",
    borderRadius: "999px",
    background: "#ffffff",
    color: "#111827",
    padding: "11px 18px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  hiddenInput: {
    display: "none",
  },
  heroMeta: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    color: "#596273",
    fontSize: "14px",
  },
  inlinePanels: {
    display: "grid",
    gap: "18px",
    gridTemplateColumns: "minmax(0, 1.1fr) minmax(340px, 0.9fr)",
    alignItems: "start",
  },
  panelCard: {
    border: "1px solid #d6dce5",
    borderRadius: "18px",
    background: "#ffffff",
    padding: "16px",
    display: "grid",
    gap: "14px",
  },
  panelHeader: {
    display: "grid",
    gap: "6px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "20px",
    color: "#111827",
  },
  sectionMeta: {
    margin: 0,
    color: "#596273",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  imageFrame: {
    position: "relative",
    borderRadius: "14px",
    overflow: "hidden",
    background: "#111827",
    minHeight: "280px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  emptySource: {
    color: "#cbd5e1",
    fontSize: "16px",
  },
  sourceImage: {
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
  resultsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))",
    gap: "12px",
    maxHeight: "940px",
    overflowY: "auto",
    paddingRight: "4px",
  },
  resultTile: {
    border: "1px solid #d6dce5",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "12px",
    display: "grid",
    gap: "10px",
    textAlign: "left",
    cursor: "pointer",
  },
  resultTileSelected: {
    borderColor: "#facc15",
    boxShadow: "0 0 0 2px rgba(250, 204, 21, 0.18)",
    background: "#fffef6",
  },
  resultTileHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    fontWeight: 700,
    color: "#111827",
  },
  matchStatusFound: {
    color: "#16a34a",
  },
  matchStatusFailed: {
    color: "#dc2626",
  },
  singleResult: {
    display: "grid",
    gap: "6px",
    justifyItems: "start",
  },
  resultImage: {
    display: "block",
    width: "40px",
    height: "40px",
  },
  resultName: {
    fontWeight: 700,
    fontSize: "14px",
    color: "#111827",
  },
  resultMeta: {
    color: "#596273",
    fontSize: "13px",
  },
  failedResults: {
    display: "grid",
    gap: "8px",
  },
  failedResultItem: {
    display: "grid",
    gridTemplateColumns: "32px minmax(0, 1fr)",
    gap: "8px",
    alignItems: "center",
  },
  smallResultImage: {
    display: "block",
    width: "32px",
    height: "32px",
  },
  failedResultName: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#111827",
  },
  failedResultScore: {
    gridColumn: "2 / 3",
    fontSize: "12px",
    color: "#596273",
  },
  emptyText: {
    margin: 0,
    color: "#596273",
  },
};
