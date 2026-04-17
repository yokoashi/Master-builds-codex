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
    <div className="flex items-center gap-2" data-testid={`stat-bar-${stat}`}>
      <span
        className="w-8 text-xs font-medium flex-shrink-0"
        style={{ color: atOrPastCap ? accent : "var(--color-dim)" }}
      >
        {stat}
      </span>
      <div className="flex-1 relative h-2 rounded-full overflow-visible" style={{ background: "#2a2318" }}>
        {/* Soft cap marker */}
        {softCapPct !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full z-10"
            style={{ left: `${softCapPct}%`, background: hexToRgba(accent, 0.6) }}
            title={`Soft cap: ${softCap}`}
          />
        )}
        {/* Fill */}
        <div
          className="stat-bar-fill h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: atOrPastCap
              ? `linear-gradient(90deg, ${hexToRgba(accent, 0.6)}, ${accent})`
              : `linear-gradient(90deg, #3a3028, #5a4e3c)`,
          }}
        />
      </div>
      <span className="w-8 text-xs text-right flex-shrink-0" style={{ color: "var(--color-text)" }}>
        {value}
      </span>
      {gain > 0 && (
        <span className="text-xs w-7 text-right flex-shrink-0" style={{ color: "var(--color-green)" }}>
          +{gain}
        </span>
      )}
      {atOrPastCap && (
        <span className="text-xs flex-shrink-0" style={{ color: accent }}>✓</span>
      )}
    </div>
  );
}
