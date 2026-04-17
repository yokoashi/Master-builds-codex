import type { Game } from "@shared/types";
import { hexToRgba } from "@/lib/utils";

interface Props {
  game: Game;
  accent: string;
}

export default function MaterialsTab({ game, accent }: Props) {
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        {game.mats.map((section) => (
          <div
            key={section.label}
            className="rounded-lg p-4"
            style={{ background: "var(--color-card)", border: "1px solid #2a2318" }}
          >
            <p
              className="text-xs uppercase tracking-widest mb-3 font-medium"
              style={{ color: accent }}
            >
              {section.label}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item} className="text-sm flex gap-2" style={{ color: "var(--color-text)" }}>
                  <span style={{ color: "var(--color-dim)" }}>▸</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Weight Info */}
      <div
        className="rounded-lg p-4"
        style={{ background: "var(--color-card)", border: `1px solid ${hexToRgba(accent, 0.25)}` }}
      >
        <p
          className="text-xs uppercase tracking-widest mb-3 font-medium"
          style={{ color: accent }}
        >
          Equip Load / Weight
        </p>
        <div className="grid gap-2">
          {game.weightInfo.map((tier) => (
            <div key={tier.label} className="flex gap-4 text-sm items-start">
              <span className="font-medium w-20 flex-shrink-0" style={{ color: accent }}>
                {tier.label}
              </span>
              <span className="w-20 flex-shrink-0" style={{ color: "var(--color-dim)" }}>
                {tier.range}
              </span>
              <span style={{ color: "var(--color-text)" }}>{tier.note}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
