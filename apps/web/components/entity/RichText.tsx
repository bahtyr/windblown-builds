"use client";

import {RichDescriptionNode} from "../../lib/types";

type Props = {
  parts: RichDescriptionNode[];
  onEntityFilter?: (id: string) => void;
};

export default function RichText({parts, onEntityFilter}: Props) {
  return (
    <div className="rich-description">
      {parts.map((p, i) => {
        if (p.key === "text") {
          if (p.newLine) {
            return <br key={i}></br>;
          }
          return (
            <span
              key={i}
              style={{
                fontWeight: p.bold ? "bold" : undefined,
                fontStyle: p.italic ? "italic" : undefined,
                color: p.color,
              }}
            >
              {p.text}
            </span>
          );
        }
        return (
          <span
            key={i}
            className="rich-description-entity"
            style={{
              fontWeight: p.bold ? "bold" : undefined,
              fontStyle: p.italic ? "italic" : undefined,
              color: p.color,
            }}
            title={p.href}
            onClick={(e) => {
              e.stopPropagation();
              const id = p.href || p.id;
              if (id) {
                if (onEntityFilter) onEntityFilter(id);
              }
            }}
          >
            {p.image ? <img src={p.image} alt={(p.text || p.id) + " image"}/> : null}
            {p.text ? <span>{p.text}</span> : ""}
          </span>
        );
      })}
    </div>
  );
}
