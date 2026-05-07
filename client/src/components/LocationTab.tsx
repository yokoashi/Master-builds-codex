import { useState } from "react";
import type { Build, Phase, Item } from "@shared/types";
import { hexToRgba } from "@/lib/utils";

interface Props {
  build: Build;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

function allPhaseItems(phase: Phase): Item[] {
  return [
    ...(phase.weapons ?? []),
    ...(phase.armor  ?? []),
    ...(phase.acc    ?? []),
    ...(phase.spells ?? []),
  ].filter((it) => it.loc && it.loc.trim().length > 0);
}

function ItemLocCard({ item, accent, index }: { item: Item; accent: string; index: number }) {
  const [open, setOpen] = useState(false);
  const hasSteps = item.steps && item.steps.length > 0;

  return (
    <div
      className="rounded overflow-hidden transition-all"
      style={{
        border: `1px solid ${open ? hexToRgba(accent, 0.3) : "var(--color-border)"}`,
        backgroundColor: "var(--color-card-hi)",
      }}
    >
      <button
        className="w-full flex items-start gap-3 px-3.5 py-2.5 text-left"
        onClick={() => setOpen(!open)}
      >
        {/* Index badge */}
        <div
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
          style={{ backgroundColor: hexToRgba(accent, 0.15), color: accent, border: `1px solid ${hexToRgba(accent, 0.3)}` }}
        >
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: "var(--color-bright)" }}>{item.n}</span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "var(--color-card-2)", color: "var(--color-dim)" }}
            >
              {item.eq}
            </span>
            {hasSteps && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                style={{ backgroundColor: hexToRgba(accent, 0.15), color: accent }}
              >
                QUESTLINE
              </span>
            )}
          </div>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--color-text)" }}>
            {item.loc}
          </p>
        </div>

        {hasSteps && (
          <span
            className="flex-shrink-0 text-xs transition-transform duration-200 mt-1"
            style={{ color: accent, transform: open ? "rotate(180deg)" : "none" }}
          >
            ▾
          </span>
        )}
      </button>

      {open && hasSteps && (
        <div
          className="px-3.5 pb-3.5 pt-2 border-t space-y-2"
          style={{ borderColor: hexToRgba(accent, 0.15) }}
        >
          <p className="text-[9px] uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: "var(--color-dim)" }}>
            Step-by-step acquisition
          </p>
          <ol className="space-y-2">
            {item.steps!.map((step, i) => (
              <li key={i} className="flex gap-2.5 text-xs leading-relaxed">
                <div
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold mt-px"
                  style={{ backgroundColor: hexToRgba(accent, 0.2), color: accent }}
                >
                  {i + 1}
                </div>
                <span style={{ color: "var(--color-text)" }}>{step}</span>
              </li>
            ))}
          </ol>
          {item.tip && (
            <div
              className="mt-2.5 px-3 py-2 rounded text-xs"
              style={{
                backgroundColor: hexToRgba(accent, 0.06),
                borderLeft: `2px solid ${hexToRgba(accent, 0.4)}`,
                color: "var(--color-dim2)",
              }}
            >
              <span className="font-semibold" style={{ color: accent }}>Tip: </span>
              {item.tip}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PhaseLocationSection({
  phase,
  phaseIndex,
  accent,
  defaultOpen,
}: {
  phase: Phase;
  phaseIndex: number;
  accent: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const items = allPhaseItems(phase);
  const hasPath = phase.areaPath && phase.areaPath.length > 0;
  const hasBosses = phase.keyBosses && phase.keyBosses.length > 0;
  const hasItems = items.length > 0;
  const label = ROMAN[phaseIndex] ?? String(phaseIndex + 1);
  const isNg = /ng\+|new.?game/i.test(phase.name);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: `1px solid ${open ? hexToRgba(accent, 0.25) : "var(--color-border)"}` }}
    >
      {/* Section header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-all"
        style={{ backgroundColor: open ? hexToRgba(accent, 0.06) : "var(--color-card-hi)" }}
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded flex items-center justify-center font-display text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: hexToRgba(accent, 0.15), color: accent, border: `1px solid ${hexToRgba(accent, 0.3)}` }}
          >
            {isNg ? "NG" : label}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--color-bright)" }}>
              {phase.chapter ?? phase.name}
            </p>
            <p className="text-[10px]" style={{ color: "var(--color-dim)" }}>
              {phase.name} · {phase.range}
              {hasPath && (
                <span
                  className="ml-2 px-1.5 py-px rounded text-[8px] font-semibold"
                  style={{ backgroundColor: hexToRgba(accent, 0.12), color: accent }}
                >
                  NAV GUIDE
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 text-[9px]" style={{ color: "var(--color-dim)" }}>
            {hasItems && <span>{items.length} items</span>}
            {hasBosses && <span>{phase.keyBosses!.length} bosses</span>}
          </div>
          <span
            className="text-xs transition-transform duration-200"
            style={{ color: "var(--color-dim2)", transform: open ? "rotate(180deg)" : "none" }}
          >
            ▾
          </span>
        </div>
      </button>

      {open && (
        <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>

          {/* ── Navigation path ─────────────────────────────────────────── */}
          {hasPath && (
            <div className="px-4 py-4">
              <p
                className="text-[9px] uppercase tracking-[0.22em] font-semibold mb-3 flex items-center gap-2"
                style={{ color: "var(--color-dim)" }}
              >
                <span style={{ color: accent }}>◈</span> How to get here
              </p>
              <ol className="space-y-0">
                {phase.areaPath!.map((step, i) => (
                  <li key={i} className="flex gap-3 relative">
                    {i < phase.areaPath!.length - 1 && (
                      <div
                        className="absolute top-[28px] bottom-0 w-px"
                        style={{ left: 13, background: hexToRgba(accent, 0.2) }}
                      />
                    )}
                    <div
                      className="flex-shrink-0 w-[26px] h-[26px] rounded-full flex items-center justify-center text-[9px] font-bold z-10 mt-0.5"
                      style={{
                        background: hexToRgba(accent, 0.15),
                        color: accent,
                        border: `1px solid ${hexToRgba(accent, 0.35)}`,
                      }}
                    >
                      {i + 1}
                    </div>
                    <p className="text-sm leading-relaxed pb-3 pt-0.5" style={{ color: "var(--color-text)" }}>
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* ── Key boss locations ──────────────────────────────────────── */}
          {hasBosses && (
            <div className="px-4 py-4">
              <p
                className="text-[9px] uppercase tracking-[0.22em] font-semibold mb-3 flex items-center gap-2"
                style={{ color: "var(--color-dim)" }}
              >
                <span style={{ color: accent }}>⚔</span> Key encounters
              </p>
              <div className="space-y-2">
                {phase.keyBosses!.map((boss, i) => {
                  const [name, ...rest] = boss.split(" — ");
                  return (
                    <div
                      key={i}
                      className="px-3 py-2.5 rounded"
                      style={{
                        backgroundColor: hexToRgba(accent, 0.04),
                        border: `1px solid ${hexToRgba(accent, 0.14)}`,
                      }}
                    >
                      <p className="text-xs font-semibold mb-0.5" style={{ color: accent }}>{name}</p>
                      {rest.length > 0 && (
                        <p className="text-xs leading-relaxed" style={{ color: "var(--color-text)" }}>
                          {rest.join(" — ")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Item locations ─────────────────────────────────────────── */}
          {hasItems && (
            <div className="px-4 py-4">
              <p
                className="text-[9px] uppercase tracking-[0.22em] font-semibold mb-3 flex items-center gap-2"
                style={{ color: "var(--color-dim)" }}
              >
                <span style={{ color: accent }}>✦</span> Item locations
                <span
                  className="ml-1 text-[8px] px-1.5 py-px rounded"
                  style={{ backgroundColor: "var(--color-card-2)", color: "var(--color-dim)" }}
                >
                  tap QUESTLINE items to expand step guide
                </span>
              </p>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <ItemLocCard key={i} item={item} accent={accent} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!hasPath && !hasBosses && !hasItems && (
            <div className="px-4 py-8 text-center">
              <p className="text-xs" style={{ color: "var(--color-dim)" }}>
                No location data — generate a new build to populate this section.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LocationTab({ build }: Props) {
  const accent = build.accent ?? "var(--color-accent)";
  const phases = build.phases ?? [];

  if (phases.length === 0) {
    return (
      <div className="flex items-center justify-center py-24" style={{ color: "var(--color-dim)" }}>
        <p className="text-sm">No phases available for this build.</p>
      </div>
    );
  }

  const totalItems = phases.reduce((acc, p) => acc + allPhaseItems(p).length, 0);
  const phasesWithPath = phases.filter((p) => p.areaPath?.length).length;

  return (
    <div className="animate-fade-in px-6 py-5 space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-bold mb-1" style={{ color: "var(--color-bright)" }}>
            Location Guide
          </h3>
          <p className="text-xs" style={{ color: "var(--color-dim)" }}>
            Navigation paths, item pickup locations, and boss encounter spots — phase by phase.
          </p>
        </div>
        <div className="flex gap-4 text-center flex-shrink-0">
          <div>
            <p className="font-mono font-bold text-xl leading-none" style={{ color: accent }}>{totalItems}</p>
            <p className="text-[8px] uppercase tracking-[0.2em] mt-1" style={{ color: "var(--color-dim)" }}>Items</p>
          </div>
          <div>
            <p className="font-mono font-bold text-xl leading-none" style={{ color: accent }}>{phasesWithPath}</p>
            <p className="text-[8px] uppercase tracking-[0.2em] mt-1" style={{ color: "var(--color-dim)" }}>Nav guides</p>
          </div>
        </div>
      </div>

      {/* No AI data notice */}
      {phasesWithPath === 0 && (
        <div
          className="px-4 py-3 rounded text-sm"
          style={{
            backgroundColor: hexToRgba(accent, 0.04),
            border: `1px solid ${hexToRgba(accent, 0.15)}`,
            borderLeft: `3px solid ${hexToRgba(accent, 0.4)}`,
            color: "var(--color-dim2)",
          }}
        >
          <span className="not-italic mr-2" style={{ color: accent }}>◈</span>
          Navigation guides are generated for new AI builds. Existing builds still show item locations below.
        </div>
      )}

      {/* Phase sections */}
      <div className="space-y-3">
        {phases.map((phase, i) => (
          <PhaseLocationSection
            key={i}
            phase={phase}
            phaseIndex={i}
            accent={accent}
            defaultOpen={i === 0}
          />
        ))}
      </div>
    </div>
  );
}
