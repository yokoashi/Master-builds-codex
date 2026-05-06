import type { Express } from "express";
import type { Server } from "http";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { storage } from "./storage";
import { buildKnowledgeBlock, countCodexEntries, formatCodexForAI, CODEX_CHAR_LIMITS } from "./knowledge";
import { parseJsonResponse } from "./parse-json";
import { SEED_GAMES, SEED_BUILDS } from "@shared/seed-data";
import type {
  Build,
  Game,
  AiProvider,
  GenerateStep1Request,
  GenerateStep2Request,
  GenerateStep3Request,
  KnowledgeFact,
} from "@shared/types";

// ── AI clients ─────────────────────────────────────────────────────────────────
const claude = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY ?? "" });
const CLAUDE_MODEL = "claude-sonnet-4-6";
const PPLX_MODEL   = "sonar-pro";

function parseJson<T = Record<string, unknown>>(text: string): T {
  const result = parseJsonResponse<T>(text);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

// ── Provider-agnostic generation ───────────────────────────────────────────────
async function callAI(
  provider: AiProvider,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  if (provider === "claude") {
    // Split system prompt into a stable codex block and a variable instruction block.
    // The codex block is identical across step1 → step2 → step3 for the same game,
    // so Anthropic's ephemeral prompt cache (5-min window) reuses it on steps 2 & 3
    // instead of charging full input-token price each time.
    const SPLIT = "\n\nYou are an expert";
    const idx = systemPrompt.indexOf(SPLIT);
    const systemBlocks: Array<{ type: "text"; text: string; cache_control?: { type: "ephemeral" } }> =
      idx > 0
        ? [
            { type: "text", text: systemPrompt.slice(0, idx), cache_control: { type: "ephemeral" } },
            { type: "text", text: systemPrompt.slice(idx + 2) },
          ]
        : [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }];

    const resp = await claude.messages.create({
      model: model || CLAUDE_MODEL,
      max_tokens: 8000,
      system: systemBlocks,
      messages: [{ role: "user", content: userPrompt }],
    });
    return resp.content.find((b) => b.type === "text")?.text ?? "";
  }

  // PPLX and OpenRouter: OpenAI-compatible chat completions
  const baseURL = provider === "pplx"
    ? "https://api.perplexity.ai"
    : "https://openrouter.ai/api/v1";
  const apiKey = provider === "pplx"
    ? (process.env.PERPLEXITY_API_KEY ?? process.env.PPLX_API_KEY ?? "")
    : (process.env.OPEN_ROUTER_API_KEY ?? process.env.OPENROUTER_API_KEY ?? "");

  if (!apiKey) {
    throw new Error(
      provider === "pplx"
        ? "PERPLEXITY_API_KEY is not set. Add it in the app settings."
        : "OPEN_ROUTER_API_KEY is not set. Add it in the app settings.",
    );
  }

  const resolvedModel = model || (provider === "pplx" ? PPLX_MODEL : "anthropic/claude-sonnet-4-5");

  const oa = new OpenAI({
    baseURL,
    apiKey,
    defaultHeaders: provider === "openrouter"
      ? { "HTTP-Referer": "http://localhost:5000", "X-Title": "Master Build Codex" }
      : undefined,
  });
  const completion = await oa.chat.completions.create({
    model: resolvedModel,
    max_tokens: 8000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  return completion.choices[0]?.message?.content ?? "";
}

// ── Phase normalisation ───────────────────────────────────────────────────────
// The AI occasionally wraps phases under a "phases" object, uses camelCase,
// or returns an array instead of the exact keys we asked for.

function phaseByName(obj: Record<string, unknown>, patterns: RegExp): unknown {
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const name = String((v as Record<string, unknown>).name ?? "");
      if (patterns.test(name)) return v;
    }
  }
  return undefined;
}

function normaliseStep1(p: Record<string, unknown>): Record<string, unknown> {
  const earlyKeys    = /early.?game|phase.?1|earlyGame/i;
  const earlyMidKeys = /early.?mid|transition|phase.?2|earlyMid/i;
  const midKeys      = /^mid.?game$|phase.?3|^midGame$/i;

  // 1. Already correct
  if (p.phase1 || p.phase2 || p.phase3) return p;

  // 2. Nested under "phases" object key
  const nested = p.phases as Record<string, unknown> | undefined;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    if (nested.phase1 || nested.phase2 || nested.phase3) return { ...p, ...nested };
  }

  // 3. Phases array [earlyGame, earlyMidGame, midGame, ...]
  if (Array.isArray(p.phases) && p.phases.length >= 2) {
    const arr = p.phases as unknown[];
    return { ...p, phase1: arr[0], phase2: arr[1], ...(arr[2] ? { phase3: arr[2] } : {}) };
  }

  // 4. By name / camelCase key variants at top level
  const phase1 = p.phase_1 ?? p.earlyGame ?? p.early_game ?? phaseByName(p, earlyKeys);
  const phase2 = p.phase_2 ?? p.earlyMidGame ?? p.early_mid_game ?? phaseByName(p, earlyMidKeys);
  const phase3 = p.phase_3 ?? p.midGame ?? p.mid_game ?? phaseByName(p, midKeys);
  if (phase1 || phase2 || phase3) return { ...p, phase1, phase2, phase3 };

  // 5. AI wrapped everything under a single top-level key e.g. { "build": { "phase1": ... } }
  for (const val of Object.values(p)) {
    if (!val || typeof val !== "object" || Array.isArray(val)) continue;
    const inner = val as Record<string, unknown>;
    if (inner.phase1 || inner.phase2 || inner.phase3) return { ...p, ...inner };
    const ip1 = inner.phase_1 ?? inner.earlyGame ?? inner.early_game ?? phaseByName(inner, earlyKeys);
    const ip2 = inner.phase_2 ?? inner.earlyMidGame ?? inner.early_mid_game ?? phaseByName(inner, earlyMidKeys);
    const ip3 = inner.phase_3 ?? inner.midGame ?? inner.mid_game ?? phaseByName(inner, midKeys);
    if (ip1 || ip2 || ip3) return { ...p, ...inner, phase1: ip1, phase2: ip2, phase3: ip3 };
    if (Array.isArray(inner.phases) && (inner.phases as unknown[]).length >= 2) {
      const arr = inner.phases as unknown[];
      return { ...p, ...inner, phase1: arr[0], phase2: arr[1], ...(arr[2] ? { phase3: arr[2] } : {}) };
    }
  }

  // 6. Parser extracted a bare phase object — detect by phase-specific keys and promote.
  const isPhase = ("sn" in p || "dmg" in p) && ("weapons" in p || "armor" in p);
  if (isPhase) {
    const name = String(p.name ?? "");
    if (midKeys.test(name)) return { phase3: p };
    if (earlyMidKeys.test(name)) return { phase2: p };
    return { phase1: p };
  }

  return p;
}

function normaliseStep2(p: Record<string, unknown>): Record<string, unknown> {
  const midKeys     = /^mid.?game$|phase.?3|^midGame$/i;
  const midLateKeys = /mid.?late|phase.?4|midLate/i;

  if (p.phase3 || p.phase4) return p;

  const nested = p.phases as Record<string, unknown> | undefined;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    if (nested.phase3 || nested.phase4) return { ...p, ...nested };
  }

  if (Array.isArray(p.phases) && p.phases.length >= 2) {
    const arr = p.phases as unknown[];
    return { ...p, phase3: arr[0], phase4: arr[1] };
  }

  const phase3 = p.phase_3 ?? p.midGame ?? p.mid_game ?? phaseByName(p, midKeys);
  const phase4 = p.phase_4 ?? p.midLateGame ?? p.mid_late_game ?? phaseByName(p, midLateKeys);
  if (phase3 || phase4) return { ...p, phase3, phase4 };

  for (const val of Object.values(p)) {
    if (!val || typeof val !== "object" || Array.isArray(val)) continue;
    const inner = val as Record<string, unknown>;
    if (inner.phase3 || inner.phase4) return { ...p, ...inner };
    const ip3 = inner.phase_3 ?? inner.midGame ?? inner.mid_game ?? phaseByName(inner, midKeys);
    const ip4 = inner.phase_4 ?? inner.midLateGame ?? inner.mid_late_game ?? phaseByName(inner, midLateKeys);
    if (ip3 || ip4) return { ...p, ...inner, phase3: ip3, phase4: ip4 };
    if (Array.isArray(inner.phases) && (inner.phases as unknown[]).length >= 2) {
      const arr = inner.phases as unknown[];
      return { ...p, ...inner, phase3: arr[0], phase4: arr[1] };
    }
  }

  return p;
}

function normaliseStep3(p: Record<string, unknown>): Record<string, unknown> {
  const lateKeys = /late.?game|phase.?5|lateGame/i;
  const endKeys  = /end.?game|phase.?6|endGame/i;
  const ngKeys   = /ng\+|new.?game\+?|phase.?7|ngPlus|build.?perfect/i;

  if (p.phase5 || p.phase6 || p.phase7) return p;

  const nested = p.phases as Record<string, unknown> | undefined;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    if (nested.phase5 || nested.phase6 || nested.phase7) return { ...p, ...nested };
  }

  if (Array.isArray(p.phases) && p.phases.length >= 2) {
    const arr = p.phases as unknown[];
    return { ...p, phase5: arr[0], phase6: arr[1], ...(arr[2] ? { phase7: arr[2] } : {}) };
  }

  const phase5 = p.phase_5 ?? p.lateGame ?? p.late_game ?? phaseByName(p, lateKeys);
  const phase6 = p.phase_6 ?? p.endGame ?? p.end_game ?? p.endgame ?? phaseByName(p, endKeys);
  const phase7 = p.phase_7 ?? p.ngPlus ?? p.ng_plus ?? p.ng ?? p.buildPerfected ?? phaseByName(p, ngKeys);
  if (phase5 || phase6 || phase7) return { ...p, phase5, phase6, phase7 };

  for (const val of Object.values(p)) {
    if (!val || typeof val !== "object" || Array.isArray(val)) continue;
    const inner = val as Record<string, unknown>;
    if (inner.phase5 || inner.phase6 || inner.phase7) return { ...p, ...inner };
    const ip5 = inner.phase_5 ?? inner.lateGame ?? inner.late_game ?? phaseByName(inner, lateKeys);
    const ip6 = inner.phase_6 ?? inner.endGame ?? inner.end_game ?? inner.endgame ?? phaseByName(inner, endKeys);
    const ip7 = inner.phase_7 ?? inner.ngPlus ?? inner.ng_plus ?? inner.ng ?? phaseByName(inner, ngKeys);
    if (ip5 || ip6 || ip7) return { ...p, ...inner, phase5: ip5, phase6: ip6, phase7: ip7 };
    if (Array.isArray(inner.phases) && (inner.phases as unknown[]).length >= 2) {
      const arr = inner.phases as unknown[];
      return { ...p, ...inner, phase5: arr[0], phase6: arr[1], ...(arr[2] ? { phase7: arr[2] } : {}) };
    }
  }

  return p;
}

// ── DS3 / per-game mechanic helpers ───────────────────────────────────────────

/** Returns the stat-block JSON string for a given phase number, keyed by game. */
function getPhaseStats(gameKey: string, phase: 1 | 2 | 3 | 4 | 5 | 6 | 7): string {
  const ds3: Record<number, Record<string, number>> = {
    1: { VIG: 15, ATT: 10, END: 12, VIT: 10, STR: 14, DEX: 13, INT: 9, FTH: 9, LCK: 7 },
    2: { VIG: 20, ATT: 12, END: 16, VIT: 12, STR: 18, DEX: 16, INT: 9, FTH: 9, LCK: 7 },
    3: { VIG: 27, ATT: 14, END: 20, VIT: 14, STR: 24, DEX: 22, INT: 9, FTH: 9, LCK: 7 },
    4: { VIG: 32, ATT: 16, END: 24, VIT: 16, STR: 32, DEX: 28, INT: 9, FTH: 9, LCK: 7 },
    5: { VIG: 36, ATT: 18, END: 27, VIT: 18, STR: 38, DEX: 32, INT: 9, FTH: 9, LCK: 7 },
    6: { VIG: 40, ATT: 20, END: 30, VIT: 20, STR: 40, DEX: 40, INT: 9, FTH: 9, LCK: 7 },
    7: { VIG: 40, ATT: 20, END: 30, VIT: 20, STR: 40, DEX: 40, INT: 9, FTH: 9, LCK: 7 },
  };
  const ds1: Record<number, Record<string, number>> = {
    1: { VIT: 12, ATT: 8,  END: 16, STR: 14, DEX: 13, RES: 11, INT: 9, FTH: 9 },
    2: { VIT: 18, ATT: 8,  END: 22, STR: 18, DEX: 16, RES: 11, INT: 9, FTH: 9 },
    3: { VIT: 25, ATT: 10, END: 28, STR: 24, DEX: 22, RES: 11, INT: 9, FTH: 9 },
    4: { VIT: 30, ATT: 12, END: 32, STR: 30, DEX: 28, RES: 11, INT: 9, FTH: 9 },
    5: { VIT: 36, ATT: 14, END: 36, STR: 36, DEX: 34, RES: 11, INT: 9, FTH: 9 },
    6: { VIT: 42, ATT: 16, END: 40, STR: 40, DEX: 40, RES: 11, INT: 9, FTH: 9 },
    7: { VIT: 50, ATT: 16, END: 40, STR: 40, DEX: 40, RES: 11, INT: 9, FTH: 9 },
  };
  return JSON.stringify(gameKey === "ds3" ? ds3[phase] : ds1[phase]);
}

/** Returns the example weapon JSON template string for a given game. */
function getWeaponTemplate(gameKey: string): string {
  if (gameKey === "ds3") {
    return `{ "n": "Weapon Name", "ap": 120, "wt": 5.0, "ef": null, "st": null, "eq": "Right Hand", "wa": "Stomp", "inf": "Heavy", "fp": 18, "d": "Role in build", "loc": "Exact location", "up": "+10", "tip": "Build tip", "lore": "Lore note", "durability": 200, "steps": null }`;
  }
  return `{ "n": "Weapon Name", "ap": 120, "wt": 5.0, "ef": null, "st": null, "eq": "Right Hand", "d": "Role in build", "loc": "Exact location", "up": "Standard +5", "tip": "Build tip", "lore": "Lore note", "durability": 200, "steps": null }`;
}

/** Returns extra system-prompt mechanic rules for a given game. */
function getGameMechanicRules(gameKey: string): string {
  if (gameKey === "ds3") {
    return `
DS3 mechanic rules — apply to every DS3 build:
- Stat names: VIG (HP), ATT (FP + spell slots), END (stamina), VIT (equip load), STR, DEX, INT, FTH, LCK. DS3 has NO "RES" stat.
- Soft caps: VIG 27 (second at 50), END 40, VIT 40, STR 40 (66 two-handed 1.5× multiplier), DEX 40 (second at 60), INT 40 (second at 60), FTH 40 (second at 60), LCK 40.
- wa (weapon art): Every weapon has a unique Weapon Art. Always populate the "wa" field with the exact in-game name (e.g. "Stomp", "Warcry", "Stance", "Spin Slash", "Hold", "Parry", "Charge", "Flame of Lorian", "Elfriede's Stance"). Catalysts use "Steady Chant" or "Unfaltering Prayer"; shields use "Parry" or "Weapon Skill".
- inf (infusion): Always populate "inf" with the infusion type — Sharp (DEX scaling), Heavy (STR), Refined (quality STR/DEX), Crystal (INT), Simple (INT + FP regen), Chaos (INT+FTH), Lightning (FTH), Dark (INT+FTH), Blessed (FTH + HP regen), Blood (LCK + bleed), Hollow (LCK when hollowed), Raw (flat AR, no scaling — early game only), Poison (LCK + poison). Use "None" for uninfusable boss weapons.
- fp (FP cost): Always populate "fp" with the FP cost of the weapon art or spell. In the phase "sn" field note the recommended Ashen Estus flask allocation for FP management (e.g. "Use 2-3 Ashen Estus flasks to sustain weapon art spam.").
- Poise: In DS3, poise does NOT work passively. It only activates as hyperarmor during weapon swing animations (ultragreatswords, great axes, hammers, greatshields have the most frames). Note this when recommending armor.
- up field for DS3: Use "+10" for standard weapons (Titanite Slab path), "+5" for boss weapons (Titanite Scale path), "+5" for unique weapons (Twinkling Titanite path).
- Ember: Being Embered grants +30% max HP. Mention Ember usage in early phases.
- PvP meta: SL 120 is the standard invasion/duel meta. Note when a phase reaches SL 120.`;
  }
  return "";
}

// ── System prompt builder ──────────────────────────────────────────────────────
// light=true skips the codex entirely (step3 only needs the build data already
// in the user message, so there's no reason to send 150K chars of codex again).
function buildSystemPrompt(
  gameKey: string,
  gameName: string,
  provider: AiProvider,
  extra = "",
  light = false,
): string {
  const mechanicRules = getGameMechanicRules(gameKey);
  if (light) {
    return `You are an expert ${gameName} build guide writer. Generate accurate build analysis in JSON format.${mechanicRules}${extra ? `\n${extra}` : ""}`;
  }
  const maxChars = CODEX_CHAR_LIMITS[provider] ?? 80_000;
  const knowledge = buildKnowledgeBlock(gameKey, maxChars);
  return `${knowledge}

You are an expert ${gameName} build guide writer. You have the full game codex above.
Generate highly detailed, accurate build guides in JSON format.
Use ONLY items and mechanics from the codex. Every item must have a real in-game location.${mechanicRules}${extra ? `\n${extra}` : ""}`;
}

// ── Routes ────────────────────────────────────────────────────────────────────
export async function registerRoutes(
  _server: Server,
  app: Express,
): Promise<void> {

  // GET /api/games
  app.get("/api/games", (_req, res) => {
    const dynamic = storage.getDynamicGames().map((r) => JSON.parse(r.data) as Game);
    res.json([...SEED_GAMES, ...dynamic]);
  });

  // GET /api/builds
  app.get("/api/builds", (req, res) => {
    const gameKey = req.query.gameKey as string | undefined;
    const hidden = new Set(storage.getHiddenStaticBuilds().map((h) => h.buildKey));
    const seed = SEED_BUILDS.filter(
      (b) => (!gameKey || b.gameKey === gameKey) && !hidden.has(b.key),
    );
    const dynamic = storage
      .getDynamicBuilds(gameKey)
      .map((r) => JSON.parse(r.data) as Build);
    res.json([...seed, ...dynamic]);
  });

  // DELETE /api/builds/:key
  app.delete("/api/builds/:key", (req, res) => {
    const { key } = req.params;
    if (SEED_BUILDS.some((b) => b.key === key)) {
      storage.hideStaticBuild(key);
    } else {
      storage.deleteDynamicBuild(key);
    }
    res.json({ ok: true });
  });

  // GET /api/codex/:gameKey — codex status
  app.get("/api/codex/:gameKey", (req, res) => {
    const raw = storage.getCodexRaw(req.params.gameKey);
    if (!raw) return res.json({ loaded: false, entryCount: 0, updatedAt: null });
    return res.json({ loaded: true, entryCount: raw.entryCount, updatedAt: raw.updatedAt });
  });

  // POST /api/codex/import
  app.post("/api/codex/import", (req, res) => {
    const { gameKey, gameName, codex } = req.body as {
      gameKey: string;
      gameName: string;
      codex: Record<string, unknown>;
    };
    if (!gameKey || !gameName || !codex) {
      return res.status(400).json({ error: "gameKey, gameName, and codex are required" });
    }
    try {
      const minJson    = JSON.stringify(codex); // minified
      const formatted  = formatCodexForAI(minJson); // compact text
      const entryCount = countCodexEntries(codex);
      storage.upsertCodexRaw(gameKey, minJson, entryCount); // store minified JSON
      console.log(
        `[codex] Imported ${gameName}: ${entryCount} entries | ` +
        `minified=${minJson.length.toLocaleString()} chars → ` +
        `formatted=${formatted.length.toLocaleString()} chars (` +
        `${((1 - formatted.length / minJson.length) * 100).toFixed(0)}% smaller)`,
      );
      return res.json({ ok: true, entryCount });
    } catch (err) {
      console.error("Codex import error:", err);
      return res.status(500).json({ error: "Failed to store codex" });
    }
  });

  // GET /api/knowledge/:gameKey — backward compat shim
  app.get("/api/knowledge/:gameKey", (req, res) => {
    const raw = storage.getCodexRaw(req.params.gameKey);
    if (!raw) return res.json({ facts: [], patchNote: null, updatedAt: null });
    return res.json({ facts: [], entryCount: raw.entryCount, patchNote: null, updatedAt: raw.updatedAt });
  });

  // POST /api/generate/step1 — metadata + Early Game (phase1) + Early-Mid Game (phase2)
  app.post("/api/generate/step1", async (req, res) => {
    const body = req.body as GenerateStep1Request;
    const { gameKey, gameName, buildDescription, provider, model, preferredWeapon, seedStats, constraints } = body;

    const phaseHint = (ph: string) => {
      const s = seedStats?.[ph];
      return s ? `\nSeed stats for ${ph}: ${JSON.stringify(s)}` : "";
    };

    const systemPrompt = buildSystemPrompt(gameKey, gameName, provider);
    const weaponTpl = getWeaponTemplate(gameKey);

    const userPrompt = `CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }.

Generate a ${gameName} build guide for: "${buildDescription}"
${preferredWeapon ? `Preferred weapon: ${preferredWeapon}` : ""}
${constraints ? `Additional constraints: ${constraints}` : ""}
${phaseHint("phase1")}${phaseHint("phase2")}

Return this EXACT JSON structure:

{
  "key": "shadow-of-anor-londo",
  "gameKey": "${gameKey}",
  "label": "Shadow of Anor Londo",
  "sub": "The Silver Knight's Ruin",
  "icon": "single emoji that fits the build theme",
  "accent": "#2a1a3a",
  "playstyle": "2-3 sentence playstyle overview",
  "cls": "Starting class name",
  "caps": ["STAT 40", "STAT 50"],
  "weaponReq": ["STR 14", "DEX 10"],
  "loadouts": null,
  "phase1": {
    "name": "Early Game",
    "chapter": "The Vow of the Sacred Flame",
    "range": "SL 1-20",
    "stats": ${getPhaseStats(gameKey, 1)},
    "sn": "Opening strategy (2-3 sentences). Describe the very first hours — starting gear, first upgrade stone, first NPC to meet.",
    "weapons": [
      ${weaponTpl}
    ],
    "armor": [ { "n": "Armor Name", "wt": 4.0, "eq": "Chest", "d": "...", "loc": "...", "up": "None", "tip": "...", "lore": "...", "durability": 300 } ],
    "acc":   [ { "n": "Ring Name", "wt": 0.0, "eq": "Ring", "d": "...", "loc": "...", "up": "None", "tip": "...", "lore": "..." } ],
    "spells": [],
    "dmg": { "ps": 150, "sp": 120, "bs": 300, "n": "Damage context note" }
  },
  "phase2": {
    "name": "Early-Mid Game",
    "chapter": "The Pale Covenant",
    "range": "SL 20-35",
    "stats": ${getPhaseStats(gameKey, 2)},
    "sn": "First major upgrade unlock — primary weapon at +3 or better, key early rings secured.",
    "weapons": [], "armor": [], "acc": [], "spells": [],
    "dmg": { "ps": 200, "sp": 170, "bs": 400, "n": "Damage context" }
  }
}

Rules:
- label: evocative lore name — NEVER a stat description. Good: "Voidwalker", "The Iron Heretic". Bad: "Pure STR Build"
- sub: poetic subtitle, lore archetype. Good: "Keeper of the First Flame". Bad: "STR/FAI hybrid"
- key: kebab-case of label
- Every item loc must be a real ${gameName} location or drop source
- Include lore and durability for every item
- Rings go in "acc"; spells/sorceries/pyromancies/miracles go in "spells"
- Stats must use the correct stat names for ${gameName} and fit the soul level range
- accent: dark hex color matching theme (deep crimson for fire, dark violet for sorcery)
- chapter: 3-5 word dark-fantasy lore title unique per phase. Good: "The Ashen Covenant". Bad: "Early Game Phase"
- steps: questline acquisition array ONLY for multi-step items. null for drops/merchants.`;

    try {
      const text = await callAI(provider, model, systemPrompt, userPrompt);
      console.log(`[step1] AI response (first 600 chars): ${text.slice(0, 600)}`);
      const raw = parseJson(text) as Record<string, unknown>;
      const p   = normaliseStep1(raw);
      if (!p.phase1 && !p.phase2) {
        const keys = Object.keys(raw).join(", ");
        console.error("[step1] MISSING phases after normalise. Keys:", keys, "| Raw:", JSON.stringify(raw).slice(0, 800));
        return res.status(500).json({
          error: `AI did not return Early Game phases (got keys: ${keys || "none"}). Try again — if it keeps failing, try a shorter or simpler build description.`,
        });
      }
      res.json(p);
    } catch (err) {
      console.error("Step1 error:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/generate/step2 — Mid Game (phase3) + Mid-Late Game (phase4)
  app.post("/api/generate/step2", async (req, res) => {
    const body = req.body as GenerateStep2Request;
    const { gameKey, gameName, partialBuild, provider, model } = body;

    const systemPrompt = buildSystemPrompt(
      gameKey, gameName, provider,
      `Continue the "${partialBuild.label}" build. Generate the mid-game phases.`,
    );

    const pb = partialBuild as Record<string, unknown>;
    const weaponTpl = getWeaponTemplate(gameKey);

    const userPrompt = `CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }.

Build so far: ${JSON.stringify({
  label: partialBuild.label,
  cls: partialBuild.cls,
  caps: partialBuild.caps,
  phase1: pb.phase1,
  phase2: pb.phase2,
}, null, 2)}

Generate phase3 (Mid Game) and phase4 (Mid-Late Game) for this ${gameName} build.

{
  "phase3": {
    "name": "Mid Game",
    "chapter": "When Iron Finds Its Purpose",
    "range": "SL 35-55",
    "stats": ${getPhaseStats(gameKey, 3)},
    "sn": "Build identity locked in — primary weapon upgraded to mid-tier, first soft caps in sight.",
    "weapons": [ ${weaponTpl} ],
    "armor": [], "acc": [], "spells": [],
    "dmg": { "ps": 270, "sp": 230, "bs": 540, "n": "Mid-game damage context" }
  },
  "phase4": {
    "name": "Mid-Late Game",
    "chapter": "The Iron Ascent",
    "range": "SL 55-75",
    "stats": ${getPhaseStats(gameKey, 4)},
    "sn": "First soft cap hit — weapon nearing max upgrade, key boss weapons unlocked.",
    "weapons": [ ${weaponTpl} ],
    "armor": [], "acc": [], "spells": [],
    "dmg": { "ps": 320, "sp": 270, "bs": 640, "n": "Mid-late damage context" }
  }
}

Rules: all item locations must be real in ${gameName}. Include lore and durability for every item. Use correct stat names for ${gameName}.
- chapter: 3-5 word dark-fantasy lore title, unique per phase.`;

    try {
      const text   = await callAI(provider, model, systemPrompt, userPrompt);
      console.log(`[step2] AI response (first 600 chars): ${text.slice(0, 600)}`);
      const parsed = parseJson(text) as Record<string, unknown>;
      const p = normaliseStep2(parsed);
      if (!p.phase3 && !p.phase4) {
        console.error("[step2] MISSING phases after normalise:", JSON.stringify(parsed).slice(0, 600));
        return res.status(500).json({ error: "AI did not return Mid Game phases. Try again." });
      }
      res.json(p);
    } catch (err) {
      console.error("Step2 error:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/generate/step3 — Late Game (phase5) + End Game (phase6) + NG+ (phase7)
  app.post("/api/generate/step3", async (req, res) => {
    const body = req.body as GenerateStep2Request;
    const { gameKey, gameName, partialBuild, provider, model } = body;

    const systemPrompt = buildSystemPrompt(
      gameKey, gameName, provider,
      `Continue the "${partialBuild.label}" build. Generate the late-game and NG+ phases.`,
    );

    const pb = partialBuild as Record<string, unknown>;
    const weaponTpl = getWeaponTemplate(gameKey);
    const ngStatKey = gameKey === "ds3" ? "VIG" : "VIT";

    const userPrompt = `CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }.

Build so far: ${JSON.stringify({
  label: partialBuild.label,
  cls: partialBuild.cls,
  caps: partialBuild.caps,
  phase3: pb.phase3,
  phase4: pb.phase4,
}, null, 2)}

Generate phase5 (Late Game), phase6 (End Game), and phase7 (NG+) for this ${gameName} build.

{
  "phase5": {
    "name": "Late Game",
    "chapter": "The Weight of Kingdoms",
    "range": "SL 75-95",
    "stats": ${getPhaseStats(gameKey, 5)},
    "sn": "Approaching peak — all core soft caps reachable, best-in-slot weapons upgrading.",
    "weapons": [ ${weaponTpl} ],
    "armor": [], "acc": [], "spells": [],
    "dmg": { "ps": 370, "sp": 320, "bs": 740, "n": "Late-game damage context" }
  },
  "phase6": {
    "name": "End Game",
    "chapter": "The Final Reckoning",
    "range": "SL 95-120",
    "stats": ${getPhaseStats(gameKey, 6)},
    "sn": "Fully optimised — all soft caps hit, best-in-slot gear equipped. PvP meta range reached.",
    "weapons": [ ${weaponTpl} ],
    "armor": [], "acc": [], "spells": [],
    "dmg": { "ps": 430, "sp": 380, "bs": 860, "n": "Peak damage context" }
  },
  "phase7": {
    "name": "NG+",
    "chapter": "The Undying Herald Endures",
    "range": "NG+1 and beyond",
    "stats": ${getPhaseStats(gameKey, 7)},
    "sn": "Same build; enemies scale harder each cycle. Note any DLC weapons or covenant rewards worth pursuing.",
    "weapons": [], "armor": [], "acc": [], "spells": [],
    "dmg": { "ps": 430, "sp": 380, "bs": 860, "n": "Same damage output; enemy HP/damage scales per cycle" },
    "ngCycles": [
      { "label": "NG+1", "stats": { "${ngStatKey}": 40 }, "notes": "~20% HP/damage increase" },
      { "label": "NG+3", "stats": { "${ngStatKey}": 45 }, "notes": "~50% HP increase — adapt positioning" },
      { "label": "NG+5", "stats": { "${ngStatKey}": 50 }, "notes": "~90% HP increase — patience over aggression" },
      { "label": "NG+7", "stats": { "${ngStatKey}": 55 }, "notes": "~150% HP increase — max difficulty" }
    ]
  }
}

Rules: all item locations must be real in ${gameName}. Include lore and durability for every item. Use correct stat names for ${gameName}.
- chapter: 3-5 word dark-fantasy lore title, unique per phase.`;

    try {
      const text   = await callAI(provider, model, systemPrompt, userPrompt);
      console.log(`[step3] AI response (first 600 chars): ${text.slice(0, 600)}`);
      const parsed = parseJson(text) as Record<string, unknown>;
      const p = normaliseStep3(parsed);
      if (!p.phase5 && !p.phase6 && !p.phase7) {
        console.error("[step3] MISSING phases after normalise:", JSON.stringify(parsed).slice(0, 600));
        return res.status(500).json({ error: "AI did not return Late Game / End Game / NG+ phases. Try again." });
      }
      res.json(p);
    } catch (err) {
      console.error("Step3 error:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/generate/step4 — pros / cons / quick-ref / tab names
  app.post("/api/generate/step4", async (req, res) => {
    const body = req.body as GenerateStep3Request;
    const { gameKey, gameName, partialBuild, provider, model } = body;

    const systemPrompt = buildSystemPrompt(gameKey, gameName, provider, "", true); // light — no codex needed

    const userPrompt = `CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }.

Build: "${partialBuild.label}" (${partialBuild.sub})
Playstyle: ${partialBuild.playstyle}
Caps: ${JSON.stringify(partialBuild.caps)}

{
  "pros": [ "Pro 1 — specific to this build", "Pro 2", "Pro 3", "Pro 4", "Pro 5" ],
  "cons": [ "Con 1 — honest weakness", "Con 2", "Con 3", "Con 4" ],
  "ref": [
    { "n": "Item Name", "i": "Type", "w": 5.0, "ap": 270, "st": "Bleed 45 or —", "ar": "Poise 12 or —", "s": "A/D or —", "a": "Sharp or —" }
  ],
  "tabNames": {
    "build": "Disciplines of Frost",
    "progression": "The Chosen Path",
    "materials": "The Arcane Arsenal",
    "prosCons": "Truths & Burdens",
    "quickRef": "Scholar's Tome"
  }
}

Include the 5-8 most important items in ref. Pros/cons must be specific to this ${gameName} build.
tabNames: 2-4 word lore-flavored labels for each UI tab, themed to this specific build. They replace the generic "Your Build / Progression / Materials / Pros & Cons / Quick Ref" labels. Keep them short enough to fit in a tab.`;

    try {
      const text = await callAI(provider, model, systemPrompt, userPrompt);
      let parsed: { pros?: string[]; cons?: string[]; ref?: unknown[]; tabNames?: Record<string, string> } = {};
      try { parsed = parseJson<typeof parsed>(text); } catch { /* non-fatal */ }
      res.json(parsed);
    } catch {
      res.json({ pros: [], cons: [], ref: [] });
    }
  });

  // POST /api/generate/finalize — assemble Build + save
  app.post("/api/generate/finalize", (req, res) => {
    const { gameKey, buildKey, step1, step2, step3, step4 } = req.body as {
      gameKey: string;
      gameName: string;
      buildKey: string;
      step1: Record<string, unknown>;
      step2: Record<string, unknown>;
      step3: Record<string, unknown>;
      step4: { pros: string[]; cons: string[]; ref: unknown[]; tabNames?: Record<string, string> };
    };

    const build: Build = {
      key: buildKey,
      gameKey,
      label:     String(step1.label    ?? ""),
      sub:       String(step1.sub      ?? ""),
      icon:      String(step1.icon     ?? "⚔️"),
      accent:    String(step1.accent   ?? "#888888"),
      playstyle: String(step1.playstyle ?? ""),
      cls:       String(step1.cls      ?? ""),
      caps:      (step1.caps      as string[]) ?? [],
      weaponReq: (step1.weaponReq as string[]) ?? [],
      loadouts:  null,
      phases: [
        step1.phase1,
        step1.phase2,
        step2.phase3,
        step2.phase4,
        step3.phase5,
        step3.phase6,
        step3.phase7,
      ].filter(Boolean) as Build["phases"],
      pros: step4?.pros ?? [],
      cons: step4?.cons ?? [],
      ref:  (step4?.ref as Build["ref"]) ?? [],
      tabNames: step4?.tabNames as Build["tabNames"] ?? undefined,
      isAI: true,
    };

    try {
      storage.createDynamicBuild({ key: build.key, gameKey, data: JSON.stringify(build) });
    } catch { /* duplicate — re-finalize is fine */ }

    res.json(build);
  });

  // POST /api/export
  app.post("/api/export", (_req, res) => {
    const builds = storage.getDynamicBuilds().map((r) => JSON.parse(r.data) as Build);
    const games  = storage.getDynamicGames().map((r) => JSON.parse(r.data) as Game);
    const knowledge: Record<string, KnowledgeFact[]> = {};
    for (const g of [...SEED_GAMES, ...games]) {
      const cache = storage.getKnowledgeCache(g.key);
      if (cache) {
        try { knowledge[g.key] = JSON.parse(cache.facts); } catch { /* ignore */ }
      }
    }
    res.json({ builds, games, knowledge, exportedAt: new Date().toISOString() });
  });

  // POST /api/import
  app.post("/api/import", (req, res) => {
    const { builds = [], games = [] } = req.body as { builds: Build[]; games: Game[] };

    let importedBuilds = 0;
    let importedGames  = 0;

    for (const g of games) {
      try { storage.createDynamicGame({ key: g.key, data: JSON.stringify(g) }); importedGames++; }
      catch { /* skip duplicates */ }
    }
    for (const b of builds) {
      try { storage.createDynamicBuild({ key: b.key, gameKey: b.gameKey, data: JSON.stringify(b) }); importedBuilds++; }
      catch { /* skip duplicates */ }
    }

    res.json({ importedBuilds, importedGames });
  });
}
