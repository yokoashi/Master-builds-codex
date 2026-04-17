import type { Build } from "@shared/types";
import VariantCard from "./VariantCard";

interface Props {
  build: Build;
  accent: string;
}

export default function OtherTab({ build, accent }: Props) {
  if (!build.oth || build.oth.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: "var(--color-dim)" }}>
        <p>No alternative OP builds available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--color-dim)" }}>
        Other powerful builds for this game
      </p>
      {build.oth.map((variant) => (
        <VariantCard key={variant.label} variant={variant} accentOverride={accent} />
      ))}
    </div>
  );
}
