import type { Build, KnowledgeFact } from "@shared/types";
import { storage } from "./storage";

const MAX_FACTS = 5000;       // storage cap: deep wiki crawls return 800+ items per source × 4 sources
const DISPLAY_PER_CAT = 300;  // UI viewer: show up to 300 per category
const INJECT_PER_CAT = 80;    // prompt injection cap: 80×14 cats = 1120 max lines (~110K chars, safe for 200K ctx)
const DEDUP_PREFIX_LEN = 40;

const CAT_ORDER = ["WEAPON", "SHIELD", "CATALYST", "ARMOR", "RING", "SPELL", "BUFF", "BUILD", "ITEM", "MECHANIC", "GEM", "UPGRADE", "MAP", "LORE"] as const;
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
  GEM: "Ashes of War & Gems",
  UPGRADE: "Upgrade Materials",
  MAP: "Areas & Maps",
  LORE: "Lore & Questlines",
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

  // Dedup by (type + name) — new facts replace old ones for the same item.
  // Raw-prefix dedup was wrong: a thin fact "WEAPON: Sword | Loc:x" and a rich
  // fact "WEAPON: Sword | attack: 250 | wt:5" have different prefixes and both
  // survive, so the thin fact with "—" stats persists in the viewer.
  const factKey = (f: KnowledgeFact) => `${f.type}:${f.name.toLowerCase().trim()}`;
  const factMap = new Map<string, KnowledgeFact>(
    currentFacts.map((f) => [factKey(f), f])
  );
  for (const fact of newFacts) {
    const key = factKey(fact);
    const existing = factMap.get(key);
    // Keep whichever fact has more structured data (more non-null fields)
    const score = (f: KnowledgeFact) =>
      [f.ap, f.physDef, f.magicDef, f.fireDef, f.lightningDef, f.holyDef,
       f.poise, f.weight, f.damageTable, f.scalingTable, f.status, f.effect,
       f.requirements, f.location, f.upgrade].filter(v => v != null).length;
    if (!existing || score(fact) >= score(existing)) {
      factMap.set(key, fact);
    }
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

/** Format facts as a prompt prefix block, grouped by category (up to DISPLAY_PER_CAT each) */
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

  // Group by type; inject up to INJECT_PER_CAT per category to stay within context limits
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
    const show = items.slice(-INJECT_PER_CAT);
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

/** Helper: parse a slash-separated numeric progression string (e.g. "100/120/145") */
function parseSlashTable(val: string): string | undefined {
  const clean = val.trim().replace(/\s*\/\s*/g, "/");
  // Must contain at least one slash and look like numbers or letter grades
  if (/[\/]/.test(clean) && clean.length > 2) return clean;
  return undefined;
}

/** Helper: parse a →-separated or (+N)-annotated progression into a slash table */
function parseArrowTable(val: string): string | undefined {
  // "100(+0)/120(+1)/145(+2)" or "100 → 400"
  const arrowMatch = val.match(/([\d.]+)\s*[→\-]+\s*([\d.]+)/);
  if (arrowMatch) return `${arrowMatch[1]}→${arrowMatch[2]}`;
  // "AP: 100(+0)/120(+1)/..." — strip the (+N) annotations and keep values
  const annotated = val.replace(/\(\+\d+\)/g, "").trim();
  return parseSlashTable(annotated);
}

/**
 * Convert a Perplexity-style "codex" JSON into KnowledgeFact arrays.
 * Handles status effects, throwables, runes, bosses, NPCs, classes,
 * endings, upgrade mats, and build phases (ph[]) from the rich wiki extract.
 */
export function extractFactsFromCodex(codex: Record<string, unknown>): KnowledgeFact[] {
  const facts: KnowledgeFact[] = [];

  // ── Status effects ─────────────────────────────────────────────────────────
  for (const se of asArray(codex.statusEffects)) {
    const name = str(se.name); if (!name) continue;
    const effect = str(se.effect);
    const proc = str(se.procThreshold);
    const best = asStringArray(se.bestWeapons).join(", ");
    facts.push({
      type: "MECHANIC",
      name: `Status: ${name}`,
      effect: effect || undefined,
      raw: `MECHANIC: Status ${name} | Effect:${effect}${proc ? ` | Proc:${proc}` : ""}${best ? ` | BestWeapons:${best}` : ""}`,
    });
  }

  // ── Upgrade materials ──────────────────────────────────────────────────────
  for (const mat of asArray(codex.upgradeMaterials)) {
    const tier = str(mat.tier); if (!tier) continue;
    const range = str(mat.upgradeRange);
    const buy = str(mat.buy);
    const farm = str(mat.farm);
    const tip = str(mat.tip);
    facts.push({
      type: "UPGRADE",
      name: tier,
      location: buy || undefined,
      effect: farm || undefined,
      raw: `UPGRADE: ${tier} | Range:${range}${buy ? ` | Buy:${buy}` : ""}${farm ? ` | Farm:${farm}` : ""}${tip ? ` | Tip:${tip}` : ""}`,
    });
  }

  // ── Classes ────────────────────────────────────────────────────────────────
  for (const cls of asArray(codex.classes)) {
    const name = str(cls.name); if (!name) continue;
    const desc = str(cls.desc);
    const stats = cls.stats && typeof cls.stats === "object" && !Array.isArray(cls.stats)
      ? Object.entries(cls.stats as Record<string, unknown>).map(([k, v]) => `${k}:${v}`).join(" ")
      : "";
    facts.push({
      type: "MECHANIC",
      name: `Class: ${name}`,
      effect: desc || undefined,
      raw: `MECHANIC: Class ${name} | ${desc}${stats ? ` | StartStats:${stats}` : ""}`,
    });
  }

  // ── Throwable items ────────────────────────────────────────────────────────
  const throwableData = codex.throwables;
  const throwableItems = throwableData && typeof throwableData === "object" && !Array.isArray(throwableData)
    ? asArray((throwableData as Record<string, unknown>).items)
    : asArray(codex.throwables);
  for (const th of throwableItems) {
    const name = str(th.name); if (!name) continue;
    const dmg = str(th.dmg);
    const ammoCost = th.ammoCost != null ? `${th.ammoCost}` : "";
    const status = str(th.status);
    const loc = str(th.loc);
    const tip = str(th.tip);
    facts.push({
      type: "WEAPON",
      name,
      location: loc || undefined,
      ap: firstNum(dmg),
      status: status || undefined,
      raw: `WEAPON: ${name} | AP:${dmg}${ammoCost ? ` | AmmoCost:${ammoCost}` : ""}${status ? ` | Status:${status}` : ""}${loc ? ` | Loc:${loc}` : ""}${tip ? ` | Tip:${tip}` : ""}`,
    });
  }

  // ── Runes (GEM) ────────────────────────────────────────────────────────────
  const runeData = codex.runes;
  if (runeData && typeof runeData === "object" && !Array.isArray(runeData)) {
    const byShape = (runeData as Record<string, unknown>).byShape;
    if (byShape && typeof byShape === "object" && !Array.isArray(byShape)) {
      for (const [shape, runes] of Object.entries(byShape as Record<string, unknown>)) {
        for (const rune of asArray(runes)) {
          const name = str(rune.name); if (!name) continue;
          const wef = str(rune.weaponEffect);
          const sef = str(rune.shieldEffect);
          facts.push({
            type: "GEM",
            name,
            effect: wef || undefined,
            raw: `GEM: Rune ${name} (${shape}) | Weapon:${wef}${sef ? ` | Shield:${sef}` : ""}`,
          });
        }
      }
    }
  }

  // ── Bosses (BUILD) ─────────────────────────────────────────────────────────
  for (const boss of asArray(codex.bosses)) {
    const name = str(boss.name); if (!name) continue;
    const area = str(boss.area);
    const drop = str(boss.drop);
    const weakness = str(boss.weakness);
    const tip = str(boss.tip);
    facts.push({
      type: "BUILD",
      name,
      location: area || undefined,
      effect: drop || undefined,
      raw: `BUILD: Boss ${name}${area ? ` | Area:${area}` : ""}${drop ? ` | Drop:${drop}` : ""}${weakness ? ` | Weakness:${weakness}` : ""}${tip ? ` | Tip:${tip}` : ""}`,
    });
  }

  // ── NPCs (LORE) ────────────────────────────────────────────────────────────
  for (const npc of asArray(codex.npcs)) {
    const name = str(npc.name); if (!name) continue;
    const loc = str(npc.loc);
    const sells = asStringArray(npc.sells).join(", ");
    const quest = str(npc.quest);
    facts.push({
      type: "LORE",
      name,
      location: loc || undefined,
      raw: `LORE: NPC ${name}${loc ? ` | Loc:${loc}` : ""}${sells ? ` | Sells:${sells}` : ""}${quest ? ` | Quest:${quest}` : ""}`,
    });
  }

  // ── Endings (LORE) ─────────────────────────────────────────────────────────
  for (const ending of asArray(codex.endings)) {
    const name = str(ending.name); if (!name) continue;
    const trophy = str(ending.trophy);
    const unlocks = str(ending.unlocks);
    const missable = str(ending.missableNotes);
    const steps = asStringArray(ending.steps).join(" → ");
    facts.push({
      type: "LORE",
      name: `Ending: ${name}`,
      raw: `LORE: Ending ${name}${trophy ? ` | Trophy:${trophy}` : ""}${unlocks ? ` | Unlocks:${unlocks}` : ""}${steps ? ` | Steps:${steps}` : ""}${missable ? ` | Missable:${missable}` : ""}`,
    });
  }

  // ── Builds section (ph[] → weapons/armor/acc/spells) ──────────────────────
  const buildsSection = codex.builds;
  if (buildsSection && typeof buildsSection === "object" && !Array.isArray(buildsSection)) {
    for (const buildVal of Object.values(buildsSection as Record<string, unknown>)) {
      if (!buildVal || typeof buildVal !== "object") continue;
      const b = buildVal as Record<string, unknown>;
      const phases = Array.isArray(b.ph) ? b.ph : Array.isArray(b.phases) ? b.phases : [];
      for (const phase of phases) {
        if (!phase || typeof phase !== "object") continue;
        const ph = phase as Record<string, unknown>;
        for (const w of asArray(ph.weapons)) {
          const n = str(w.n ?? w.name); if (!n) continue;
          const loc = str(w.loc ?? w.location);
          const up = str(w.up ?? w.upgrade);
          const apStr = str(w.ap);
          const st = str(w.st ?? w.status);
          facts.push({ type: "WEAPON", name: n, location: loc || undefined, upgrade: up || undefined, ap: firstNum(apStr), status: st || undefined, raw: `WEAPON: ${n} | AP:${apStr || "?"} | Status:${st || "none"} | Loc:${loc} | Up:${up}` });
        }
        for (const a of asArray(ph.armor)) {
          const n = str(a.n ?? a.name); if (!n) continue;
          const loc = str(a.loc ?? a.location);
          facts.push({ type: "ARMOR", name: n, location: loc || undefined, raw: `ARMOR: ${n} | Wt:${a.wt ?? "?"} | Loc:${loc}` });
        }
        for (const acc of asArray(ph.acc)) {
          const n = str(acc.n ?? acc.name); if (!n) continue;
          const loc = str(acc.loc ?? acc.location);
          const ef = str(acc.ef ?? acc.effect);
          facts.push({ type: "RING", name: n, location: loc || undefined, effect: ef || undefined, raw: `RING/ACC: ${n} | Effect:${ef || "none"} | Loc:${loc}` });
        }
        for (const sp of asArray(ph.spells)) {
          const n = str(sp.n ?? sp.name); if (!n) continue;
          const loc = str(sp.loc ?? sp.location);
          const ef = str(sp.ef ?? sp.effect);
          facts.push({ type: "SPELL", name: n, location: loc || undefined, effect: ef || undefined, raw: `SPELL: ${n} | Effect:${ef || "none"} | Loc:${loc}` });
        }
      }
    }
  }

  return facts;
}

// ── Private helpers ────────────────────────────────────────────────────────────

function asArray(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as unknown[]).map(String) : [];
}

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/** Extract first numeric value from a string like "80-100" or "250" */
function firstNum(s: string): number | undefined {
  const m = s.match(/[\d]+/);
  return m ? parseInt(m[0], 10) : undefined;
}

/** Parse raw AI output lines into KnowledgeFact objects (used by /api/learn) */
export function parseLearnLines(raw: string, gameKey: string, gameName: string): KnowledgeFact[] {
  if (!raw) return [];

  // Canonical type for first-word prefixes
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
    // Ashes / gems → GEM
    gem: "GEM", ash: "GEM", ashes: "GEM", infusion: "GEM", whetblade: "GEM",
    // Upgrade materials → UPGRADE
    upgrade: "UPGRADE", smithing: "UPGRADE", titanite: "UPGRADE", shard: "UPGRADE",
    somber: "UPGRADE", bone: "UPGRADE",
    // Areas / maps → MAP
    map: "MAP", area: "MAP", zone: "MAP", region: "MAP", location: "MAP",
    // Lore / questlines → LORE
    lore: "LORE", npc: "LORE", questline: "LORE", quest: "LORE", story: "LORE",
    // Mechanics → MECHANIC (non-item game systems)
    mechanic: "MECHANIC", scaling: "MECHANIC", system: "MECHANIC",
  };

  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    // Must be substantive and contain a field delimiter
    .filter((l) => l.length > 10 && (l.includes("—") || l.includes("|") || l.includes(":")));

  const facts: KnowledgeFact[] = [];

  for (const line of lines) {
    let type: KnowledgeFact["type"] | null = null;
    let rest = line;

    // 1. Try explicit keyword prefix (WEAPON:, SHIELD:, MECHANIC:, GEM:, etc.)
    const prefixMatch = line.match(
      /^(WEAPON|SHIELD|CATALYST|ARMOR|RING\/ACC|RING|SPELL|BUFF|BUILD|ITEM|MECHANIC|GEM|UPGRADE|MAP|LORE)[:\s]+/i
    );
    if (prefixMatch) {
      const key = prefixMatch[1].toUpperCase().replace("/ACC", "") as KnowledgeFact["type"];
      type = key;
      rest = line.slice(prefixMatch[0].length);
    } else {
      // 2. First-word REMAP fallback
      const wordMatch = line.match(/^([A-Za-z]+)\s+/);
      if (wordMatch) {
        const key = wordMatch[1].toLowerCase();
        type = REMAP[key] ?? null;
        if (type) rest = line.slice(wordMatch[0].length);
      }
    }

    if (!type) continue;

    // ── Field extraction ───────────────────────────────────────────────────

    // Name: everything before first — or | or a labelled field
    const nameMatch = rest.match(/^([^—|\[]+)/);
    const name = nameMatch ? nameMatch[1].replace(/^[:\-]+/, "").trim() : rest.slice(0, 60).trim();
    if (!name || name.length < 2) continue;

    // Location
    const locMatch = rest.match(/[Ll]oc[:\s]+([^|—\n]+)/);
    const location = locMatch ? locMatch[1].trim() : undefined;

    // Effect / Ef
    const efMatch = rest.match(/[Ee]ffect[:\s]+([^|—\n]+)|\bef[:\s]+([^|—\n]+)/i);
    const effect = efMatch ? (efMatch[1] ?? efMatch[2])?.trim() : undefined;

    // Status (e.g. "status: Bleed 45" or "st: Frost 30")
    const stMatch = rest.match(/\bstatus[:\s]+([^|—\n]+)|\bst[:\s]+([^|—\n]+)/i);
    const status = stMatch ? (stMatch[1] ?? stMatch[2])?.trim() : undefined;

    // Attack power (scalar: "AP: 250" or "ap: 300")
    const apMatch = rest.match(/\bAP[:\s]+([\d]+)/);
    const ap = apMatch ? parseInt(apMatch[1], 10) : undefined;

    // Damage table: "AP: 100(+0)/120(+1)/..." or "AP: 100/120/145/..." or "100 → 400"
    const dmgTableMatch = rest.match(/\bAP[:\s]+([\d()+\/→\-]+(?:[\d()+\/→\-]+)+)/i);
    const damageTable = dmgTableMatch ? parseArrowTable(dmgTableMatch[1]) : undefined;

    // Scaling table: "scaling: D/D/C/C/B/A/S" or "scaling: D(+0)/C(+5)/S(+10)"
    const scaleMatch = rest.match(/\bscaling[:\s]+([A-S][\/()+\d A-S]+)/i);
    const scalingTable = scaleMatch ? parseSlashTable(scaleMatch[1].replace(/\(\+\d+\)/g, "")) : undefined;

    // Status buildup table: "bleed: 30/35/40/.../85" or "status: Bleed 30(+0)/35(+1)/.../85(+10)"
    const statusTableMatch = rest.match(/\b(?:bleed|frost|poison|rot|madness|blood|buildup)[:\s]+([\d()+\/]+(?:[\d()+\/]+)+)/i);
    const statusTable = statusTableMatch ? parseArrowTable(statusTableMatch[1]) : undefined;

    // Stat requirements: "STR 12 / DEX 18" or "stat: STR 12 / DEX 18"
    const reqMatch = rest.match(/\bstat[:\s]+([A-Z]{2,3}\s*\d[^|—\n]+)/i)
      || rest.match(/\b(STR\s+\d[^|—\n]*(?:DEX|INT|FTH|ARC|END|VIG)[^|—\n]*)/i);
    const requirements = reqMatch ? reqMatch[1].trim() : undefined;

    // Weight: "weight: 12.5" or "wt: 8"
    const wtMatch = rest.match(/\b(?:weight|wt)[:\s]+([\d.]+)/i);
    const weight = wtMatch ? parseFloat(wtMatch[1]) : undefined;

    // Armor defense stats: "phys:42.5 | magic:28.3 | fire:31.1 | lightning:25.6 | holy:30.2"
    const physMatch = rest.match(/\bphys(?:ical)?\s*(?:def)?[:\s]+([\d.]+)/i);
    const magicMatch = rest.match(/\bmagic(?:al)?\s*(?:def)?[:\s]+([\d.]+)/i);
    const fireMatch = rest.match(/\bfire\s*(?:def)?[:\s]+([\d.]+)/i);
    const lightMatch = rest.match(/\blightning\s*(?:def)?[:\s]+([\d.]+)/i);
    const holyMatch = rest.match(/\b(?:holy|dark|strike)\s*(?:def)?[:\s]+([\d.]+)/i);
    const poiseMatch = rest.match(/\bpoise[:\s]+([\d.]+)/i);

    const physDef = physMatch ? parseFloat(physMatch[1]) : undefined;
    const magicDef = magicMatch ? parseFloat(magicMatch[1]) : undefined;
    const fireDef = fireMatch ? parseFloat(fireMatch[1]) : undefined;
    const lightningDef = lightMatch ? parseFloat(lightMatch[1]) : undefined;
    const holyDef = holyMatch ? parseFloat(holyMatch[1]) : undefined;
    const poise = poiseMatch ? parseFloat(poiseMatch[1]) : undefined;

    // Quantity (upgrade mats): "x3", "qty: 3", "found N times"
    const qtyMatch = rest.match(/\bqty[:\s]+(\d+)|\bx(\d+)\b/i);
    const quantity = qtyMatch ? (qtyMatch[1] ?? qtyMatch[2]) : undefined;

    // Build the raw summary string (compact, factual)
    let rawParts = [`${type}: ${name}`];
    if (location) rawParts.push(`Loc:${location}`);
    if (ap && !damageTable) rawParts.push(`AP:${ap}`);
    if (damageTable) rawParts.push(`AP:${damageTable}`);
    if (scalingTable) rawParts.push(`Scaling:${scalingTable}`);
    if (status) rawParts.push(`Status:${status}`);
    if (statusTable) rawParts.push(`Buildup:${statusTable}`);
    if (physDef !== undefined) rawParts.push(`Phys:${physDef}`);
    if (magicDef !== undefined) rawParts.push(`Mag:${magicDef}`);
    if (fireDef !== undefined) rawParts.push(`Fire:${fireDef}`);
    if (lightningDef !== undefined) rawParts.push(`Lgt:${lightningDef}`);
    if (holyDef !== undefined) rawParts.push(`Holy:${holyDef}`);
    if (poise !== undefined) rawParts.push(`Poise:${poise}`);
    if (weight !== undefined) rawParts.push(`Wt:${weight}`);
    if (requirements) rawParts.push(`Req:${requirements}`);
    if (effect) rawParts.push(`Ef:${effect}`);
    if (quantity) rawParts.push(`Qty:${quantity}`);

    facts.push({
      type,
      name,
      location,
      ap,
      status,
      effect,
      damageTable,
      scalingTable,
      statusTable,
      requirements,
      physDef,
      magicDef,
      fireDef,
      lightningDef,
      holyDef,
      poise,
      weight,
      quantity,
      raw: rawParts.join(" | "),
    });
  }

  return facts;
}
