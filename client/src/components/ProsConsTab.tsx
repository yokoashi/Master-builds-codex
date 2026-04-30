import type { Build } from "@shared/types";
import { hexToRgba } from "@/lib/utils";

interface Props {
  build: Build;
}

export default function ProsConsTab({ build }: Props) {
  const accent = build.accent ?? "#d64545";
  const pros = build.pros ?? [];
  const cons = build.cons ?? [];

  const hasPros = pros.length > 0;
  const hasCons = cons.length > 0;

  return (
    <div className="p-4 space-y-5 animate-fade-in">
      {/* Header */}
      <div
        className="rounded-lg p-4"
        style={{ background: hexToRgba(accent, 0.07), border: `1px solid ${hexToRgba(accent, 0.25)}` }}
      >
        <h2 className="font-display text-base font-bold mb-1" style={{ color: "var(--color-bright)" }}>
          {build.label} — Strengths & Weaknesses
        </h2>
        <p className="text-xs" style={{ color: "var(--color-dim)" }}>
          Honest assessment of what this build excels at and where it struggles.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pros */}
        <div>
          <div className="section-label mb-3">Strengths</div>
          {hasPros ? (
            <div className="space-y-2">
              {pros.map((pro, i) => (
                <div
                  key={i}
                  className="flex gap-3 px-3 py-2.5 rounded-lg text-sm leading-relaxed"
                  style={{ backgroundColor: "rgba(109,170,69,0.08)", border: "1px solid rgba(109,170,69,0.18)" }}
                >
                  <span className="flex-shrink-0 mt-0.5" style={{ color: "#6daa45" }}>✓</span>
                  <span style={{ color: "var(--color-text)" }}>{pro}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: "var(--color-dim)" }}>
              Regenerate the build to get pros.
            </p>
          )}
        </div>

        {/* Cons */}
        <div>
          <div className="section-label mb-3">Weaknesses</div>
          {hasCons ? (
            <div className="space-y-2">
              {cons.map((con, i) => (
                <div
                  key={i}
                  className="flex gap-3 px-3 py-2.5 rounded-lg text-sm leading-relaxed"
                  style={{ backgroundColor: "rgba(214,69,69,0.07)", border: "1px solid rgba(214,69,69,0.18)" }}
                >
                  <span className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-crimson)" }}>✗</span>
                  <span style={{ color: "var(--color-text)" }}>{con}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: "var(--color-dim)" }}>
              Regenerate the build to get cons.
            </p>
          )}
        </div>
      </div>

      {/* Caps summary */}
      {(build.caps?.length ?? 0) > 0 && (
        <div>
          <div className="section-label mb-2">Stat Targets</div>
          <div className="flex flex-wrap gap-2">
            {build.caps?.map((cap) => (
              <div
                key={cap}
                className="px-3 py-1.5 rounded text-xs font-medium"
                style={{ backgroundColor: hexToRgba(accent, 0.1), color: accent, border: `1px solid ${hexToRgba(accent, 0.25)}` }}
              >
                {cap}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loadouts (if any) */}
      {(build.loadouts ?? []).length > 0 && (
        <div>
          <div className="section-label mb-2">Loadout Options</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {build.loadouts!.map((l) => (
              <div
                key={l.id}
                className="rounded-lg p-3"
                style={{ backgroundColor: "var(--color-card-hi)", border: "1px solid var(--color-card-2)" }}
              >
                <p className="font-semibold text-sm mb-2" style={{ color: "var(--color-bright)" }}>{l.label}</p>
                <p className="text-xs mb-2" style={{ color: "var(--color-dim)" }}>
                  Armor: {l.armor} · Weapon wt: {l.weaponWt} · END req: {l.endReq}
                </p>
                <div className="space-y-1">
                  {l.pros.map((p) => (
                    <div key={p} className="flex gap-2 text-xs">
                      <span style={{ color: "#6daa45" }}>+</span>
                      <span style={{ color: "var(--color-text)" }}>{p}</span>
                    </div>
                  ))}
                  {l.cons.map((c) => (
                    <div key={c} className="flex gap-2 text-xs">
                      <span style={{ color: "var(--color-crimson)" }}>–</span>
                      <span style={{ color: "var(--color-text)" }}>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
