import type { Build } from "@shared/types";
import { hexToRgba } from "@/lib/utils";

interface Props {
  build: Build;
}

export default function QuickRefTab({ build }: Props) {
  const accent = build.accent ?? "#d64545";

  if (!build.ref || build.ref.length === 0) {
    return (
      <div className="p-4 text-center py-12" style={{ color: "var(--color-dim)" }}>
        <p className="text-sm">No quick reference data for this build.</p>
        <p className="text-xs mt-1">Regenerate the build to populate this table.</p>
      </div>
    );
  }

  return (
    <div className="p-4 animate-fade-in">
      <div
        className="rounded-lg p-4 mb-4"
        style={{ background: hexToRgba(accent, 0.07), border: `1px solid ${hexToRgba(accent, 0.2)}` }}
      >
        <h2 className="font-display text-base font-bold" style={{ color: "var(--color-bright)" }}>
          Quick Reference
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-dim)" }}>
          Key items for {build.label} at a glance.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${hexToRgba(accent, 0.3)}` }}>
              {["Name", "Type", "Wt", "AR", "Status", "Armor", "Scaling", "Affinity"].map((col) => (
                <th
                  key={col}
                  className="text-left py-2 pr-4 text-xs uppercase tracking-widest font-medium"
                  style={{ color: accent }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {build.ref.map((row, i) => (
              <tr
                key={i}
                style={{ borderBottom: `1px solid var(--color-card-hi)` }}
                className="hover:bg-[var(--color-card-hi)] transition-colors"
                data-testid={`ref-row-${i}`}
              >
                <td className="py-2 pr-4 font-medium" style={{ color: "var(--color-bright)" }}>
                  {row.n}
                </td>
                <td className="py-2 pr-4 text-xs" style={{ color: "var(--color-dim)" }}>
                  {row.i}
                </td>
                <td className="py-2 pr-4 text-xs font-mono" style={{ color: "var(--color-text)" }}>
                  {row.w > 0 ? row.w : "—"}
                </td>
                <td className="py-2 pr-4 text-xs font-mono font-bold" style={{ color: row.ap > 0 ? accent : "var(--color-dim)" }}>
                  {row.ap > 0 ? row.ap : "—"}
                </td>
                <td className="py-2 pr-4 text-xs" style={{ color: "var(--color-purple)" }}>
                  {row.st || "—"}
                </td>
                <td className="py-2 pr-4 text-xs" style={{ color: "var(--color-text)" }}>
                  {row.ar || "—"}
                </td>
                <td className="py-2 pr-4 text-xs" style={{ color: "var(--color-gold)" }}>
                  {row.s || "—"}
                </td>
                <td className="py-2 text-xs" style={{ color: "var(--color-dim)" }}>
                  {row.a || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
