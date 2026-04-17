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
        className="text-xs font-medium flex-shrink-0 text-right"
        style={{
          width: 28,
          color: atOrPastCap ? accent : "var(--color-dim)",
          fontFamily: "var(--font-display)",
          letterSpacing: "0.05em",
        }}
      >
        {stat}
      </span>

      {/* Bar track */}
      <div
        className="flex-1 relative rounded-full overflow-visible"
        style={{ height: 6, background: "#1e1a14" }}
      >
        {/* Soft cap marker */}
        {softCapPct !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 z-10 rounded-full"
            style={{
              left: `${softCapPct}%`,
              width: 2,
              height: 10,
              background: hexToRgba(accent, atOrPastCap ? 0.9 : 0.4),
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
            borderRadius: "9999px",
            background: atOrPastCap
              ? `linear-gradient(90deg, ${hexToRgba(accent, 0.5)}, ${accent})`
              : `linear-gradient(90deg, #2e2620, #4a3e30)`,
            boxShadow: atOrPastCap ? `0 0 8px ${hexToRgba(accent, 0.5)}` : "none",
          }}
        />
      </div>

      {/* Value */}
      <span
        className="text-xs text-right flex-shrink-0 font-mono"
        style={{ width: 26, color: atOrPastCap ? accent : "var(--color-text)" }}
      >
        {value}
      </span>

      {/* Gain badge */}
      {gain > 0 && (
        <span
          className="text-xs flex-shrink-0 font-mono px-1 rounded"
          style={{
            color: "var(--color-green)",
            background: hexToRgba("#6daa45", 0.12),
            border: "1px solid rgba(109,170,69,0.2)",
            width: 32,
            textAlign: "right",
          }}
        >
          +{gain}
        </span>
      )}

      {/* Cap badge */}
      {atOrPastCap && (
        <span
          className="text-xs flex-shrink-0 font-bold"
          style={{ color: accent, textShadow: `0 0 8px ${hexToRgba(accent, 0.6)}` }}
        >
          ✓
        </span>
      )}
    </div>
  );
}
