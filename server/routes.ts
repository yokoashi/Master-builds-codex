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
  const lateKeys = /late.?game|phase.?4|lateGame/i;
  const endKeys  = /end.?game|phase.?5|endGame/i;
  const ngKeys   = /ng\+|new.?game\+?|phase.?6|ngPlus/i;

  // 1. Already correct
  if (p.phase4 || p.phase5 || p.phase6) return p;

  // 2. Nested under "phases" object key
  const nested = p.phases as Record<string, unknown> | undefined;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    if (nested.phase4 || nested.phase5 || nested.phase6) return { ...p, ...nested };
  }

  // 3. Phases array [lateGame, endGame, ngPlus]
  if (Array.isArray(p.phases) && p.phases.length >= 2) {
    const arr = p.phases as unknown[];
    return { ...p, phase4: arr[0], phase5: arr[1], ...(arr[2] ? { phase6: arr[2] } : {}) };
  }

  // 4. By name / camelCase key variants at top level
  const phase4 = p.phase_4 ?? p.lateGame ?? p.late_game ?? phaseByName(p, lateKeys);
  const phase5 = p.phase_5 ?? p.endGame ?? p.end_game ?? p.endgame ?? phaseByName(p, endKeys);
  const phase6 = p.phase_6 ?? p.ngPlus ?? p.ng_plus ?? p.ng ?? phaseByName(p, ngKeys);
  if (phase4 || phase5 || phase6) return { ...p, phase4, phase5, phase6 };

  // 5. AI wrapped everything under a single top-level key
  for (const val of Object.values(p)) {
    if (!val || typeof val !== "object" || Array.isArray(val)) continue;
    const inner = val as Record<string, unknown>;
    if (inner.phase4 || inner.phase5 || inner.phase6) return { ...p, ...inner };
    const ip4 = inner.phase_4 ?? inner.lateGame ?? inner.late_game ?? phaseByName(inner, lateKeys);
    const ip5 = inner.phase_5 ?? inner.endGame ?? inner.end_game ?? inner.endgame ?? phaseByName(inner, endKeys);
    const ip6 = inner.phase_6 ?? inner.ngPlus ?? inner.ng_plus ?? inner.ng ?? phaseByName(inner, ngKeys);
    if (ip4 || ip5 || ip6) return { ...p, ...inner, phase4: ip4, phase5: ip5, phase6: ip6 };
    if (Array.isArray(inner.phases) && (inner.phases as unknown[]).length >= 2) {
      const arr = inner.phases as unknown[];
      return { ...p, ...inner, phase4: arr[0], phase5: arr[1], ...(arr[2] ? { phase6: arr[2] } : {}) };
    }
  }

  return p;
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
  if (light) {
    return `You are an expert ${gameName} build guide writer. Generate accurate build analysis in JSON format.${extra ? `\n${extra}` : ""}`;
  }
  const maxChars = CODEX_CHAR_LIMITS[provider] ?? 80_000;
  const knowledge = buildKnowledgeBlock(gameKey, maxChars);
  return `${knowledge}

You are an expert ${gameName} build guide writer. You have the full game codex above.
Generate highly detailed, accurate build guides in JSON format.
Use ONLY items and mechanics from the codex. Every item must have a real in-game location.${extra ? `\n${extra}` : ""}`;
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

  // POST /api/generate/step1 — metadata + Early Game (phase1) + Early-Mid Game (phase2) + Mid Game (phase3)
  app.post("/api/generate/step1", async (req, res) => {
    const body = req.body as GenerateStep1Request;
    const { gameKey, gameName, buildDescription, provider, model, preferredWeapon, seedStats, constraints } = body;

    const phaseHint = (ph: string) => {
      const s = seedStats?.[ph];
      return s ? `\nSeed stats for ${ph}: ${JSON.stringify(s)}` : "";
    };

    const systemPrompt = buildSystemPrompt(gameKey, gameName, provider);

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
    "stats": { "VIT": 12, "ATT": 8, "END": 16, "STR": 14, "DEX": 13, "RES": 11, "INT": 9, "FTH": 9 },
    "sn": "Opening strategy (2-3 sentences). Focus on what's reachable before the first major boss gate.",
    "weapons": [
      { "n": "Weapon Name", "ap": 120, "wt": 5.0, "ef": null, "st": null,
        "eq": "Right Hand", "d": "Role in build", "loc": "Exact location",
        "up": "Standard +5", "tip": "Build tip", "lore": "Lore note", "durability": 200,
        "steps": null }
    ],
    "armor": [ { "n": "Armor Name", "wt": 4.0, "eq": "Chest", "d": "...", "loc": "...", "up": "None", "tip": "...", "lore": "...", "durability": 300 } ],
    "acc":   [ { "n": "Ring Name", "wt": 0.0, "eq": "Ring", "d": "...", "loc": "...", "up": "None", "tip": "...", "lore": "..." } ],
    "spells": [],
    "dmg": { "ps": 150, "sp": 120, "bs": 300, "n": "Damage context note" }
  },
  "phase2": {
    "name": "Early-Mid Game",
    "chapter": "The Pale Covenant",
    "range": "SL 20-40",
    "stats": { "VIT": 18, "ATT": 8, "END": 22, "STR": 18, "DEX": 16, "RES": 11, "INT": 9, "FTH": 9 },
    "sn": "Transition strategy — first major upgrades and gear unlocks after the early boss gates.",
    "weapons": [], "armor": [], "acc": [], "spells": [],
    "dmg": { "ps": 200, "sp": 170, "bs": 400, "n": "Damage context" }
  },
  "phase3": {
    "name": "Mid Game",
    "chapter": "When Iron Finds Its Purpose",
    "range": "SL 40-60",
    "stats": { "VIT": 25, "ATT": 10, "END": 28, "STR": 24, "DEX": 22, "RES": 11, "INT": 9, "FTH": 9 },
    "sn": "Build core taking shape — key weapons at +10 or better, core rings obtained.",
    "weapons": [], "armor": [], "acc": [], "spells": [],
    "dmg": { "ps": 270, "sp": 230, "bs": 540, "n": "Damage context" }
  }
}

Rules:
- label: give the build an evocative proper name or poetic title rooted in ${gameName} lore — NEVER a stat description. Good: "Voidwalker", "The Iron Heretic", "Daughter of Chaos". Bad: "Pure STR Build", "Magic Sorcerer Build"
- sub: a poetic subtitle — a character archetype, lore fragment, or thematic phrase. Good: "Keeper of the First Flame", "Sellsword of the Painted World". Bad: "STR/FAI hybrid"
- key: kebab-case of the label
- Every item loc must be a real ${gameName} location or drop source
- Include lore and durability for every item
- Rings go in "acc" array; spells/pyromancies/miracles go in "spells"
- Stats must fit the soul level range for each phase
- accent must be a dark hex color that fits the build's theme (e.g. deep crimson for fire, dark violet for sorcery)
- chapter: a 3-5 word lore title for each phase — reads like a chapter heading in a dark fantasy novel. Must be unique per phase and thematically tied to what happens in that phase of the build's journey. Good: "The Ashen Covenant", "When Flame Meets Iron", "Heir of the Abyss". Bad: "Early Game Phase", "Getting Started"
- steps: include a ["Step 1: ...", "Step 2: ..."] array ONLY for items requiring NPC questlines or multi-step acquisition (e.g. Logan's Catalyst, Moonlight Greatsword). Leave null for simple drops, loot, or merchant purchases.`;

    try {
      const text   = await callAI(provider, model, systemPrompt, userPrompt);
      console.log(`[step1] AI response (first 600 chars): ${text.slice(0, 600)}`);
      const raw = parseJson(text) as Record<string, unknown>;
      const p   = normaliseStep1(raw);
      if (!p.phase1 && !p.phase2 && !p.phase3) {
        const keys = Object.keys(raw).join(", ");
        console.error("[step1] MISSING phases after normalise. Keys:", keys, "| Raw:", JSON.stringify(raw).slice(0, 800));
        return res.status(500).json({
          error: `AI did not return any phase data (got keys: ${keys || "none"}). Try again — if it keeps failing, try a shorter or simpler build description.`,
        });
      }
      res.json(p);
    } catch (err) {
      console.error("Step1 error:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/generate/step2 — Late Game (phase4) + End Game (phase5) + NG+ (phase6)
  app.post("/api/generate/step2", async (req, res) => {
    const body = req.body as GenerateStep2Request;
    const { gameKey, gameName, partialBuild, provider, model } = body;

    const systemPrompt = buildSystemPrompt(
      gameKey, gameName, provider,
      `Continue the "${partialBuild.label}" build. Generate the final three phases.`,
    );

    const pb = partialBuild as Record<string, unknown>;
    const userPrompt = `CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }.

Build so far: ${JSON.stringify({
  label: partialBuild.label,
  cls: partialBuild.cls,
  caps: partialBuild.caps,
  phase1: pb.phase1,
  phase2: pb.phase2,
  phase3: pb.phase3,
}, null, 2)}

Generate phase4 (Late Game), phase5 (End Game), and phase6 (NG+) for this ${gameName} build.

{
  "phase4": {
    "name": "Late Game",
    "chapter": "The Weight of Kingdoms",
    "range": "SL 60-80",
    "stats": { "VIT": 32, "ATT": 14, "END": 36, "STR": 32, "DEX": 32, "RES": 11, "INT": 9, "FTH": 9 },
    "sn": "Late-game push — approaching soft caps, upgraded gear, boss souls spent.",
    "weapons": [ { "n": "...", "ap": 330, "wt": 6.0, "ef": null, "st": null, "eq": "Right Hand", "d": "...", "loc": "...", "up": "+12 standard", "tip": "...", "lore": "...", "durability": 200 } ],
    "armor": [], "acc": [], "spells": [],
    "dmg": { "ps": 340, "sp": 290, "bs": 680, "n": "Late-game damage context" }
  },
  "phase5": {
    "name": "End Game",
    "chapter": "The Final Reckoning",
    "range": "SL 80-120",
    "stats": { "VIT": 42, "ATT": 16, "END": 40, "STR": 40, "DEX": 40, "RES": 11, "INT": 9, "FTH": 9 },
    "sn": "Fully optimised — soft caps hit, best-in-slot gear equipped.",
    "weapons": [ { "n": "...", "ap": 420, "wt": 6.0, "ef": null, "st": null, "eq": "Right Hand", "d": "...", "loc": "...", "up": "+15 standard", "tip": "...", "lore": "...", "durability": 200 } ],
    "armor": [], "acc": [], "spells": [],
    "dmg": { "ps": 420, "sp": 370, "bs": 840, "n": "Peak damage context" }
  },
  "phase6": {
    "name": "NG+",
    "chapter": "The Undying Herald Endures",
    "range": "NG+1 and beyond",
    "stats": { "VIT": 50, "ATT": 16, "END": 40, "STR": 40, "DEX": 40, "RES": 11, "INT": 9, "FTH": 9 },
    "sn": "Same build; enemies scale harder each cycle. Consider stamina management over pure offense.",
    "weapons": [], "armor": [], "acc": [], "spells": [],
    "dmg": { "ps": 420, "sp": 370, "bs": 840, "n": "Same damage output; enemy HP/damage scales per cycle" },
    "ngCycles": [
      { "label": "NG+1", "stats": { "VIT": 50 }, "notes": "~20% HP/damage increase" },
      { "label": "NG+3", "stats": { "VIT": 55 }, "notes": "~50% HP increase — adapt positioning" },
      { "label": "NG+5", "stats": { "VIT": 60 }, "notes": "~90% HP increase — patience over aggression" },
      { "label": "NG+7", "stats": { "VIT": 65 }, "notes": "~150% HP increase — max difficulty" }
    ]
  }
}

Rules: all item locations must be real in ${gameName}. Include lore and durability for every item.
- chapter: a 3-5 word lore title per phase — dark fantasy chapter heading, unique per phase, thematically tied to that stage of the journey.`;

    try {
      const text   = await callAI(provider, model, systemPrompt, userPrompt);
      console.log(`[step2] AI response (first 600 chars): ${text.slice(0, 600)}`);
      const parsed = parseJson(text) as Record<string, unknown>;

      const p = normaliseStep2(parsed);
      if (!p.phase4 && !p.phase5 && !p.phase6) {
        console.error("[step2] MISSING phases after normalise:", JSON.stringify(parsed).slice(0, 600));
        return res.status(500).json({ error: "AI did not return Late Game / End Game / NG+ phases. Try again — if this keeps happening, try a shorter build description." });
      }
      res.json(p);
    } catch (err) {
      console.error("Step2 error:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/generate/step3 — pros / cons / quick-ref / tab names
  app.post("/api/generate/step3", async (req, res) => {
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
    const { gameKey, buildKey, step1, step2, step3 } = req.body as {
      gameKey: string;
      gameName: string;
      buildKey: string;
      step1: Record<string, unknown>;
      step2: Record<string, unknown>;
      step3: { pros: string[]; cons: string[]; ref: unknown[]; tabNames?: Record<string, string> };
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
        step1.phase3,
        step2.phase4,
        step2.phase5,
        step2.phase6,
      ].filter(Boolean) as Build["phases"],
      pros: step3?.pros ?? [],
      cons: step3?.cons ?? [],
      ref:  (step3?.ref as Build["ref"]) ?? [],
      tabNames: step3?.tabNames as Build["tabNames"] ?? undefined,
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
