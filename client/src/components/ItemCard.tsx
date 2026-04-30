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
      className="rounded-lg overflow-hidden transition-all"
      style={{
        background: "var(--color-card-hi)",
        border: `1px solid ${expanded ? hexToRgba(accent, 0.25) : "var(--color-card-2)"}`,
        boxShadow: expanded ? `0 0 12px ${hexToRgba(accent, 0.08)}` : "none",
      }}
      data-testid={`item-card-${(item.n ?? "").replace(/\s+/g, "-").toLowerCase()}`}
    >
      {/* Header row — always visible */}
      <button
        className="w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3"
        style={{ background: expanded ? hexToRgba(accent, 0.04) : "transparent" }}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Slot badge */}
          <span
            className="flex-shrink-0 px-1.5 py-0.5 rounded font-medium truncate"
            style={{
              background: "var(--color-card-2)",
              color: "var(--color-dim2)",
              fontSize: "0.58rem",
              letterSpacing: "0.06em",
              maxWidth: 60,
            }}
          >
            {item.eq}
          </span>

          {/* Name */}
          <span className="font-semibold text-sm truncate" style={{ color: "var(--color-bright)" }}>
            {item.n}
          </span>

          {/* AP */}
          {item.ap !== undefined && item.ap > 0 && (
            <span className="flex-shrink-0 text-xs font-mono font-bold" style={{ color: accent }}>
              {item.ap} AR
            </span>
          )}

          {/* Weight */}
          {item.wt !== undefined && (
            <span className="flex-shrink-0 text-[10px] hidden sm:inline" style={{ color: "var(--color-dim2)" }}>
              {item.wt}wt
            </span>
          )}

          {/* Effect */}
          {item.ef && (
            <span className="flex-shrink-0 text-[10px] hidden md:inline truncate max-w-[120px]" style={{ color: "var(--color-purple)", opacity: 0.85 }}>
              {item.ef}
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

      {/* Expanded content */}
      {expanded && (
        <div
          className="item-expand px-3.5 pb-3.5 pt-2 border-t space-y-2.5"
          style={{ borderColor: hexToRgba(accent, 0.15) }}
        >
          {/* Role in build */}
          {item.d && (
            <p className="text-xs leading-relaxed" style={{ color: "var(--color-dim)" }}>
              {item.d}
            </p>
          )}

          {/* Mobile: effect + status */}
          {(item.ef || item.st) && (
            <div className="flex gap-3 text-xs sm:hidden">
              {item.ef && <span style={{ color: "var(--color-purple)" }}>✦ {item.ef}</span>}
              {item.st && <span style={{ color: "var(--color-crimson)" }}>⚡ {item.st}</span>}
            </div>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-1 gap-1.5">
            {/* Show steps instead of plain loc when available */}
            {item.steps && item.steps.length > 0 ? (
              <div>
                <div className="flex gap-1.5 items-center mb-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ backgroundColor: hexToRgba(accent, 0.18), color: accent }}>
                    QUESTLINE
                  </span>
                </div>
                <ol className="space-y-1.5">
                  {item.steps.map((step, i) => (
                    <li key={i} className="flex gap-2 text-xs leading-relaxed">
                      <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                        style={{ backgroundColor: hexToRgba(accent, 0.18), color: accent }}>
                        {i + 1}
                      </span>
                      <span style={{ color: "var(--color-text)" }}>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              item.loc && <InfoRow icon="📍" label="Location" value={item.loc} accent={accent} />
            )}
            {item.up && <InfoRow icon="⬆" label="Upgrade" value={item.up} accent={accent} />}
            {item.durability !== undefined && (
              <InfoRow icon="🛡" label="Durability" value={String(item.durability)} accent={accent} />
            )}
            {item.ap !== undefined && item.ap > 0 && (
              <InfoRow icon="⚔" label="AR at this upgrade" value={String(item.ap)} accent={accent} />
            )}
            {item.st && (
              <InfoRow icon="⚡" label="Status" value={item.st} accent={accent} />
            )}
          </div>

          {/* Lore */}
          {item.lore && (
            <div
              className="px-2.5 py-2 rounded text-xs italic leading-relaxed"
              style={{ background: hexToRgba(accent, 0.05), color: "var(--color-dim)", borderLeft: `2px solid ${hexToRgba(accent, 0.3)}` }}
            >
              {item.lore}
            </div>
          )}

          {/* Tip */}
          {item.tip && (
            <div
              className="flex gap-2 text-xs leading-relaxed pt-2"
              style={{ borderTop: `1px solid ${hexToRgba(accent, 0.1)}` }}
            >
              <span style={{ color: accent, flexShrink: 0 }}>💡</span>
              <span style={{ color: "var(--color-text)" }}>{item.tip}</span>
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
      <span className="flex-shrink-0" style={{ color: hexToRgba(accent, 0.7) }}>{icon} {label}:</span>
      <span style={{ color: "var(--color-text)" }}>{value}</span>
    </div>
  );
}
