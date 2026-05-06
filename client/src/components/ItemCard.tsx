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
      className="rounded overflow-hidden transition-all"
      style={{
        background: "var(--color-card-hi)",
        border: `1px solid ${expanded ? hexToRgba(accent, 0.28) : "var(--color-border)"}`,
        boxShadow: expanded ? `0 0 16px ${hexToRgba(accent, 0.06)}` : "none",
      }}
      data-testid={`item-card-${(item.n ?? "").replace(/\s+/g, "-").toLowerCase()}`}
    >
      {/* Header row */}
      <button
        className="w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3"
        style={{ background: expanded ? hexToRgba(accent, 0.04) : "transparent" }}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Slot badge */}
          <span
            className="flex-shrink-0 text-[8px] px-1.5 py-0.5 rounded uppercase tracking-widest font-semibold"
            style={{
              background: "var(--color-card-2)",
              color: "var(--color-dim2)",
              maxWidth: 56,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.eq}
          </span>

          {/* Questline badge */}
          {item.steps && item.steps.length > 0 && (
            <span
              className="flex-shrink-0 text-[8px] px-1.5 py-0.5 rounded uppercase tracking-widest font-bold"
              style={{ backgroundColor: hexToRgba(accent, 0.16), color: accent }}
            >
              Questline
            </span>
          )}

          {/* Infusion badge (DS3) */}
          {item.inf && item.inf !== "None" && (
            <span
              className="flex-shrink-0 text-[8px] px-1.5 py-0.5 rounded uppercase tracking-widest font-semibold"
              style={{ background: "var(--color-card-2)", color: "var(--color-gold)" }}
            >
              {item.inf}
            </span>
          )}

          {/* Name */}
          <span
            className="font-semibold text-sm truncate"
            style={{ color: "var(--color-bright)", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}
          >
            {item.n}
          </span>
        </div>

        {/* Right side stats */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {item.ap !== undefined && item.ap > 0 && (
            <span className="text-xs font-mono font-bold" style={{ color: accent }}>
              {item.ap}
            </span>
          )}
          {item.wt !== undefined && (
            <span className="text-[10px] hidden sm:inline" style={{ color: "var(--color-dim2)" }}>
              {item.wt}
            </span>
          )}
          <span
            className="text-xs flex-shrink-0 transition-transform duration-200"
            style={{ color: expanded ? accent : "var(--color-dim2)", transform: expanded ? "rotate(180deg)" : "none" }}
          >
            ▾
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div
          className="item-expand px-3.5 pb-4 pt-3 border-t"
          style={{ borderColor: hexToRgba(accent, 0.14) }}
        >
          {/* Role in build */}
          {item.d && (
            <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--color-dim)" }}>
              {item.d}
            </p>
          )}

          {/* Effect / status (mobile) */}
          {(item.ef || item.st) && (
            <div className="flex flex-wrap gap-3 text-xs mb-3 sm:hidden">
              {item.ef && <span style={{ color: "var(--color-purple)" }}>✦ {item.ef}</span>}
              {item.st && <span style={{ color: "var(--color-crimson)" }}>⚡ {item.st}</span>}
            </div>
          )}

          {/* Questline steps — timeline style */}
          {item.steps && item.steps.length > 0 ? (
            <div className="mb-3">
              <p className="text-[8px] uppercase tracking-[0.22em] font-semibold mb-2.5" style={{ color: "var(--color-dim)" }}>
                Questline · {item.n}
              </p>
              <ol className="space-y-0">
                {item.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 relative">
                    {i < item.steps!.length - 1 && (
                      <div className="ql-step-line" style={{ background: "var(--color-border)" }} />
                    )}
                    <div
                      className="ql-step-dot flex-shrink-0 mt-px"
                      style={{ borderColor: hexToRgba(accent, 0.5), color: accent, background: "var(--color-card)" }}
                    >
                      {i + 1}
                    </div>
                    <p className="text-xs leading-relaxed pb-3" style={{ color: "var(--color-text)" }}>{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            item.loc && (
              <div className="flex gap-2 text-xs mb-2.5">
                <span className="flex-shrink-0" style={{ color: hexToRgba(accent, 0.7) }}>📍</span>
                <span style={{ color: "var(--color-text)" }}>{item.loc}</span>
              </div>
            )
          )}

          {/* Weapon Art (DS3) */}
          {item.wa && (
            <div className="flex gap-2 text-xs mb-2.5">
              <span className="flex-shrink-0" style={{ color: hexToRgba(accent, 0.7) }}>⚔</span>
              <span style={{ color: "var(--color-text)" }}>
                <span style={{ color: "var(--color-dim)" }}>Weapon Art: </span>
                {item.wa}
                {item.fp !== undefined && item.fp > 0 && (
                  <span className="ml-2 font-mono" style={{ color: "var(--color-purple)" }}>({item.fp} FP)</span>
                )}
              </span>
            </div>
          )}

          {/* Upgrade path */}
          {item.up && item.up !== "—" && item.up !== "N/A" && (
            <div className="flex gap-2 text-xs mb-2.5">
              <span className="flex-shrink-0" style={{ color: hexToRgba(accent, 0.7) }}>⬆</span>
              <span style={{ color: "var(--color-text)" }}>{item.up}</span>
            </div>
          )}

          {/* Inline stats */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2.5">
            {item.ap !== undefined && item.ap > 0 && (
              <span className="text-[10px]">
                <span style={{ color: "var(--color-dim)" }}>AR: </span>
                <span className="font-mono font-bold" style={{ color: accent }}>{item.ap}</span>
              </span>
            )}
            {item.wt !== undefined && (
              <span className="text-[10px]">
                <span style={{ color: "var(--color-dim)" }}>Wt: </span>
                <span style={{ color: "var(--color-text)" }}>{item.wt}</span>
              </span>
            )}
            {item.durability !== undefined && (
              <span className="text-[10px]">
                <span style={{ color: "var(--color-dim)" }}>Dur: </span>
                <span style={{ color: "var(--color-text)" }}>{item.durability}</span>
              </span>
            )}
            {item.inf && item.inf !== "None" && (
              <span className="text-[10px]">
                <span style={{ color: "var(--color-dim)" }}>Infusion: </span>
                <span style={{ color: "var(--color-gold)" }}>{item.inf}</span>
              </span>
            )}
            {item.st && (
              <span className="text-[10px]">
                <span style={{ color: "var(--color-dim)" }}>Status: </span>
                <span style={{ color: "var(--color-crimson)" }}>{item.st}</span>
              </span>
            )}
            {item.ef && (
              <span className="text-[10px] hidden sm:inline">
                <span style={{ color: "var(--color-dim)" }}>Effect: </span>
                <span style={{ color: "var(--color-purple)" }}>{item.ef}</span>
              </span>
            )}
          </div>

          {/* Lore */}
          {item.lore && (
            <div
              className="px-3 py-2 rounded text-[11px] italic leading-relaxed mb-2.5"
              style={{ background: hexToRgba(accent, 0.04), color: "var(--color-dim)", borderLeft: `2px solid ${hexToRgba(accent, 0.3)}` }}
            >
              "{item.lore}"
            </div>
          )}

          {/* Tip */}
          {item.tip && (
            <div
              className="flex gap-2 text-xs leading-relaxed pt-2.5"
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
