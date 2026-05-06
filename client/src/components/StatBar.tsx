import { hexToRgba } from "@/lib/utils";

interface Props {
  stat: string;
  value: number;
  prevValue?: number;
  max: number;
  softCap: number | null;
  accent: string;
}

export default function StatBar({ stat, value, prevValue, max, softCap, accent }: Props) {
  const pct = Math.min(100, (value / max) * 100);
  const softCapPct = softCap ? Math.min(100, (softCap / max) * 100) : null;
  const atOrPastCap = softCap !== null && value >= softCap;
  const gain = prevValue !== undefined ? value - prevValue : 0;

  return (
    <div className="flex items-center gap-2.5" data-testid={`stat-bar-${stat}`}>
      {/* Stat name */}
      <span
        className="text-[10px] font-bold flex-shrink-0 text-right uppercase tracking-widest"
        style={{
          width: 30,
          color: atOrPastCap ? accent : "var(--color-dim)",
          fontFamily: "var(--font-display)",
        }}
      >
        {stat}
      </span>

      {/* Bar track */}
      <div
        className="flex-1 relative rounded-sm overflow-visible"
        style={{ height: 4, background: "var(--color-card-2)" }}
      >
        {/* Soft cap marker */}
        {softCapPct !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 z-10"
            style={{
              left: `${softCapPct}%`,
              width: 1,
              height: 10,
              background: hexToRgba(accent, atOrPastCap ? 0.85 : 0.35),
            }}
            title={`Soft cap: ${softCap}`}
          />
        )}
        {/* Fill */}
        <div
          className={atOrPastCap ? "stat-bar-fill--capped" : "stat-bar-fill"}
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: "2px",
            background: atOrPastCap
              ? `linear-gradient(90deg, ${hexToRgba(accent, 0.55)}, ${accent})`
              : `linear-gradient(90deg, var(--color-dim2), var(--color-dim))`,
            boxShadow: atOrPastCap ? `0 0 6px ${hexToRgba(accent, 0.45)}` : "none",
          }}
        />
      </div>

      {/* Value */}
      <span
        className="text-xs text-right flex-shrink-0 font-mono font-bold"
        style={{ width: 24, color: atOrPastCap ? accent : "var(--color-text)" }}
      >
        {value}
      </span>

      {/* Gain badge */}
      {gain > 0 && (
        <span
          className="text-[10px] flex-shrink-0 font-mono px-1 rounded"
          style={{
            color: "var(--color-green)",
            background: hexToRgba("#5a9040", 0.14),
            border: "1px solid rgba(90,144,64,0.22)",
            width: 30,
            textAlign: "right",
          }}
        >
          +{gain}
        </span>
      )}

      {/* Cap check */}
      {atOrPastCap && (
        <span
          className="text-[10px] flex-shrink-0 font-bold"
          style={{ color: accent }}
        >
          ✓
        </span>
      )}
    </div>
  );
}
