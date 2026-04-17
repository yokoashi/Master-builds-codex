import type { Build, KnowledgeFact } from "@shared/types";
import { storage } from "./storage";

const MAX_FACTS = 1500; // was 200 — raised to support 8 categories × 150+ items each
const DISPLAY_PER_CAT = 80; // show up to 80 per category (was 80 total flat — now per-category)
const DEDUP_PREFIX_LEN = 40;

const CAT_ORDER = ["WEAPON", "SHIELD", "CATALYST", "ARMOR", "RING", "SPELL", "BUFF", "BUILD", "ITEM", "MECHANIC"] as const;
const CAT_LABELS: Record<string, string> = {
  WEAPON: "Weapons",
  SHIELD: "Shields & Offhand",
  CATALYST: "Casting Tools",
  ARMOR: "Armor",
  RING: "Rings & Accessories",
  SPELL: "Offensive Spells",
  BUFF: "Buffs & Support Spells",
  BUILD: "Bosses & Progression",
  ITEM: "Items",
  MECHANIC: "Mechanics",
};

/** Detect if an item should be classified as a SHIELD based on name/equip-slot */
function isShieldItem(item: { n: string; eq?: string; st?: string }): boolean {
  const name = item.n.toLowerCase();
  const slot = (item.eq ?? "").toLowerCase();
  return (
    /\b(shield|greatshield|buckler|parr(y|ying))\b/.test(name) ||
    /shield|offhand|left.?hand/.test(slot)
  );
}

/** Detect if an item is a casting catalyst (staff, seal, wand, etc.) */
function isCatalystItem(item: { n: string; eq?: string }): boolean {
  const name = item.n.toLowerCase();
  const slot = (item.eq ?? "").toLowerCase();
  return (
    /\b(staff|seal|catalyst|wand|foci|focus|glintstone)\b/.test(name) ||
    /catalyst|staff|seal/.test(slot)
  );
}

/** Walk a build's phases and extract structured item facts */
export function extractFactsFromBuild(build: Build): KnowledgeFact[] {
  const facts: KnowledgeFact[] = [];

  for (const phase of build.phases) {
    for (const w of phase.weapons) {
      // Classify weapons into WEAPON / SHIELD / CATALYST based on name/slot
      let type: KnowledgeFact["type"] = "WEAPON";
      if (isShieldItem(w)) type = "SHIELD";
      else if (isCatalystItem(w)) type = "CATALYST";

      const prefix = type === "SHIELD"
        ? `SHIELD: ${w.n} | Stability:? | Block:? | Loc:${w.loc}`
        : type === "CATALYST"
        ? `CATALYST: ${w.n} | SpellBuff:? | Loc:${w.loc}`
        : `WEAPON: ${w.n} | AP:${w.ap ?? "?"} | Status:${w.st ?? "none"} | Loc:${w.loc} | Up:${w.up}`;

      facts.push({
        type,
        name: w.n,
        location: w.loc,
        upgrade: w.up,
        ap: w.ap,
        status: w.st,
        effect: w.ef,
        raw: prefix,
      });
    }
    for (const a of phase.armor) {
      facts.push({
        type: "ARMOR",
        name: a.n,
        location: a.loc,
        upgrade: a.up,
        raw: `ARMOR: ${a.n} | Wt:${a.wt ?? "?"} | Loc:${a.loc}`,
      });
    }
    for (const acc of phase.acc) {
      facts.push({
        type: "RING",
        name: acc.n,
        location: acc.loc,
        effect: acc.ef,
        raw: `RING/ACC: ${acc.n} | Effect:${acc.ef ?? "none"} | Loc:${acc.loc}`,
      });
    }
    for (const sp of phase.spells) {
      facts.push({
        type: "SPELL",
        name: sp.n,
        location: sp.loc,
        effect: sp.ef,
        raw: `SPELL: ${sp.n} | Effect:${sp.ef ?? "none"} | Loc:${sp.loc}`,
      });
    }
  }

  return facts;
}

/** Merge new facts into the cache with dedup, capped at MAX_FACTS */
export function updateKnowledgeCache(
  gameKey: string,
  gameName: string,
  newFacts: KnowledgeFact[],
  patchNote?: string
): void {
  const existing = storage.getKnowledgeCache(gameKey);
  let currentFacts: KnowledgeFact[] = [];

  if (existing) {
    try {
      currentFacts = JSON.parse(existing.facts);
    } catch {
      currentFacts = [];
    }
  }

  // Dedup by 40-char prefix of raw string (replace old entry with newer one)
  const factMap = new Map<string, KnowledgeFact>(
    currentFacts.map((f) => [f.raw.substring(0, DEDUP_PREFIX_LEN), f])
  );
  for (const fact of newFacts) {
    factMap.set(fact.raw.substring(0, DEDUP_PREFIX_LEN), fact);
  }

  let merged = Array.from(factMap.values());

  // Cap at MAX_FACTS (keep newest by dropping oldest)
  if (merged.length > MAX_FACTS) {
    merged = merged.slice(merged.length - MAX_FACTS);
  }

  storage.upsertKnowledgeCache({
    gameKey,
    facts: JSON.stringify(merged),
    patchNote: patchNote ?? existing?.patchNote ?? null,
  });
}

/** Format facts as a prompt prefix block, grouped by category (80 per category) */
export function buildKnowledgeBlock(gameKey: string): string {
  const cache = storage.getKnowledgeCache(gameKey);
  if (!cache) return "";

  let facts: KnowledgeFact[] = [];
  try {
    facts = JSON.parse(cache.facts);
  } catch {
    return "";
  }

  if (facts.length === 0) return "";

  const ageHours = Math.round(
    (Date.now() - new Date(cache.updatedAt).getTime()) / 3600000
  );

  // Group by type for organized injection (each category gets up to 80 entries)
  const groups: Record<string, KnowledgeFact[]> = {};
  for (const f of facts) {
    if (!groups[f.type]) groups[f.type] = [];
    groups[f.type].push(f);
  }

  let totalShown = 0;
  let factBlock = "";
  for (const cat of CAT_ORDER) {
    const items = groups[cat];
    if (!items || items.length === 0) continue;
    const show = items.slice(-DISPLAY_PER_CAT);
    factBlock += `\n[${CAT_LABELS[cat] ?? cat}] ${show.length}/${items.length}:\n`;
    factBlock += show.map((f) => `- ${f.raw}`).join("\n") + "\n";
    totalShown += show.length;
  }

  if (!factBlock) return "";

  return `KNOWN FACTS FROM PREVIOUS BUILDS (${totalShown} items, ${ageHours}h old):
${factBlock}
Use these as authoritative references. Only search the web for things NOT in this list.
`;
}

/** Check if we have enough cached facts to skip web search */
export function shouldSkipWebSearch(
  gameKey: string,
  referenceUrl?: string,
  isNewCustomGame?: boolean
): boolean {
  if (referenceUrl || isNewCustomGame) return false;
  const cache = storage.getKnowledgeCache(gameKey);
  if (!cache) return false;
  try {
    const facts: KnowledgeFact[] = JSON.parse(cache.facts);
    return facts.length >= 20;
  } catch {
    return false;
  }
}

/** Parse raw AI output lines into KnowledgeFact objects (used by /api/learn) */
export function parseLearnLines(raw: string, gameKey: string, gameName: string): KnowledgeFact[] {
  if (!raw) return [];

  // Map variant prefixes to canonical types
  const REMAP: Record<string, KnowledgeFact["type"]> = {
    // Shields → SHIELD (not WEAPON)
    shield: "SHIELD", greatshield: "SHIELD", buckler: "SHIELD", parrying: "SHIELD",
    offhand: "SHIELD", lantern: "SHIELD", torch: "SHIELD",
    // Casting tools → CATALYST (not WEAPON)
    catalyst: "CATALYST", staff: "CATALYST", seal: "CATALYST", wand: "CATALYST",
    foci: "CATALYST", focus: "CATALYST",
    // Support spells → BUFF (not SPELL)
    buff: "BUFF", support: "BUFF", utility: "BUFF", healing: "BUFF",
    // Ranged/pole → WEAPON
    bow: "WEAPON", crossbow: "WEAPON", greatbow: "WEAPON", polearm: "WEAPON",
    halberd: "WEAPON", spear: "WEAPON", lance: "WEAPON",
    // Accessories → RING
    acc: "RING", talisman: "RING", amulet: "RING", charm: "RING", trinket: "RING",
    // Endgame → BUILD
    ng: "BUILD", endgame: "BUILD", boss: "BUILD", milestone: "BUILD", build: "BUILD",
  };

  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    // Parentheses required: && binds tighter than ||, so without them a 2-char
    // line containing only ":" would pass the length check incorrectly.
    .filter((l) => l.length > 10 && (l.includes("—") || l.includes("|") || l.includes(":")));

  const facts: KnowledgeFact[] = [];

  for (const line of lines) {
    let type: KnowledgeFact["type"] | null = null;
    let rest = line;

    // Try explicit prefix match first
    const prefixMatch = line.match(/^(WEAPON|SHIELD|CATALYST|ARMOR|RING\/ACC|RING|SPELL|BUFF|BUILD)\s+/i);
    if (prefixMatch) {
      const key = prefixMatch[1].toUpperCase().replace("/ACC", "").replace("/", "");
      type = (key === "RING" ? "RING" : key) as KnowledgeFact["type"];
      rest = line.slice(prefixMatch[0].length);
    } else {
      // Try first word REMAP
      const wordMatch = line.match(/^([A-Za-z]+)\s+/);
      if (wordMatch) {
        const key = wordMatch[1].toLowerCase();
        type = REMAP[key] ?? null;
        if (type) rest = line.slice(wordMatch[0].length);
      }
    }

    if (!type) continue;

    // Extract name (everything before first — or |)
    const nameMatch = rest.match(/^([^—|]+)/);
    const name = nameMatch ? nameMatch[1].trim() : rest.slice(0, 60).trim();
    if (!name || name.length < 2) continue;

    // Extract location
    const locMatch = rest.match(/[Ll]oc:\s*([^|—\n]+)/);
    const location = locMatch ? locMatch[1].trim() : undefined;

    // Extract effect
    const efMatch = rest.match(/[Ee]ffect:\s*([^|—\n]+)|[Ee]f:\s*([^|—\n]+)/);
    const effect = efMatch ? (efMatch[1] ?? efMatch[2])?.trim() : undefined;

    facts.push({
      type,
      name,
      location,
      effect,
      raw: `${type}: ${name}${location ? ` | Loc:${location}` : ""}${effect ? ` | Ef:${effect}` : ""} | ${rest.slice(0, 200)}`,
    });
  }

  return facts;
}
