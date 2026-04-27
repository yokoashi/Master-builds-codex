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

// Keys we handle explicitly — used to skip them in the generic fallback
const HANDLED_CODEX_KEYS = new Set([
  "meta", "builds",
  "statusEffects", "upgradeMaterials", "classes", "throwables",
  "runes", "bosses", "npcs", "endings", "stats",
  "ngPlus", "ngplus", "ng+", "trophies",
  "weapons", "weapon", "armor", "armors", "rings", "ring",
  "accessories", "acc", "spells", "spell", "items", "consumables",
  "shields", "shield", "catalysts", "catalyst", "buffs", "buff",
  "areas", "area", "locations", "location", "maps", "enemies",
  "skills", "ashes", "gems", "talismans", "amulets", "charms",
]);

/** Map a top-level JSON key name → KnowledgeFact type */
function keyToFactType(key: string): KnowledgeFact["type"] | null {
  const k = key.toLowerCase();
  if (/weapon|sword|blade|axe|hammer|bow|crossbow|staff|dagger|spear|halberd|lance|fist|claw|whip|gun/.test(k)) return "WEAPON";
  if (/shield|greatshield|buckler/.test(k)) return "SHIELD";
  if (/catalyst|seal|wand|foci|focus/.test(k)) return "CATALYST";
  if (/armor|armour|helm|chest|gauntlet|leg|set/.test(k)) return "ARMOR";
  if (/ring|talisman|amulet|accessor|charm|trinket/.test(k)) return "RING";
  if (/spell|sorcery|incantation|magic|prayer|miracle|pyromancy/.test(k)) return "SPELL";
  if (/buff|support|heal|utility/.test(k)) return "BUFF";
  if (/ash|gem|infusion|whetblade|ashes/.test(k)) return "GEM";
  if (/upgrade|material|smith|titanite|shard|stone|ore/.test(k)) return "UPGRADE";
  if (/item|consumable|potion|tool|misc/.test(k)) return "ITEM";
  if (/area|map|zone|region|location/.test(k)) return "MAP";
  if (/boss|enemy|npc|mob|creature/.test(k)) return "BUILD";
  if (/lore|quest|ending|story|faction/.test(k)) return "LORE";
  if (/class|origin|stat|mechanic|system|skill/.test(k)) return "MECHANIC";
  if (/trophy|achievement/.test(k)) return "LORE";
  return null;
}

/**
 * Convert a Perplexity-style "codex" JSON into KnowledgeFact arrays.
 * Handles every known section explicitly, then falls back to auto-detecting
 * any array-of-named-objects top-level key that wasn't handled explicitly.
 */
export function extractFactsFromCodex(codex: Record<string, unknown>): KnowledgeFact[] {
  const facts: KnowledgeFact[] = [];

  // ── Status effects ─────────────────────────────────────────────────────────
  for (const se of asArray(codex.statusEffects)) {
    const name = str(se.name); if (!name) continue;
    const effect = str(se.effect);
    const proc = str(se.procThreshold ?? se.proc);
    const best = asStringArray(se.bestWeapons ?? se.weapons).join(", ");
    const buildup = str(se.buildup ?? se.buildupThreshold);
    facts.push({
      type: "MECHANIC",
      name: `Status: ${name}`,
      effect: effect || undefined,
      raw: `MECHANIC: Status ${name} | Effect:${effect}${proc ? ` | Proc:${proc}` : ""}${buildup ? ` | Buildup:${buildup}` : ""}${best ? ` | BestWeapons:${best}` : ""}`,
    });
  }

  // ── Upgrade materials ──────────────────────────────────────────────────────
  for (const mat of asArray(codex.upgradeMaterials)) {
    const tier = str(mat.tier ?? mat.name); if (!tier) continue;
    const range = str(mat.upgradeRange ?? mat.range);
    const buy = str(mat.buy ?? mat.location);
    const farm = str(mat.farm ?? mat.drop);
    const tip = str(mat.tip ?? mat.note);
    facts.push({
      type: "UPGRADE",
      name: tier,
      location: buy || undefined,
      effect: farm || undefined,
      raw: `UPGRADE: ${tier}${range ? ` | Range:${range}` : ""}${buy ? ` | Buy:${buy}` : ""}${farm ? ` | Farm:${farm}` : ""}${tip ? ` | Tip:${tip}` : ""}`,
    });
  }

  // ── Classes ────────────────────────────────────────────────────────────────
  for (const cls of asArray(codex.classes)) {
    const name = str(cls.name); if (!name) continue;
    const desc = str(cls.desc ?? cls.description ?? cls.playstyle);
    const statsObj = cls.stats ?? cls.startingStats ?? cls.baseStats;
    const stats = statsObj && typeof statsObj === "object" && !Array.isArray(statsObj)
      ? Object.entries(statsObj as Record<string, unknown>).map(([k, v]) => `${k}:${v}`).join(" ")
      : "";
    const startWep = str(cls.startingWeapon ?? cls.weapon);
    facts.push({
      type: "MECHANIC",
      name: `Class: ${name}`,
      effect: desc || undefined,
      raw: `MECHANIC: Class ${name}${desc ? ` | ${desc}` : ""}${stats ? ` | StartStats:${stats}` : ""}${startWep ? ` | StartWeapon:${startWep}` : ""}`,
    });
  }

  // ── Stats (soft caps, scaling) ─────────────────────────────────────────────
  for (const stat of asArray(codex.stats)) {
    const name = str(stat.name ?? stat.stat); if (!name) continue;
    const desc = str(stat.desc ?? stat.description ?? stat.effect);
    const softCaps = stat.softCaps ?? stat.softcaps;
    const capStr = Array.isArray(softCaps) ? softCaps.join("/") :
      (softCaps && typeof softCaps === "object"
        ? Object.entries(softCaps as Record<string, unknown>).map(([k, v]) => `${k}:${v}`).join(", ")
        : str(softCaps));
    facts.push({
      type: "MECHANIC",
      name: `Stat: ${name}`,
      effect: desc || undefined,
      raw: `MECHANIC: Stat ${name}${desc ? ` | ${desc}` : ""}${capStr ? ` | SoftCaps:${capStr}` : ""}`,
    });
  }

  // ── Throwable items ────────────────────────────────────────────────────────
  const throwableData = codex.throwables;
  const throwableItems = throwableData && typeof throwableData === "object" && !Array.isArray(throwableData)
    ? asArray((throwableData as Record<string, unknown>).items)
    : asArray(codex.throwables);
  for (const th of throwableItems) {
    const name = str(th.name); if (!name) continue;
    const dmg = str(th.dmg ?? th.damage ?? th.ap);
    const ammoCost = th.ammoCost != null ? `${th.ammoCost}` : "";
    const status = str(th.status ?? th.st);
    const loc = str(th.loc ?? th.location);
    const tip = str(th.tip ?? th.note ?? th.effect);
    facts.push({
      type: "ITEM",
      name,
      location: loc || undefined,
      ap: firstNum(dmg),
      status: status || undefined,
      raw: `ITEM: ${name} | Dmg:${dmg || "?"}${ammoCost ? ` | AmmoCost:${ammoCost}` : ""}${status ? ` | Status:${status}` : ""}${loc ? ` | Loc:${loc}` : ""}${tip ? ` | Tip:${tip}` : ""}`,
    });
  }

  // ── Runes (GEM) ────────────────────────────────────────────────────────────
  const runeData = codex.runes;
  if (runeData && typeof runeData === "object" && !Array.isArray(runeData)) {
    const rd = runeData as Record<string, unknown>;
    const byShape = rd.byShape ?? rd.byType ?? rd.types;
    if (byShape && typeof byShape === "object" && !Array.isArray(byShape)) {
      for (const [shape, runes] of Object.entries(byShape as Record<string, unknown>)) {
        for (const rune of asArray(runes)) {
          const name = str(rune.name); if (!name) continue;
          const wef = str(rune.weaponEffect ?? rune.effect ?? rune.wef);
          const sef = str(rune.shieldEffect ?? rune.sef);
          const loc = str(rune.loc ?? rune.location);
          facts.push({
            type: "GEM",
            name,
            effect: wef || undefined,
            location: loc || undefined,
            raw: `GEM: Rune ${name} (${shape}) | Effect:${wef || "?"}${sef ? ` | ShieldEf:${sef}` : ""}${loc ? ` | Loc:${loc}` : ""}`,
          });
        }
      }
    }
    // Also handle flat rune arrays
    for (const rune of asArray(rd.items ?? rd.list)) {
      const name = str(rune.name); if (!name) continue;
      const ef = str(rune.effect ?? rune.weaponEffect);
      facts.push({ type: "GEM", name, effect: ef || undefined, raw: `GEM: ${name} | Effect:${ef || "?"}` });
    }
  } else {
    for (const rune of asArray(codex.runes)) {
      const name = str(rune.name); if (!name) continue;
      const ef = str(rune.effect ?? rune.weaponEffect);
      facts.push({ type: "GEM", name, effect: ef || undefined, raw: `GEM: ${name} | Effect:${ef || "?"}` });
    }
  }

  // ── Top-level weapons array ────────────────────────────────────────────────
  for (const w of asArray(codex.weapons ?? codex.weapon)) {
    const n = str(w.name ?? w.n); if (!n) continue;
    extractItemFact(w, n, "WEAPON", facts);
  }

  // ── Shields ────────────────────────────────────────────────────────────────
  for (const s of asArray(codex.shields ?? codex.shield)) {
    const n = str(s.name ?? s.n); if (!n) continue;
    extractItemFact(s, n, "SHIELD", facts);
  }

  // ── Catalysts / staffs ────────────────────────────────────────────────────
  for (const c of asArray(codex.catalysts ?? codex.catalyst ?? codex.staffs)) {
    const n = str(c.name ?? c.n); if (!n) continue;
    extractItemFact(c, n, "CATALYST", facts);
  }

  // ── Armor ─────────────────────────────────────────────────────────────────
  for (const a of asArray(codex.armor ?? codex.armors)) {
    const n = str(a.name ?? a.n); if (!n) continue;
    const loc = str(a.loc ?? a.location);
    const wt = a.wt ?? a.weight;
    const set = str(a.set ?? a.setName);
    const phys = str(a.phys ?? a.physDef ?? a.physical);
    facts.push({
      type: "ARMOR",
      name: n,
      location: loc || undefined,
      weight: typeof wt === "number" ? wt : undefined,
      raw: `ARMOR: ${n}${set ? ` (${set})` : ""}${phys ? ` | Phys:${phys}` : ""}${wt != null ? ` | Wt:${wt}` : ""}${loc ? ` | Loc:${loc}` : ""}`,
    });
  }

  // ── Rings / accessories / talismans ───────────────────────────────────────
  for (const r of asArray(codex.rings ?? codex.ring ?? codex.accessories ?? codex.talismans ?? codex.amulets)) {
    const n = str(r.name ?? r.n); if (!n) continue;
    const loc = str(r.loc ?? r.location);
    const ef = str(r.effect ?? r.ef ?? r.description ?? r.desc);
    facts.push({
      type: "RING",
      name: n,
      location: loc || undefined,
      effect: ef || undefined,
      raw: `RING/ACC: ${n} | Effect:${ef || "none"}${loc ? ` | Loc:${loc}` : ""}`,
    });
  }

  // ── Spells ────────────────────────────────────────────────────────────────
  for (const sp of asArray(codex.spells ?? codex.spell ?? codex.sorceries ?? codex.incantations ?? codex.miracles)) {
    const n = str(sp.name ?? sp.n); if (!n) continue;
    const loc = str(sp.loc ?? sp.location);
    const ef = str(sp.effect ?? sp.ef ?? sp.description);
    const ap = firstNum(str(sp.ap ?? sp.damage ?? sp.dmg));
    const type: KnowledgeFact["type"] = /buff|support|heal|utility/i.test(ef + n) ? "BUFF" : "SPELL";
    facts.push({
      type,
      name: n,
      location: loc || undefined,
      effect: ef || undefined,
      ap,
      raw: `${type}: ${n} | Effect:${ef || "none"}${loc ? ` | Loc:${loc}` : ""}`,
    });
  }

  // ── Consumable items ──────────────────────────────────────────────────────
  for (const it of asArray(codex.items ?? codex.consumables)) {
    const n = str(it.name ?? it.n); if (!n) continue;
    const loc = str(it.loc ?? it.location);
    const ef = str(it.effect ?? it.description ?? it.desc);
    facts.push({
      type: "ITEM",
      name: n,
      location: loc || undefined,
      effect: ef || undefined,
      raw: `ITEM: ${n} | Effect:${ef || "?"}${loc ? ` | Loc:${loc}` : ""}`,
    });
  }

  // ── Areas / Maps ──────────────────────────────────────────────────────────
  for (const area of asArray(codex.areas ?? codex.locations ?? codex.maps)) {
    const n = str(area.name ?? area.n); if (!n) continue;
    const desc = str(area.desc ?? area.description ?? area.notes);
    const boss = str(area.boss ?? area.mainBoss);
    facts.push({
      type: "MAP",
      name: n,
      effect: desc || undefined,
      raw: `MAP: ${n}${desc ? ` | ${desc}` : ""}${boss ? ` | Boss:${boss}` : ""}`,
    });
  }

  // ── Bosses (BUILD) ─────────────────────────────────────────────────────────
  for (const boss of asArray(codex.bosses ?? codex.enemies)) {
    const name = str(boss.name); if (!name) continue;
    const area = str(boss.area ?? boss.location ?? boss.loc);
    const drop = str(boss.drop ?? boss.reward ?? boss.loot);
    const weakness = str(boss.weakness ?? boss.weaknesses ?? boss.weak);
    const tip = str(boss.tip ?? boss.strategy ?? boss.note);
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
    const loc = str(npc.loc ?? npc.location);
    const sells = asStringArray(npc.sells ?? npc.items).join(", ");
    const quest = str(npc.quest ?? npc.questline);
    const role = str(npc.role ?? npc.type);
    facts.push({
      type: "LORE",
      name,
      location: loc || undefined,
      raw: `LORE: NPC ${name}${role ? ` (${role})` : ""}${loc ? ` | Loc:${loc}` : ""}${sells ? ` | Sells:${sells}` : ""}${quest ? ` | Quest:${quest}` : ""}`,
    });
  }

  // ── Endings (LORE) ─────────────────────────────────────────────────────────
  for (const ending of asArray(codex.endings)) {
    const name = str(ending.name); if (!name) continue;
    const trophy = str(ending.trophy);
    const unlocks = str(ending.unlocks ?? ending.unlock);
    const missable = str(ending.missableNotes ?? ending.missable);
    const steps = asStringArray(ending.steps ?? ending.requirements).join(" → ");
    facts.push({
      type: "LORE",
      name: `Ending: ${name}`,
      raw: `LORE: Ending ${name}${trophy ? ` | Trophy:${trophy}` : ""}${unlocks ? ` | Unlocks:${unlocks}` : ""}${steps ? ` | Steps:${steps}` : ""}${missable ? ` | Missable:${missable}` : ""}`,
    });
  }

  // ── NG+ / NG cycles (BUILD) ────────────────────────────────────────────────
  const ngData = codex.ngPlus ?? codex.ngplus ?? (codex as Record<string, unknown>)["ng+"] ?? codex.ng;
  if (ngData && typeof ngData === "object" && !Array.isArray(ngData)) {
    const ng = ngData as Record<string, unknown>;
    // Handle object of cycle info: { ng1: {...}, ng2: {...} } or { cycles: [...] }
    const cycles = Array.isArray(ng.cycles) ? ng.cycles : Object.values(ng).filter((v) => typeof v === "object");
    for (const cycle of asArray(cycles.length ? cycles : [ng])) {
      const name = str(cycle.name ?? cycle.cycle ?? cycle.label);
      if (!name) continue;
      const diff = str(cycle.difficulty ?? cycle.modifier ?? cycle.desc);
      const reward = str(cycle.reward ?? cycle.drop ?? cycle.bonus);
      facts.push({
        type: "BUILD",
        name: `NG+ ${name}`,
        effect: diff || undefined,
        raw: `BUILD: NG+ ${name}${diff ? ` | Difficulty:${diff}` : ""}${reward ? ` | Reward:${reward}` : ""}`,
      });
    }
  } else {
    for (const cycle of asArray(ngData)) {
      const name = str(cycle.name ?? cycle.cycle); if (!name) continue;
      const diff = str(cycle.difficulty ?? cycle.modifier);
      facts.push({ type: "BUILD", name: `NG+ ${name}`, effect: diff || undefined, raw: `BUILD: NG+ ${name}${diff ? ` | ${diff}` : ""}` });
    }
  }

  // ── Trophies / achievements (LORE) ────────────────────────────────────────
  for (const tr of asArray(codex.trophies ?? codex.achievements)) {
    const name = str(tr.name ?? tr.title); if (!name) continue;
    const desc = str(tr.desc ?? tr.description ?? tr.requirement);
    const type = str(tr.type ?? tr.rarity);
    facts.push({
      type: "LORE",
      name: `Trophy: ${name}`,
      raw: `LORE: Trophy ${name}${type ? ` (${type})` : ""}${desc ? ` | ${desc}` : ""}`,
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

  // ── Generic fallback: any unhandled top-level key with named-item arrays ──
  for (const [key, val] of Object.entries(codex)) {
    if (HANDLED_CODEX_KEYS.has(key.toLowerCase())) continue;
    if (!Array.isArray(val) || val.length === 0) continue;
    const first = val[0];
    if (!first || typeof first !== "object") continue;
    // Must have a name field to be useful
    const firstRec = first as Record<string, unknown>;
    if (!firstRec.name && !firstRec.n && !firstRec.title) continue;

    const type = keyToFactType(key) ?? "ITEM";
    for (const item of val as Record<string, unknown>[]) {
      const n = str(item.name ?? item.n ?? item.title); if (!n) continue;
      const loc = str(item.loc ?? item.location);
      const ef = str(item.effect ?? item.ef ?? item.description ?? item.desc);
      const apStr = str(item.ap ?? item.damage ?? item.dmg);
      facts.push({
        type,
        name: n,
        location: loc || undefined,
        effect: ef || undefined,
        ap: firstNum(apStr),
        raw: `${type}: ${n}${ef ? ` | ${ef}` : ""}${loc ? ` | Loc:${loc}` : ""}`,
      });
    }
  }

  return facts;
}

/** Helper: extract a standard weapon/shield/catalyst fact from an item record */
function extractItemFact(
  w: Record<string, unknown>,
  n: string,
  defaultType: "WEAPON" | "SHIELD" | "CATALYST",
  facts: KnowledgeFact[]
): void {
  const loc = str(w.loc ?? w.location);
  const up = str(w.up ?? w.upgrade);
  const apStr = str(w.ap ?? w.damage ?? w.dmg);
  const st = str(w.st ?? w.status);
  const ef = str(w.effect ?? w.ef ?? w.description);
  const wt = w.wt ?? w.weight;
  const scaling = str(w.scaling ?? w.scale);
  const req = str(w.requirements ?? w.req ?? w.stats);

  let type: KnowledgeFact["type"] = defaultType;
  if (defaultType === "WEAPON") {
    if (isShieldItem({ n, eq: str(w.slot ?? w.eq) })) type = "SHIELD";
    else if (isCatalystItem({ n, eq: str(w.slot ?? w.eq) })) type = "CATALYST";
  }

  facts.push({
    type,
    name: n,
    location: loc || undefined,
    upgrade: up || undefined,
    ap: firstNum(apStr),
    status: st || undefined,
    effect: ef || undefined,
    weight: typeof wt === "number" ? wt : undefined,
    raw: `${type}: ${n} | AP:${apStr || "?"}${st ? ` | Status:${st}` : ""}${scaling ? ` | Scaling:${scaling}` : ""}${req ? ` | Req:${req}` : ""}${up ? ` | Up:${up}` : ""}${wt != null ? ` | Wt:${wt}` : ""}${loc ? ` | Loc:${loc}` : ""}`,
  });
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
