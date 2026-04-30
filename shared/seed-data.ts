import type { Game, Build } from "./types";

// ── GAMES ─────────────────────────────────────────────────────────────────────
// Only DS1R is available. Additional games unlock when you import their codex.

export const SEED_GAMES: Game[] = [
  {
    key: "ds1r",
    name: "Dark Souls: Remastered",
    icon: "🔥",
    statMax: 99,
    endgameBudget: 200,
    softCaps: {
      VIT: 40,
      ATT: 50,
      END: 40,
      STR: 40,
      DEX: 40,
      RES: null,
      INT: 50,
      FTH: 50,
    },
    mats: [
      {
        label: "Standard Titanite",
        items: [
          "Titanite Shard (+1 → +5)",
          "Large Titanite Shard (+6 → +10)",
          "Titanite Chunk (+11 → +14)",
          "Titanite Slab (+15, max upgrade)",
        ],
      },
      {
        label: "Special Stones",
        items: [
          "Green Titanite Shard (lightning / magic path)",
          "Blue Titanite Chunk (magic +10 max)",
          "Red Titanite Chunk (fire +10 max)",
          "White Titanite Chunk (occult / divine path)",
          "Dragon Scale (dragon weapons)",
          "Twinkling Titanite (unique weapons)",
        ],
      },
      {
        label: "Embers",
        items: [
          "Large Ember — standard → +10 ascension (Andre)",
          "Very Large Ember — +10 → +15 (New Londo Ruins)",
          "Enchanted Ember — magic path (Darkroot Garden)",
          "Divine Ember + Large Divine Ember (undead parish / tomb)",
          "Dark Ember — occult ascension (Painted World)",
          "Large Flame Ember — chaos / fire path (Demon Ruins)",
          "Crystal Ember — crystal ascension (Duke's Archives)",
        ],
      },
    ],
    weightInfo: [
      { label: "Light", range: "0–25%", note: "Fast roll — maximum i-frames" },
      { label: "Medium", range: "25–50%", note: "Standard roll — recommended" },
      { label: "Fat", range: "50–100%", note: "Fat roll / slow movement" },
      { label: "Over", range: "100%+", note: "No roll at all" },
    ],
  },
];

// ── BUILDS ────────────────────────────────────────────────────────────────────
// No pre-baked builds. All builds are AI-generated from the imported codex.

export const SEED_BUILDS: Build[] = [];
