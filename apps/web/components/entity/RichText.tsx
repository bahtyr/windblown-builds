"use client";

import {RichDescriptionNode} from "../../lib/types";

export default function RichText({parts, onEntityClick}: {parts: RichDescriptionNode[]; onEntityClick?: (id: string) => void}) {
  return (
    <div className="rich">
      {parts.map((p, i) => {
        if (p.key === "text") {
          return (
            <span key={i} style={{fontWeight: p.bold ? "bold" : undefined, color: p.color}}>
              {p.text}
            </span>
          );
        }
        return (
          <span
            key={i}
            className="entity"
            style={{fontWeight: p.bold ? "bold" : undefined, color: p.color}}
            title={p.href}
            onClick={(e) => {
              e.stopPropagation();
              if (onEntityClick && (p.href || p.id)) {
                onEntityClick(p.href || p.id!);
              }
            }}
          >
            {p.text || p.id}
          </span>
        );
      })}
    </div>
  );
}
