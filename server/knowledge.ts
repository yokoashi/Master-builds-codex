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
/** Guess a KnowledgeFact type from an item name string */
function guessTypeFromName(name: string): KnowledgeFact["type"] {
  const n = name.toLowerCase();
  if (/\b(sword|blade|axe|hammer|bow|crossbow|dagger|spear|halberd|lance|fist|claw|whip|gun|knife|glory|flail|mace|club|flintlock|greataxe|greatsword|scythe|glaive|staff|wand|seal)\b/.test(n)) return "WEAPON";
  if (/\b(shield|greatshield|buckler)\b/.test(n)) return "SHIELD";
  if (/\b(ring|pendant|talisman|amulet|charm|trinket|sting|bane|necklace)\b/.test(n)) return "RING";
  if (/\b(set|helm|helmet|chest|gauntlet|leg|armor|armour|cuirass|greaves)\b/.test(n)) return "ARMOR";
  if (/\b(eye|umbral eye|lamp)\b/.test(n)) return "ITEM";
  return "RING";
}

/** Map a top-level JSON key name → KnowledgeFact type */
/**
 * Convert a Perplexity-style soulslike codex JSON into KnowledgeFact arrays.
 * Schema-aware: handles every section of the known format including nested
 * sim/oth build arrays, stats-as-object, throwable keyRings, rune string summaries,
 * weightClasses, ammoPoolFormula, ngPlus object, trophies.keyTrophies, and
 * per-phase ngCycles arrays.
 */
export function extractFactsFromCodex(codexInput: Record<string, unknown>): KnowledgeFact[] {
  // Unwrap single-key document wrapper (e.g. { lotfCodex: {...} })
  const codex: Record<string, unknown> =
    (codexInput.lotfCodex && typeof codexInput.lotfCodex === "object" && !Array.isArray(codexInput.lotfCodex))
      ? (codexInput.lotfCodex as Record<string, unknown>)
      : codexInput;
  const facts: KnowledgeFact[] = [];

  // ── 1. Classes → MECHANIC ──────────────────────────────────────────────────
  for (const cls of asArray(codex.classes)) {
    const name = str(cls.name); if (!name) continue;
    const desc = str(cls.desc ?? cls.description ?? cls.playstyle);
    const statsObj = cls.stats ?? cls.startingStats ?? cls.baseStats;
    const statsStr = statsObj && typeof statsObj === "object" && !Array.isArray(statsObj)
      ? Object.entries(statsObj as Record<string, unknown>).map(([k, v]) => `${k}:${v}`).join(" ")
      : "";
    facts.push({
      type: "MECHANIC",
      name: `Class: ${name}`,
      effect: desc || undefined,
      raw: `MECHANIC: Class ${name}${desc ? ` | ${desc}` : ""}${statsStr ? ` | StartStats:${statsStr}` : ""}`,
    });
  }

  // ── 2. Stats → MECHANIC  (object keyed by stat name, NOT an array) ─────────
  const statsSection = codex.stats;
  if (statsSection && typeof statsSection === "object" && !Array.isArray(statsSection)) {
    // Rich codex format has primary_stats sub-key — handled in rich sections below; skip old-style iteration
    for (const [statName, statData] of ((statsSection as Record<string, unknown>).primary_stats
      ? []
      : Object.entries(statsSection as Record<string, unknown>))) {
      if (!statName || !statData || typeof statData !== "object" || Array.isArray(statData)) continue;
      const sd = statData as Record<string, unknown>;
      const desc = str(sd.desc ?? sd.description);
      const softCap = sd.softCap != null ? String(sd.softCap) : "none";
      const hardCap = sd.hardCap != null ? String(sd.hardCap) : "none";
      facts.push({
        type: "MECHANIC",
        name: `Stat: ${statName}`,
        effect: desc || undefined,
        raw: `MECHANIC: Stat ${statName} | SoftCap:${softCap} | HardCap:${hardCap}${desc ? ` | ${desc}` : ""}`,
      });
    }
  } else {
    // fallback: stats as array [{ name, desc, softCap, hardCap }]
    for (const stat of asArray(codex.stats)) {
      const name = str(stat.name ?? stat.stat); if (!name) continue;
      const desc = str(stat.desc ?? stat.description);
      const softCap = stat.softCap != null ? String(stat.softCap) : "none";
      const hardCap = stat.hardCap != null ? String(stat.hardCap) : "none";
      facts.push({
        type: "MECHANIC",
        name: `Stat: ${name}`,
        effect: desc || undefined,
        raw: `MECHANIC: Stat ${name} | SoftCap:${softCap} | HardCap:${hardCap}${desc ? ` | ${desc}` : ""}`,
      });
    }
  }

  // ── 3. ammoPoolFormula → MECHANIC ─────────────────────────────────────────
  const apf = codex.ammoPoolFormula as Record<string, unknown> | undefined;
  if (apf && str(apf.desc)) {
    facts.push({
      type: "MECHANIC",
      name: "Ammo Pool Formula",
      effect: str(apf.desc),
      raw: `MECHANIC: Ammo Pool Formula | ${str(apf.desc)}${apf.hardCapPips != null ? ` | HardCap:${apf.hardCapPips} pips` : ""}`,
    });
  }

  // ── 4. Status effects → MECHANIC ─────────────────────────────────────────
  for (const se of asArray(codex.statusEffects)) {
    const name = str(se.name); if (!name) continue;
    const effect = str(se.effect);
    const proc = str(se.procThreshold ?? se.proc);
    const best = asStringArray(se.bestWeapons ?? se.weapons).join(", ");
    facts.push({
      type: "MECHANIC",
      name: `Status: ${name}`,
      effect: effect || undefined,
      raw: `MECHANIC: Status ${name} | Effect:${effect}${proc ? ` | Proc:${proc}` : ""}${best ? ` | BestWeapons:${best}` : ""}`,
    });
  }

  // ── 5. Upgrade materials → UPGRADE ───────────────────────────────────────
  for (const mat of asArray(codex.upgradeMaterials)) {
    const tier = str(mat.tier ?? mat.name); if (!tier) continue;
    const range = str(mat.upgradeRange ?? mat.range);
    const buy = str(mat.buy ?? mat.location);
    const farm = str(mat.farm ?? mat.drop);
    const tip = str(mat.tip ?? mat.note);
    const find = Array.isArray(mat.find)
      ? (mat.find as unknown[]).map(String).join(", ")
      : str(mat.find);
    facts.push({
      type: "UPGRADE",
      name: tier,
      location: buy || find || undefined,
      effect: farm || undefined,
      raw: `UPGRADE: ${tier}${range ? ` | Range:${range}` : ""}${buy ? ` | Buy:${buy}` : ""}${farm ? ` | Farm:${farm}` : ""}${find ? ` | Find:${find}` : ""}${tip ? ` | Tip:${tip}` : ""}`,
    });
  }

  // ── 6. Weight classes → MECHANIC (object, not array) ─────────────────────
  const wc = codex.weightClasses as Record<string, unknown> | undefined;
  if (wc) {
    for (const key of ["light", "medium", "heavy"]) {
      const entry = wc[key] as Record<string, unknown> | undefined;
      if (!entry) continue;
      const threshold = str(entry.threshold);
      const effect = str(entry.effect);
      facts.push({
        type: "MECHANIC",
        name: `Weight: ${key[0].toUpperCase() + key.slice(1)} Load`,
        effect: effect || undefined,
        raw: `MECHANIC: Weight ${key} | ${threshold}${effect ? ` | ${effect}` : ""}`,
      });
    }
    for (const note of asStringArray(wc.notes)) {
      if (note.length < 10) continue;
      facts.push({ type: "MECHANIC", name: "Weight Note", effect: note, raw: `MECHANIC: Weight Note | ${note}` });
    }
  }

  // ── 7. Throwables → RING (keyRings) + ITEM (items) + MECHANIC (desc) ──────
  const throwData = codex.throwables as Record<string, unknown> | undefined;
  if (throwData) {
    if (str(throwData.desc)) {
      facts.push({
        type: "MECHANIC",
        name: "Throwable Mechanics",
        effect: str(throwData.desc),
        raw: `MECHANIC: Throwable Mechanics | ${str(throwData.desc)}`,
      });
    }
    for (const ring of asArray(throwData.keyRings)) {
      const name = str(ring.name); if (!name) continue;
      const ef = str(ring.effect ?? ring.ef);
      const loc = str(ring.loc ?? ring.location);
      facts.push({
        type: "RING",
        name,
        effect: ef || undefined,
        location: loc || undefined,
        raw: `RING/ACC: ${name} | Effect:${ef || "none"}${loc ? ` | Loc:${loc}` : ""}`,
      });
    }
    for (const th of asArray(throwData.items)) {
      const name = str(th.name); if (!name) continue;
      const dmg = str(th.dmg ?? th.damage ?? th.ap);
      const ammoCost = th.ammoCost != null ? `${th.ammoCost}` : "";
      const status = str(th.status ?? th.st);
      const loc = str(th.loc ?? th.location);
      const tip = str(th.tip ?? th.note);
      facts.push({
        type: "ITEM",
        name,
        location: loc || undefined,
        ap: firstNum(dmg),
        status: status || undefined,
        raw: `ITEM: ${name} | Dmg:${dmg || "?"}${ammoCost ? ` | AmmoCost:${ammoCost}` : ""}${status ? ` | Status:${status}` : ""}${loc ? ` | Loc:${loc}` : ""}${tip ? ` | Tip:${tip}` : ""}`,
      });
    }
  }

  // ── 8. Runes → GEM ────────────────────────────────────────────────────────
  const runeData = codex.runes as Record<string, unknown> | undefined;
  if (runeData) {
    // throwerPriority: array of strings like "Aelstrix (weapon: +throwable dmg | shield: +ammo)"
    for (const priority of asStringArray(runeData.throwerPriority)) {
      const nameMatch = priority.match(/^([A-Za-z'']+)/);
      if (!nameMatch) continue;
      facts.push({ type: "GEM", name: nameMatch[1], effect: priority, raw: `GEM: ${priority}` });
    }
    // byShape: { "Circular_STR": [{name, weaponEffect, shieldEffect},...], "InvertedTriangle_AGI": "summary string", ... }
    const byShape = runeData.byShape as Record<string, unknown> | undefined;
    if (byShape) {
      for (const [shape, runes] of Object.entries(byShape)) {
        if (typeof runes === "string") {
          // Summary string for a whole category
          facts.push({ type: "GEM", name: `Rune Category: ${shape}`, effect: runes, raw: `GEM: Rune Category ${shape} | ${runes}` });
        } else {
          for (const rune of asArray(runes)) {
            const name = str(rune.name); if (!name) continue;
            const wef = str(rune.weaponEffect ?? rune.effect ?? rune.wef);
            const sef = str(rune.shieldEffect ?? rune.sef);
            facts.push({
              type: "GEM",
              name,
              effect: wef || undefined,
              raw: `GEM: Rune ${name} (${shape}) | Weapon:${wef || "?"}${sef ? ` | Shield:${sef}` : ""}`,
            });
          }
        }
      }
    }
  }

  // ── 9. Builds → full walk ─────────────────────────────────────────────────
  // Each build entry has: ph[] (full phases), sim[] (similar builds), oth[] (other builds),
  // ref[] (quick-ref rows), loadouts[] (loadout entries)
  const buildsSection = codex.builds as Record<string, unknown> | undefined;
  if (buildsSection) {
    for (const buildVal of Object.values(buildsSection)) {
      if (!buildVal || typeof buildVal !== "object" || Array.isArray(buildVal)) continue;
      const b = buildVal as Record<string, unknown>;

      // Loadouts → MECHANIC
      for (const loadout of asArray(b.loadouts)) {
        const label = str(loadout.label ?? loadout.id); if (!label) continue;
        const armor = str(loadout.armor);
        const pros = str(loadout.pros);
        facts.push({
          type: "MECHANIC",
          name: `Loadout: ${label}`,
          effect: pros || undefined,
          raw: `MECHANIC: Loadout ${label}${armor ? ` | Armor:${armor}` : ""}${pros ? ` | Pros:${pros}` : ""}`,
        });
      }

      // Main phases — full item object format: weapons[], armor[], acc[], spells[]
      for (const phase of asArray(b.ph)) {
        extractFullPhase(phase, facts);
      }

      // sim[] and oth[] — abbreviated format: { ph:[{n,r,s,w:string,ar:string,dm}], key:[{i,d}] }
      for (const sub of [...asArray(b.sim), ...asArray(b.oth)]) {
        extractAbbrevBuild(sub, facts);
      }

      // ref[] — quick-ref rows: { n, w, ap, st, ar }
      for (const ref of asArray(b.ref)) {
        const wName = str(ref.w ?? ref.weapon);
        if (wName) {
          facts.push({
            type: "WEAPON",
            name: wName,
            ap: firstNum(str(ref.ap)),
            status: str(ref.st ?? ref.status) || undefined,
            raw: `WEAPON: ${wName} | AP:${str(ref.ap) || "?"}${ref.st ? ` | Status:${str(ref.st)}` : ""}`,
          });
        }
        const arName = str(ref.ar ?? ref.armor);
        if (arName) {
          facts.push({ type: "ARMOR", name: arName, raw: `ARMOR: ${arName}` });
        }
      }
    }
  }

  // ── 10. Bosses → BUILD ────────────────────────────────────────────────────
  for (const boss of asArray(codex.bosses)) {
    const name = str(boss.name); if (!name) continue;
    const area = str(boss.area ?? boss.location ?? boss.loc);
    const drop = str(boss.drop ?? boss.reward ?? boss.loot);
    const weakness = str(boss.weakness ?? boss.weaknesses);
    const tip = str(boss.tip ?? boss.strategy);
    facts.push({
      type: "BUILD",
      name,
      location: area || undefined,
      effect: drop || undefined,
      raw: `BUILD: Boss ${name}${area ? ` | Area:${area}` : ""}${drop ? ` | Drop:${drop}` : ""}${weakness ? ` | Weakness:${weakness}` : ""}${tip ? ` | Tip:${tip}` : ""}`,
    });
  }

  // ── 11. NPCs → LORE ──────────────────────────────────────────────────────
  for (const npc of asArray(codex.npcs)) {
    const name = str(npc.name); if (!name) continue;
    const loc = str(npc.loc ?? npc.location);
    const sells = asStringArray(npc.sells ?? npc.items).join(", ");
    const quest = str(npc.quest ?? npc.questline);
    facts.push({
      type: "LORE",
      name,
      location: loc || undefined,
      raw: `LORE: NPC ${name}${loc ? ` | Loc:${loc}` : ""}${sells ? ` | Sells:${sells}` : ""}${quest ? ` | Quest:${quest}` : ""}`,
    });
  }

  // ── 12. Endings → LORE ───────────────────────────────────────────────────
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

  // ── 13. ngPlus → MECHANIC  (object, not array of cycles) ─────────────────
  const ng = codex.ngPlus as Record<string, unknown> | undefined;
  if (ng) {
    const carryOver = asStringArray(ng.carryOver);
    const doesNot = asStringArray(ng.doesNotCarryOver ?? ng.doesNotCarry);
    if (carryOver.length)
      facts.push({ type: "MECHANIC", name: "NG+ Carry Over", effect: carryOver.join(", "), raw: `MECHANIC: NG+ CarryOver | ${carryOver.join(", ")}` });
    if (doesNot.length)
      facts.push({ type: "MECHANIC", name: "NG+ Does Not Carry", effect: doesNot.join(", "), raw: `MECHANIC: NG+ DoesNotCarry | ${doesNot.join(", ")}` });

    // vestigenRemoval: { "NG+1": "few removed", "NG+2": "more removed", ... }
    const vr = ng.vestigenRemoval ?? ng.vestigeRemoval;
    if (vr && typeof vr === "object" && !Array.isArray(vr)) {
      for (const [cycle, note] of Object.entries(vr as Record<string, unknown>)) {
        facts.push({ type: "MECHANIC", name: `NG+ Vestiges ${cycle}`, effect: str(note), raw: `MECHANIC: NG+ Vestiges ${cycle} | ${str(note)}` });
      }
    }
    if (ng.ng0Option)
      facts.push({ type: "MECHANIC", name: "NG+0 Option", effect: str(ng.ng0Option), raw: `MECHANIC: NG+0 | ${str(ng.ng0Option)}` });
    if (ng.communityTip)
      facts.push({ type: "MECHANIC", name: "NG+ Community Tip", effect: str(ng.communityTip), raw: `MECHANIC: NG+ Tip | ${str(ng.communityTip)}` });
    if (ng.throwableNote)
      facts.push({ type: "MECHANIC", name: "NG+ Throwable Note", effect: str(ng.throwableNote), raw: `MECHANIC: NG+ Throwable | ${str(ng.throwableNote)}` });
    if (ng.minimumPlaythroughs)
      facts.push({ type: "MECHANIC", name: "NG+ Min Playthroughs", effect: String(ng.minimumPlaythroughs), raw: `MECHANIC: NG+ MinPlaythroughs | ${ng.minimumPlaythroughs}` });
  }

  // ── 14. Trophies → LORE  (object with keyTrophies array, not a top-level array) ──
  const trophies = codex.trophies as Record<string, unknown> | undefined;
  if (trophies) {
    for (const tr of asArray(trophies.keyTrophies ?? trophies.trophies ?? trophies.achievements)) {
      const name = str(tr.name ?? tr.title); if (!name) continue;
      const ttype = str(tr.type ?? tr.rarity);
      const req = str(tr.req ?? tr.requirement ?? tr.desc);
      const missable = tr.missable ? " [MISSABLE]" : "";
      facts.push({
        type: "LORE",
        name: `Trophy: ${name}`,
        raw: `LORE: Trophy ${name}${ttype ? ` (${ttype})` : ""}${missable}${req ? ` | Req:${req}` : ""}`,
      });
    }
    // Also add summary stats as a single LORE fact
    if (trophies.total) {
      facts.push({ type: "LORE", name: "Trophy Summary", raw: `LORE: Trophies total:${trophies.total} | missable:${trophies.missable ?? "?"} | onlineReq:${trophies.onlineRequired ?? "?"} | minPlaythroughs:${trophies.minimumPlaythroughs ?? "?"}` });
    }
  }

  // ── 15. Rich stats (primary_stats / secondary_stats) → MECHANIC ─────────────
  const richStats = codex.stats as Record<string, unknown> | undefined;
  if (richStats && (richStats.primary_stats || richStats.secondary_stats)) {
    for (const ps of asArray(richStats.primary_stats)) {
      const name = str(ps.stat ?? ps.name); if (!name) continue;
      const governs = str(ps.governs);
      const buildUse = str(ps.build_use ?? ps.buildUse);
      const caps = str(ps.caps);
      const softCaps = asStringArray(ps.soft_caps ?? ps.softCaps).join(", ");
      facts.push({
        type: "MECHANIC",
        name: `Stat: ${name}`,
        effect: governs || undefined,
        raw: `MECHANIC: Stat ${name}${caps ? ` | Caps:${caps}` : ""}${softCaps ? ` | SoftCaps:${softCaps}` : ""}${governs ? ` | Governs:${governs}` : ""}${buildUse ? ` | BuildUse:${buildUse}` : ""}`,
      });
    }
    const secondary = richStats.secondary_stats as Record<string, unknown> | undefined;
    if (secondary && typeof secondary === "object" && !Array.isArray(secondary)) {
      for (const [statName, statDesc] of Object.entries(secondary)) {
        const desc = typeof statDesc === "string"
          ? statDesc
          : str((statDesc as Record<string, unknown>)?.description ?? (statDesc as Record<string, unknown>)?.desc);
        if (!desc) continue;
        facts.push({ type: "MECHANIC", name: `Stat: ${statName}`, effect: desc, raw: `MECHANIC: Stat ${statName} | ${desc}` });
      }
    }
  }

  // ── 16. mechanics section → MECHANIC ──────────────────────────────────────
  const mechanicsSection = codex.mechanics as Record<string, unknown> | undefined;
  if (mechanicsSection) {
    for (const se of asArray(mechanicsSection.status_effects)) {
      const name = str(se.name); if (!name) continue;
      const effect = str(se.effect ?? se.desc);
      const threshold = str(se.threshold ?? se.proc);
      facts.push({
        type: "MECHANIC",
        name: `Status: ${name}`,
        effect: effect || undefined,
        raw: `MECHANIC: Status ${name}${threshold ? ` | Threshold:${threshold}` : ""}${effect ? ` | Effect:${effect}` : ""}`,
      });
    }
    for (const tip of asArray(mechanicsSection.combat_tips)) {
      const tipStr = str((tip as unknown as string).toString !== Object.prototype.toString
        ? tip
        : (tip.tip ?? tip.name ?? tip));
      if (tipStr.length < 10 || tipStr.startsWith("[object")) continue;
      facts.push({ type: "MECHANIC", name: "Combat Tip", effect: tipStr, raw: `MECHANIC: Combat Tip | ${tipStr}` });
    }
    const ngPlus = mechanicsSection.ng_plus as Record<string, unknown> | undefined;
    if (ngPlus) {
      const carry = asStringArray(ngPlus.carryOver ?? ngPlus.carry_over);
      const doesNot = asStringArray(ngPlus.doesNotCarry ?? ngPlus.does_not_carry);
      if (carry.length) facts.push({ type: "MECHANIC", name: "NG+ Carry Over", effect: carry.join(", "), raw: `MECHANIC: NG+ CarryOver | ${carry.join(", ")}` });
      if (doesNot.length) facts.push({ type: "MECHANIC", name: "NG+ Does Not Carry", effect: doesNot.join(", "), raw: `MECHANIC: NG+ DoesNotCarry | ${doesNot.join(", ")}` });
    }
  }

  // ── 17. classes rich format (starting_classes / unlockable_classes) → MECHANIC
  const classesRich = codex.classes as Record<string, unknown> | undefined;
  if (classesRich && (classesRich.starting_classes || classesRich.unlockable_classes)) {
    const allClasses = [
      ...asArray(classesRich.starting_classes),
      ...asArray(classesRich.unlockable_classes),
    ];
    for (const cls of allClasses) {
      const name = str(cls.name); if (!name) continue;
      const desc = str(cls.description ?? cls.playstyle ?? cls.desc);
      const statsObj = cls.stats ?? cls.starting_stats ?? cls.baseStats;
      const statsStr = statsObj && typeof statsObj === "object" && !Array.isArray(statsObj)
        ? Object.entries(statsObj as Record<string, unknown>).map(([k, v]) => `${k}:${v}`).join(" ")
        : "";
      facts.push({
        type: "MECHANIC",
        name: `Class: ${name}`,
        effect: desc || undefined,
        raw: `MECHANIC: Class ${name}${desc ? ` | ${desc}` : ""}${statsStr ? ` | Stats:${statsStr}` : ""}`,
      });
    }
  }

  // ── 18. Magic spells (radiance / inferno / umbral) → SPELL ───────────────
  const magic = codex.magic as Record<string, unknown> | undefined;
  if (magic) {
    const spellsSection = magic.spells as Record<string, unknown> | undefined;
    if (spellsSection) {
      for (const school of ["radiance", "inferno", "umbral"]) {
        for (const sp of asArray(spellsSection[school])) {
          const name = str(sp.name); if (!name) continue;
          const effect = str(sp.effect ?? sp.description ?? sp.desc);
          const loc = str(sp.location ?? sp.loc);
          const mana = sp.mana_cost != null ? String(sp.mana_cost) : str(sp.mana ?? sp.fp_cost);
          const missable = sp.missable ? " [MISSABLE]" : "";
          const reqs = str(sp.reqs ?? sp.requirements);
          facts.push({
            type: "SPELL",
            name,
            location: loc || undefined,
            effect: effect || undefined,
            raw: `SPELL: ${name} (${school})${missable}${mana ? ` | Mana:${mana}` : ""}${reqs ? ` | Req:${reqs}` : ""}${loc ? ` | Loc:${loc}` : ""}${effect ? ` | Effect:${effect}` : ""}`,
          });
        }
      }
    }
  }

  // ── 19. Weapons by type → WEAPON / CATALYST ───────────────────────────────
  // Stat fields like str/agi/rad/inf contain "11 D+" (req + grade). Split them.
  function extractStatGrade(val: unknown): string {
    if (val == null) return "";
    const s = String(val).trim();
    if (!s || s === "—" || s === "-" || s === "0") return "";
    const m = s.match(/^\d+\s+(.+)/); // "11 D+" → "D+"
    return m ? m[1].trim() : s;       // already just a grade → return as-is
  }
  function extractStatReq(val: unknown): number | null {
    if (val == null) return null;
    const m = String(val).match(/^(\d+)/);
    const n = m ? parseInt(m[1]) : 0;
    return n > 0 ? n : null;
  }

  const weaponsSection = codex.weapons as Record<string, unknown> | undefined;
  if (weaponsSection) {
    for (const [weaponType, weaponCategory] of Object.entries(weaponsSection)) {
      if (!weaponCategory || typeof weaponCategory !== "object") continue;
      const cat = weaponCategory as Record<string, unknown>;
      for (const w of asArray(cat.weapons)) {
        const name = str(w.name ?? w.n); if (!name) continue;
        const loc = str(w.location ?? w.loc);
        // Scaling grades from str/agi/rad/inf (each like "11 D+")
        const statKeys = ["str", "agi", "rad", "inf"] as const;
        const statLabels = ["STR", "AGI", "RAD", "INF"];
        const gradeParts: string[] = [];
        const reqParts: string[] = [];
        for (let i = 0; i < statKeys.length; i++) {
          const raw = (w as Record<string, unknown>)[statKeys[i]];
          const grade = extractStatGrade(raw);
          const req = extractStatReq(raw);
          if (grade) gradeParts.push(`${statLabels[i]}:${grade}`);
          if (req) reqParts.push(`${statLabels[i]} ${req}`);
        }
        const scalingTableVal = gradeParts.length > 0 ? gradeParts.join(" ") : undefined;
        const requirementsVal = reqParts.length > 0 ? reqParts.join(" / ") : undefined;
        // Damage from phy/holy/fire/wither
        const dmgParts: string[] = [];
        if (w.phy != null) dmgParts.push(`Phy:${w.phy}`);
        if (w.holy != null) dmgParts.push(`Holy:${w.holy}`);
        if (w.fire != null) dmgParts.push(`Fire:${w.fire}`);
        if (w.wither != null) dmgParts.push(`Wither:${w.wither}`);
        const dmgStr = dmgParts.join(" ");
        const apNum = typeof w.phy === "number" ? w.phy
          : typeof w.holy === "number" ? w.holy
          : typeof w.fire === "number" ? w.fire
          : undefined;
        // Weight field is wgt in this codex
        const wt = w.wgt ?? w.wt ?? w.weight;
        // Status buildups → statusTable string + primary status name
        const statusParts: string[] = [];
        let primaryStatus = "";
        for (const s of ["bleed", "smite", "ignite", "frostbite", "poison"]) {
          const sv = (w as Record<string, unknown>)[s];
          if (sv != null && sv !== 0 && sv !== "0") {
            statusParts.push(`${s}:${sv}`);
            if (!primaryStatus) primaryStatus = s;
          }
        }
        const statusTableVal = statusParts.length > 0 ? statusParts.join(" ") : undefined;
        const special = str(w.special ?? w.tip ?? w.note);
        let type: KnowledgeFact["type"] = "WEAPON";
        if (isCatalystItem({ n: name, eq: weaponType })) type = "CATALYST";
        facts.push({
          type,
          name,
          location: loc || undefined,
          ap: apNum,
          scalingTable: scalingTableVal,
          statusTable: statusTableVal,
          status: primaryStatus || undefined,
          requirements: requirementsVal,
          weight: typeof wt === "number" ? wt : undefined,
          raw: `${type}: ${name} (${weaponType})${scalingTableVal ? ` | Scaling:${scalingTableVal}` : ""}${dmgStr ? ` | Dmg:${dmgStr}` : ""}${statusTableVal ? ` | Status:${statusTableVal}` : ""}${wt != null ? ` | Wt:${wt}` : ""}${requirementsVal ? ` | Req:${requirementsVal}` : ""}${loc ? ` | Loc:${loc}` : ""}${special ? ` | Note:${special}` : ""}`,
        });
      }
      // Catalyst sub-arrays (radiance_catalysts, inferno_catalysts, umbral_catalysts)
      for (const catalystKey of ["radiance_catalysts", "inferno_catalysts", "umbral_catalysts"]) {
        const school = catalystKey.replace("_catalysts", "");
        for (const c of asArray(cat[catalystKey])) {
          const name = str(c.name ?? c.n); if (!name) continue;
          const loc = str(c.location ?? c.loc);
          const spellpower = c.spellpower != null ? String(c.spellpower) : "";
          const spellslots = c.spellslots != null ? String(c.spellslots) : "";
          const special = str(c.special ?? c.tip ?? c.note);
          facts.push({
            type: "CATALYST",
            name,
            location: loc || undefined,
            raw: `CATALYST: ${name} (${school})${spellpower ? ` | Spellpower:${spellpower}` : ""}${spellslots ? ` | Slots:${spellslots}` : ""}${loc ? ` | Loc:${loc}` : ""}${special ? ` | Note:${special}` : ""}`,
          });
        }
      }
      const catalystSlot = cat.catalyst_slot as Record<string, unknown> | undefined;
      if (catalystSlot) {
        const cname = str(catalystSlot.name ?? catalystSlot.n);
        if (cname) {
          const cloc = str(catalystSlot.location ?? catalystSlot.loc);
          const ceff = str(catalystSlot.effect ?? catalystSlot.note);
          facts.push({
            type: "CATALYST",
            name: cname,
            location: cloc || undefined,
            effect: ceff || undefined,
            raw: `CATALYST: ${cname}${cloc ? ` | Loc:${cloc}` : ""}${ceff ? ` | Effect:${ceff}` : ""}`,
          });
        }
      }
    }
  }

  // ── 20. Shields and Armor → SHIELD / ARMOR ────────────────────────────────
  const shieldsArmor = codex.shields_and_armor as Record<string, unknown> | undefined;
  if (shieldsArmor) {
    const shieldsObj = shieldsArmor.shields as Record<string, unknown> | undefined;
    if (shieldsObj) {
      // Basic shields (light/medium/heavy) — have name/type/notes, no numeric stats
      for (const shieldKey of ["light_shields", "medium_shields", "heavy_shields"]) {
        for (const sh of asArray(shieldsObj[shieldKey])) {
          const name = str(sh.name ?? sh.n); if (!name) continue;
          const loc = str(sh.location ?? sh.loc);
          const notes = str(sh.notes ?? sh.note ?? sh.special);
          const shType = str(sh.type);
          facts.push({
            type: "SHIELD",
            name,
            location: loc || undefined,
            raw: `SHIELD: ${name}${shType ? ` (${shType})` : ""}${notes ? ` | Notes:${notes}` : ""}${loc ? ` | Loc:${loc}` : ""}`,
          });
        }
      }
      // Shields with full stats — block is an object {physical, fire, lightning, magic, umbral}
      for (const sh of asArray(shieldsObj.shields_with_full_stats)) {
        const name = str(sh.name ?? sh.n); if (!name) continue;
        const loc = str(sh.location ?? sh.loc);
        const blockObj = sh.block as Record<string, unknown> | undefined;
        const physBlockStr = blockObj ? str(blockObj.physical ?? blockObj.phy) : "";
        // physDef: strip trailing "%" and parse as number
        const physDefNum = physBlockStr ? parseFloat(physBlockStr.replace("%", "")) : undefined;
        const stability = sh.stability != null ? Number(sh.stability) : undefined;
        const wt = sh.wgt ?? sh.weight ?? sh.wt;
        const reqObj = sh.req as Record<string, unknown> | undefined;
        const reqStr = reqObj && typeof reqObj === "object" && !Array.isArray(reqObj)
          ? Object.entries(reqObj).filter(([, v]) => v != null && v !== 0).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(" / ")
          : str(sh.req);
        // Build block string for raw (all damage types)
        const blockParts: string[] = [];
        if (blockObj) {
          for (const [k, v] of Object.entries(blockObj)) {
            if (v != null) blockParts.push(`${k}:${v}`);
          }
        }
        facts.push({
          type: "SHIELD",
          name,
          location: loc || undefined,
          weight: typeof wt === "number" ? wt : undefined,
          physDef: !isNaN(physDefNum as number) && physDefNum != null ? physDefNum : undefined,
          poise: !isNaN(stability as number) && stability != null ? stability : undefined,
          requirements: reqStr || undefined,
          raw: `SHIELD: ${name}${blockParts.length ? ` | Block:${blockParts.join(" ")}` : ""}${stability != null ? ` | Stability:${stability}` : ""}${wt != null ? ` | Wt:${wt}` : ""}${reqStr ? ` | Req:${reqStr}` : ""}${loc ? ` | Loc:${loc}` : ""}`,
        });
      }
    }
    // Notable armor sets (weight is a string category like "Heavy", not numeric)
    for (const armorSet of asArray(shieldsArmor.notable_armor_sets)) {
      const setName = str(armorSet.set_name ?? armorSet.name); if (!setName) continue;
      const loc = str(armorSet.location ?? armorSet.loc);
      const rating = str(armorSet.protection_rating ?? armorSet.rating);
      const weightCat = str(armorSet.weight);
      const notes = str(armorSet.notes ?? armorSet.note);
      facts.push({
        type: "ARMOR",
        name: setName,
        location: loc || undefined,
        raw: `ARMOR: ${setName}${weightCat ? ` (${weightCat})` : ""}${rating ? ` | Rating:${rating}` : ""}${notes ? ` | Notes:${notes}` : ""}${loc ? ` | Loc:${loc}` : ""}`,
      });
    }
    // armor_sets_complete: flat string array → simple ARMOR facts
    for (const armorStr of asStringArray(shieldsArmor.armor_sets_complete)) {
      if (armorStr.length < 2) continue;
      facts.push({ type: "ARMOR", name: armorStr, raw: `ARMOR: ${armorStr}` });
    }
    // Armor tier lists (have actual numeric defense stats)
    const armorSection = shieldsArmor.armor as Record<string, unknown> | undefined;
    const tierLists = armorSection?.armor_tier_lists as Record<string, unknown> | undefined;
    if (tierLists) {
      for (const tierKey of ["best_for_physical", "best_for_holy", "best_for_fire", "best_for_wither", "best_light"]) {
        for (const a of asArray(tierLists[tierKey])) {
          const name = str(a.name ?? a.n ?? a.set); if (!name) continue;
          const loc = str(a.location ?? a.loc);
          const wt = a.weight != null ? Number(a.weight) : NaN;
          const vsPhy = a.vs_physical != null ? Number(a.vs_physical) : NaN;
          const notes = str(a.notes ?? a.note);
          facts.push({
            type: "ARMOR",
            name,
            location: loc || undefined,
            weight: !isNaN(wt) ? wt : undefined,
            physDef: !isNaN(vsPhy) ? vsPhy : undefined,
            raw: `ARMOR: ${name} (${tierKey.replace("best_for_", "vs ").replace(/_/g, " ")})${!isNaN(vsPhy) ? ` | VsPhy:${vsPhy}` : ""}${!isNaN(wt) ? ` | Wt:${wt}` : ""}${loc ? ` | Loc:${loc}` : ""}${notes ? ` | Notes:${notes}` : ""}`,
          });
        }
      }
    }
  }

  // ── 21. Accessories → RING / GEM ──────────────────────────────────────────
  const accessories = codex.accessories as Record<string, unknown> | undefined;
  if (accessories) {
    for (const ring of asArray(accessories.rings)) {
      const name = str(ring.name ?? ring.n); if (!name) continue;
      const ef = str(ring.effect ?? ring.ef);
      const loc = str(ring.location ?? ring.loc);
      const missable = ring.missable ? " [MISSABLE]" : "";
      facts.push({
        type: "RING",
        name,
        effect: ef || undefined,
        location: loc || undefined,
        raw: `RING/ACC: ${name}${missable} | Effect:${ef || "none"}${loc ? ` | Loc:${loc}` : ""}`,
      });
    }
    for (const pendant of asArray(accessories.pendants)) {
      const name = str(pendant.name ?? pendant.n); if (!name) continue;
      const ef = str(pendant.effect ?? pendant.ef);
      const loc = str(pendant.location ?? pendant.loc);
      const missable = pendant.missable ? " [MISSABLE]" : "";
      facts.push({
        type: "RING",
        name: `Pendant: ${name}`,
        effect: ef || undefined,
        location: loc || undefined,
        raw: `RING/ACC: Pendant: ${name}${missable} | Effect:${ef || "none"}${loc ? ` | Loc:${loc}` : ""}`,
      });
    }
    const umbralEyes = accessories.umbral_eyes as Record<string, unknown> | undefined;
    if (umbralEyes) {
      for (const eye of asArray(umbralEyes.all_eyes ?? umbralEyes.eyes)) {
        const name = str(eye.name ?? eye.n); if (!name) continue;
        const ef = str(eye.effect ?? eye.ef);
        const loc = str(eye.location ?? eye.how_to_obtain ?? eye.loc);
        facts.push({
          type: "GEM",
          name,
          effect: ef || undefined,
          location: loc || undefined,
          raw: `GEM: Umbral Eye: ${name}${loc ? ` | Loc:${loc}` : ""}${ef ? ` | Effect:${ef}` : ""}`,
        });
      }
    }
  }

  // ── 22. Ammo / throwables (new format) → ITEM ─────────────────────────────
  const ammoThrowables = codex.ammo_throwables as Record<string, unknown> | undefined;
  if (ammoThrowables) {
    for (const arrow of asArray(ammoThrowables.arrows)) {
      const name = str(arrow.name ?? arrow.n); if (!name) continue;
      const dmg = str(arrow.damage ?? arrow.ap);
      const source = str(arrow.source ?? arrow.location ?? arrow.loc);
      const status = str(arrow.status ?? arrow.st);
      facts.push({
        type: "ITEM",
        name,
        location: source || undefined,
        ap: firstNum(dmg),
        status: status || undefined,
        raw: `ITEM: Arrow ${name}${dmg ? ` | Dmg:${dmg}` : ""}${status ? ` | Status:${status}` : ""}${source ? ` | Source:${source}` : ""}`,
      });
    }
    for (const bolt of asArray(ammoThrowables.bolts)) {
      const name = str(bolt.name ?? bolt.n); if (!name) continue;
      const dmg = str(bolt.damage ?? bolt.ap);
      const source = str(bolt.source ?? bolt.location ?? bolt.loc);
      const status = str(bolt.status ?? bolt.st);
      facts.push({
        type: "ITEM",
        name,
        location: source || undefined,
        ap: firstNum(dmg),
        status: status || undefined,
        raw: `ITEM: Bolt ${name}${dmg ? ` | Dmg:${dmg}` : ""}${status ? ` | Status:${status}` : ""}${source ? ` | Source:${source}` : ""}`,
      });
    }
    for (const th of asArray(ammoThrowables.throwables)) {
      const name = str(th.name ?? th.n); if (!name) continue;
      const dmg = str(th.base_damage ?? th.damage ?? th.ap);
      const dmgType = str(th.damage_type ?? th.type);
      const status = str(th.status_buildup ?? th.status ?? th.st);
      const ammoCost = th.ammo_cost != null ? String(th.ammo_cost) : str(th.ammoCost);
      const source = str(th.source ?? th.location ?? th.loc);
      const tip = str(th.tip ?? th.note);
      facts.push({
        type: "ITEM",
        name,
        location: source || undefined,
        ap: firstNum(dmg),
        status: status || undefined,
        raw: `ITEM: Throwable ${name}${dmgType ? ` (${dmgType})` : ""}${dmg ? ` | Dmg:${dmg}` : ""}${status ? ` | Status:${status}` : ""}${ammoCost ? ` | AmmoCost:${ammoCost}` : ""}${source ? ` | Source:${source}` : ""}${tip ? ` | Tip:${tip}` : ""}`,
      });
    }
  }

  // ── 23. Areas → MAP ───────────────────────────────────────────────────────
  for (const area of asArray(codex.areas)) {
    const name = str(area.name ?? area.area ?? area.n); if (!name) continue;
    const recLevel = area.recommended_level != null ? String(area.recommended_level) : str(area.level);
    const boss = str(area.boss ?? area.mainBoss);
    const areaType = str(area.type ?? area.realm);
    facts.push({
      type: "MAP",
      name,
      raw: `MAP: ${name}${areaType ? ` (${areaType})` : ""}${recLevel ? ` | RecLevel:${recLevel}` : ""}${boss ? ` | Boss:${boss}` : ""}`,
    });
  }

  // ── 24. Bosses / Enemies (new format) → BUILD ─────────────────────────────
  const bossesEnemies = codex.bosses_enemies as Record<string, unknown> | undefined;
  if (bossesEnemies) {
    for (const boss of asArray(bossesEnemies.bosses)) {
      const name = str(boss.name ?? boss.n); if (!name) continue;
      const area = str(boss.area ?? boss.location);
      const weakness = Array.isArray(boss.weaknesses)
        ? (boss.weaknesses as unknown[]).map(String).join(", ")
        : str(boss.weakness ?? boss.weaknesses);
      const rewards = str(boss.rewards ?? boss.drop ?? boss.reward);
      const missable = boss.missable ? " [MISSABLE]" : "";
      const endingLock = boss.ending_lock ? ` [EndingLock:${str(boss.ending_lock)}]` : "";
      const strategy = str(boss.strategy ?? boss.tip);
      facts.push({
        type: "BUILD",
        name,
        location: area || undefined,
        effect: rewards || undefined,
        raw: `BUILD: Boss ${name}${missable}${endingLock}${area ? ` | Area:${area}` : ""}${weakness ? ` | Weakness:${weakness}` : ""}${rewards ? ` | Rewards:${rewards}` : ""}${strategy ? ` | Tip:${strategy}` : ""}`,
      });
    }
    for (const enemy of asArray(bossesEnemies.enemies)) {
      const name = str(enemy.name ?? enemy.n ?? enemy.type ?? enemy.enemy_type); if (!name) continue;
      const locs = Array.isArray(enemy.locations)
        ? (enemy.locations as unknown[]).map(String).join(", ")
        : str(enemy.location ?? enemy.locations);
      const drops = str(enemy.drops ?? enemy.drop ?? enemy.reward);
      const weakness = str(enemy.weakness ?? enemy.weaknesses);
      facts.push({
        type: "BUILD",
        name: `Enemy: ${name}`,
        location: locs || undefined,
        effect: drops || undefined,
        raw: `BUILD: Enemy ${name}${locs ? ` | Locs:${locs}` : ""}${weakness ? ` | Weakness:${weakness}` : ""}${drops ? ` | Drops:${drops}` : ""}`,
      });
    }
  }

  // ── 25. NPCs (rich format: npcs.all_npcs) → LORE ─────────────────────────
  const npcsRich = codex.npcs as Record<string, unknown> | undefined;
  if (npcsRich && (npcsRich.all_npcs || npcsRich.npcs) && !Array.isArray(npcsRich)) {
    for (const npc of asArray(npcsRich.all_npcs ?? npcsRich.npcs)) {
      const name = str(npc.name ?? npc.n); if (!name) continue;
      const loc = str(npc.location ?? npc.loc);
      const role = str(npc.role ?? npc.desc);
      const sells = asStringArray(npc.sells ?? npc.items).join(", ");
      const missable = npc.missable ? " [MISSABLE]" : "";
      const quest = str(npc.quest_involvement ?? npc.quest ?? npc.questline);
      facts.push({
        type: "LORE",
        name,
        location: loc || undefined,
        raw: `LORE: NPC ${name}${missable}${loc ? ` | Loc:${loc}` : ""}${role ? ` | Role:${role}` : ""}${sells ? ` | Sells:${sells}` : ""}${quest ? ` | Quest:${quest}` : ""}`,
      });
    }
  }

  // ── 26. Quests (new format: quests.quests) → LORE ─────────────────────────
  const questsSection = codex.quests as Record<string, unknown> | undefined;
  if (questsSection && !Array.isArray(questsSection)) {
    for (const quest of asArray(questsSection.quests ?? questsSection.questlines)) {
      const name = str(quest.name ?? quest.n); if (!name) continue;
      const giver = str(quest.giver ?? quest.npc);
      const missable = str(quest.missable_warning ?? quest.missable);
      const rewards = str(quest.rewards ?? quest.reward);
      const steps = asStringArray(quest.steps).join(" → ");
      facts.push({
        type: "LORE",
        name: `Quest: ${name}`,
        raw: `LORE: Quest ${name}${giver ? ` | Giver:${giver}` : ""}${missable ? ` | Missable:${missable}` : ""}${rewards ? ` | Rewards:${rewards}` : ""}${steps ? ` | Steps:${steps.slice(0, 200)}` : ""}`,
      });
    }
  }

  // ── 27. Lore section → LORE ───────────────────────────────────────────────
  const loreSection = codex.lore as Record<string, unknown> | undefined;
  if (loreSection && !Array.isArray(loreSection)) {
    const cosm = loreSection.cosmology as Record<string, unknown> | undefined;
    if (cosm) {
      for (const [cosmKey, cosmVal] of Object.entries(cosm)) {
        const desc = typeof cosmVal === "string"
          ? cosmVal
          : str((cosmVal as Record<string, unknown>)?.description ?? (cosmVal as Record<string, unknown>)?.desc);
        if (!desc || desc.length < 10) continue;
        facts.push({ type: "LORE", name: `Cosmology: ${cosmKey}`, effect: desc, raw: `LORE: Cosmology ${cosmKey} | ${desc.slice(0, 250)}` });
      }
    }
    for (const faction of asArray(loreSection.factions)) {
      const name = str(faction.name ?? faction.n); if (!name) continue;
      const desc = str(faction.description ?? faction.desc ?? faction.summary);
      facts.push({ type: "LORE", name: `Faction: ${name}`, effect: desc || undefined, raw: `LORE: Faction ${name}${desc ? ` | ${desc.slice(0, 200)}` : ""}` });
    }
  }

  // ── 28. Endings (new format: endings.endings) → LORE ─────────────────────
  const endingsRich = codex.endings as Record<string, unknown> | undefined;
  if (endingsRich && !Array.isArray(endingsRich) && (endingsRich.endings || endingsRich.ending_list)) {
    for (const ending of asArray(endingsRich.endings ?? endingsRich.ending_list)) {
      const name = str(ending.name ?? ending.n); if (!name) continue;
      const trophy = str(ending.trophy);
      const ngUnlock = str(ending.ng_class_unlock ?? ending.ngClassUnlock);
      const missableBoss = str(ending.missable_boss ?? ending.missableBoss);
      const reqs = asStringArray(ending.requirements ?? ending.steps).join(" → ");
      facts.push({
        type: "LORE",
        name: `Ending: ${name}`,
        raw: `LORE: Ending ${name}${trophy ? ` | Trophy:${trophy}` : ""}${ngUnlock ? ` | NG+Class:${ngUnlock}` : ""}${missableBoss ? ` | MissableBoss:${missableBoss}` : ""}${reqs ? ` | Reqs:${reqs}` : ""}`,
      });
    }
  }

  // ── 29. Meta builds / farming guide → BUILD / MECHANIC ────────────────────
  const meta = codex.meta as Record<string, unknown> | undefined;
  if (meta) {
    const metaBuilds = meta.builds as Record<string, unknown> | undefined;
    if (metaBuilds) {
      for (const build of asArray(metaBuilds.top_builds ?? metaBuilds.builds)) {
        const name = str(build.name ?? build.n); if (!name) continue;
        const stats = str(build.stats ?? build.stat_spread ?? build.key_stats);
        const strategy = str(build.strategy ?? build.desc);
        const keyItems = asStringArray(build.key_items ?? build.keyItems).join(", ");
        const ngViab = str(build.ng_viability ?? build.ng_plus);
        facts.push({
          type: "BUILD",
          name: `Meta Build: ${name}`,
          effect: strategy || undefined,
          raw: `BUILD: Meta ${name}${stats ? ` | Stats:${stats}` : ""}${keyItems ? ` | KeyItems:${keyItems}` : ""}${strategy ? ` | Strategy:${strategy.slice(0, 150)}` : ""}${ngViab ? ` | NG:${ngViab}` : ""}`,
        });
      }
    }
    const farmGuide = meta.farming_guide as Record<string, unknown> | undefined;
    if (farmGuide) {
      for (const [section, content] of Object.entries(farmGuide)) {
        const desc = typeof content === "string"
          ? content
          : str((content as Record<string, unknown>)?.desc ?? (content as Record<string, unknown>)?.description);
        if (!desc || desc.length < 10) continue;
        facts.push({ type: "MECHANIC", name: `Farming: ${section}`, effect: desc, raw: `MECHANIC: Farming ${section} | ${desc.slice(0, 200)}` });
      }
    }
  }

  // ── 30. Cross-references / missable checklist → LORE ──────────────────────
  const crossRefs = codex.cross_references as Record<string, unknown> | undefined;
  if (crossRefs) {
    const missableChecklist = crossRefs.missable_checklist as Record<string, unknown> | undefined;
    if (missableChecklist) {
      for (const [category, items] of Object.entries(missableChecklist)) {
        const itemList = asStringArray(items);
        if (itemList.length === 0) continue;
        facts.push({
          type: "LORE",
          name: `Missable ${category}`,
          effect: itemList.join(", "),
          raw: `LORE: Missable ${category} | ${itemList.join(", ")}`,
        });
      }
    }
  }

  // ── 31. Build family recommendations → MECHANIC ───────────────────────────
  const buildFamilies = codex.build_family_recommendations as Record<string, unknown> | undefined;
  if (buildFamilies) {
    for (const rec of asArray(buildFamilies.table)) {
      const family = str(rec.family ?? rec.name); if (!family) continue;
      const keyStats = str(rec.key_stats ?? rec.stats);
      const weapons = str(rec.weapons ?? rec.weapon);
      const rings = str(rec.rings ?? rec.accessories);
      facts.push({
        type: "MECHANIC",
        name: `Build Family: ${family}`,
        raw: `MECHANIC: Build Family ${family}${keyStats ? ` | Stats:${keyStats}` : ""}${weapons ? ` | Weapons:${weapons}` : ""}${rings ? ` | Rings:${rings}` : ""}`,
      });
    }
  }

  return facts;
}

/**
 * Extract facts from a main build phase (full item-object format).
 * Each phase has weapons[], armor[], acc[], spells[] as arrays of rich objects,
 * plus an optional ngCycles[] array.
 */
function extractFullPhase(phase: Record<string, unknown>, facts: KnowledgeFact[]): void {
  for (const w of asArray(phase.weapons)) {
    const n = str(w.n ?? w.name); if (!n) continue;
    const loc = str(w.loc ?? w.location);
    const up = str(w.up ?? w.upgrade);
    const apStr = str(w.ap);
    const st = str(w.st ?? w.status);
    const tip = str(w.tip ?? w.d ?? w.effect);
    let type: KnowledgeFact["type"] = "WEAPON";
    if (isShieldItem({ n, eq: str(w.eq ?? w.slot) })) type = "SHIELD";
    else if (isCatalystItem({ n, eq: str(w.eq ?? w.slot) })) type = "CATALYST";
    facts.push({
      type,
      name: n,
      location: loc || undefined,
      upgrade: up || undefined,
      ap: firstNum(apStr),
      status: st || undefined,
      effect: tip || undefined,
      raw: `${type}: ${n} | AP:${apStr || "?"}${st ? ` | Status:${st}` : ""}${up ? ` | Up:${up}` : ""}${loc ? ` | Loc:${loc}` : ""}${tip ? ` | Tip:${tip}` : ""}`,
    });
  }
  for (const a of asArray(phase.armor)) {
    const n = str(a.n ?? a.name); if (!n) continue;
    const loc = str(a.loc ?? a.location);
    const wt = a.wt ?? a.weight;
    facts.push({
      type: "ARMOR",
      name: n,
      location: loc || undefined,
      weight: typeof wt === "number" ? wt : undefined,
      raw: `ARMOR: ${n}${wt != null ? ` | Wt:${wt}` : ""}${loc ? ` | Loc:${loc}` : ""}`,
    });
  }
  for (const acc of asArray(phase.acc)) {
    const n = str(acc.n ?? acc.name); if (!n) continue;
    const loc = str(acc.loc ?? acc.location);
    const ef = str(acc.ef ?? acc.effect ?? acc.d);
    facts.push({
      type: "RING",
      name: n,
      location: loc || undefined,
      effect: ef || undefined,
      raw: `RING/ACC: ${n} | Effect:${ef || "none"}${loc ? ` | Loc:${loc}` : ""}`,
    });
  }
  for (const sp of asArray(phase.spells)) {
    const n = str(sp.n ?? sp.name); if (!n) continue;
    const loc = str(sp.loc ?? sp.location);
    const ef = str(sp.ef ?? sp.effect ?? sp.d);
    facts.push({
      type: "SPELL",
      name: n,
      location: loc || undefined,
      effect: ef || undefined,
      raw: `SPELL: ${n} | Effect:${ef || "none"}${loc ? ` | Loc:${loc}` : ""}`,
    });
  }
  // ngCycles inside a phase: [{ label, stats, notes }]
  for (const cycle of asArray(phase.ngCycles)) {
    const label = str(cycle.label ?? cycle.name); if (!label) continue;
    const notes = str(cycle.notes ?? cycle.note);
    facts.push({
      type: "BUILD",
      name: `NG Cycle: ${label}`,
      effect: notes || undefined,
      raw: `BUILD: ${label}${notes ? ` | ${notes}` : ""}`,
    });
  }
}

/**
 * Extract facts from a sim/oth abbreviated build entry.
 * These have:
 *   ph: [{ n, r, s, w: "string weapon", ar: "string armor", dm }]
 *   key: [{ i: "item name", d: "location / description" }]
 */
function extractAbbrevBuild(build: Record<string, unknown>, facts: KnowledgeFact[]): void {
  // key items (important accessories/weapons for this build)
  for (const keyItem of asArray(build.key)) {
    const name = str(keyItem.i ?? keyItem.name ?? keyItem.item); if (!name) continue;
    const detail = str(keyItem.d ?? keyItem.loc ?? keyItem.location);
    const type = guessTypeFromName(name);
    facts.push({
      type,
      name,
      location: detail || undefined,
      raw: `${type}: ${name}${detail ? ` | ${detail}` : ""}`,
    });
  }
  // abbreviated phases: w and ar are strings, not arrays
  for (const phase of asArray(build.ph)) {
    const wName = str(phase.w ?? phase.weapon);
    if (wName) {
      const dmg = str(phase.dm ?? phase.dmg);
      facts.push({ type: "WEAPON", name: wName, raw: `WEAPON: ${wName}${dmg ? ` | Dmg:${dmg}` : ""}` });
    }
    const arName = str(phase.ar ?? phase.armor);
    if (arName) {
      facts.push({ type: "ARMOR", name: arName, raw: `ARMOR: ${arName}` });
    }
  }
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
