import { useState } from "react";
import type { Build, Game, Item } from "@shared/types";
import { hexToRgba } from "@/lib/utils";

interface Props {
  build: Build;
  game: Game | null;
}

interface CollectedItem {
  item: Item;
  phase: string;
  phaseIndex: number;
  category: string;
}

const CAT_ICONS: Record<string, string> = {
  Weapons: "⚔",
  Armor: "🛡",
  "Rings & Accessories": "💍",
  Spells: "✨",
};

function collectAllItems(build: Build): CollectedItem[] {
  const seen = new Set<string>();
  const collected: CollectedItem[] = [];
  (build.phases ?? []).forEach((phase, phaseIndex) => {
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
          collected.push({ item, phase: phase.name, phaseIndex, category: label });
        }
      }
    }
  });
  return collected;
}

function isQuestline(item: Item): boolean {
  if (item.steps && item.steps.length > 0) return true;
  if (!item.loc) return false;
  const l = item.loc.toLowerCase();
  return (
    l.includes("quest") ||
    l.includes("after rescuing") ||
    l.includes("after freeing") ||
    l.includes("rescue") ||
    l.includes("talk to") ||
    (l.includes("after") && l.length > 90)
  );
}

function ItemRow({ item, accent, phaseIndex }: { item: Item; accent: string; phaseIndex: number; phase: string }) {
  const [open, setOpen] = useState(false);
  const hasExtra = !!(item.d || item.lore || item.tip || item.steps?.length || item.loc || item.up);
  const questline = isQuestline(item);

  const phaseAlpha = Math.max(0.06, 0.14 - phaseIndex * 0.03);

  return (
    <div
      className="rounded-lg overflow-hidden transition-all"
      style={{
        border: `1px solid ${open ? hexToRgba(accent, 0.3) : "var(--color-card-2)"}`,
        boxShadow: open ? `0 0 14px ${hexToRgba(accent, 0.07)}` : "none",
      }}
    >
      {/* Header row */}
      <button
        className="w-full text-left flex items-center gap-3 px-3.5 py-2.5"
        style={{ background: open ? hexToRgba(accent, phaseAlpha) : "var(--color-card-hi)" }}
        onClick={() => hasExtra && setOpen(!open)}
        aria-expanded={open}
      >
        {/* Name + badges */}
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm" style={{ color: "var(--color-bright)" }}>
            {item.n}
          </span>
          {questline && (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0"
              style={{ backgroundColor: hexToRgba(accent, 0.2), color: accent }}>
              QUESTLINE
            </span>
          )}
          {item.ef && (
            <span className="text-[10px] flex-shrink-0 hidden sm:inline" style={{ color: "var(--color-purple)", opacity: 0.9 }}>
              ✦ {item.ef}
            </span>
          )}
        </div>

        {/* Right side: AP + weight */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {item.ap !== undefined && item.ap > 0 && (
            <span className="text-xs font-mono font-bold" style={{ color: accent }}>{item.ap} AR</span>
          )}
          {item.wt !== undefined && (
            <span className="text-[10px]" style={{ color: "var(--color-dim2)" }}>{item.wt}wt</span>
          )}
          {item.eq && (
            <span className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "var(--color-card-2)", color: "var(--color-dim)", minWidth: 48, textAlign: "center" }}>
              {item.eq}
            </span>
          )}
          {hasExtra && (
            <span className="text-xs transition-transform duration-200"
              style={{ color: open ? accent : "var(--color-dim2)", transform: open ? "rotate(180deg)" : "none" }}>
              ▾
            </span>
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-4 pb-4 pt-3 space-y-3 border-t" style={{ borderColor: hexToRgba(accent, 0.15), backgroundColor: "var(--color-card-hi)" }}>
          {item.d && (
            <p className="text-xs leading-relaxed" style={{ color: "var(--color-dim)" }}>{item.d}</p>
          )}

          {/* Steps (questline) or plain location */}
          {item.steps && item.steps.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--color-dim)" }}>How to Obtain</p>
              <ol className="space-y-1.5">
                {item.steps.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-xs leading-relaxed">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ backgroundColor: hexToRgba(accent, 0.18), color: accent }}>
                      {i + 1}
                    </span>
                    <span style={{ color: "var(--color-text)" }}>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : item.loc && item.loc !== "—" ? (
            <div className="flex gap-2 text-xs">
              <span style={{ color: hexToRgba(accent, 0.7), flexShrink: 0 }}>📍</span>
              <span style={{ color: "var(--color-text)" }}>{item.loc}</span>
            </div>
          ) : null}

          {/* Upgrade */}
          {item.up && item.up !== "—" && item.up !== "N/A" && (
            <div className="flex gap-2 text-xs">
              <span style={{ color: hexToRgba(accent, 0.7), flexShrink: 0 }}>⬆</span>
              <span style={{ color: "var(--color-text)" }}>{item.up}</span>
            </div>
          )}

          {/* Stats row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {item.durability !== undefined && <Stat label="Durability" value={String(item.durability)} />}
            {item.st && <Stat label="Status" value={item.st} />}
          </div>

          {/* Lore */}
          {item.lore && (
            <div className="px-2.5 py-2 rounded text-xs italic leading-relaxed"
              style={{ background: hexToRgba(accent, 0.05), color: "var(--color-dim)", borderLeft: `2px solid ${hexToRgba(accent, 0.25)}` }}>
              {item.lore}
            </div>
          )}

          {/* Tip */}
          {item.tip && (
            <div className="flex gap-2 text-xs leading-relaxed pt-2" style={{ borderTop: `1px solid ${hexToRgba(accent, 0.1)}` }}>
              <span style={{ color: accent, flexShrink: 0 }}>💡</span>
              <span style={{ color: "var(--color-text)" }}>{item.tip}</span>
            </div>
          )}
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

export default function MaterialsTab({ build, game }: Props) {
  const accent = build.accent ?? "#d64545";
  const allItems = collectAllItems(build);

  const categories = ["Weapons", "Armor", "Rings & Accessories", "Spells"] as const;
  const byCategory: Record<string, CollectedItem[]> = {};
  for (const cat of categories) byCategory[cat] = [];
  for (const entry of allItems) {
    if (byCategory[entry.category]) byCategory[entry.category].push(entry);
  }

  const upgradeMats = new Set<string>();
  for (const { item } of allItems) {
    if (item.up && item.up !== "N/A" && item.up !== "—" && item.up.trim()) {
      upgradeMats.add(item.up);
    }
  }

  const totalItems = allItems.length;
  const questlineCount = allItems.filter(({ item }) => isQuestline(item)).length;

  return (
    <div className="p-4 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="rounded-lg p-4 flex items-start justify-between gap-4"
        style={{ background: hexToRgba(accent, 0.07), border: `1px solid ${hexToRgba(accent, 0.25)}` }}>
        <div>
          <h2 className="font-display text-base font-bold mb-1" style={{ color: "var(--color-bright)" }}>
            {build.label} — Index
          </h2>
          <p className="text-xs" style={{ color: "var(--color-dim)" }}>
            All items across every phase, with locations and upgrade paths.
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0 text-right">
          <div>
            <p className="text-lg font-bold font-mono leading-none" style={{ color: accent }}>{totalItems}</p>
            <p className="text-[10px]" style={{ color: "var(--color-dim)" }}>items</p>
          </div>
          {questlineCount > 0 && (
            <div>
              <p className="text-lg font-bold font-mono leading-none" style={{ color: accent }}>{questlineCount}</p>
              <p className="text-[10px]" style={{ color: "var(--color-dim)" }}>questlines</p>
            </div>
          )}
        </div>
      </div>

      {/* Categories */}
      {categories.map((cat) => {
        const items = byCategory[cat];
        if (!items || items.length === 0) return null;
        return (
          <div key={cat}>
            {/* Section header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{CAT_ICONS[cat]}</span>
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-dim)" }}>
                {cat}
              </span>
              <span className="text-[10px] px-1.5 py-px rounded ml-1"
                style={{ backgroundColor: "var(--color-card-2)", color: "var(--color-dim)" }}>
                {items.length}
              </span>
              <div className="flex-1 h-px ml-1" style={{ backgroundColor: "var(--color-card-2)" }} />
            </div>

            <div className="space-y-1.5">
              {items.map(({ item, phase, phaseIndex }, i) => (
                <ItemRow key={i} item={item} accent={accent} phaseIndex={phaseIndex} phase={phase} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Upgrade materials */}
      {upgradeMats.size > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">🪨</span>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-dim)" }}>
              Upgrade Materials
            </span>
            <div className="flex-1 h-px ml-1" style={{ backgroundColor: "var(--color-card-2)" }} />
          </div>
          <div className="rounded-lg p-3 space-y-1.5" style={{ backgroundColor: "var(--color-card-hi)", border: "1px solid var(--color-card-2)" }}>
            {Array.from(upgradeMats).map((mat, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span style={{ color: hexToRgba(accent, 0.7), flexShrink: 0 }}>•</span>
                <span style={{ color: "var(--color-text)" }}>{mat}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Equip load tiers */}
      {game?.weightInfo && game.weightInfo.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">⚖</span>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-dim)" }}>
              Equip Load Tiers
            </span>
            <div className="flex-1 h-px ml-1" style={{ backgroundColor: "var(--color-card-2)" }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {game.weightInfo.map((tier) => (
              <div key={tier.label} className="rounded-lg p-3"
                style={{ backgroundColor: "var(--color-card-hi)", border: "1px solid var(--color-card-2)" }}>
                <p className="text-xs font-semibold" style={{ color: "var(--color-bright)" }}>{tier.label}</p>
                <p className="text-[10px] font-mono mt-0.5" style={{ color: accent }}>{tier.range}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--color-dim)" }}>{tier.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
