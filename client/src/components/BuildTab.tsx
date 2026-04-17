import { useState, Component } from "react";
import type { Build, Game, Phase, Item, NgCycle } from "@shared/types";
import { cn, hexToRgba, statGain } from "@/lib/utils";
import ItemCard from "./ItemCard";
import StatBar from "./StatBar";

// ── Error boundary so a bad build never blacks out the whole page ─────────────
class BuildErrorBoundary extends Component<
  { children: React.ReactNode; accent: string },
  { error: string | null }
> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-lg p-6 text-sm" style={{ background: "var(--color-card)", border: `1px solid ${hexToRgba(this.props.accent, 0.3)}` }}>
          <p style={{ color: "var(--color-crimson)" }} className="font-semibold mb-2">⚠ Build display error</p>
          <p style={{ color: "var(--color-dim)" }}>{this.state.error}</p>
          <p className="mt-3" style={{ color: "var(--color-dim)" }}>This build may have been generated with an older schema. Try deleting and regenerating it.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

interface Props {
  build: Build;
  game: Game;
  onDelete: () => void;
}

const PHASE_NAMES = [
  "Early Game",
  "Core Weapon",
  "Key Accessories",
  "Unlock Spells",
  "Mid-to-Late",
  "Endgame",
  "NG+",
];

function BuildTabInner({ build, game, onDelete }: Props) {
  const [activePhase, setActivePhase] = useState(0);
  const [activeNg, setActiveNg] = useState(0);
  const [activeLoadout, setActiveLoadout] = useState(0);

  const accent = build.accent;
  const accentBg = hexToRgba(accent, 0.1);
  const accentBorder = hexToRgba(accent, 0.35);

  // Guard: clamp activePhase to valid range (handles builds with < 7 phases)
  const safePhaseIdx = Math.min(activePhase, build.phases.length - 1);
  const phase: Phase = build.phases[safePhaseIdx];
  const prevPhase: Phase | undefined = build.phases[safePhaseIdx - 1];

  const displayStats =
    safePhaseIdx === 6 && phase.ngCycles
      ? phase.ngCycles[activeNg]?.stats ?? phase.stats
      : phase.stats;

  const ngNotes =
    safePhaseIdx === 6 && phase.ngCycles
      ? phase.ngCycles[activeNg]?.notes ?? null
      : null;

  const statEntries = Object.entries(displayStats);
  const totalStats = Object.values(displayStats).reduce((a, b) => a + b, 0);

  return (
    <div>
      {/* ── Hero Card ────────────────────────────────────────────────────── */}
      <div
        className="relative rounded-lg p-5 mb-6"
        style={{ background: "var(--color-card)", border: `1px solid ${accentBorder}` }}
        data-testid="build-hero-card"
      >
        {/* Delete button */}
        <button
          onClick={onDelete}
          data-testid="btn-delete-build"
          className="absolute top-3 right-3 px-2 py-1 rounded text-xs transition-all hover:border-red-500 hover:text-red-400"
          style={{ border: "1px solid #3a3028", color: "var(--color-dim)" }}
          aria-label="Delete this build"
        >
          ✕
        </button>

        <div className="flex items-start gap-4 pr-8">
          <div
            className="text-3xl w-12 h-12 rounded flex items-center justify-center flex-shrink-0"
            style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
          >
            {build.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h2
              className="text-xl font-bold mb-0.5"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-bright)" }}
              data-testid="build-label"
            >
              {build.label}
            </h2>
            <p className="text-sm font-medium mb-2" style={{ color: accent }}>
              {build.sub}
            </p>
            <p className="text-sm mb-3" style={{ color: "var(--color-dim)" }}>
              {build.playstyle}
            </p>
            <div className="flex flex-wrap gap-2">
              {build.cls && <Chip label={`Class: ${build.cls}`} accent={accent} />}
              {(build.caps ?? []).map((c) => (
                <Chip key={c} label={c} accent={accent} />
              ))}
              {(build.weaponReq ?? []).map((r) => (
                <Chip key={r} label={`Req: ${r}`} accent={accent} dim />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Phase Buttons ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Build phases">
        {PHASE_NAMES.map((name, i) => {
          const ph = build.phases[i]; // may be undefined for short builds
          const isActive = safePhaseIdx === i;
          return (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && ph && build.phases[i - 1] && (
                <PhaseGain prev={build.phases[i - 1]} curr={ph} accent={accent} />
              )}
              <button
                data-testid={`phase-btn-${i}`}
                onClick={() => { setActivePhase(i); setActiveNg(0); }}
                disabled={!ph}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-medium transition-all",
                  isActive ? "phase-btn-active" : "hover:bg-white/5",
                  !ph ? "opacity-30 cursor-not-allowed" : ""
                )}
                style={
                  isActive
                    ? { background: accentBg, border: `1px solid ${accentBorder}`, color: accent }
                    : { border: "1px solid #2a2318", color: "var(--color-dim)" }
                }
              >
                {name}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── NG+ Cycle Buttons ─────────────────────────────────────────────── */}
      {activePhase === 6 && phase.ngCycles && phase.ngCycles.length > 0 && (
        <div className="flex gap-2 mb-4" aria-label="NG+ cycles">
          {phase.ngCycles.map((cycle: NgCycle, i: number) => (
            <button
              key={i}
              data-testid={`ng-cycle-btn-${i}`}
              onClick={() => setActiveNg(i)}
              className={cn(
                "px-3 py-1 rounded text-xs font-medium transition-all",
                activeNg === i ? "phase-btn-active" : "hover:bg-white/5"
              )}
              style={
                activeNg === i
                  ? { background: accentBg, border: `1px solid ${accentBorder}`, color: accent }
                  : { border: "1px solid #2a2318", color: "var(--color-dim)" }
              }
            >
              {cycle.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Phase Note ────────────────────────────────────────────────────── */}
      <div
        className="mb-4 px-3 py-2 rounded text-sm"
        style={{ background: "var(--color-card)", border: `1px solid #2a2318` }}
        data-testid="phase-note"
      >
        <span style={{ color: accent }}>▸ </span>
        <span style={{ color: "var(--color-text)" }}>
          {ngNotes ?? phase.sn}
        </span>
      </div>

      {/* ── Loadout Selector ──────────────────────────────────────────────── */}
      {build.loadouts && build.loadouts.length > 0 && (
        <div className="mb-4">
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--color-dim)" }}>
            Loadout
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {build.loadouts.map((l, i) => (
              <button
                key={l.id}
                data-testid={`loadout-btn-${l.id}`}
                onClick={() => setActiveLoadout(i)}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-medium transition-all",
                  activeLoadout === i ? "phase-btn-active" : "hover:bg-white/5"
                )}
                style={
                  activeLoadout === i
                    ? { background: accentBg, border: `1px solid ${accentBorder}`, color: accent }
                    : { border: "1px solid #2a2318", color: "var(--color-dim)" }
                }
              >
                {l.label}
              </button>
            ))}
          </div>
          {(() => {
            const l = build.loadouts![activeLoadout];
            return (
              <div
                className="grid grid-cols-2 gap-3 p-3 rounded text-xs"
                style={{ background: "var(--color-card)", border: `1px solid #2a2318` }}
              >
                <div>
                  <span style={{ color: "var(--color-dim)" }}>Weapon Wt:</span>{" "}
                  <span style={{ color: "var(--color-text)" }}>{l.weaponWt}</span>
                </div>
                <div>
                  <span style={{ color: "var(--color-dim)" }}>End Req:</span>{" "}
                  <span style={{ color: "var(--color-text)" }}>{l.endReq}</span>
                </div>
                <div className="col-span-2">
                  <span style={{ color: "var(--color-dim)" }}>Armor:</span>{" "}
                  <span style={{ color: "var(--color-text)" }}>{l.armor}</span>
                </div>
                <div>
                  <p style={{ color: "var(--color-green)" }} className="font-medium mb-1">Pros</p>
                  {l.pros.map((p) => <p key={p} style={{ color: "var(--color-dim)" }}>+ {p}</p>)}
                </div>
                <div>
                  <p style={{ color: "var(--color-crimson)" }} className="font-medium mb-1">Cons</p>
                  {l.cons.map((c) => <p key={c} style={{ color: "var(--color-dim)" }}>- {c}</p>)}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Stat Bars ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-dim)" }}>
            Stats
          </p>
          <span className="text-xs" style={{ color: "var(--color-dim)" }}>
            Total: {totalStats} / {game.endgameBudget}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {statEntries.map(([stat, val]) => (
            <StatBar
              key={stat}
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

      {/* ── Items ─────────────────────────────────────────────────────────── */}
      {[
        { label: "Weapons", items: phase.weapons },
        { label: "Armor", items: phase.armor },
        { label: "Accessories", items: phase.acc },
        { label: "Spells / Skills", items: phase.spells },
      ].map(({ label, items }) =>
        items && items.length > 0 ? (
          <div key={label} className="mb-4">
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--color-dim)" }}>
              {label}
            </p>
            <div className="space-y-2">
              {items.map((item: Item, i: number) => (
                <ItemCard key={i} item={item} accent={accent} />
              ))}
            </div>
          </div>
        ) : null
      )}

      {/* ── Damage Summary ────────────────────────────────────────────────── */}
      <div
        className="rounded-lg p-4 mt-4"
        style={{ background: "var(--color-card)", border: `1px solid ${accentBorder}` }}
        data-testid="damage-summary"
      >
        <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--color-dim)" }}>
          Damage Estimate
        </p>
        <div className="grid grid-cols-3 gap-4 mb-2">
          <DmgStat label="1H / PvE" value={phase.dmg?.ps ?? 0} accent={accent} />
          <DmgStat label="2H / Swap" value={phase.dmg?.sp ?? 0} accent={accent} />
          <DmgStat label="Backstab" value={phase.dmg?.bs ?? 0} accent={accent} />
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--color-dim)" }}>
          {phase.dmg?.n ?? ""}
        </p>
      </div>
    </div>
  );
}

export default function BuildTab(props: Props) {
  return (
    <BuildErrorBoundary accent={props.build.accent ?? "#d64545"}>
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
        border: `1px solid ${hexToRgba(accent, dim ? 0.2 : 0.3)}`,
        color: dim ? "var(--color-dim)" : accent,
      }}
    >
      {label}
    </span>
  );
}

function DmgStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold font-display" style={{ color: accent }}>
        {value > 0 ? value.toLocaleString() : "—"}
      </p>
      <p className="text-xs" style={{ color: "var(--color-dim)" }}>{label}</p>
    </div>
  );
}

function PhaseGain({ prev, curr, accent }: { prev: Phase; curr: Phase; accent: string }) {
  const gains = Object.entries(curr.stats)
    .map(([stat, val]) => {
      const diff = val - (prev.stats[stat] ?? 0);
      return diff;
    })
    .filter((d) => d > 0);
  const totalGain = gains.reduce((a, b) => a + b, 0);
  if (totalGain === 0) return null;
  return (
    <span className="text-xs font-medium" style={{ color: accent, opacity: 0.7 }}>
      +{totalGain}
    </span>
  );
}
