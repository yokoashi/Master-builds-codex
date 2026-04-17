import { useState } from "react";
import type { Item } from "@shared/types";
import { hexToRgba } from "@/lib/utils";

interface Props { item: Item; accent: string; }

export default function ItemCard({ item, accent }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-lg overflow-hidden transition-all"
      style={{
        background: "var(--color-card-hi)",
        border: `1px solid ${expanded ? hexToRgba(accent, 0.2) : "#242018"}`,
        boxShadow: expanded ? `0 0 12px ${hexToRgba(accent, 0.08)}` : "none",
      }}
      data-testid={`item-card-${(item.n ?? "").replace(/\s+/g, "-").toLowerCase()}`}
    >
      <button
        className="w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-all"
        style={{ background: expanded ? hexToRgba(accent, 0.04) : "transparent" }}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Slot badge */}
          <span
            className="text-xs flex-shrink-0 px-1.5 py-0.5 rounded font-medium"
            style={{
              background: "#1a1712",
              border: "1px solid #2e2820",
              color: "var(--color-dim2)",
              fontSize: "0.6rem",
              letterSpacing: "0.06em",
              maxWidth: 52,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.eq}
          </span>

          {/* Name */}
          <span className="font-semibold text-sm truncate" style={{ color: "var(--color-bright)" }}>
            {item.n}
          </span>

          {/* AP badge */}
          {item.ap !== undefined && item.ap > 0 && (
            <span
              className="text-xs flex-shrink-0 font-mono font-bold"
              style={{ color: accent }}
            >
              {item.ap}
            </span>
          )}

          {/* Effect */}
          {item.ef && (
            <span className="text-xs flex-shrink-0 hidden sm:inline truncate max-w-[100px]" style={{ color: "var(--color-purple)", opacity: 0.85 }}>
              {item.ef}
            </span>
          )}

          {/* Weight */}
          {item.wt !== undefined && (
            <span className="text-xs flex-shrink-0 hidden sm:inline" style={{ color: "var(--color-dim2)" }}>
              {item.wt}wt
            </span>
          )}
        </div>

        <span
          className="text-xs flex-shrink-0 transition-transform duration-200"
          style={{
            color: expanded ? accent : "var(--color-dim2)",
            transform: expanded ? "rotate(180deg)" : "none",
          }}
        >
          ▾
        </span>
      </button>

      {expanded && (
        <div
          className="item-expand px-3.5 pb-3.5 pt-2 border-t space-y-2"
          style={{ borderColor: hexToRgba(accent, 0.12) }}
        >
          {/* Description */}
          {item.d && (
            <p className="text-xs leading-relaxed" style={{ color: "var(--color-dim)" }}>{item.d}</p>
          )}

          {/* Effect (small screens) */}
          {item.ef && (
            <p className="text-xs sm:hidden" style={{ color: "var(--color-purple)" }}>
              Effect: {item.ef}
            </p>
          )}

          {/* Info rows */}
          <div className="grid grid-cols-1 gap-1.5">
            {item.loc && (
              <InfoRow icon="📍" label="Location" value={item.loc} accent={accent} />
            )}
            {item.up && (
              <InfoRow icon="⬆" label="Upgrade" value={item.up} accent={accent} />
            )}
          </div>

          {/* Tip */}
          {item.tip && (
            <div
              className="flex gap-2 text-xs mt-1 pt-2 leading-relaxed"
              style={{ borderTop: `1px solid ${hexToRgba(accent, 0.1)}` }}
            >
              <span style={{ color: accent, flexShrink: 0, marginTop: 1 }}>💡</span>
              <span style={{ color: "var(--color-dim)" }}>{item.tip}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value, accent }: { icon: string; label: string; value: string; accent: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span style={{ color: hexToRgba(accent, 0.7), flexShrink: 0 }}>{icon} {label}:</span>
      <span style={{ color: "var(--color-text)" }}>{value}</span>
    </div>
  );
}
