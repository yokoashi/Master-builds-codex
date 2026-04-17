import type { Build } from "@shared/types";
import VariantCard from "./VariantCard";

interface Props {
  build: Build;
  accent: string;
}

export default function SimilarTab({ build, accent }: Props) {
  if (!build.sim || build.sim.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: "var(--color-dim)" }}>
        <p>No similar builds available for this build yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--color-dim)" }}>
        Builds with similar stat investment or playstyle
      </p>
      {build.sim.map((variant) => (
        <VariantCard key={variant.label} variant={variant} accentOverride={accent} />
      ))}
    </div>
  );
}
