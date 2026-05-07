import { useState, useEffect } from "react";
import type { Build, Game, Phase } from "@shared/types";
import { cn, hexToRgba } from "@/lib/utils";
import ItemCard from "./ItemCard";
import StatBar from "./StatBar";

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

function phaseShortLabel(name: string, index: number): string {
  if (/ng\+|new.?game/i.test(name)) return "NG+";
  return ROMAN[index] ?? String(index + 1);
}

interface Props {
  build: Build;
  game: Game | null;
}

type SubTab = "overview" | "roadmap" | "checklist";

export default function BuildTab({ build, game }: Props) {
  const [activePhase, setActivePhase] = useState(0);
  const [activeNg, setActiveNg] = useState(0);
  const [subTabs, setSubTabs] = useState<Record<number, SubTab>>({});
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    setActivePhase(0);
    setActiveNg(0);
    setSubTabs({});
    setChecked(new Set());
  }, [build.key]);

  const subTab: SubTab = subTabs[activePhase] ?? "overview";
  function setSubTab(t: SubTab) { setSubTabs((prev) => ({ ...prev, [activePhase]: t })); }
  function toggleCheck(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const accent = build.accent ?? "var(--color-accent)";
  const accentBg = hexToRgba(accent, 0.08);
  const accentBorder = hexToRgba(accent, 0.28);

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

  const isNgPlus = phase && /ng\+|new.?game/i.test(phase.name);
  const chapterLabel = isNgPlus
    ? "New Game+"
    : `Chapter ${ROMAN[activePhase] ?? String(activePhase + 1)}`;

  return (
    <div className="animate-fade-in">

      {/* ── Build hero ──────────────────────────────────────────────────────── */}
      <div
        className="px-6 pt-6 pb-5 border-b"
        style={{ borderColor: "var(--color-border)", background: `linear-gradient(180deg, ${hexToRgba(accent, 0.06)} 0%, transparent 100%)` }}
        data-testid="build-hero-card"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* Chapter context line */}
            <p
              className="text-[9px] uppercase tracking-[0.25em] font-semibold mb-2"
              style={{ color: "var(--color-dim)" }}
            >
              {chapterLabel}
              {build.sub && (
                <span style={{ color: "var(--color-dim2)" }}> · {build.sub}</span>
              )}
            </p>

            {/* Big build title */}
            <h2
              className="font-display text-3xl font-bold leading-tight mb-2"
              style={{ color: "var(--color-bright)" }}
            >
              {build.label}
            </h2>

            <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--color-text)", maxWidth: 560 }}>
              {build.playstyle}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {build.cls && (
                <span className="text-[10px] px-2 py-0.5 rounded"
                  style={{ backgroundColor: "var(--color-card-2)", color: "var(--color-dim)" }}>
                  {build.cls}
                </span>
              )}
              {build.caps?.map((c) => (
                <span key={c} className="text-[10px] px-2 py-0.5 rounded font-medium"
                  style={{ backgroundColor: accentBg, color: accent, border: `1px solid ${accentBorder}` }}>
                  {c}
                </span>
              ))}
              {build.weaponReq && build.weaponReq.length > 0 && build.weaponReq.map((r) => (
                <span key={r} className="text-[10px] px-2 py-0.5 rounded"
                  style={{ backgroundColor: "var(--color-card-2)", color: "var(--color-dim2)", border: "1px solid var(--color-border)" }}>
                  {r}
                </span>
              ))}
            </div>
          </div>

          {/* Roman numeral badge */}
          <div
            className="flex-shrink-0 w-14 h-14 flex items-center justify-center"
            style={{ border: `1px solid ${accentBorder}` }}
          >
            <span className="font-display text-2xl font-bold" style={{ color: accent }}>
              {phaseShortLabel(phase?.name ?? "", activePhase)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Phase navigation — horizontal chapter cards ──────────────────────── */}
      {phases.length > 0 && (
        <div
          className="border-b px-6 pt-3 pb-0"
          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-card)" }}
        >
          <div className="overflow-x-auto -mx-2 px-2">
            <div className="flex gap-2 min-w-max pb-3">
              {phases.map((p, i) => {
                const active = activePhase === i;
                return (
                  <button
                    key={i}
                    onClick={() => { setActivePhase(i); setActiveNg(0); }}
                    className="flex-shrink-0 text-left px-3.5 py-2.5 rounded transition-all"
                    style={{
                      minWidth: 120,
                      backgroundColor: active ? accentBg : "var(--color-card-hi)",
                      border: `1px solid ${active ? accentBorder : "var(--color-border)"}`,
                    }}
                    data-testid={`phase-btn-${i}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className="font-display text-[9px] font-bold uppercase tracking-widest"
                        style={{ color: active ? accent : "var(--color-dim2)" }}
                      >
                        {phaseShortLabel(p.name, i)}
                      </span>
                      {active && <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />}
                    </div>
                    {p.chapter ? (
                      <>
                        <p
                          className="text-[10px] font-semibold leading-tight"
                          style={{ color: active ? "var(--color-bright)" : "var(--color-text)" }}
                        >
                          {p.chapter}
                        </p>
                        <p className="text-[9px] mt-0.5" style={{ color: "var(--color-dim)" }}>{p.range}</p>
                      </>
                    ) : (
                      <>
                        <p
                          className="text-[10px] font-semibold leading-tight"
                          style={{ color: active ? "var(--color-bright)" : "var(--color-text)" }}
                        >
                          {p.name}
                        </p>
                        <p className="text-[9px] mt-0.5" style={{ color: "var(--color-dim)" }}>{p.range}</p>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Sub-tab bar — always visible ──────────────────────────────────── */}
          <div
            className="flex border-t -mx-6 px-6"
            style={{ borderColor: "var(--color-border)" }}
          >
            {(
              [
                { id: "overview",  label: "Overview",    icon: "◈" },
                { id: "roadmap",   label: "Progression", icon: "↗" },
                { id: "checklist", label: "Checklist",   icon: "✦" },
              ] as { id: SubTab; label: string; icon: string }[]
            ).map((t) => {
              const active = subTab === t.id;
              const hasData =
                t.id === "overview" ? true :
                t.id === "roadmap"  ? !!(phase?.progression?.length || phase?.keyBosses?.length) :
                                      !!phase?.checklist?.length;
              return (
                <button
                  key={t.id}
                  onClick={() => setSubTab(t.id)}
                  className="relative flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-semibold transition-all"
                  style={{
                    color: active ? accent : hasData ? "var(--color-dim2)" : "var(--color-dim)",
                    borderBottom: active ? `2px solid ${accent}` : "2px solid transparent",
                    marginBottom: -1,
                    opacity: hasData || active ? 1 : 0.5,
                  }}
                >
                  <span style={{ fontSize: 10 }}>{t.icon}</span>
                  {t.label}
                  {!hasData && t.id !== "overview" && (
                    <span
                      className="ml-1 text-[8px] px-1 rounded"
                      style={{ backgroundColor: "var(--color-card-2)", color: "var(--color-dim)" }}
                    >
                      AI only
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* NG+ cycle selector */}
          {ngCycles.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2 pb-3">
              {ngCycles.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setActiveNg(i)}
                  className={cn("px-2 py-1 rounded text-[10px] transition-all", activeNg === i ? "opacity-100" : "opacity-40 hover:opacity-70")}
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

      {/* ── Phase content ────────────────────────────────────────────────────── */}
      {phase && (
        <div className="px-6 py-5 space-y-5">

          {/* Phase storybook header */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p
                className="text-[9px] uppercase tracking-[0.25em] font-semibold mb-1.5"
                style={{ color: "var(--color-dim)" }}
              >
                {chapterLabel}
              </p>
              {phase.chapter ? (
                <>
                  <h3 className="font-display text-2xl font-bold leading-tight" style={{ color: "var(--color-bright)" }}>
                    {phase.chapter}
                  </h3>
                  <p className="text-xs mt-1 italic" style={{ color: "var(--color-dim)" }}>
                    {phase.name} · {phase.range}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="font-display text-lg font-bold" style={{ color: "var(--color-bright)" }}>
                    {phase.name}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: accent }}>{phase.range}</p>
                </>
              )}
            </div>

            {/* Damage numbers */}
            {phase.dmg && (
              <div className="flex gap-5 flex-shrink-0" data-testid="damage-summary">
                <div className="text-center">
                  <p className="font-mono font-bold text-2xl leading-none" style={{ color: accent }}>{phase.dmg.ps}</p>
                  <p className="text-[8px] uppercase tracking-[0.2em] mt-1" style={{ color: "var(--color-dim)" }}>1H</p>
                </div>
                <div className="text-center">
                  <p className="font-mono font-bold text-2xl leading-none" style={{ color: accent }}>{phase.dmg.sp}</p>
                  <p className="text-[8px] uppercase tracking-[0.2em] mt-1" style={{ color: "var(--color-dim)" }}>2H</p>
                </div>
                <div className="text-center">
                  <p className="font-mono font-bold text-2xl leading-none" style={{ color: accent }}>{phase.dmg.bs}</p>
                  <p className="text-[8px] uppercase tracking-[0.2em] mt-1" style={{ color: "var(--color-dim)" }}>BS</p>
                </div>
              </div>
            )}
          </div>

          {/* Strategy note */}
          {phase.sn && (
            <div
              className="px-4 py-3 rounded text-sm leading-relaxed italic"
              style={{
                backgroundColor: hexToRgba(accent, 0.05),
                border: `1px solid ${hexToRgba(accent, 0.20)}`,
                borderLeft: `3px solid ${hexToRgba(accent, 0.55)}`,
              }}
              data-testid="phase-note"
            >
              <span className="not-italic mr-2 text-base" style={{ color: accent }}>🕯</span>
              <span style={{ color: "var(--color-text)" }}>{phase.sn}</span>
            </div>
          )}

          {/* NG+ cycle notes */}
          {activeCycle && (
            <div
              className="px-4 py-3 rounded text-sm leading-relaxed"
              style={{ backgroundColor: hexToRgba(accent, 0.07), border: `1px solid ${hexToRgba(accent, 0.2)}` }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: accent }}>
                {activeCycle.label}
              </p>
              <p style={{ color: "var(--color-text)" }}>{activeCycle.notes}</p>
            </div>
          )}

          {/* ── SUB-TAB: Overview (default — stats + items) ──────────────────── */}
          {subTab === "overview" && (
            <>
              {/* Stats */}
              {phase.stats && Object.keys(phase.stats).length > 0 && (
                <div>
                  <div className="section-label mb-3">
                    Stats at {phase.range}
                    {game?.statMax && (
                      <span
                        className="ml-1 text-[9px] px-1.5 py-px rounded font-mono"
                        style={{ backgroundColor: "var(--color-card-2)", color: "var(--color-dim)", letterSpacing: "0" }}
                      >
                        {Object.values(activeCycle?.stats ?? phase.stats).reduce((a, b) => a + (b as number), 0)}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
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
                  <div className="section-label mb-2.5">{label}</div>
                  <div className="space-y-1.5">
                    {items.map((item, i) => (
                      <ItemCard key={i} item={item} accent={accent} />
                    ))}
                  </div>
                </div>
              ))}

              {/* Damage context note */}
              {phase.dmg?.n && (
                <div
                  className="px-3 py-2.5 rounded text-xs leading-relaxed"
                  style={{ backgroundColor: "var(--color-card-hi)", color: "var(--color-dim)", borderLeft: "2px solid var(--color-border)" }}
                >
                  <span className="font-medium">Damage note: </span>
                  {phase.dmg.n}
                </div>
              )}
            </>
          )}

          {/* ── SUB-TAB: Roadmap (progression steps) ─────────────────────────── */}
          {subTab === "roadmap" && (
            <div className="space-y-2">
              {phase.progression && phase.progression.length > 0 ? (
                <div>
                  <p className="text-[9px] uppercase tracking-[0.22em] font-semibold mb-3" style={{ color: "var(--color-dim)" }}>
                    How to advance to the next phase
                  </p>
                  <ol className="space-y-0">
                    {phase.progression.map((step, i) => (
                      <li key={i} className="flex gap-3 relative">
                        {i < phase.progression!.length - 1 && (
                          <div className="absolute left-[13px] top-[26px] bottom-0 w-px" style={{ background: hexToRgba(accent, 0.25) }} />
                        )}
                        <div
                          className="w-[26px] h-[26px] rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold z-10 mt-0.5"
                          style={{ background: hexToRgba(accent, 0.15), color: accent, border: `1px solid ${hexToRgba(accent, 0.35)}` }}
                        >
                          {i + 1}
                        </div>
                        <p className="text-sm leading-relaxed pb-3 pt-0.5" style={{ color: "var(--color-text)" }}>{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <div className="py-10 text-center">
                  <p className="text-2xl mb-3" style={{ color: "var(--color-dim)" }}>↗</p>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-dim2)" }}>No progression guide yet</p>
                  <p className="text-xs" style={{ color: "var(--color-dim)" }}>
                    Generate a new build to get step-by-step guidance for advancing through each phase.
                  </p>
                </div>
              )}

              {phase.keyBosses && phase.keyBosses.length > 0 && (
                <div className="pt-2">
                  <p className="text-[9px] uppercase tracking-[0.22em] font-semibold mb-2.5" style={{ color: "var(--color-dim)" }}>
                    Key encounters
                  </p>
                  <div className="space-y-1.5">
                    {phase.keyBosses.map((b, i) => (
                      <div key={i} className="flex gap-2.5 items-start px-3 py-2 rounded"
                        style={{ backgroundColor: hexToRgba(accent, 0.04), border: `1px solid ${hexToRgba(accent, 0.12)}` }}>
                        <span className="flex-shrink-0 text-base" style={{ color: accent }}>⚔</span>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--color-text)" }}>{b}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SUB-TAB: Checklist ────────────────────────────────────────────── */}
          {subTab === "checklist" && (
            <div className="space-y-3">
              {phase.checklist && phase.checklist.length > 0 ? (
                <div>
                  <p className="text-[9px] uppercase tracking-[0.22em] font-semibold mb-2.5" style={{ color: "var(--color-dim)" }}>
                    Items & objectives for this phase
                  </p>
                  <div className="space-y-1">
                    {phase.checklist.map((item, i) => {
                      const key = `${activePhase}-${i}`;
                      const done = checked.has(key);
                      return (
                        <button
                          key={i}
                          onClick={() => toggleCheck(key)}
                          className="w-full flex items-start gap-2.5 px-3 py-2 rounded text-left transition-all hover:opacity-80"
                          style={{
                            backgroundColor: done ? hexToRgba(accent, 0.08) : "var(--color-card-hi)",
                            border: `1px solid ${done ? hexToRgba(accent, 0.25) : "var(--color-border)"}`,
                          }}
                        >
                          <div
                            className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-[9px] font-bold mt-0.5"
                            style={{
                              background: done ? hexToRgba(accent, 0.2) : "var(--color-card-2)",
                              border: `1px solid ${done ? accent : "var(--color-border)"}`,
                              color: accent,
                            }}
                          >
                            {done ? "✓" : ""}
                          </div>
                          <p className="text-xs leading-relaxed" style={{
                            color: done ? "var(--color-dim)" : "var(--color-text)",
                            textDecoration: done ? "line-through" : "none",
                          }}>
                            {item}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center">
                  <p className="text-2xl mb-3" style={{ color: "var(--color-dim)" }}>✦</p>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-dim2)" }}>No checklist yet</p>
                  <p className="text-xs" style={{ color: "var(--color-dim)" }}>
                    Generate a new build to get an interactive item and objective checklist per phase.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {phases.length === 0 && (
        <div className="text-center py-16" style={{ color: "var(--color-dim)" }}>
          <p className="text-sm">No phases available for this build.</p>
        </div>
      )}
    </div>
  );
}
