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
export function extractFactsFromCodex(codex: Record<string, unknown>): KnowledgeFact[] {
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
    for (const [statName, statData] of Object.entries(statsSection as Record<string, unknown>)) {
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
