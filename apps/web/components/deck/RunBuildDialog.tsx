/* eslint-disable @next/next/no-img-element */
"use client";

import {type ChangeEvent, type CSSProperties, useEffect, useMemo, useRef, useState} from "react";
import {
  isGiftMatch,
  type GiftMatchRunResult,
  type GiftMatchTemplateSpec,
  runGiftMatchWorkflow,
} from "../../app/gift-match/gift-match-workflow";
import {
  buildDetectedDeckItems,
  buildDetectedRunName,
  buildFailedSquareCandidates,
  type MatchedDeckItem,
} from "../../app/gift-match/run-build-flow";
import {type Rectangle} from "../../lib/gift-icon-matcher";
import {useDeck} from "./DeckContext";
import {useDeckUi} from "./DeckUiContext";

type RunBuildDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  templateSpecs: GiftMatchTemplateSpec[];
};

/**
 * Renders the user-facing run upload flow that detects a build from a screenshot.
 *
 * @param {RunBuildDialogProps} props - Dialog state and template catalog.
 * @returns {JSX.Element | null} Upload and review dialog when open.
 */
export default function RunBuildDialog({isOpen, onClose, templateSpecs}: RunBuildDialogProps): JSX.Element | null {
  const deck = useDeck();
  const deckUi = useDeckUi();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [sourceSrc, setSourceSrc] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<GiftMatchRunResult | null>(null);
  const [manualItems, setManualItems] = useState<MatchedDeckItem[]>([]);
  const [buildName, setBuildName] = useState<string>(buildDetectedRunName());
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);

  useEffect(() => () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetDialogState();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const matchedItems = useMemo(() => buildDetectedDeckItems(runResult?.squareResults ?? []), [runResult?.squareResults]);
  const failedSquares = useMemo(() => buildFailedSquareCandidates(runResult?.squareResults ?? []), [runResult?.squareResults]);
  const visibleMatchedItems = useMemo(() => matchedItems, [matchedItems]);
  const buildItems = useMemo(() => [...visibleMatchedItems, ...manualItems], [manualItems, visibleMatchedItems]);
  const selectedCandidateIds = useMemo(() => new Set(manualItems.map((item) => item.id)), [manualItems]);

  if (!isOpen) {
    return null;
  }

  async function runDetection(nextSourceSrc: string) {
    try {
      setIsRunning(true);
      setError(null);
      setRunResult(null);
      setManualItems([]);

      const nextState = await runGiftMatchWorkflow(templateSpecs, nextSourceSrc);
      setRunResult(nextState);
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : "Failed to run image matching.");
    } finally {
      setIsRunning(false);
    }
  }

  function resetDialogState() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setSourceSrc(null);
    setRunResult(null);
    setManualItems([]);
    setBuildName(buildDetectedRunName());
    setError(null);
    setIsRunning(false);
    setIsDragActive(false);
  }

  function setSourceFile(file: File) {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const nextObjectUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextObjectUrl;
    setSourceSrc(nextObjectUrl);
    void runDetection(nextObjectUrl);
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSourceFile(file);
    event.target.value = "";
  }

  function handleAddCandidate(item: MatchedDeckItem) {
    setManualItems((current) => (
      current.some((entry) => entry.id === item.id)
        ? current.filter((entry) => entry.id !== item.id)
        : [...current, item]
    ));
  }

  function handleSave() {
    if (buildItems.length === 0) {
      return;
    }

    deck.saveImportedDeck(buildName, buildItems);
    onClose();
  }

  function handleSaveAndEdit() {
    if (buildItems.length === 0) {
      return;
    }

    deck.saveImportedDeck(buildName, buildItems);
    onClose();
    deckUi.openDeck();
  }

  return (
    <div className="run-build-overlay" role="presentation">
      <div className="run-build-backdrop" onClick={onClose}/>
      <div aria-label="New run" aria-modal="true" className="run-build-dialog" role="dialog">
        <button aria-label="Close new run dialog" className="run-build-close" type="button" onClick={onClose}>
          x
        </button>

        <div className="run-build-shell">
          <div className="run-build-header">
            <h2 className="run-build-title">New run</h2>
          </div>

          <div className="run-build-layout">
            <section className="run-build-preview-panel">
              <input
                ref={fileInputRef}
                accept="image/*"
                className="run-build-hidden-input"
                type="file"
                onChange={handleFileInput}
              />
              <button
                className={`run-build-dropzone ${isDragActive ? "is-drag-active" : ""} ${isRunning ? "is-loading" : ""}`}
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    return;
                  }
                  setIsDragActive(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragActive(false);
                  const file = event.dataTransfer.files?.[0];
                  if (file) {
                    setSourceFile(file);
                  }
                }}
              >
                {sourceSrc ? (
                  <div className="run-build-source-frame">
                    <img alt="Uploaded run screenshot" className="run-build-source-image" src={sourceSrc}/>
                    {isRunning ? (
                      <div className="run-build-loading-overlay">
                        <span className="run-build-loading-spinner" aria-hidden="true"/>
                        <span>Parsing screenshot...</span>
                      </div>
                    ) : null}
                    {runResult?.squareResults.map((square) => (
                      <div
                        key={`${square.index}-${square.bounds.x}-${square.bounds.y}`}
                        className="run-build-square"
                        style={buildOverlayStyle(
                          square.bounds,
                          runResult.sourceWidth,
                          runResult.sourceHeight,
                          isGiftMatch(square.bestTemplate?.score ?? 0) ? "#16a34a" : "#dc2626",
                        )}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="run-build-dropzone-copy">
                    <strong>Drop an image here</strong>
                    <span>or click to upload a run screenshot</span>
                  </div>
                )}
              </button>

              <div className="run-build-preview-meta">
                {!isRunning && runResult ? <p>{runResult.squares.length} squares detected.</p> : null}
                {error ? <p className="run-build-error">{error}</p> : null}
              </div>
            </section>

            <section className="run-build-results-panel">
              <div className="run-build-form-row">
                <label className="run-build-label" htmlFor="run-build-name">Build name</label>
                <input
                  className="run-build-name-input"
                  id="run-build-name"
                  value={buildName}
                  onChange={(event) => setBuildName(event.target.value)}
                  placeholder="Build name"
                />
              </div>

              {visibleMatchedItems.length > 0 ? (
                <div className="run-build-section">
                  <div className="run-build-section-head">
                    <h3>Build items</h3>
                    <span>{visibleMatchedItems.length}</span>
                  </div>
                  <div className="run-build-success-grid" aria-label="Detected build items">
                    {visibleMatchedItems.map((item) => (
                      <div className="run-build-success-tile" key={item.id} title={item.name}>
                        {item.image ? <img alt={item.name} className="run-build-success-image" src={item.image}/> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {failedSquares.length > 0 ? (
                <div className="run-build-section">
                  <div className="run-build-section-head">
                    <h3>Candidates for failed matches</h3>
                    <span>{failedSquares.length}</span>
                  </div>
                  <div className="run-build-success-grid" aria-label="Failed match candidates">
                    {failedSquares.map((candidate) => (
                      <button
                        key={candidate.id}
                        aria-pressed={selectedCandidateIds.has(candidate.id)}
                        className={`run-build-success-tile run-build-failed-tile ${selectedCandidateIds.has(candidate.id) ? "is-selected" : ""}`}
                        title={candidate.name}
                        type="button"
                        onClick={() => handleAddCandidate(candidate)}
                      >
                        {candidate.image ? <img alt={candidate.name} className="run-build-success-image" src={candidate.image}/> : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="run-build-actions">
                <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
                <button className="btn ghost" disabled={buildItems.length === 0} type="button" onClick={handleSaveAndEdit}>Edit</button>
                <button className="btn" disabled={buildItems.length === 0} type="button" onClick={handleSave}>Save build</button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildOverlayStyle(square: Rectangle, sourceWidth: number, sourceHeight: number, borderColor: string): CSSProperties {
  return {
    left: `${(square.x / sourceWidth) * 100}%`,
    top: `${(square.y / sourceHeight) * 100}%`,
    width: `${(square.width / sourceWidth) * 100}%`,
    height: `${(square.height / sourceHeight) * 100}%`,
    borderColor,
  };
}
