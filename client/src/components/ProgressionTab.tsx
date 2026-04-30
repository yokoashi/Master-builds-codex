import { useState } from "react";
import type { Build, Item, Phase } from "@shared/types";
import { hexToRgba } from "@/lib/utils";

interface Props {
  build: Build;
}

// Detect questline items by steps field OR complex loc text
function isQuestline(item: Item): boolean {
  if (item.steps && item.steps.length > 0) return true;
  if (!item.loc) return false;
  const l = item.loc.toLowerCase();
  return (
    l.includes("quest") ||
    l.includes("after rescuing") ||
    l.includes("after freeing") ||
    l.includes("rescue") ||
    l.includes("talk to") ||
    (l.includes("after") && l.length > 90)
  );
}

// Collect all items from a phase across all categories
function phaseItems(phase: Phase): Item[] {
  return [
    ...(phase.weapons ?? []),
    ...(phase.armor ?? []),
    ...(phase.acc ?? []),
    ...(phase.spells ?? []),
  ];
}

// Stats that changed meaningfully between two phases (>= 3 point increase)
function statDiffs(prev: Record<string, number>, next: Record<string, number>): Array<{ stat: string; from: number; to: number }> {
  const diffs: Array<{ stat: string; from: number; to: number }> = [];
  for (const [stat, val] of Object.entries(next)) {
    const prevVal = prev[stat] ?? 0;
    if (val - prevVal >= 3) diffs.push({ stat, from: prevVal, to: val });
  }
  return diffs;
}

function QuestlineSteps({ item, accent }: { item: Item; accent: string }) {
  const [open, setOpen] = useState(false);
  const steps = item.steps && item.steps.length > 0 ? item.steps : null;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: `1px solid ${hexToRgba(accent, 0.3)}`, backgroundColor: "var(--color-card-hi)" }}
    >
      <button
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-left"
        style={{ background: hexToRgba(accent, 0.05) }}
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ backgroundColor: hexToRgba(accent, 0.2), color: accent }}>
            QUESTLINE
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--color-bright)" }}>{item.n}</span>
          <span className="text-[10px]" style={{ color: "var(--color-dim)" }}>{item.eq}</span>
        </div>
        <span className="text-xs transition-transform duration-200" style={{ color: accent, transform: open ? "rotate(180deg)" : "none" }}>▾</span>
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 pt-2 space-y-2.5 border-t" style={{ borderColor: hexToRgba(accent, 0.15) }}>
          <p className="text-xs" style={{ color: "var(--color-dim)" }}>{item.d}</p>

          {steps ? (
            <ol className="space-y-1.5">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-2.5 text-xs leading-relaxed">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-px"
                    style={{ backgroundColor: hexToRgba(accent, 0.2), color: accent }}>
                    {i + 1}
                  </span>
                  <span style={{ color: "var(--color-text)" }}>{step}</span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex gap-2 text-xs leading-relaxed">
              <span style={{ color: hexToRgba(accent, 0.7) }}>📍</span>
              <span style={{ color: "var(--color-text)" }}>{item.loc}</span>
            </div>
          )}

          {item.tip && (
            <div className="flex gap-2 text-xs leading-relaxed pt-2" style={{ borderTop: `1px solid ${hexToRgba(accent, 0.1)}` }}>
              <span style={{ color: accent, flexShrink: 0 }}>💡</span>
              <span style={{ color: "var(--color-text)" }}>{item.tip}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProgressionTab({ build }: Props) {
  const accent = build.accent ?? "#d64545";
  const phases = build.phases ?? [];

  // Collect items first-appearing per phase (dedup by name)
  const seen = new Set<string>();
  const newPerPhase: Item[][] = phases.map((phase) => {
    const first: Item[] = [];
    for (const item of phaseItems(phase)) {
      if (!seen.has(item.n)) {
        seen.add(item.n);
        first.push(item);
      }
    }
    return first;
  });

  // All questline items across all phases
  const questlines: Item[] = [];
  const qSeen = new Set<string>();
  for (const phase of phases) {
    for (const item of phaseItems(phase)) {
      if (isQuestline(item) && !qSeen.has(item.n)) {
        qSeen.add(item.n);
        questlines.push(item);
      }
    }
  }

  const phaseColors = [
    hexToRgba(accent, 0.12),
    hexToRgba(accent, 0.08),
    hexToRgba(accent, 0.06),
    hexToRgba(accent, 0.04),
  ];

  return (
    <div className="p-4 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="rounded-lg p-4" style={{ background: hexToRgba(accent, 0.07), border: `1px solid ${hexToRgba(accent, 0.25)}` }}>
        <h2 className="font-display text-base font-bold mb-1" style={{ color: "var(--color-bright)" }}>
          {build.label} — Progression
        </h2>
        <p className="text-xs" style={{ color: "var(--color-dim)" }}>
          Key gear changes, stat targets, and questlines phase by phase.
        </p>
      </div>

      {/* Phase timeline */}
      <div className="relative pl-6">
        {/* Vertical spine */}
        <div className="absolute left-2.5 top-3 bottom-3 w-px" style={{ backgroundColor: hexToRgba(accent, 0.25) }} />

        <div className="space-y-5">
          {phases.map((phase, pi) => {
            const prevStats = pi > 0 ? phases[pi - 1].stats : {};
            const diffs = pi > 0 ? statDiffs(prevStats, phase.stats) : [];
            const newItems = newPerPhase[pi] ?? [];

            return (
              <div key={pi} className="relative">
                {/* Timeline dot */}
                <div
                  className="absolute -left-6 top-3.5 w-3 h-3 rounded-full border-2"
                  style={{ backgroundColor: pi === 0 ? accent : "var(--color-card)", borderColor: accent }}
                />

                <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${hexToRgba(accent, pi === 0 ? 0.3 : 0.15)}` }}>
                  {/* Phase header */}
                  <div className="px-4 py-3 flex items-center justify-between" style={{ background: phaseColors[pi] }}>
                    <div>
                      <span className="font-display font-bold text-sm" style={{ color: "var(--color-bright)" }}>
                        {phase.name}
                      </span>
                      <span className="text-xs ml-2" style={{ color: "var(--color-dim)" }}>{phase.range}</span>
                    </div>
                    {phase.dmg && (
                      <div className="flex gap-3 text-[10px] font-mono">
                        <span style={{ color: accent }}>{phase.dmg.ps} PS</span>
                        <span style={{ color: "var(--color-dim2)" }}>{phase.dmg.bs} BS</span>
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-3 space-y-3">
                    {/* Strategy note */}
                    {phase.sn && (
                      <p className="text-xs leading-relaxed" style={{ color: "var(--color-text)" }}>{phase.sn}</p>
                    )}

                    {/* Stat upgrades from previous phase */}
                    {diffs.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider mb-1.5 font-medium" style={{ color: "var(--color-dim)" }}>
                          Stat Targets
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {diffs.map(({ stat, from, to }) => (
                            <span key={stat} className="text-[10px] px-2 py-0.5 rounded font-mono"
                              style={{ backgroundColor: hexToRgba(accent, 0.12), color: accent }}>
                              {stat} {from}→{to}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* New items this phase */}
                    {newItems.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider mb-1.5 font-medium" style={{ color: "var(--color-dim)" }}>
                          {pi === 0 ? "Starting Gear" : "New This Phase"}
                        </p>
                        <div className="space-y-1">
                          {newItems.map((item, ii) => (
                            <div key={ii} className="flex items-center gap-2 text-xs">
                              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-px" style={{ backgroundColor: isQuestline(item) ? accent : "var(--color-dim2)" }} />
                              <span style={{ color: "var(--color-bright)" }}>{item.n}</span>
                              <span style={{ color: "var(--color-dim)" }}>({item.eq})</span>
                              {isQuestline(item) && (
                                <span className="text-[9px] px-1 py-px rounded" style={{ backgroundColor: hexToRgba(accent, 0.15), color: accent }}>
                                  questline
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Questlines section */}
      {questlines.length > 0 && (
        <div>
          <div className="section-label mb-3">Questlines & Complex Acquisitions</div>
          <div className="space-y-2">
            {questlines.map((item, i) => (
              <QuestlineSteps key={i} item={item} accent={accent} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
