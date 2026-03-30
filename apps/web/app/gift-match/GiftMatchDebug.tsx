/* eslint-disable @next/next/no-img-element */
"use client";

import Image from "next/image";
import {type ChangeEvent, useEffect, useMemo, useRef, useState} from "react";
import {buildDeckShareUrl} from "../../components/deck/deck-share";
import {type Rectangle} from "../../lib/gift-icon-matcher";
import {type EntityType} from "../../lib/types";
import {
  GIFT_MATCH_SOURCE_PATH,
  isGiftMatch,
  runGiftMatchWorkflow,
  selectGiftMatchOverlay,
  type GiftMatchRunResult,
  type GiftMatchSquareResult,
  type GiftMatchTemplateSpec,
} from "./gift-match-workflow";

type GiftMatchDebugProps = {
  templateSpecs: GiftMatchTemplateSpec[];
};

type MatchedDeckItem = {
  id: string;
  type: Exclude<EntityType, "effects">;
  name: string;
  image?: string;
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
  const [selectedSquareIndex, setSelectedSquareIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [sourceSrc, setSourceSrc] = useState<string>(GIFT_MATCH_SOURCE_PATH);

  useEffect(() => () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
  }, []);

  const selectedOverlay = state ? selectGiftMatchOverlay(state, selectedSquareIndex) : null;
  const selectedOverlayStyle = state && selectedOverlay ? buildOverlayStyle(
    selectedOverlay.bounds,
    state.sourceWidth,
    state.sourceHeight,
    selectedOverlay.borderColor,
  ) : undefined;
  const matchedDeckItems = useMemo(() => buildDeckItems(state?.squareResults ?? []), [state?.squareResults]);

  async function handleStart() {
    try {
      setIsRunning(true);
      setError(null);
      setState(null);

      const nextState = await runGiftMatchWorkflow(templateSpecs, sourceSrc);
      setState(nextState);
      setSelectedSquareIndex(nextState.squareResults[0]?.index ?? 0);
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
    setSelectedSquareIndex(0);
    event.target.value = "";
  }

  function handleSaveToDeck() {
    if (!matchedDeckItems.length || typeof window === "undefined") {
      return;
    }

    const deckName = `Gift Match ${buildShortTimestamp()}`;
    const url = buildDeckShareUrl(window.location.origin, {
      name: deckName,
      items: matchedDeckItems,
    });

    window.location.assign(url);
  }

  return (
    <section style={styles.shell}>
      {error ? <p style={styles.error}>{error}</p> : null}

      <div style={styles.actions}>
        <button type="button" onClick={() => void handleStart()} disabled={isRunning} style={styles.primaryButton}>
          {isRunning ? "Running..." : "Start"}
        </button>
        <button
          type="button"
          onClick={handleSaveToDeck}
          disabled={!matchedDeckItems.length}
          style={styles.secondaryButton}
        >
          Save to Deck
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isRunning}
          style={styles.secondaryButton}
        >
          Replace Source Image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleReplaceSource}
          style={styles.hiddenInput}
        />
      </div>

      <div style={styles.sourceCard}>
        <div style={styles.imageFrame}>
          <img alt="Source screenshot" src={sourceSrc} style={styles.sourceImage}/>
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

      <div style={styles.summaryCard}>
        <div style={styles.summaryValue}>
          {state ? `Total time: ${formatMilliseconds(state.totalMilliseconds)}` : isRunning ? "Running..." : "Click Start to process the source image."}
        </div>
        <div style={styles.summaryMeta}>
          {state ? `${state.squares.length} squares x ${state.templateCount} templates` : `${templateSpecs.length} templates ready`}
        </div>
      </div>

      <div style={styles.resultsCard}>
        <h2 style={styles.sectionTitle}>Found Images</h2>
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
                      width={44}
                      height={44}
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
                      <Image alt={template.name} src={template.path} width={36} height={36} style={styles.smallResultImage}/>
                      <div style={styles.failedResultName}>{template.name}</div>
                      <div style={styles.failedResultScore}>{template.score.toFixed(4)}</div>
                    </div>
                  ))}
                </div>
              )}
            </button>
          )) : (
            <p style={styles.emptyText}>{isRunning ? "Running..." : "No results yet."}</p>
          )}
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

function buildDeckItems(squareResults: GiftMatchSquareResult[]): MatchedDeckItem[] {
  const uniqueItems = new Map<string, MatchedDeckItem>();

  for (const square of squareResults) {
    const template = square.bestTemplate;
    if (!template || !isGiftMatch(template.score)) {
      continue;
    }

    const type = extractEntityTypeFromPath(template.path);
    if (!type || type === "boosts") {
      continue;
    }

    const id = `${type}:${template.name}`;
    if (!uniqueItems.has(id)) {
      uniqueItems.set(id, {
        id,
        type,
        name: template.name,
        image: template.path,
      });
    }
  }

  return [...uniqueItems.values()];
}

function extractEntityTypeFromPath(imagePath: string): Exclude<EntityType, "effects"> | null {
  const pathParts = imagePath.split("/");
  const type = pathParts[2];

  if (type === "gifts" || type === "weapons" || type === "trinkets" || type === "magifishes" || type === "hexes" || type === "boosts") {
    return type;
  }

  return null;
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
  },
  error: {
    margin: "0 0 16px",
    color: "#dc2626",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  primaryButton: {
    border: "1px solid #111827",
    borderRadius: "10px",
    background: "#111827",
    color: "#ffffff",
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #d6dce5",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#111827",
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  hiddenInput: {
    display: "none",
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
  selectedOverlay: {
    position: "absolute",
    borderStyle: "solid",
    borderWidth: "4px",
    boxSizing: "border-box",
    pointerEvents: "none",
  },
  summaryCard: {
    marginTop: "16px",
    border: "1px solid #d6dce5",
    borderRadius: "16px",
    background: "#ffffff",
    padding: "16px",
  },
  summaryValue: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#111827",
  },
  summaryMeta: {
    marginTop: "6px",
    color: "#596273",
    fontSize: "14px",
  },
  resultsCard: {
    marginTop: "16px",
    border: "1px solid #d6dce5",
    borderRadius: "16px",
    background: "#ffffff",
    padding: "16px",
  },
  sectionTitle: {
    margin: "0 0 12px",
    fontSize: "18px",
    color: "#111827",
  },
  resultsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "12px",
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
    borderColor: "#111827",
    background: "#f8fafc",
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
    width: "44px",
    height: "44px",
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
    gridTemplateColumns: "36px minmax(0, 1fr)",
    gap: "8px",
    alignItems: "center",
  },
  smallResultImage: {
    display: "block",
    width: "36px",
    height: "36px",
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
