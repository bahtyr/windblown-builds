/* eslint-disable @next/next/no-img-element */
"use client";

import {ScrapedEntity} from "../../lib/types";

type Props = {
  className?: string;
  entity: ScrapedEntity;
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
export default function EntityVideoPreview({className = "", entity}: Props) {
  const videos = getEntityVideos(entity);
  if (videos.length === 0) return null;

  return (
    <div className={`entity-video-preview ${className}`.trim()}>
      <video
        aria-label={`${entity.name} preview video`}
        autoPlay
        className="entity-video-preview-media"
        loop
        muted
        playsInline
        preload="metadata"
      >
        <source src={videos[0]} type="video/webm"/>
      </video>
      {videos.length > 1 ? <span className="entity-video-preview-count">+{videos.length - 1}</span> : null}
    </div>
  );
}
