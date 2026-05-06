// ── Core domain types for Master Build Codex ──────────────────────────────────

export interface Game {
  key: string;
  name: string;
  icon: string;
  statMax: number;
  endgameBudget: number;
  softCaps: Record<string, number | null>;
  mats: MatSection[];
  weightInfo: WeightTier[];
  isCustom?: boolean;
}

export interface MatSection {
  label: string;
  items: string[];
}

export interface WeightTier {
  label: string;
  range: string;
  note: string;
}

export interface BuildTabNames {
  build?: string;       // replaces "Your Build"
  progression?: string; // replaces "Progression"
  materials?: string;   // replaces "Materials"
  prosCons?: string;    // replaces "Pros & Cons"
  quickRef?: string;    // replaces "Quick Ref"
}

export interface Build {
  key: string;
  gameKey: string;
  label: string;
  sub: string;
  icon: string;
  accent: string; // css color hex
  playstyle: string;
  cls: string;
  caps: string[];
  weaponReq: string[];
  loadouts: Loadout[] | null;
  phases: Phase[];
  pros: string[];
  cons: string[];
  ref: RefRow[];
  sim?: SimilarBuild[];
  oth?: SimilarBuild[];
  tabNames?: BuildTabNames;
  isAI?: boolean;
}

export interface Phase {
  name: string;     // "Early Game" | "Early-Mid Game" | "Mid Game" | "Late Game" | "End Game" | "NG+"
  chapter?: string; // lore chapter title, e.g. "The Vow of the Sacred Flame"
  range: string;    // e.g. "SL 1–20"
  stats: Record<string, number>;
  sn: string;     // short note / strategy summary
  weapons: Item[];
  armor: Item[];
  acc: Item[];    // accessories: rings, talismans, etc.
  spells: Item[];
  dmg: { ps: number; sp: number; bs: number; n: string };
  ngCycles?: NgCycle[]; // only on NG+ phase
}

export interface NgCycle {
  label: string;
  stats: Record<string, number>;
  notes: string;
}

export interface Item {
  n: string;        // name
  ap?: number;      // attack power / AR
  wt?: number;      // weight
  ef?: string;      // effect / passive
  st?: string;      // status buildup
  eq: string;       // equip slot
  wa?: string;      // weapon art / skill name (DS3)
  inf?: string;     // infusion type (DS3: Sharp, Heavy, Refined, Crystal, Chaos, etc.)
  fp?: number;      // FP cost for weapon art or spell cast (DS3)
  d: string;        // description / role in build
  loc: string;      // how / where to get it
  up: string;       // upgrade path
  tip: string;      // build-specific tip
  lore?: string;    // short lore blurb
  durability?: number; // base durability value
  steps?: string[];  // step-by-step acquisition guide for questline/complex items
}

export interface Loadout {
  id: string;
  label: string;
  weaponWt: number;
  endReq: number;
  armor: string;
  pros: string[];
  cons: string[];
}

export interface RefRow {
  n: string;  // name
  i: string;  // type/icon label
  w: number;  // weight
  ap: number; // attack power
  st: string; // status effect
  ar: string; // armor rating
  s: string;  // scaling
  a: string;  // affinity / infusion
}

export interface SimilarBuild {
  n: string;
  cls: string;
  weapon: string;
  why: string;
}

// ── AI provider ────────────────────────────────────────────────────────────────
export type AiProvider = "claude" | "pplx" | "openrouter";

// ── Knowledge cache (minimal — kept for schema compat) ─────────────────────────
export interface KnowledgeFact {
  type: string;
  name: string;
  raw: string;
}

// ── AI generation request types ────────────────────────────────────────────────
export interface GenerateStep1Request {
  gameKey: string;
  gameName: string;
  buildDescription: string;
  provider: AiProvider;
  model: string;
  preferredWeapon?: string;
  /** Semi-AI: per-phase stat seeds. Key = "phase1" | "phase2" | "phase3" | "phase4" */
  seedStats?: Record<string, Record<string, number>>;
  /** Semi-AI: free-text item constraints */
  constraints?: string;
}

export interface GenerateStep2Request {
  gameKey: string;
  gameName: string;
  buildKey: string;
  partialBuild: Partial<Build>;
  provider: AiProvider;
  model: string;
}

export interface GenerateStep3Request {
  gameKey: string;
  gameName: string;
  buildKey: string;
  partialBuild: Partial<Build>;
  provider: AiProvider;
  model: string;
}
