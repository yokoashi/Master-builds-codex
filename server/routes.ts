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
    // The codex block is identical across step1 → step2 → step3 → step4 for the same game,
    // so Anthropic's ephemeral prompt cache (5-min window) reuses it on steps 2–4
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

// Metadata-only normaliser for step1 (label, key, cls, etc. — no phases)
function normaliseMetadata(p: Record<string, unknown>): Record<string, unknown> {
  if (p.label || p.key) return p;
  // AI wrapped everything under a single top-level key e.g. { "build": { "label": ... } }
  for (const val of Object.values(p)) {
    if (!val || typeof val !== "object" || Array.isArray(val)) continue;
    const inner = val as Record<string, unknown>;
    if (inner.label || inner.key) return { ...p, ...inner };
  }
  return p;
}

// Early-phase normaliser for step2 (finds phase1 / phase2)
function normaliseEarlyPhases(p: Record<string, unknown>): Record<string, unknown> {
  const earlyKeys    = /early.?game|phase.?1|earlyGame/i;
  const earlyMidKeys = /early.?mid|transition|phase.?2|earlyMid/i;

  if (p.phase1 || p.phase2) return p;

  const nested = p.phases as Record<string, unknown> | undefined;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    if (nested.phase1 || nested.phase2) return { ...p, ...nested };
  }

  if (Array.isArray(p.phases) && p.phases.length >= 2) {
    const arr = p.phases as unknown[];
    return { ...p, phase1: arr[0], phase2: arr[1] };
  }

  const phase1 = p.phase_1 ?? p.earlyGame ?? p.early_game ?? phaseByName(p, earlyKeys);
  const phase2 = p.phase_2 ?? p.earlyMidGame ?? p.early_mid_game ?? phaseByName(p, earlyMidKeys);
  if (phase1 || phase2) return { ...p, phase1, phase2 };

  for (const val of Object.values(p)) {
    if (!val || typeof val !== "object" || Array.isArray(val)) continue;
    const inner = val as Record<string, unknown>;
    if (inner.phase1 || inner.phase2) return { ...p, ...inner };
    const ip1 = inner.phase_1 ?? inner.earlyGame ?? inner.early_game ?? phaseByName(inner, earlyKeys);
    const ip2 = inner.phase_2 ?? inner.earlyMidGame ?? inner.early_mid_game ?? phaseByName(inner, earlyMidKeys);
    if (ip1 || ip2) return { ...p, ...inner, phase1: ip1, phase2: ip2 };
    if (Array.isArray(inner.phases) && (inner.phases as unknown[]).length >= 2) {
      const arr = inner.phases as unknown[];
      return { ...p, ...inner, phase1: arr[0], phase2: arr[1] };
    }
  }

  // Bare phase object detection
  const isPhase = ("sn" in p || "dmg" in p) && ("weapons" in p || "armor" in p);
  if (isPhase) {
    const name = String(p.name ?? "");
    return /early.?mid/i.test(name) ? { phase2: p } : { phase1: p };
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

/** Returns brief, imperative rules injected into every step's user-prompt Rules section. */
function getGamePromptRules(gameKey: string): string {
  if (gameKey === "ds3") {
    return `
DS3 MANDATORY FIELDS — failure to include these is invalid output:
- wa: exact weapon art name for EVERY weapon — "Stomp", "Warcry", "Stance", "Hold", "Parry", "Spin Slash", "Charge", "Skill", etc. NEVER null.
- inf: infusion type for EVERY weapon — Sharp, Heavy, Refined, Crystal, Simple, Chaos, Lightning, Dark, Blessed, Blood, Hollow, Raw, Poison, or None (boss/unique weapons). NEVER null.
- fp: FP cost integer for EVERY weapon art and spell. NEVER null.
- Stats: VIG (HP), ATT (FP+slots), END (stamina), VIT (equip load), STR, DEX, INT, FTH, LCK — NEVER use RES or VIT for HP.
- Upgrade paths: "+10" for standard (Titanite Slab), "+5" for boss (Titanite Scale) or unique (Twinkling Titanite) weapons.
- Soft caps to observe: VIG 27/50, END 40, VIT 40, STR 40/66 two-hand, DEX 40/60, INT 40/60, FTH 40/60, LCK 40.`;
  }
  return "";
}


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
// light=true skips the codex entirely (step4/pros-cons only needs the build data
// already in the user message, so there's no reason to send 150K chars again).
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

  // POST /api/generate/step1 — build concept & metadata only (label, sub, cls, caps, etc.)
  app.post("/api/generate/step1", async (req, res) => {
    const body = req.body as GenerateStep1Request;
    const { gameKey, gameName, buildDescription, provider, model, preferredWeapon, constraints } = body;

    const systemPrompt = buildSystemPrompt(gameKey, gameName, provider);

    const userPrompt = `CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }.

Define the identity and concept for a ${gameName} build: "${buildDescription}"
${preferredWeapon ? `Preferred weapon: ${preferredWeapon}` : ""}
${constraints ? `Constraints: ${constraints}` : ""}

Return ONLY this JSON — NO phases, NO items:

{
  "key": "iron-heretic",
  "gameKey": "${gameKey}",
  "label": "The Iron Heretic",
  "sub": "Outcast of the First Flame",
  "icon": "⚔",
  "accent": "#1c0a2e",
  "playstyle": "2-3 sentences: combat style, defining mechanic, and one key vulnerability.",
  "cls": "Knight",
  "caps": ["STR 40", "VIG 27"],
  "weaponReq": ["STR 28"],
  "loadouts": null
}

Rules:
- label: evocative proper name rooted in ${gameName} lore. NEVER a stat description. Good: "Moonlight Pilgrim", "The Iron Heretic". Bad: "Pure STR Build"
- sub: 3-6 word poetic subtitle — lore archetype or thematic phrase
- key: kebab-case of label, no suffix
- accent: dark hex color matching theme (deep crimson=fire, dark violet=sorcery, gunmetal=STR)
- playstyle: honest 2-3 sentences — combat identity, primary mechanic, and one defining weakness
- cls: optimal starting class for this exact build (fewest wasted level-ups)
- caps: stat soft caps this build targets as ["STAT XX"] strings${getGamePromptRules(gameKey)}`;

    try {
      const text = await callAI(provider, model, systemPrompt, userPrompt);
      console.log(`[step1] AI response (first 600 chars): ${text.slice(0, 600)}`);
      const raw = parseJson(text) as Record<string, unknown>;
      const p   = normaliseMetadata(raw);
      if (!p.label && !p.key) {
        const keys = Object.keys(raw).join(", ");
        console.error("[step1] MISSING metadata after normalise. Keys:", keys);
        return res.status(500).json({
          error: `AI did not return build metadata (got keys: ${keys || "none"}). Try again.`,
        });
      }
      res.json(p);
    } catch (err) {
      console.error("Step1 error:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/generate/step2 — loadouts & equipment configurations
  app.post("/api/generate/step2", async (req, res) => {
    const body = req.body as GenerateStep2Request;
    const { gameKey, gameName, partialBuild, provider, model } = body;

    const systemPrompt = buildSystemPrompt(
      gameKey, gameName, provider,
      `Generate loadout configurations for "${partialBuild.label}".`,
    );

    const userPrompt = `CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }.

Build identity: ${JSON.stringify({
  label: partialBuild.label,
  cls: partialBuild.cls,
  caps: partialBuild.caps,
  weaponReq: partialBuild.weaponReq,
  playstyle: partialBuild.playstyle,
}, null, 2)}

Generate 2-3 loadout configurations for this ${gameName} build. Each loadout defines an alternate weapon+armor setup with specific equipment weight thresholds and roll-speed tier.

{
  "loadouts": [
    {
      "id": "fast-roll",
      "label": "Fast Roll",
      "weaponWt": 8.5,
      "endReq": 25,
      "armor": "Black Leather Set — maximum agility",
      "pros": ["Fastest dodge i-frames", "Best chase/escape mobility"],
      "cons": ["Lowest absorption", "Heavily punished on trades"]
    },
    {
      "id": "standard",
      "label": "Standard",
      "weaponWt": 14.0,
      "endReq": 32,
      "armor": "Knight Set — solid absorption",
      "pros": ["Reliable i-frames", "Good absorption"],
      "cons": ["Less mobile than fast roll"]
    }
  ]
}

Rules:
- 2-3 loadouts covering different weight/roll tiers (fast/medium/heavy or fast/standard/tank)
- Each loadout must reference real ${gameName} armor sets
- endReq: minimum END stat needed to stay in that roll tier with the primary weapon
- weaponWt: combined weapon weight for the loadout's primary setup${getGamePromptRules(gameKey)}`;

    try {
      const text = await callAI(provider, model, systemPrompt, userPrompt);
      console.log(`[step2] AI response (first 400 chars): ${text.slice(0, 400)}`);
      let parsed: { loadouts?: unknown[] } = { loadouts: [] };
      try {
        const raw = parseJson(text) as Record<string, unknown>;
        const arr = raw.loadouts ?? raw.configurations ?? raw.variants;
        parsed = { loadouts: Array.isArray(arr) ? arr : [] };
      } catch { /* non-fatal */ }
      res.json(parsed);
    } catch {
      res.json({ loadouts: [] });
    }
  });

  // POST /api/generate/step3 — Early Game (phase1) + Early-Mid Game (phase2)
  app.post("/api/generate/step3", async (req, res) => {
    const body = req.body as GenerateStep2Request;
    const { gameKey, gameName, partialBuild, provider, model } = body;

    const systemPrompt = buildSystemPrompt(
      gameKey, gameName, provider,
      `Generate early-game phases for "${partialBuild.label}".`,
    );

    const weaponTpl = getWeaponTemplate(gameKey);

    const userPrompt = `CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }.

Build identity: ${JSON.stringify({
  label: partialBuild.label,
  sub: partialBuild.sub,
  cls: partialBuild.cls,
  caps: partialBuild.caps,
  weaponReq: partialBuild.weaponReq,
  playstyle: partialBuild.playstyle,
}, null, 2)}

Generate phase1 (Early Game) and phase2 (Early-Mid Game) for this ${gameName} build.

{
  "phase1": {
    "name": "Early Game",
    "chapter": "The Vow of the Sacred Flame",
    "range": "SL 1-20",
    "stats": ${getPhaseStats(gameKey, 1)},
    "sn": "Opening strategy (2-3 sentences) — starting gear, first upgrade stone, first key NPC.",
    "weapons": [ ${weaponTpl} ],
    "armor": [ { "n": "Armor Name", "wt": 4.0, "eq": "Chest", "d": "...", "loc": "...", "up": "None", "tip": "...", "lore": "...", "durability": 300 } ],
    "acc":   [ { "n": "Ring Name", "wt": 0.0, "eq": "Ring", "d": "...", "loc": "...", "up": "None", "tip": "...", "lore": "..." } ],
    "spells": [],
    "dmg": { "ps": 150, "sp": 120, "bs": 300, "n": "Damage context" },
    "progression": ["Action 1: specific thing to do first", "Action 2: upgrade goal", "Action 3: NPC or location to visit", "Action 4: boss kill or item to unlock", "Action 5: gear swap or level target"],
    "checklist": ["Item Name — why needed", "Upgrade level — e.g. +3 weapon before leaving", "Boss kill — what it unlocks", "NPC visit — what you get"],
    "keyBosses": ["Boss Name — 1 sentence on build-specific approach or difficulty"]
  },
  "phase2": {
    "name": "Early-Mid Game",
    "chapter": "The Pale Covenant",
    "range": "SL 20-35",
    "stats": ${getPhaseStats(gameKey, 2)},
    "sn": "First major upgrade unlock — weapon at +3 or better, key early rings secured.",
    "weapons": [ ${weaponTpl} ],
    "armor": [], "acc": [], "spells": [],
    "dmg": { "ps": 200, "sp": 170, "bs": 400, "n": "Damage context" },
    "progression": ["Action 1: specific thing to do first", "Action 2: upgrade goal", "Action 3: NPC or location to visit", "Action 4: boss kill or item to unlock"],
    "checklist": ["Item Name — why needed", "Upgrade level before leaving", "Boss kill — unlocks next area", "Ring or tool to acquire"],
    "keyBosses": ["Boss Name — 1 sentence on build-specific approach"]
  }
}

Rules: all item locations must be real in ${gameName}. Include lore and durability for every item. Use correct stat names for ${gameName}.
- chapter: 3-5 word dark-fantasy lore title, unique per phase.
- Rings in "acc"; spells/sorceries/pyromancies/miracles in "spells".
- steps: questline array only for multi-step acquisitions; null for drops/merchants.
- progression: 4-6 specific ordered actions to advance from THIS phase to the NEXT (boss kills, upgrade milestones, NPC visits, area clears). Be concrete.
- checklist: 5-8 items/objectives to have/complete before leaving. Format: "Name — brief why"
- keyBosses: boss encounters in this SL range, 1 sentence each on build-specific strategy${getGamePromptRules(gameKey)}`;

    try {
      const text   = await callAI(provider, model, systemPrompt, userPrompt);
      console.log(`[step3] AI response (first 600 chars): ${text.slice(0, 600)}`);
      const parsed = parseJson(text) as Record<string, unknown>;
      const p = normaliseEarlyPhases(parsed);
      if (!p.phase1 && !p.phase2) {
        console.error("[step3] MISSING early phases:", JSON.stringify(parsed).slice(0, 600));
        return res.status(500).json({ error: "AI did not return Early Game phases. Try again." });
      }
      res.json(p);
    } catch (err) {
      console.error("Step3 error:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/generate/step4 — Mid Game (phase3 only — isolated for quality)
  app.post("/api/generate/step4", async (req, res) => {
    const body = req.body as GenerateStep2Request;
    const { gameKey, gameName, partialBuild, provider, model } = body;

    const systemPrompt = buildSystemPrompt(
      gameKey, gameName, provider,
      `Continue "${partialBuild.label}". Generate the mid-game phase.`,
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

Generate phase3 (Mid Game) for this ${gameName} build. Build identity is crystallising — primary weapon at mid-tier upgrade, first key covenants unlocked.

{
  "phase3": {
    "name": "Mid Game",
    "chapter": "When Iron Finds Its Purpose",
    "range": "SL 35-55",
    "stats": ${getPhaseStats(gameKey, 3)},
    "sn": "Build identity locked in — primary weapon at mid-tier upgrade, first soft caps in sight. Key covenants and merchants unlocked.",
    "weapons": [ ${weaponTpl} ],
    "armor": [], "acc": [], "spells": [],
    "dmg": { "ps": 270, "sp": 230, "bs": 540, "n": "Mid-game damage context" },
    "progression": ["Action 1: specific goal to push toward mid-late", "Action 2: upgrade milestone", "Action 3: covenant or NPC", "Action 4: boss that gates mid-late content"],
    "checklist": ["Item — why needed before moving on", "Upgrade level — target before leaving", "Boss kill — what it unlocks", "Key ring or accessory"],
    "keyBosses": ["Boss Name — 1 sentence build-specific approach", "Boss Name 2 — strategy note"]
  }
}

Rules: all item locations must be real in ${gameName}. Include lore and durability for every item. Use correct stat names.
- chapter: 3-5 word dark-fantasy lore title.
- Include 2-3 weapons, 2-3 armor pieces, 2-3 accessories.
- progression: 4-6 specific ordered steps to advance from Mid Game to Mid-Late. Boss kills, upgrade targets, NPC visits.
- checklist: 5-8 items/objectives. Format: "Name — brief why"
- keyBosses: boss encounters in SL 35-55, 1 sentence each on build approach${getGamePromptRules(gameKey)}`;

    try {
      const text = await callAI(provider, model, systemPrompt, userPrompt);
      console.log(`[step4] AI response (first 600 chars): ${text.slice(0, 600)}`);
      const parsed = parseJson(text) as Record<string, unknown>;
      let p = parsed;
      if (!p.phase3) {
        const midKeys = /^mid.?game$|phase.?3|^midGame$/i;
        const nested = (p.phases as Record<string, unknown> | undefined)?.phase3 ?? p.phase_3 ?? p.midGame ?? phaseByName(p, midKeys);
        if (nested) { p = { ...p, phase3: nested }; }
        else if (Array.isArray(p.phases) && (p.phases as unknown[]).length > 0) { p = { ...p, phase3: (p.phases as unknown[])[0] }; }
        else if ("sn" in p || "dmg" in p) { p = { phase3: p }; }
        else {
          // deep search — catches OpenAI wrapping output under a top-level key
          for (const val of Object.values(p)) {
            if (!val || typeof val !== "object" || Array.isArray(val)) continue;
            const inner = val as Record<string, unknown>;
            const ip3 = inner.phase3 ?? inner.phase_3 ?? inner.midGame ?? phaseByName(inner, midKeys);
            if (ip3) { p = { ...p, phase3: ip3 }; break; }
            if (Array.isArray(inner.phases) && (inner.phases as unknown[]).length > 0) { p = { ...p, phase3: (inner.phases as unknown[])[0] }; break; }
          }
        }
      }
      if (!p.phase3) {
        console.error("[step4] MISSING phase3:", JSON.stringify(parsed).slice(0, 600));
        return res.status(500).json({ error: "AI did not return Mid Game phase. Try again." });
      }
      res.json(p);
    } catch (err) {
      console.error("Step4 error:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/generate/step5 — Mid-Late Game (phase4 only — first soft caps)
  app.post("/api/generate/step5", async (req, res) => {
    const body = req.body as GenerateStep2Request;
    const { gameKey, gameName, partialBuild, provider, model } = body;

    const systemPrompt = buildSystemPrompt(
      gameKey, gameName, provider,
      `Continue "${partialBuild.label}". Generate the mid-late transition phase.`,
    );

    const pb = partialBuild as Record<string, unknown>;
    const weaponTpl = getWeaponTemplate(gameKey);

    const userPrompt = `CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }.

Build so far: ${JSON.stringify({
  label: partialBuild.label,
  cls: partialBuild.cls,
  caps: partialBuild.caps,
  phase3: pb.phase3,
}, null, 2)}

Generate phase4 (Mid-Late Game) for this ${gameName} build. Critical transition — first soft caps landing, boss weapons now craftable, playstyle fully commits.

{
  "phase4": {
    "name": "Mid-Late Game",
    "chapter": "The Iron Ascent",
    "range": "SL 55-75",
    "stats": ${getPhaseStats(gameKey, 4)},
    "sn": "First soft cap hit — weapon nearing max upgrade, boss weapons craftable. Build commits fully.",
    "weapons": [ ${weaponTpl} ],
    "armor": [], "acc": [], "spells": [],
    "dmg": { "ps": 320, "sp": 270, "bs": 640, "n": "Mid-late damage context" },
    "progression": ["Action 1: which boss weapon to forge first", "Action 2: upgrade path to +10/+5", "Action 3: stat level to hit next soft cap", "Action 4: late-game area unlock"],
    "checklist": ["Boss weapon — which boss soul to use", "Upgrade — weapon to +10 or +5 before late game", "Soft cap — which stat to push first", "Key armor — acquire before late content"],
    "keyBosses": ["Boss Name — boss soul used for weapon / build significance", "Boss Name 2 — gates late-game area"]
  }
}

Rules: all item locations must be real in ${gameName}. Include lore and durability. Use correct stat names.
- chapter: 3-5 word dark-fantasy lore title.
- Mention specific boss weapon prerequisites in weapon loc fields.
- progression: 4-6 steps to advance to Late Game. Focus on weapon forge decisions and soft cap milestones.
- checklist: 5-8 items/objectives. Format: "Name — brief why"
- keyBosses: boss encounters in SL 55-75 with build-specific notes${getGamePromptRules(gameKey)}`;

    try {
      const text = await callAI(provider, model, systemPrompt, userPrompt);
      console.log(`[step5] AI response (first 600 chars): ${text.slice(0, 600)}`);
      const parsed = parseJson(text) as Record<string, unknown>;
      let p = parsed;
      if (!p.phase4) {
        const midLateKeys = /mid.?late|phase.?4|midLate/i;
        const nested = (p.phases as Record<string, unknown> | undefined)?.phase4 ?? p.phase_4 ?? p.midLateGame ?? phaseByName(p, midLateKeys);
        if (nested) { p = { ...p, phase4: nested }; }
        else if (Array.isArray(p.phases) && (p.phases as unknown[]).length > 0) { p = { ...p, phase4: (p.phases as unknown[])[0] }; }
        else if ("sn" in p || "dmg" in p) { p = { phase4: p }; }
        else {
          for (const val of Object.values(p)) {
            if (!val || typeof val !== "object" || Array.isArray(val)) continue;
            const inner = val as Record<string, unknown>;
            const ip4 = inner.phase4 ?? inner.phase_4 ?? inner.midLateGame ?? phaseByName(inner, midLateKeys);
            if (ip4) { p = { ...p, phase4: ip4 }; break; }
            if (Array.isArray(inner.phases) && (inner.phases as unknown[]).length > 0) { p = { ...p, phase4: (inner.phases as unknown[])[0] }; break; }
          }
        }
      }
      if (!p.phase4) {
        console.error("[step5] MISSING phase4:", JSON.stringify(parsed).slice(0, 600));
        return res.status(500).json({ error: "AI did not return Mid-Late Game phase. Try again." });
      }
      res.json(p);
    } catch (err) {
      console.error("Step5 error:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/generate/step6 — Late Game (phase5 only)
  app.post("/api/generate/step6", async (req, res) => {
    const body = req.body as GenerateStep2Request;
    const { gameKey, gameName, partialBuild, provider, model } = body;

    const systemPrompt = buildSystemPrompt(
      gameKey, gameName, provider,
      `Continue "${partialBuild.label}". Generate the Late Game phase.`,
    );

    const pb = partialBuild as Record<string, unknown>;
    const weaponTpl = getWeaponTemplate(gameKey);

    const userPrompt = `CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }.

Build so far: ${JSON.stringify({
  label: partialBuild.label,
  cls: partialBuild.cls,
  caps: partialBuild.caps,
  phase4: pb.phase4,
}, null, 2)}

Generate ONLY phase5 (Late Game) for this ${gameName} build.

{
  "phase5": {
    "name": "Late Game",
    "chapter": "The Weight of Kingdoms",
    "range": "SL 75-95",
    "stats": ${getPhaseStats(gameKey, 5)},
    "sn": "Approaching peak — all core soft caps reachable, best-in-slot weapons upgrading.",
    "weapons": [ ${weaponTpl} ],
    "armor": [], "acc": [], "spells": [],
    "dmg": { "ps": 370, "sp": 320, "bs": 740, "n": "Late-game damage context" },
    "progression": ["Action 1: remaining soft caps to finish", "Action 2: best-in-slot item to farm or buy", "Action 3: optional covenant or DLC content", "Action 4: final stat level before End Game"],
    "checklist": ["Weapon at max upgrade — +10 or +5", "All primary soft caps hit", "Best-in-slot armor acquired", "Key talisman/ring for build finisher"],
    "keyBosses": ["Boss Name — guards key late item for this build", "Optional Boss — DLC or covenant reward worth pursuing"]
  }
}

Rules: all item locations must be real in ${gameName}. Include lore and durability. Use correct stat names.
- chapter: 3-5 word dark-fantasy lore title.
- progression: 4-6 steps that advance toward End Game.
- checklist: 5-8 items/objectives. Format: "Name — brief why"
- keyBosses: boss encounters in SL 75-95 range, 1 sentence each on build approach${getGamePromptRules(gameKey)}`;

    try {
      const text = await callAI(provider, model, systemPrompt, userPrompt);
      console.log(`[step6] raw (first 2000 chars):\n${text.slice(0, 2000)}`);
      const parsed = parseJson(text) as Record<string, unknown>;
      const lateKeys = /late.?game|phase.?5|lateGame/i;
      let p = parsed;
      if (!p.phase5) {
        const nested = (p.phases as Record<string, unknown> | undefined)?.phase5 ?? p.phase_5 ?? p.lateGame ?? p.late_game ?? phaseByName(p, lateKeys);
        if (nested) { p = { ...p, phase5: nested }; }
        else if (Array.isArray(p.phases) && (p.phases as unknown[]).length > 0) { p = { ...p, phase5: (p.phases as unknown[])[0] }; }
        else if ("sn" in p || "dmg" in p) { p = { phase5: p }; }
        else {
          for (const val of Object.values(p)) {
            if (!val || typeof val !== "object" || Array.isArray(val)) continue;
            const inner = val as Record<string, unknown>;
            const ip5 = inner.phase5 ?? inner.phase_5 ?? inner.lateGame ?? inner.late_game ?? phaseByName(inner, lateKeys);
            if (ip5) { p = { ...p, phase5: ip5 }; break; }
            if (Array.isArray(inner.phases) && (inner.phases as unknown[]).length > 0) { p = { ...p, phase5: (inner.phases as unknown[])[0] }; break; }
          }
        }
      }
      if (!p.phase5) {
        console.error("[step6] MISSING phase5. Keys:", Object.keys(parsed), "| raw first 2000:", text.slice(0, 2000));
        return res.status(500).json({ error: "AI did not return Late Game phase. Try again." });
      }
      res.json(p);
    } catch (err) {
      console.error("Step6 error:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/generate/step6b — End Game (phase6 only)
  app.post("/api/generate/step6b", async (req, res) => {
    const body = req.body as GenerateStep2Request;
    const { gameKey, gameName, partialBuild, provider, model } = body;

    const systemPrompt = buildSystemPrompt(
      gameKey, gameName, provider,
      `Continue "${partialBuild.label}". Generate the End Game phase.`,
    );

    const pb = partialBuild as Record<string, unknown>;
    const weaponTpl = getWeaponTemplate(gameKey);

    const userPrompt = `CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }.

Build so far: ${JSON.stringify({
  label: partialBuild.label,
  cls: partialBuild.cls,
  caps: partialBuild.caps,
  phase5: pb.phase5,
}, null, 2)}

Generate ONLY phase6 (End Game) for this ${gameName} build.

{
  "phase6": {
    "name": "End Game",
    "chapter": "The Final Reckoning",
    "range": "SL 95-120",
    "stats": ${getPhaseStats(gameKey, 6)},
    "sn": "Fully optimised — all soft caps hit, best-in-slot gear equipped. PvP meta range reached.",
    "weapons": [ ${weaponTpl} ],
    "armor": [], "acc": [], "spells": [],
    "dmg": { "ps": 430, "sp": 380, "bs": 860, "n": "Peak damage context" },
    "progression": ["Action 1: hit SL 120 (PvP meta)", "Action 2: final optional stat point allocation", "Action 3: any last DLC or covenant content", "Action 4: prepare for NG+"],
    "checklist": ["SL 120 reached — PvP meta locked", "All DLC optional content cleared", "Final covenant reward obtained if applicable", "Build fully optimised — nothing left to upgrade"],
    "keyBosses": ["Final boss — build's peak performance showcase", "Optional End Game boss — extra challenge or reward"]
  }
}

Rules: all item locations must be real in ${gameName}. Include lore and durability. Use correct stat names.
- chapter: 3-5 word dark-fantasy lore title, different from phase5's chapter.
- progression: 4-6 final polish steps leading into NG+.
- checklist: 5-8 items/objectives. Format: "Name — brief why"
- keyBosses: end-game boss encounters, 1 sentence each on build approach${getGamePromptRules(gameKey)}`;

    try {
      const text = await callAI(provider, model, systemPrompt, userPrompt);
      console.log(`[step6b] raw (first 2000 chars):\n${text.slice(0, 2000)}`);
      const parsed = parseJson(text) as Record<string, unknown>;
      const endKeys = /end.?game|phase.?6|endGame/i;
      let p = parsed;
      if (!p.phase6) {
        const nested = (p.phases as Record<string, unknown> | undefined)?.phase6 ?? p.phase_6 ?? p.endGame ?? p.end_game ?? p.endgame ?? phaseByName(p, endKeys);
        if (nested) { p = { ...p, phase6: nested }; }
        else if (Array.isArray(p.phases) && (p.phases as unknown[]).length > 0) { p = { ...p, phase6: (p.phases as unknown[])[0] }; }
        else if ("sn" in p || "dmg" in p) { p = { phase6: p }; }
        else {
          for (const val of Object.values(p)) {
            if (!val || typeof val !== "object" || Array.isArray(val)) continue;
            const inner = val as Record<string, unknown>;
            const ip6 = inner.phase6 ?? inner.phase_6 ?? inner.endGame ?? inner.end_game ?? inner.endgame ?? phaseByName(inner, endKeys);
            if (ip6) { p = { ...p, phase6: ip6 }; break; }
            if (Array.isArray(inner.phases) && (inner.phases as unknown[]).length > 0) { p = { ...p, phase6: (inner.phases as unknown[])[0] }; break; }
          }
        }
      }
      if (!p.phase6) {
        console.error("[step6b] MISSING phase6. Keys:", Object.keys(parsed), "| raw first 2000:", text.slice(0, 2000));
        return res.status(500).json({ error: "AI did not return End Game phase. Try again." });
      }
      res.json(p);
    } catch (err) {
      console.error("Step6b error:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/generate/step7 — NG+ cycles (phase7 only)
  app.post("/api/generate/step7", async (req, res) => {
    const body = req.body as GenerateStep2Request;
    const { gameKey, gameName, partialBuild, provider, model } = body;

    const systemPrompt = buildSystemPrompt(
      gameKey, gameName, provider,
      `Generate NG+ guidance for "${partialBuild.label}".`,
    );

    const pb = partialBuild as Record<string, unknown>;
    const ngStatKey = gameKey === "ds3" ? "VIG" : "VIT";

    const userPrompt = `CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }.

Build (peak state): ${JSON.stringify({
  label: partialBuild.label,
  cls: partialBuild.cls,
  caps: partialBuild.caps,
  phase6: pb.phase6,
}, null, 2)}

Generate phase7 (NG+) for this ${gameName} build. Enemies scale harder each cycle — adaptation strategies, covenant rewards across cycles, DLC adjustments.

{
  "phase7": {
    "name": "NG+",
    "chapter": "The Undying Herald Endures",
    "range": "NG+1 and beyond",
    "stats": ${getPhaseStats(gameKey, 7)},
    "sn": "Same build; enemies scale harder each cycle. Note DLC weapons or covenant rewards worth pursuing across NG+ runs.",
    "weapons": [], "armor": [], "acc": [], "spells": [],
    "dmg": { "ps": 430, "sp": 380, "bs": 860, "n": "Same damage output; enemy HP/damage scales per cycle" },
    "ngCycles": [
      { "label": "NG+1", "stats": { "${ngStatKey}": 40 }, "notes": "~20% HP/damage increase — same strategy, tighter execution" },
      { "label": "NG+3", "stats": { "${ngStatKey}": 45 }, "notes": "~50% HP increase — adapt positioning and stamina management" },
      { "label": "NG+5", "stats": { "${ngStatKey}": 50 }, "notes": "~90% HP increase — patience and resource management critical" },
      { "label": "NG+7", "stats": { "${ngStatKey}": 55 }, "notes": "~150% HP increase — maximum difficulty, no margin for error" }
    ],
    "progression": ["Tip 1: how to handle HP/damage scaling across cycles", "Tip 2: any stat point investments worth making in later cycles", "Tip 3: DLC or covenant content to revisit in NG+", "Tip 4: toughest encounter in NG+ for this build and how to handle it"],
    "checklist": ["Collect any missed covenant rewards in NG+", "Grab DLC items that become more accessible in NG+", "Reassess Estus flask allocation if HP pool changes", "Note any questlines that are easier in NG+"],
    "keyBosses": ["Hardest NG+ boss for this build — specific adaptive strategy", "Any boss that scales unfavourably for this build — what to watch for"]
  }
}

Rules: Use correct stat names for ${gameName}. ngCycles notes must be specific to this build's playstyle.
- progression: 4-6 tips specifically for running this build through NG+ cycles
- checklist: items, covenants, or adjustments to make across NG+ runs
- keyBosses: hardest encounters in NG+ for this specific build with adaptive advice${getGamePromptRules(gameKey)}`;

    try {
      const text = await callAI(provider, model, systemPrompt, userPrompt);
      console.log(`[step7] AI response (first 600 chars): ${text.slice(0, 600)}`);
      const parsed = parseJson(text) as Record<string, unknown>;
      let p = parsed;
      if (!p.phase7) {
        const ngKeys = /ng\+|new.?game\+?|phase.?7|ngPlus|build.?perfect/i;
        const nested = (p.phases as Record<string, unknown> | undefined)?.phase7 ?? p.phase_7 ?? p.ngPlus ?? p.ng ?? phaseByName(p, ngKeys);
        if (nested) { p = { ...p, phase7: nested }; }
        else if (Array.isArray(p.phases) && (p.phases as unknown[]).length > 0) { p = { ...p, phase7: (p.phases as unknown[])[0] }; }
        else if ("sn" in p || "ngCycles" in p) { p = { phase7: p }; }
        else {
          for (const val of Object.values(p)) {
            if (!val || typeof val !== "object" || Array.isArray(val)) continue;
            const inner = val as Record<string, unknown>;
            const ip7 = inner.phase7 ?? inner.phase_7 ?? inner.ngPlus ?? inner.ng ?? phaseByName(inner, ngKeys);
            if (ip7) { p = { ...p, phase7: ip7 }; break; }
            if (Array.isArray(inner.phases) && (inner.phases as unknown[]).length > 0) { p = { ...p, phase7: (inner.phases as unknown[])[0] }; break; }
          }
        }
      }
      if (!p.phase7) {
        console.error("[step7] MISSING phase7:", JSON.stringify(parsed).slice(0, 600));
        return res.status(500).json({ error: "AI did not return NG+ phase. Try again." });
      }
      res.json(p);
    } catch (err) {
      console.error("Step7 error:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/generate/step8 — similar & contrasting builds
  app.post("/api/generate/step8", async (req, res) => {
    const body = req.body as GenerateStep3Request;
    const { gameKey, gameName, partialBuild, provider, model } = body;

    const systemPrompt = buildSystemPrompt(gameKey, gameName, provider, "", true);

    const userPrompt = `CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }.

Build: "${partialBuild.label}" (${partialBuild.sub})
Playstyle: ${partialBuild.playstyle}
Caps: ${JSON.stringify(partialBuild.caps)}
Class: ${partialBuild.cls}

Generate similar and contrasting builds that help a player understand this build in context.

{
  "sim": [
    { "n": "Build Name", "cls": "Knight", "weapon": "Primary weapon name", "why": "1-2 sentences on what's shared and how this differs" },
    { "n": "Build Name 2", "cls": "Warrior", "weapon": "Primary weapon name", "why": "What this shares and what it trades" }
  ],
  "oth": [
    { "n": "Contrasting Build", "cls": "Sorcerer", "weapon": "Different weapon", "why": "Why a player might choose this instead — different strengths" },
    { "n": "Alternative 2", "cls": "Pyromancer", "weapon": "Another weapon", "why": "The tradeoffs vs this build" }
  ]
}

- sim: 2 builds sharing the same core damage type or weapon class but taking a different path
- oth: 2 clearly different builds (different damage type, playstyle) a player considering this might also consider
- why: always written from the perspective of choosing BETWEEN these builds`;

    try {
      const text = await callAI(provider, model, systemPrompt, userPrompt);
      let parsed: { sim?: unknown[]; oth?: unknown[] } = {};
      try { parsed = parseJson<typeof parsed>(text); } catch { /* non-fatal */ }
      res.json({ sim: parsed.sim ?? [], oth: parsed.oth ?? [] });
    } catch {
      res.json({ sim: [], oth: [] });
    }
  });

  // POST /api/generate/step9 — pros / cons / quick-ref / tab names
  app.post("/api/generate/step9", async (req, res) => {
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
    const { gameKey, buildKey, step1, step2, step3, step4, step5, step6, step6b, step7, step8, step9 } = req.body as {
      gameKey: string;
      gameName: string;
      buildKey: string;
      step1: Record<string, unknown>;
      step2: { loadouts?: unknown[] };
      step3: Record<string, unknown>;
      step4: Record<string, unknown>;
      step5: Record<string, unknown>;
      step6: Record<string, unknown>;
      step6b: Record<string, unknown>;
      step7: Record<string, unknown>;
      step8: { sim?: unknown[]; oth?: unknown[] };
      step9: { pros?: string[]; cons?: string[]; ref?: unknown[]; tabNames?: Record<string, string> };
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
      loadouts:  (step2?.loadouts as Build["loadouts"]) ?? null,
      phases: [
        step3.phase1,
        step3.phase2,
        step4.phase3,
        step5.phase4,
        step6.phase5,
        step6b?.phase6,
        step7.phase7,
      ].filter(Boolean) as Build["phases"],
      sim:  (step8?.sim as Build["sim"])  ?? [],
      oth:  (step8?.oth as Build["oth"])  ?? [],
      pros: step9?.pros  ?? [],
      cons: step9?.cons  ?? [],
      ref:  (step9?.ref  as Build["ref"]) ?? [],
      tabNames: step9?.tabNames as Build["tabNames"] ?? undefined,
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
