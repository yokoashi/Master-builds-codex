import { useState } from "react";
import type { Variant } from "@shared/types";
import { hexToRgba } from "@/lib/utils";

interface Props {
  variant: Variant;
  accentOverride?: string;
}

export default function VariantCard({ variant, accentOverride }: Props) {
  const [expanded, setExpanded] = useState(false);
  const accent = accentOverride ?? variant.a;

  return (
    <div
      className="rounded-lg"
      style={{ background: "var(--color-card)", border: `1px solid ${hexToRgba(accent, 0.3)}` }}
      data-testid={`variant-card-${variant.label.replace(/\s+/g, "-").toLowerCase()}`}
    >
      <button
        className="w-full text-left p-4"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: hexToRgba(accent, 0.12), border: `1px solid ${hexToRgba(accent, 0.3)}` }}
          >
            {variant.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-sm" style={{ color: "var(--color-bright)" }}>
                {variant.label}
              </h3>
              <span className="text-xs" style={{ color: accent }}>{variant.cls}</span>
            </div>
            <p className="text-xs mb-1" style={{ color: accent }}>{variant.sub}</p>
            <p className="text-xs" style={{ color: "var(--color-dim)" }}>{variant.why}</p>
          </div>
          <span
            className="text-xs flex-shrink-0 transition-transform mt-1"
            style={{ color: "var(--color-dim)", transform: expanded ? "rotate(180deg)" : "none" }}
          >
            ▾
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: hexToRgba(accent, 0.2) }}>
          {/* 3 condensed phases */}
          <div className="grid grid-cols-3 gap-2 mt-3 mb-3">
            {(variant.ph ?? []).map((ph, i) => (
              <div
                key={i}
                className="rounded p-2 text-xs"
                style={{ background: "var(--color-card-hi)", border: "1px solid #2a2318" }}
              >
                <p className="font-medium mb-1" style={{ color: accent }}>{ph.name}</p>
                {Object.entries(ph.stats ?? {}).map(([k, v]) => (
                  <p key={k} style={{ color: "var(--color-dim)" }}>{k}: {v}</p>
                ))}
                {(ph.weapons ?? []).map((w) => (
                  <p key={w} className="mt-1" style={{ color: "var(--color-text)" }}>⚔ {w}</p>
                ))}
              </div>
            ))}
          </div>

          {/* Key items */}
          {(variant.key ?? []).length > 0 && (
            <div className="mb-3">
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--color-dim)" }}>
                Key Items
              </p>
              <div className="flex flex-wrap gap-1">
                {(variant.key ?? []).map((k) => (
                  <span
                    key={k}
                    className="px-2 py-0.5 rounded text-xs"
                    style={{ background: hexToRgba(accent, 0.08), border: `1px solid ${hexToRgba(accent, 0.2)}`, color: "var(--color-text)" }}
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Steps */}
          {(variant.steps ?? []).length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--color-dim)" }}>
                Path
              </p>
              <ol className="space-y-0.5">
                {(variant.steps ?? []).map((step, i) => (
                  <li key={i} className="text-xs flex gap-2" style={{ color: "var(--color-dim)" }}>
                    <span style={{ color: accent }} className="flex-shrink-0">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
