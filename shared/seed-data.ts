import type { Game, Build } from "./types";

// ── GAMES ─────────────────────────────────────────────────────────────────────

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
  {
    key: "ds3",
    name: "Dark Souls III",
    icon: "⚔️",
    statMax: 99,
    endgameBudget: 250,
    softCaps: {
      VIG: 27,   // second cap at 50
      ATT: 35,
      END: 40,
      VIT: 40,
      STR: 40,   // second cap at 66
      DEX: 40,   // second cap at 60
      INT: 40,   // second cap at 60
      FTH: 40,   // second cap at 60
      LCK: 40,
    },
    mats: [
      {
        label: "Standard Titanite",
        items: [
          "Titanite Shard (+1 → +3)",
          "Large Titanite Shard (+4 → +6)",
          "Titanite Chunk (+7 → +9)",
          "Titanite Slab (+10, max regular upgrade)",
        ],
      },
      {
        label: "Infusion Gems",
        items: [
          "Sharp Gem — scales DEX",
          "Heavy Gem — scales STR",
          "Refined Gem — quality STR/DEX",
          "Crystal Gem — scales INT (Crystal)",
          "Simple Gem — scales INT (Simple, regen FP)",
          "Fire Gem — raw fire, no scaling",
          "Chaos Gem — scales INT+FTH (Chaos)",
          "Lightning Gem — scales FTH (Lightning)",
          "Deep Gem — raw dark, no scaling",
          "Dark Gem — scales INT+FTH (Dark)",
          "Blessed Gem — scales FTH, regen HP",
          "Blood Gem — scales LCK (Blood, bleed buildup)",
          "Poison Gem — scales LCK (Poison)",
          "Hollow Gem — scales LCK when hollowed",
          "Profaned Coal / Giant's Coal / etc. — unlock infusion paths at Andre",
        ],
      },
      {
        label: "Unique & Boss Weapons",
        items: [
          "Titanite Scale (+1 → +4 for boss weapons)",
          "Twinkling Titanite (+1 → +4 for unique weapons)",
          "Titanite Slab (max upgrade for all weapon types)",
          "Transpose boss souls via Ludleth into boss weapons & spells",
        ],
      },
    ],
    weightInfo: [
      { label: "Light", range: "0–25%", note: "Fast roll — best i-frames" },
      { label: "Medium", range: "25–50%", note: "Mid roll — recommended for most builds" },
      { label: "Fat", range: "50–70%", note: "Fat roll — significantly reduced i-frames" },
      { label: "Over", range: "70%+", note: "No roll — avoid unless Giant Dad cosplay" },
    ],
  },
];

// ── BUILDS ────────────────────────────────────────────────────────────────────
// No pre-baked builds. All builds are AI-generated from the imported codex.

export const SEED_BUILDS: Build[] = [];
