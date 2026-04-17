import type { Build } from "@shared/types";
import { hexToRgba } from "@/lib/utils";

interface Props {
  build: Build;
  accent: string;
}

export default function QuickRefTab({ build, accent }: Props) {
  if (!build.ref || build.ref.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: "var(--color-dim)" }}>
        <p>No quick reference data for this build.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--color-dim)" }}>
        Quick Reference — Key Items
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${hexToRgba(accent, 0.3)}` }}>
              {["Name", "Type", "Wt", "AP", "Status", "AR", "Scaling", "Affinity"].map(
                (col) => (
                  <th
                    key={col}
                    className="text-left py-2 pr-4 text-xs uppercase tracking-widest font-medium"
                    style={{ color: accent }}
                  >
                    {col}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {build.ref.map((row, i) => (
              <tr
                key={i}
                style={{ borderBottom: "1px solid #2a2318" }}
                data-testid={`ref-row-${i}`}
              >
                <td className="py-2 pr-4 font-medium" style={{ color: "var(--color-bright)" }}>
                  {row.n}
                </td>
                <td className="py-2 pr-4 text-xs" style={{ color: "var(--color-dim)" }}>
                  {row.i}
                </td>
                <td className="py-2 pr-4 text-xs" style={{ color: "var(--color-text)" }}>
                  {row.w > 0 ? row.w : "—"}
                </td>
                <td className="py-2 pr-4 text-xs" style={{ color: row.ap > 0 ? accent : "var(--color-dim)" }}>
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
