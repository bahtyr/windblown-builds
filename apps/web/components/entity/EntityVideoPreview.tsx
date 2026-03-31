/* eslint-disable @next/next/no-img-element */
"use client";

import {useEffect, useRef} from "react";
import {ScrapedEntity} from "../../lib/types";

type Props = {
  entity: ScrapedEntity;
  active?: boolean;
  mediaClassName?: string;
  onMediaReady?: () => void;
  preload?: "none" | "metadata" | "auto";
  wrapperClassName?: string;
};

/**
 * Normalize entity video fields into a stable ordered list.
 *
 * @param {ScrapedEntity} entity - Entity payload with optional legacy and array video fields.
 * @returns {string[]} Unique video URLs in display order.
 */
export function getEntityVideos(entity: ScrapedEntity): string[] {
  const videos = [
    ...(entity.videos ?? []),
    ...(entity.video ? [entity.video] : []),
  ].filter((value): value is string => Boolean(value));

  return Array.from(new Set(videos));
}

/**
 * Render a compact looping entity video preview.
 *
 * @param {Props} props - Video preview props.
 * @returns {JSX.Element | null} Video preview when media exists.
 */
export default function EntityVideoPreview({
  entity,
  active = true,
  mediaClassName = "",
  onMediaReady,
  preload = "metadata",
  wrapperClassName = "",
}: Props) {
  const videos = getEntityVideos(entity);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    if (!active) {
      video.pause();
      video.currentTime = 0;
      return;
    }

    void video.play().catch(() => {});
  }, [active, videos]);

  if (videos.length === 0) return null;

  return (
    <div className={`entity-video-preview ${wrapperClassName}`.trim()}>
      <video
        aria-label={`${entity.name} preview video`}
        autoPlay
        className={`entity-video-preview-media ${mediaClassName}`.trim()}
        loop
        muted
        onLoadedData={onMediaReady}
        onLoadedMetadata={onMediaReady}
        playsInline
        preload={preload}
        ref={videoRef}
      >
        <source src={videos[0]} type="video/webm"/>
      </video>
      {videos.length > 1 ? <span className="entity-video-preview-count">+{videos.length - 1}</span> : null}
    </div>
  );
}
