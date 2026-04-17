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
  phases: Phase[]; // always 7
  sim: Variant[];
  oth: Variant[];
  ref: RefRow[];
  isAI?: boolean;
}

export interface Phase {
  name: string;
  range: string;
  stats: Record<string, number>;
  sn: string; // short note
  weapons: Item[];
  armor: Item[];
  acc: Item[];
  spells: Item[];
  dmg: { ps: number; sp: number; bs: number; n: string };
  ngCycles?: NgCycle[]; // only on phase 7
}

export interface NgCycle {
  label: string;
  stats: Record<string, number>;
  notes: string;
}

export interface Item {
  n: string; // name
  ap?: number; // attack power
  wt?: number; // weight
  ef?: string; // effect
  st?: string; // status
  eq: string; // equip slot
  d: string; // description
  loc: string; // location
  up: string; // upgrade path
  tip: string; // tip
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

export interface Variant {
  label: string;
  sub: string;
  icon: string;
  a: string; // accent color
  cls: string;
  why: string;
  ph: [CondensedPhase, CondensedPhase, CondensedPhase];
  key: string[];
  steps: string[];
}

export interface CondensedPhase {
  name: string;
  stats: Record<string, number>;
  weapons: string[];
}

export interface RefRow {
  n: string; // name
  i: string; // icon/type
  w: number; // weight
  ap: number; // attack power
  st: string; // status effect
  ar: string; // armor rating
  s: string; // scaling
  a: string; // affinity
}

// ── Knowledge cache ────────────────────────────────────────────────────────────
export interface KnowledgeFact {
  type: "WEAPON" | "SHIELD" | "CATALYST" | "ARMOR" | "RING" | "SPELL" | "BUFF" | "BUILD" | "ITEM" | "MECHANIC" | "GEM" | "UPGRADE" | "MAP" | "LORE";
  name: string;
  location?: string;
  upgrade?: string;
  ap?: number;
  status?: string;
  effect?: string;
  /** Damage at each upgrade level: e.g. "100/120/145/170/200/230/260/295/330/365/400" (+0 to +10) */
  damageTable?: string;
  /** Scaling grade at each upgrade level: e.g. "D/D/C/C/B/B/B/A/A/A/S" */
  scalingTable?: string;
  /** Status buildup at each upgrade level: e.g. "30/35/40/45/50/55/62/70/77/82/85" */
  statusTable?: string;
  /** Stat requirements: e.g. "STR 12 / DEX 18" */
  requirements?: string;
  /** Physical defense (armor pieces) */
  physDef?: number;
  /** Magic defense (armor pieces) */
  magicDef?: number;
  /** Fire defense (armor pieces) */
  fireDef?: number;
  /** Lightning defense (armor pieces) */
  lightningDef?: number;
  /** Holy/dark/non-phys defense (armor pieces) */
  holyDef?: number;
  /** Poise (armor) or stability (shields) */
  poise?: number;
  /** Item weight */
  weight?: number;
  /** Quantity or count (upgrade mats, consumables) */
  quantity?: string;
  raw: string;
}

// ── AI generation request types ────────────────────────────────────────────────
export interface GenerateStep1Request {
  gameKey: string;
  gameName: string;
  buildDescription: string;
  statBudget: number;
  seedStats?: Record<string, number>;
  preferredWeapon?: string;
  referenceUrl?: string;
  knowledgeBlock: string;
  mode: "full" | "semi" | "manual";
}

export interface GenerateStep2Request {
  gameKey: string;
  gameName: string;
  buildKey: string;
  partialBuild: Partial<Build>;
  knowledgeBlock: string;
}

export interface GenerateStep3Request {
  gameKey: string;
  gameName: string;
  buildKey: string;
  partialBuild: Partial<Build>;
  knowledgeBlock: string;
}

export interface UpdateRequest {
  gameKey: string;
  gameName: string;
  knowledgeBlock: string;
}

export interface UpdateResponse {
  patchVersion: string;
  summary: string;
  changes: string[];
  newFacts: KnowledgeFact[];
}
