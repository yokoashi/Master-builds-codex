import { useState, useEffect, Component } from "react";
import type { Build, Game, Phase, Item, NgCycle } from "@shared/types";
import { cn, hexToRgba, statGain } from "@/lib/utils";
import ItemCard from "./ItemCard";
import StatBar from "./StatBar";

class BuildErrorBoundary extends Component<
  { children: React.ReactNode; accent: string; buildKey: string },
  { error: string | null }
> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  componentDidUpdate(prevProps: { buildKey: string }) {
    if (prevProps.buildKey !== this.props.buildKey && this.state.error) {
      this.setState({ error: null });
    }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-lg p-6 text-sm" style={{ background: "var(--color-card)", border: `1px solid ${hexToRgba(this.props.accent, 0.3)}` }}>
          <p style={{ color: "var(--color-crimson)" }} className="font-semibold mb-2">⚠ Build display error</p>
          <p style={{ color: "var(--color-dim)" }}>{this.state.error}</p>
          <p className="mt-3 text-xs" style={{ color: "var(--color-dim)" }}>Try deleting and regenerating this build.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

interface Props { build: Build; game: Game; onDelete: () => void; }

const PHASE_NAMES = ["Early Game", "Core Weapon", "Key Accessories", "Unlock Spells", "Mid-to-Late", "Endgame", "NG+"];

function BuildTabInner({ build, game, onDelete }: Props) {
  const [activePhase, setActivePhase] = useState(0);
  const [activeNg, setActiveNg] = useState(0);
  const [activeLoadout, setActiveLoadout] = useState(0);

  useEffect(() => {
    setActivePhase(0);
    setActiveNg(0);
    setActiveLoadout(0);
  }, [build.key]);

  const accent = build.accent;
  const accentBg = hexToRgba(accent, 0.1);
  const accentBorder = hexToRgba(accent, 0.35);
  const accentGlow = hexToRgba(accent, 0.2);

  const safePhaseIdx = Math.min(activePhase, (build.phases?.length ?? 1) - 1);
  const phase: Phase = build.phases[safePhaseIdx];
  const safeLoadoutIdx = Math.min(activeLoadout, (build.loadouts?.length ?? 1) - 1);
  const prevPhase: Phase | undefined = build.phases[safePhaseIdx - 1];

  const displayStats = safePhaseIdx === 6 && phase.ngCycles
    ? phase.ngCycles[activeNg]?.stats ?? phase.stats
    : phase.stats;
  const ngNotes = safePhaseIdx === 6 && phase.ngCycles
    ? phase.ngCycles[activeNg]?.notes ?? null
    : null;

  const statEntries = Object.entries(displayStats);
  const totalStats = Object.values(displayStats).reduce((a, b) => a + b, 0);

  return (
    <div className="animate-fade-in">
      {/* ── Hero Card ─────────────────────────────────────────────────────── */}
      <div
        className="relative rounded-xl p-5 mb-5"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(accent, 0.12)} 0%, var(--color-card) 55%)`,
          border: `1px solid ${accentBorder}`,
          boxShadow: `0 0 32px ${hexToRgba(accent, 0.07)}, inset 0 1px 0 ${hexToRgba(accent, 0.15)}`,
        }}
        data-testid="build-hero-card"
      >
        <button
          onClick={onDelete}
          data-testid="btn-delete-build"
          className="absolute top-3 right-3 w-6 h-6 rounded flex items-center justify-center text-xs transition-all hover:border-red-500/60 hover:text-red-400"
          style={{ border: "1px solid #3a3028", color: "var(--color-dim2)" }}
          aria-label="Delete this build"
        >
          ✕
        </button>

        <div className="flex items-start gap-4 pr-8">
          <div
            className="text-2xl w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: `radial-gradient(circle, ${hexToRgba(accent, 0.25)} 0%, ${hexToRgba(accent, 0.06)} 100%)`,
              border: `1px solid ${accentBorder}`,
              boxShadow: `0 0 16px ${hexToRgba(accent, 0.2)}`,
            }}
          >
            {build.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h2
              className="text-lg font-bold mb-0.5 shimmer-text"
              style={{ fontFamily: "var(--font-display)" }}
              data-testid="build-label"
            >
              {build.label}
            </h2>
            <p className="text-sm font-medium mb-1.5" style={{ color: accent, opacity: 0.9 }}>
              {build.sub}
            </p>
            <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--color-dim)" }}>
              {build.playstyle}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {build.cls && <Chip label={`Class: ${build.cls}`} accent={accent} />}
              {(build.caps ?? []).map((c) => <Chip key={c} label={c} accent={accent} />)}
              {(build.weaponReq ?? []).map((r) => <Chip key={r} label={`Req: ${r}`} accent={accent} dim />)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Phase Buttons ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label="Build phases">
        {PHASE_NAMES.map((name, i) => {
          const ph = build.phases[i];
          if (!ph) return null; // don't render buttons for phases that don't exist
          const isActive = safePhaseIdx === i;
          return (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && build.phases[i - 1] && (
                <PhaseGain prev={build.phases[i - 1]} curr={ph} accent={accent} />
              )}
              <button
                data-testid={`phase-btn-${i}`}
                onClick={() => { setActivePhase(i); setActiveNg(0); }}
                className="px-2.5 py-1.5 rounded text-xs font-medium transition-all"
                style={
                  isActive
                    ? {
                        background: `linear-gradient(135deg, ${accentBg}, ${hexToRgba(accent, 0.05)})`,
                        border: `1px solid ${accentBorder}`,
                        color: accent,
                        boxShadow: `0 0 10px ${hexToRgba(accent, 0.2)}`,
                      }
                    : { border: "1px solid #2a2218", color: "var(--color-dim)", background: "transparent" }
                }
              >
                {i + 1}. {name}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── NG+ Cycle Buttons ────────────────────────────────────────────── */}
      {activePhase === 6 && phase.ngCycles && phase.ngCycles.length > 0 && (
        <div className="flex gap-1.5 mb-4" aria-label="NG+ cycles">
          {phase.ngCycles.map((cycle: NgCycle, i: number) => (
            <button
              key={i}
              data-testid={`ng-cycle-btn-${i}`}
              onClick={() => setActiveNg(i)}
              className="px-2.5 py-1 rounded text-xs font-medium transition-all"
              style={
                activeNg === i
                  ? { background: accentBg, border: `1px solid ${accentBorder}`, color: accent }
                  : { border: "1px solid #2a2218", color: "var(--color-dim)" }
              }
            >
              {cycle.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Phase Note ───────────────────────────────────────────────────── */}
      <div
        className="mb-5 px-4 py-2.5 rounded-lg text-xs leading-relaxed flex items-start gap-2"
        style={{
          background: `linear-gradient(90deg, ${hexToRgba(accent, 0.08)} 0%, var(--color-card) 100%)`,
          border: `1px solid ${hexToRgba(accent, 0.15)}`,
          borderLeft: `3px solid ${accentBorder}`,
        }}
        data-testid="phase-note"
      >
        <span style={{ color: accent, marginTop: 1 }}>▸</span>
        <span style={{ color: "var(--color-text)" }}>{ngNotes ?? phase.sn}</span>
      </div>

      {/* ── Loadout Selector ─────────────────────────────────────────────── */}
      {build.loadouts && build.loadouts.length > 0 && (
        <div className="mb-5">
          <SectionLabel>Loadout</SectionLabel>
          <div className="flex flex-wrap gap-1.5 mb-3 mt-2">
            {build.loadouts.map((l, i) => (
              <button
                key={l.id}
                data-testid={`loadout-btn-${l.id}`}
                onClick={() => setActiveLoadout(i)}
                className="px-3 py-1.5 rounded text-xs font-medium transition-all"
                style={
                  safeLoadoutIdx === i
                    ? { background: accentBg, border: `1px solid ${accentBorder}`, color: accent }
                    : { border: "1px solid #2a2218", color: "var(--color-dim)" }
                }
              >
                {l.label}
              </button>
            ))}
          </div>
          {(() => {
            const l = build.loadouts![safeLoadoutIdx];
            return (
              <div className="rounded-lg p-3 text-xs" style={{ background: "var(--color-card-hi)", border: "1px solid #2a2218" }}>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Kv label="Weapon Wt" value={String(l.weaponWt)} />
                  <Kv label="End Req" value={String(l.endReq)} />
                  <div className="col-span-2"><Kv label="Armor" value={l.armor} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2" style={{ borderTop: "1px solid #2a2218" }}>
                  <div>
                    <p className="font-semibold mb-1" style={{ color: "var(--color-green)" }}>Pros</p>
                    {l.pros.map((p) => <p key={p} className="leading-snug" style={{ color: "var(--color-dim)" }}>+ {p}</p>)}
                  </div>
                  <div>
                    <p className="font-semibold mb-1" style={{ color: "var(--color-crimson)" }}>Cons</p>
                    {l.cons.map((c) => <p key={c} className="leading-snug" style={{ color: "var(--color-dim)" }}>− {c}</p>)}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Stat Bars ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <SectionLabel>Stats</SectionLabel>
          <span className="text-xs font-mono" style={{ color: "var(--color-dim)" }}>
            {totalStats} <span style={{ color: "var(--color-dim2)" }}>/ {game.endgameBudget}</span>
          </span>
        </div>
        <div
          className="rounded-lg p-3"
          style={{ background: "var(--color-card)", border: "1px solid #242018" }}
        >
          <div className="grid grid-cols-1 gap-2">
            {statEntries.map(([stat, val]) => (
              <StatBar
                key={`${build.key}-${safePhaseIdx}-${stat}`}
                stat={stat}
                value={val}
                prevValue={prevPhase?.stats[stat]}
                max={game.statMax}
                softCap={game.softCaps[stat] ?? null}
                accent={accent}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Items ─────────────────────────────────────────────────────────── */}
      {[
        { label: "Weapons", icon: "⚔", items: phase.weapons },
        { label: "Armor", icon: "🛡", items: phase.armor },
        { label: "Accessories / Rings", icon: "◈", items: phase.acc },
        { label: "Spells / Buffs", icon: "✦", items: phase.spells },
      ].map(({ label, icon, items }) =>
        items && items.length > 0 ? (
          <div key={label} className="mb-4">
            <SectionLabel icon={icon}>{label}</SectionLabel>
            <div className="space-y-1.5 mt-2">
              {items.map((item: Item, i: number) => (
                <ItemCard key={i} item={item} accent={accent} />
              ))}
            </div>
          </div>
        ) : null
      )}

      {/* ── Damage Summary ────────────────────────────────────────────────── */}
      <div
        className="rounded-xl p-4 mt-2"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(accent, 0.08)} 0%, var(--color-card) 60%)`,
          border: `1px solid ${accentBorder}`,
        }}
        data-testid="damage-summary"
      >
        <SectionLabel>Damage Estimate</SectionLabel>
        <div className="grid grid-cols-3 gap-4 mt-3 mb-2">
          <DmgStat label="1H / PvE" value={phase.dmg?.ps ?? 0} accent={accent} />
          <DmgStat label="2H / Swap" value={phase.dmg?.sp ?? 0} accent={accent} />
          <DmgStat label="Backstab" value={phase.dmg?.bs ?? 0} accent={accent} />
        </div>
        {phase.dmg?.n && (
          <p className="text-xs mt-3 pt-2.5 leading-relaxed" style={{ borderTop: "1px solid #2a2218", color: "var(--color-dim)" }}>
            {phase.dmg.n}
          </p>
        )}
      </div>
    </div>
  );
}

export default function BuildTab(props: Props) {
  return (
    <BuildErrorBoundary accent={props.build.accent ?? "#d64545"} buildKey={props.build.key}>
      <BuildTabInner {...props} />
    </BuildErrorBoundary>
  );
}

function Chip({ label, accent, dim }: { label: string; accent: string; dim?: boolean }) {
  return (
    <span
      className="px-2 py-0.5 rounded text-xs"
      style={{
        background: dim ? "transparent" : hexToRgba(accent, 0.1),
        border: `1px solid ${hexToRgba(accent, dim ? 0.18 : 0.3)}`,
        color: dim ? "var(--color-dim)" : accent,
      }}
    >
      {label}
    </span>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ color: "var(--color-dim)" }}>{label}: </span>
      <span style={{ color: "var(--color-text)" }}>{value}</span>
    </div>
  );
}

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: string }) {
  return (
    <div className="section-label">
      {icon && <span style={{ opacity: 0.5 }}>{icon}</span>}
      {children}
    </div>
  );
}

function DmgStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="text-center">
      <p
        className="text-xl font-bold"
        style={{
          fontFamily: "var(--font-display)",
          color: value > 0 ? accent : "var(--color-dim2)",
          textShadow: value > 0 ? `0 0 20px ${hexToRgba(accent, 0.4)}` : "none",
        }}
      >
        {value > 0 ? value.toLocaleString() : "—"}
      </p>
      <p className="text-xs mt-0.5" style={{ color: "var(--color-dim)" }}>{label}</p>
    </div>
  );
}

function PhaseGain({ prev, curr, accent }: { prev: Phase; curr: Phase; accent: string }) {
  const totalGain = Object.entries(curr.stats)
    .map(([s, v]) => v - (prev.stats[s] ?? 0))
    .filter((d) => d > 0)
    .reduce((a, b) => a + b, 0);
  if (totalGain === 0) return null;
  return (
    <span className="text-xs font-semibold" style={{ color: accent, opacity: 0.6 }}>
      +{totalGain}
    </span>
  );
}
