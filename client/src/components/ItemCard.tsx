import { useState } from "react";
import type { Item } from "@shared/types";
import { hexToRgba } from "@/lib/utils";

interface Props {
  item: Item;
  accent: string;
}

export default function ItemCard({ item, accent }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded"
      style={{ background: "var(--color-card-hi)", border: "1px solid #2a2318" }}
      data-testid={`item-card-${(item.n ?? "").replace(/\s+/g, "-").toLowerCase()}`}
    >
      <button
        className="w-full text-left px-3 py-2 flex items-center justify-between gap-2"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs flex-shrink-0" style={{ color: "var(--color-dim)" }}>
            {item.eq}
          </span>
          <span className="font-medium text-sm truncate" style={{ color: "var(--color-bright)" }}>
            {item.n}
          </span>
          {item.ap !== undefined && item.ap > 0 && (
            <span className="text-xs flex-shrink-0" style={{ color: accent }}>
              {item.ap} AP
            </span>
          )}
          {item.ef && (
            <span className="text-xs flex-shrink-0 hidden sm:inline" style={{ color: "var(--color-purple)" }}>
              {item.ef}
            </span>
          )}
          {item.wt !== undefined && (
            <span className="text-xs flex-shrink-0 hidden sm:inline" style={{ color: "var(--color-dim)" }}>
              {item.wt} wt
            </span>
          )}
        </div>
        <span
          className="text-xs flex-shrink-0 transition-transform"
          style={{ color: "var(--color-dim)", transform: expanded ? "rotate(180deg)" : "none" }}
        >
          ▾
        </span>
      </button>

      {expanded && (
        <div
          className="px-3 pb-3 pt-1 border-t space-y-1"
          style={{ borderColor: "#2a2318" }}
        >
          {item.d && (
            <p className="text-xs" style={{ color: "var(--color-dim)" }}>{item.d}</p>
          )}
          {item.ef && (
            <p className="text-xs sm:hidden" style={{ color: "var(--color-purple)" }}>
              Effect: {item.ef}
            </p>
          )}
          {item.loc && (
            <div className="flex gap-2 text-xs">
              <span style={{ color: "var(--color-gold)" }} className="flex-shrink-0">📍 Loc:</span>
              <span style={{ color: "var(--color-text)" }}>{item.loc}</span>
            </div>
          )}
          {item.up && (
            <div className="flex gap-2 text-xs">
              <span style={{ color: "var(--color-gold)" }} className="flex-shrink-0">⬆ Up:</span>
              <span style={{ color: "var(--color-text)" }}>{item.up}</span>
            </div>
          )}
          {item.tip && (
            <div
              className="flex gap-2 text-xs mt-1 pt-1"
              style={{ borderTop: "1px solid #2a2318" }}
            >
              <span style={{ color: accent }} className="flex-shrink-0">💡</span>
              <span style={{ color: "var(--color-dim)" }}>{item.tip}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
