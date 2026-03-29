"use client";

import Image from "next/image";
import {useEffect, useState} from "react";
import {grayscaleImageData, loadImageData, matchTemplate, type MatchResult} from "../../lib/gift-icon-matcher";

const SOURCE_PATH = "/source-cropped.png";
const TEMPLATE_PATH = "/Intense_Burn.webp";
const MATCH_THRESHOLD = 0.85;

type MatchState = {
  sourceWidth: number;
  sourceHeight: number;
  templateWidth: number;
  templateHeight: number;
  result: MatchResult;
};

/**
 * Renders a client-side debug view for gift icon template matching.
 *
 * @returns {JSX.Element} Debug UI showing images, score, and best match bounds.
 */
export default function GiftMatchDebug(): JSX.Element {
  const [state, setState] = useState<MatchState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function runMatch() {
      try {
        const [sourceImageData, templateImageData] = await Promise.all([
          loadImageData(SOURCE_PATH),
          loadImageData(TEMPLATE_PATH),
        ]);

        const result = matchTemplate(
          grayscaleImageData(sourceImageData),
          grayscaleImageData(templateImageData),
          {
            threshold: MATCH_THRESHOLD,
            scales: [0.9, 1, 1.1],
            trimBorder: 2,
            coarseStep: 2,
            refineRadius: 3,
          },
        );

        if (!cancelled) {
          setState({
            sourceWidth: sourceImageData.width,
            sourceHeight: sourceImageData.height,
            templateWidth: templateImageData.width,
            templateHeight: templateImageData.height,
            result,
          });
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

  const overlayStyle = state ? {
    left: `${(state.result.x / state.sourceWidth) * 100}%`,
    top: `${(state.result.y / state.sourceHeight) * 100}%`,
    width: `${(state.result.width / state.sourceWidth) * 100}%`,
    height: `${(state.result.height / state.sourceHeight) * 100}%`,
    borderColor: state.result.isMatch ? "#2f855a" : "#c53030",
  } : undefined;

  return (
    <section style={styles.shell}>
      <div style={styles.header}>
        <h1 style={styles.title}>Gift icon match debug</h1>
        <p style={styles.subtitle}>Client-side grayscale template matching against a cropped screenshot.</p>
      </div>

      {error ? <p style={styles.error}>{error}</p> : null}

      <div style={styles.metrics}>
        <Metric label="Best score" value={state ? state.result.score.toFixed(4) : "Running..."} />
        <Metric label="Match" value={state ? (state.result.isMatch ? "Yes" : "No") : "Running..."} />
        <Metric label="Position" value={state ? `${state.result.x}, ${state.result.y}` : "Running..."} />
        <Metric label="Bounds" value={state ? `${state.result.width} x ${state.result.height}` : "Running..."} />
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Source image</h2>
          <div style={styles.imageFrame}>
            <Image alt="Source screenshot" src={SOURCE_PATH} width={766} height={162} style={styles.image} />
            {overlayStyle ? <div style={{...styles.overlay, ...overlayStyle}} /> : null}
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Template image</h2>
          <div style={styles.templateFrame}>
            <Image alt="Template icon" src={TEMPLATE_PATH} width={48} height={48} style={styles.templateImage} />
          </div>
          <p style={styles.note}>Threshold: {MATCH_THRESHOLD}. Border trim: 2px. Scales: 0.9, 1.0, 1.1.</p>
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
  metrics: {
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
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
  grid: {
    display: "grid",
    gap: "16px",
    gridTemplateColumns: "minmax(0, 1.8fr) minmax(260px, 0.8fr)",
    alignItems: "start",
  },
  card: {
    border: "1px solid #d6dce5",
    borderRadius: "16px",
    background: "#ffffff",
    padding: "16px",
  },
  cardTitle: {
    margin: "0 0 12px",
    fontSize: "18px",
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
  templateFrame: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "18px",
    borderRadius: "12px",
    border: "1px solid #d6dce5",
    background: "#eef2f7",
  },
  templateImage: {
    display: "block",
    width: "96px",
    height: "96px",
    imageRendering: "pixelated",
  },
  note: {
    margin: "12px 0 0",
    color: "#596273",
    fontSize: "14px",
    lineHeight: 1.5,
  },
};
