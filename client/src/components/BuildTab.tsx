import { useState, useEffect } from "react";
import type { Build, Game, Phase } from "@shared/types";
import { cn, hexToRgba } from "@/lib/utils";
import ItemCard from "./ItemCard";
import StatBar from "./StatBar";

// Phase 4 names used in navigation
const PHASE_ICONS: Record<string, string> = {
  "Early Game": "I",
  "Mid Game": "II",
  "End Game": "III",
  "NG+": "NG+",
};

interface Props {
  build: Build;
  game: Game | null;
}

export default function BuildTab({ build, game }: Props) {
  const [activePhase, setActivePhase] = useState(0);
  const [activeNg, setActiveNg] = useState(0);

  useEffect(() => {
    setActivePhase(0);
    setActiveNg(0);
  }, [build.key]);

  const accent = build.accent ?? "#d64545";
  const accentBg = hexToRgba(accent, 0.08);
  const accentBorder = hexToRgba(accent, 0.3);

  const phases = build.phases ?? [];
  const phase: Phase | undefined = phases[activePhase];
  const ngCycles = phase?.ngCycles ?? [];
  const activeCycle = ngCycles[activeNg];

  const softCaps = game?.softCaps ?? {};

  const sectionItems = phase
    ? [
        { label: "Weapons", items: phase.weapons ?? [] },
        { label: "Armor", items: phase.armor ?? [] },
        { label: "Rings & Accessories", items: phase.acc ?? [] },
        { label: "Spells", items: phase.spells ?? [] },
      ].filter((s) => s.items.length > 0)
    : [];

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      {/* Hero card */}
      <div
        className="rounded-lg p-4"
        style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
        data-testid="build-hero-card"
      >
        <div className="flex items-start gap-3">
          <span className="text-3xl">{build.icon}</span>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-xl font-bold" style={{ color: "var(--color-bright)" }}>
              {build.label}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--color-dim)" }}>{build.sub}</p>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--color-text)" }}>
              {build.playstyle}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {build.cls && (
                <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--color-card-2)", color: "var(--color-dim)" }}>
                  {build.cls}
                </span>
              )}
              {build.caps?.map((c) => (
                <span key={c} className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: accentBg, color: accent, border: `1px solid ${accentBorder}` }}>
                  {c}
                </span>
              ))}
            </div>
            {build.weaponReq && build.weaponReq.length > 0 && (
              <p className="text-xs mt-2" style={{ color: "var(--color-dim)" }}>
                Requirements: {build.weaponReq.join(" · ")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Phase navigation */}
      {phases.length > 0 && (
        <div>
          <div className="flex flex-wrap gap-1 mb-3">
            {phases.map((p, i) => (
              <button
                key={i}
                onClick={() => { setActivePhase(i); setActiveNg(0); }}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-semibold transition-all",
                  activePhase === i ? "phase-btn-active" : "opacity-50 hover:opacity-80"
                )}
                style={{
                  color: activePhase === i ? accent : "var(--color-text)",
                  backgroundColor: activePhase === i ? accentBg : "var(--color-card-hi)",
                  border: `1px solid ${activePhase === i ? accentBorder : "transparent"}`,
                }}
                data-testid={`phase-btn-${i}`}
              >
                {PHASE_ICONS[p.name] ?? String(i + 1)} {p.name}
              </button>
            ))}
          </div>

          {/* NG+ cycle selector */}
          {ngCycles.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3 pl-2">
              {ngCycles.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setActiveNg(i)}
                  className={cn(
                    "px-2 py-1 rounded text-xs transition-all",
                    activeNg === i ? "opacity-100" : "opacity-40 hover:opacity-70"
                  )}
                  style={{
                    color: "var(--color-gold)",
                    backgroundColor: activeNg === i ? hexToRgba(accent, 0.12) : "var(--color-card-hi)",
                    border: `1px solid ${activeNg === i ? hexToRgba(accent, 0.3) : "transparent"}`,
                  }}
                  data-testid={`ng-cycle-btn-${i}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {phase && (
        <>
          {/* Phase header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold" style={{ color: "var(--color-bright)" }}>
                {phase.name}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: accent }}>{phase.range}</p>
            </div>
            {phase.dmg && (
              <div className="text-right text-xs" style={{ color: "var(--color-dim)" }} data-testid="damage-summary">
                <div><span className="font-mono font-bold" style={{ color: accent }}>{phase.dmg.ps}</span> 1H</div>
                <div><span className="font-mono font-bold" style={{ color: accent }}>{phase.dmg.bs}</span> BS</div>
              </div>
            )}
          </div>

          {/* Phase note */}
          {phase.sn && (
            <div
              className="px-3 py-2.5 rounded text-sm leading-relaxed"
              style={{ backgroundColor: "var(--color-card-hi)", borderLeft: `2px solid ${accent}` }}
              data-testid="phase-note"
            >
              {phase.sn}
            </div>
          )}

          {/* NG+ cycle notes (if selected) */}
          {activeCycle && (
            <div
              className="px-3 py-2.5 rounded text-sm leading-relaxed"
              style={{ backgroundColor: hexToRgba(accent, 0.07), border: `1px solid ${hexToRgba(accent, 0.2)}` }}
            >
              <p className="text-xs font-medium mb-1" style={{ color: accent }}>{activeCycle.label}</p>
              <p style={{ color: "var(--color-text)" }}>{activeCycle.notes}</p>
            </div>
          )}

          {/* Stats */}
          {phase.stats && Object.keys(phase.stats).length > 0 && (
            <div>
              <div className="section-label mb-2">Stats at {phase.range}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                {Object.entries(activeCycle?.stats ?? phase.stats).map(([stat, val]) => (
                  <StatBar
                    key={stat}
                    stat={stat}
                    value={val as number}
                    max={game?.statMax ?? 99}
                    accent={accent}
                    softCap={softCaps[stat] ?? null}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Item sections */}
          {sectionItems.map(({ label, items }) => (
            <div key={label}>
              <div className="section-label mb-2">{label}</div>
              <div className="space-y-1.5">
                {items.map((item, i) => (
                  <ItemCard key={i} item={item} accent={accent} />
                ))}
              </div>
            </div>
          ))}

          {/* Damage context */}
          {phase.dmg?.n && (
            <div
              className="px-3 py-2.5 rounded text-xs leading-relaxed"
              style={{ backgroundColor: "var(--color-card-hi)", color: "var(--color-dim)" }}
            >
              <span className="font-medium" style={{ color: "var(--color-dim)" }}>Damage note: </span>
              {phase.dmg.n}
            </div>
          )}
        </>
      )}

      {phases.length === 0 && (
        <div className="text-center py-10" style={{ color: "var(--color-dim)" }}>
          <p className="text-sm">No phases available for this build.</p>
        </div>
      )}
    </div>
  );
}
