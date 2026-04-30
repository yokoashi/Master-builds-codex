import type { Build, Game, Item } from "@shared/types";
import { hexToRgba } from "@/lib/utils";

interface Props {
  build: Build;
  game: Game | null;
}

interface CollectedItem {
  item: Item;
  phase: string;
  category: string;
}

function collectAllItems(build: Build): CollectedItem[] {
  const seen = new Set<string>();
  const collected: CollectedItem[] = [];

  for (const phase of build.phases ?? []) {
    const cats = [
      { label: "Weapons", items: phase.weapons ?? [] },
      { label: "Armor", items: phase.armor ?? [] },
      { label: "Rings & Accessories", items: phase.acc ?? [] },
      { label: "Spells", items: phase.spells ?? [] },
    ];
    for (const { label, items } of cats) {
      for (const item of items) {
        if (!seen.has(item.n)) {
          seen.add(item.n);
          collected.push({ item, phase: phase.name, category: label });
        }
      }
    }
  }
  return collected;
}

export default function MaterialsTab({ build, game }: Props) {
  const accent = build.accent ?? "#d64545";
  const accentBg = hexToRgba(accent, 0.07);
  const accentBorder = hexToRgba(accent, 0.25);

  const allItems = collectAllItems(build);

  // Group by category
  const categories = ["Weapons", "Armor", "Rings & Accessories", "Spells"] as const;
  const byCategory: Record<string, CollectedItem[]> = {};
  for (const cat of categories) byCategory[cat] = [];
  for (const entry of allItems) {
    if (byCategory[entry.category]) byCategory[entry.category].push(entry);
  }

  // Collect unique upgrade materials from all weapon upgrade paths
  const upgradeMats = new Set<string>();
  for (const { item } of allItems) {
    if (item.up && item.up !== "N/A" && item.up !== "—" && item.up.trim()) {
      upgradeMats.add(item.up);
    }
  }

  return (
    <div className="p-4 space-y-5 animate-fade-in">
      {/* Build materials overview */}
      <div
        className="rounded-lg p-4"
        style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
      >
        <h2 className="font-display text-base font-bold mb-1" style={{ color: "var(--color-bright)" }}>
          {build.label} — Materials Guide
        </h2>
        <p className="text-xs" style={{ color: "var(--color-dim)" }}>
          All items needed across every phase, with locations and upgrade paths.
        </p>
      </div>

      {/* Item sections by category */}
      {categories.map((cat) => {
        const items = byCategory[cat];
        if (!items || items.length === 0) return null;
        return (
          <div key={cat}>
            <div className="section-label mb-2">{cat}</div>
            <div className="space-y-2">
              {items.map(({ item, phase }, i) => (
                <div
                  key={i}
                  className="rounded-lg p-3"
                  style={{ backgroundColor: "var(--color-card-hi)", border: "1px solid var(--color-card-2)" }}
                >
                  {/* Name + phase */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-sm" style={{ color: "var(--color-bright)" }}>{item.n}</p>
                      {item.ap !== undefined && item.ap > 0 && (
                        <p className="text-xs font-mono font-bold" style={{ color: accent }}>{item.ap} AR</p>
                      )}
                    </div>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ backgroundColor: "var(--color-card-2)", color: "var(--color-dim)" }}
                    >
                      {phase}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                    {item.eq && <Stat label="Slot" value={item.eq} />}
                    {item.wt !== undefined && <Stat label="Weight" value={`${item.wt}`} />}
                    {item.durability !== undefined && <Stat label="Durability" value={String(item.durability)} />}
                    {item.st && <Stat label="Status" value={item.st} />}
                    {item.ef && <Stat label="Effect" value={item.ef} />}
                  </div>

                  {/* Location */}
                  {item.loc && item.loc !== "—" && (
                    <div className="flex gap-2 text-xs mb-1.5">
                      <span className="flex-shrink-0" style={{ color: hexToRgba(accent, 0.7) }}>📍</span>
                      <span style={{ color: "var(--color-text)" }}>{item.loc}</span>
                    </div>
                  )}

                  {/* Upgrade path */}
                  {item.up && item.up !== "—" && item.up !== "N/A" && (
                    <div className="flex gap-2 text-xs mb-1.5">
                      <span className="flex-shrink-0" style={{ color: hexToRgba(accent, 0.7) }}>⬆</span>
                      <span style={{ color: "var(--color-text)" }}>{item.up}</span>
                    </div>
                  )}

                  {/* Lore */}
                  {item.lore && (
                    <div
                      className="px-2.5 py-1.5 rounded text-xs italic leading-relaxed mt-2"
                      style={{ background: hexToRgba(accent, 0.05), color: "var(--color-dim)", borderLeft: `2px solid ${hexToRgba(accent, 0.25)}` }}
                    >
                      {item.lore}
                    </div>
                  )}

                  {/* Tip */}
                  {item.tip && (
                    <div className="flex gap-2 text-xs mt-2 leading-relaxed">
                      <span style={{ color: accent }}>💡</span>
                      <span style={{ color: "var(--color-dim)" }}>{item.tip}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Upgrade materials needed */}
      {upgradeMats.size > 0 && (
        <div>
          <div className="section-label mb-2">Upgrade Materials</div>
          <div className="space-y-1">
            {Array.from(upgradeMats).map((mat, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span style={{ color: accent }}>•</span>
                <span style={{ color: "var(--color-text)" }}>{mat}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game-level weight info */}
      {game?.weightInfo && game.weightInfo.length > 0 && (
        <div>
          <div className="section-label mb-2">Equip Load Tiers</div>
          <div className="grid grid-cols-2 gap-2">
            {game.weightInfo.map((tier) => (
              <div
                key={tier.label}
                className="rounded p-2.5"
                style={{ backgroundColor: "var(--color-card-hi)", border: "1px solid var(--color-card-2)" }}
              >
                <p className="text-xs font-semibold" style={{ color: "var(--color-bright)" }}>{tier.label}</p>
                <p className="text-[10px]" style={{ color: accent }}>{tier.range}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--color-dim)" }}>{tier.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-[10px]">
      <span style={{ color: "var(--color-dim)" }}>{label}: </span>
      <span style={{ color: "var(--color-text)" }}>{value}</span>
    </div>
  );
}
