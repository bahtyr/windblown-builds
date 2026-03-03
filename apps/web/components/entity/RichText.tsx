"use client";

import {RichDescriptionNode} from "../../lib/types";

type Props = {
  parts: RichDescriptionNode[];
  onEntityFilter?: (id: string) => void;
};

export default function RichText({parts, onEntityFilter}: Props) {
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
              const id = p.href || p.id;
              if (id) {
                if (onEntityFilter) onEntityFilter(id); // todo make this toggle filter if filter already applied remove
              }
            }}
          >
            {p.image ? <img src={p.image} alt={(p.text || p.id) + " image"}/> : null}
            {p.text || p.id}
          </span>
        );
      })}
    </div>
  );
}
