import type { Express } from "express";
import type { Server } from "http";
import { EventEmitter } from "events";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import Perplexity from "@perplexity-ai/perplexity_ai";
import Anthropic from "@anthropic-ai/sdk";
import { storage } from "./storage";
import {
  extractFactsFromBuild,
  updateKnowledgeCache,
  buildKnowledgeBlock,
  parseLearnLines,
} from "./knowledge";
import { fetchWikiPrePass } from "./wiki-fetch";
import { parseJsonResponse } from "./parse-json";
import { SEED_GAMES, SEED_BUILDS } from "@shared/seed-data";
import type {
  Build,
  Game,
  GenerateStep1Request,
  GenerateStep2Request,
  GenerateStep3Request,
  UpdateRequest,
} from "@shared/types";

// ── AI Clients ───────────────────────────────────────────────────────────────
// Dual-AI pipeline:
//   Perplexity — web research, real-time item data, wiki crawling
//   Claude     — JSON structuring, extended thinking, synthesis validation
const pplx = new Perplexity({
  apiKey: process.env.PERPLEXITY_API_KEY ?? "",
});
const claude = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY ?? "",
});

// Perplexity models
const SONAR_PRO = "sonar-pro";           // 200K ctx, live web search
const SONAR_REASONING = "sonar-reasoning-pro"; // CoT, used only as fallback
const CLAUDE_MODEL = "claude-sonnet-4-6"; // JSON structuring + extended thinking

// ── Learn progress broadcaster ───────────────────────────────────────────────
// Emits {gameKey, stage, detail, done} events that the SSE endpoint forwards
// to any connected client listeners.
export interface LearnProgressEvent {
  gameKey: string;
  stage: string;   // short label shown in the UI
  detail?: string; // optional extra info (e.g. category name)
  done?: boolean;  // signals the stream can close
  error?: string;
}
const learnEmitter = new EventEmitter();
learnEmitter.setMaxListeners(20);
const SONAR_DEEP = "sonar-deep-research";

// ── App settings (persisted to settings.json next to the DB) ─────────────────
interface AppSettings { dualAi: boolean; }
const SETTINGS_PATH = process.env.DB_PATH
  ? join(dirname(process.env.DB_PATH), "settings.json")
  : join(process.cwd(), "settings.json");

function loadSettings(): AppSettings {
  try {
    if (existsSync(SETTINGS_PATH)) {
      return { dualAi: true, ...JSON.parse(readFileSync(SETTINGS_PATH, "utf-8")) };
    }
  } catch { /* ignore */ }
  return { dualAi: true };
}
function saveSettings(s: AppSettings) {
  try { writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2) + "\n", "utf-8"); } catch { /* ignore */ }
}
let appSettings = loadSettings();

// ── Helper: extract text from Perplexity non-streaming response ──────────────
// The SDK's create() return type union is overly broad; we know stream:false gives us
// a non-streaming StreamChunk. Use a local shape to keep things simple.
interface PplxResponse {
  choices: Array<{ message: { content: string | null | unknown[] } }>;
}
function extractText(response: PplxResponse): string {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((chunk) => (typeof (chunk as { text?: string }).text === "string" ? (chunk as { text: string }).text : ""))
      .join("");
  }
  return "";
}

// ── Claude JSON generator — takes research text + prompt → structured JSON ──
// Claude never does web search (no sonar); it only structures the data it receives.
// max_tokens: 8000 minimum per spec.
async function claudeJson<T>(
  systemPrompt: string,
  userPrompt: string,
  extendedThinking = false
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    };
    if (extendedThinking) {
      params.thinking = { type: "enabled", budget_tokens: 5000 };
      params.max_tokens = 16000;
    }
    const msg = await claude.messages.create(params);
    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
    const parsed = parseJsonResponse<T>(text);
    if (parsed.ok) return parsed;
    return { ok: false, error: parsed.error };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── JSON Schema definitions for structured output ───────────────────────────
// Perplexity enforces the schema so the model must emit valid JSON.
// We use a practical "loose" schema that validates the top-level keys
// without over-constraining nested items (avoids schema preparation delay).

const ITEM_SCHEMA = {
  type: "object",
  properties: {
    n: { type: "string" },
    ap: { type: "number" },
    wt: { type: "number" },
    ef: { type: "string" },
    st: { type: "string" },
    eq: { type: "string" },
    d: { type: "string" },
    loc: { type: "string" },
    up: { type: "string" },
    tip: { type: "string" },
  },
  required: ["n"],
  additionalProperties: true,
};

const PHASE_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    range: { type: "string" },
    stats: { type: "object", additionalProperties: { type: "number" } },
    sn: { type: "string" },
    weapons: { type: "array", items: ITEM_SCHEMA },
    armor: { type: "array", items: ITEM_SCHEMA },
    acc: { type: "array", items: ITEM_SCHEMA },
    spells: { type: "array", items: ITEM_SCHEMA },
    dmg: {
      type: "object",
      properties: {
        ps: { type: "number" },
        sp: { type: "number" },
        bs: { type: "number" },
        n: { type: "string" },
      },
      additionalProperties: true,
    },
  },
  required: ["name", "stats", "weapons"],
  additionalProperties: true,
};

const STEP1_SCHEMA = {
  type: "object",
  properties: {
    key: { type: "string" },
    gameKey: { type: "string" },
    label: { type: "string" },
    sub: { type: "string" },
    icon: { type: "string" },
    accent: { type: "string" },
    playstyle: { type: "string" },
    cls: { type: "string" },
    caps: { type: "array", items: { type: "string" } },
    weaponReq: { type: "array", items: { type: "string" } },
    loadouts: { type: "array", items: { type: "object", additionalProperties: true } },
    phases: { type: "array", items: PHASE_SCHEMA },
  },
  required: ["key", "gameKey", "label", "phases"],
  additionalProperties: true,
};

const STEP2_SCHEMA = {
  type: "object",
  properties: {
    phases_4_to_7: { type: "array", items: PHASE_SCHEMA },
  },
  required: ["phases_4_to_7"],
  additionalProperties: true,
};

const STEP3_SCHEMA = {
  type: "object",
  properties: {
    sim: { type: "array", items: { type: "object", additionalProperties: true } },
    oth: { type: "array", items: { type: "object", additionalProperties: true } },
    ref: { type: "array", items: { type: "object", additionalProperties: true } },
  },
  required: ["sim", "oth", "ref"],
  additionalProperties: true,
};

const UPDATE_SCHEMA = {
  type: "object",
  properties: {
    patchVersion: { type: "string" },
    summary: { type: "string" },
    changes: { type: "array", items: { type: "string" } },
    newFacts: { type: "array", items: { type: "object", additionalProperties: true } },
  },
  required: ["patchVersion", "summary", "changes", "newFacts"],
  additionalProperties: true,
};

// ── Error helpers ────────────────────────────────────────────────────────────
function truncateError(msg: string): string {
  if (msg.length > 200) return msg.substring(0, 197) + "...";
  return msg;
}

function friendlyPplxError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("rate_limit") || msg.includes("429")) {
    return "Perplexity API rate limit reached. Please wait a moment and try again.";
  }
  if (msg.includes("401") || msg.includes("authentication")) {
    return "Perplexity API key is invalid or missing. Check your PERPLEXITY_API_KEY environment variable.";
  }
  return truncateError(msg);
}

// ── Route registration ───────────────────────────────────────────────────────
export function registerRoutes(httpServer: Server, app: Express) {

  // ── GET /api/games — all games (seed + dynamic) ────────────────────────────
  app.get("/api/games", (_req, res) => {
    const dynamicGames = storage.getDynamicGames();
    const customGames: Game[] = dynamicGames.map((g) => ({
      ...JSON.parse(g.data),
      isCustom: true,
    }));
    res.json([...SEED_GAMES, ...customGames]);
  });

  // ── GET /api/builds — all builds (seed + dynamic, minus hidden) ────────────
  app.get("/api/builds", (req, res) => {
    const { gameKey } = req.query as { gameKey?: string };
    const hiddenKeys = new Set(
      storage.getHiddenStaticBuilds().map((h) => h.buildKey)
    );

    const seedBuilds = (gameKey
      ? SEED_BUILDS.filter((b) => b.gameKey === gameKey)
      : SEED_BUILDS
    ).filter((b) => !hiddenKeys.has(b.key));

    const dynamicRows = storage.getDynamicBuilds(gameKey);
    const dynamicBuilds: Build[] = dynamicRows.map((r) => ({
      ...JSON.parse(r.data),
      isAI: true,
    }));

    res.json([...seedBuilds, ...dynamicBuilds]);
  });

  // ── DELETE /api/builds/:key — delete a dynamic build ──────────────────────
  app.delete("/api/builds/:key", (req, res) => {
    const { key } = req.params;
    const isSeed = SEED_BUILDS.some((b) => b.key === key);
    if (isSeed) {
      storage.hideStaticBuild(key);
    } else {
      storage.deleteDynamicBuild(key);
    }
    res.json({ ok: true });
  });

  // ── GET /api/knowledge/:gameKey — knowledge cache status ──────────────────
  app.get("/api/knowledge/:gameKey", (req, res) => {
    const { gameKey } = req.params;
    const cache = storage.getKnowledgeCache(gameKey);
    if (!cache) return res.json({ count: 0, patchNote: null, updatedAt: null });
    try {
      const facts = JSON.parse(cache.facts);
      res.json({
        count: facts.length,
        patchNote: cache.patchNote,
        updatedAt: cache.updatedAt,
      });
    } catch {
      res.json({ count: 0, patchNote: null, updatedAt: null });
    }
  });

  // ── DELETE /api/knowledge/:gameKey — clear all cached facts for a game ─────
  app.delete("/api/knowledge/:gameKey", (req, res) => {
    const { gameKey } = req.params;
    storage.clearKnowledgeCache(gameKey);
    res.json({ ok: true });
  });

  // ── GET /api/knowledge/:gameKey/facts — full fact list for cache viewer ─────
  app.get("/api/knowledge/:gameKey/facts", (req, res) => {
    const { gameKey } = req.params;
    const cache = storage.getKnowledgeCache(gameKey);
    if (!cache) return res.json({ facts: [], patchNote: null, updatedAt: null });
    try {
      const facts = JSON.parse(cache.facts);
      res.json({ facts, patchNote: cache.patchNote, updatedAt: cache.updatedAt });
    } catch {
      res.json({ facts: [], patchNote: null, updatedAt: null });
    }
  });

  // ── GET /api/settings ─────────────────────────────────────────────────────
  app.get("/api/settings", (_req, res) => res.json(appSettings));

  // ── PATCH /api/settings ───────────────────────────────────────────────────
  app.patch("/api/settings", (req, res) => {
    const { dualAi } = req.body as Partial<AppSettings>;
    if (typeof dualAi === "boolean") appSettings.dualAi = dualAi;
    saveSettings(appSettings);
    res.json(appSettings);
  });

  // ── POST /api/generate/step1 — metadata + loadouts + phases 1-3 ───────────
  // Dual-AI: Perplexity researches → Claude structures (when dualAi=true)
  // Single-AI: Perplexity sonar-pro with JSON schema (when dualAi=false)
  app.post("/api/generate/step1", async (req, res) => {
    try {
      const body = req.body as GenerateStep1Request;
      const knowledgeBlock = buildKnowledgeBlock(body.gameKey);

      const systemContent = `You are an expert soulslike game build guide author. You create detailed, accurate build guides in structured JSON format.

${knowledgeBlock}

CRITICAL ACCURACY RULES — FOLLOW THESE ABOVE ALL ELSE:
- ONLY use items that ACTUALLY EXIST in ${body.gameName}. Search the web to confirm every single item name before including it.
- NEVER invent, combine, or approximate item names. If you are not 100% certain an item exists, search for it first.
- If web search returns no result for an item name, DO NOT include it — use a different item you can verify.
- Every "loc" field must be a real, specific in-game location. Never write "Found in the world" or vague descriptions.
- Every "up" field must reflect the real upgrade system of ${body.gameName}.
- If you are unsure about any item, weapon, armor piece or accessory — search for it. Do not guess.

CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }. No prose, no markdown fences, no explanation — pure JSON only.`;

      // Build mode-specific constraint block
      const extBody = body as GenerateStep1Request & {
        mode?: string;
        manualSkeleton?: object;
        isCustomGame?: boolean;
      };
      const isManual = extBody.mode === "manual";
      const isCustomGame = extBody.isCustomGame === true;

      let modeBlock = "";
      if (isManual && extBody.manualSkeleton) {
        modeBlock = `
MANUAL MODE — USER-PROVIDED BUILD SKELETON:
Preserve all user-provided values exactly as written. Fill in blank/missing fields: descriptions (d), specific locations (loc), upgrade paths (up), tips, ap (attack power), wt (weight), damage box (dmg). Expand the 3 user stages (Early/Mid/Endgame) into 3 schema phases naturally.

USER SKELETON:
${JSON.stringify(extBody.manualSkeleton, null, 2)}
`;
      } else if (body.seedStats) {
        const statTargets = Object.entries(body.seedStats)
          .filter(([, v]) => v > 0)
          .map(([k, v]) => `${k}:${v}`)
          .join(", ");
        modeBlock = `
SEMI-AI MODE — ENDGAME STAT TARGETS (the build MUST naturally reach these by endgame, ±2 points): ${statTargets}
Total stat budget is ~${body.statBudget}. DO NOT exceed this across all stats combined.
Earlier phases should naturally lead toward the endgame targets.
`;
      }

      const customGameNote = isCustomGame
        ? `NOTE: ${body.gameName} is a custom game not yet in the codex. Determine its stat system (short codes like VIG, END, STR, DEX, INT, FTH) and use those exact stat codes in every phase stats object.`
        : "";

      const userContent = `Search the web for "${body.gameName} ${body.buildDescription} build guide" and "${body.gameName} items wiki" BEFORE generating anything. Use only items you find confirmed in search results.

Create the first part of a build guide for ${body.gameName}.

Build description: ${body.buildDescription}
Stat budget: ${body.statBudget} points
${body.preferredWeapon ? `Preferred weapon: ${body.preferredWeapon}` : ""}
${body.referenceUrl ? `Reference URL: ${body.referenceUrl}` : ""}
${customGameNote}
${modeBlock}

Generate JSON with this exact structure:
{
  "key": "kebab-case-build-key",
  "gameKey": "${body.gameKey}",
  "label": "Build Name",
  "sub": "Short subtitle (e.g. DEX Katana Build)",
  "icon": "single emoji",
  "accent": "#hexcolor",
  "playstyle": "2-3 sentence playstyle description",
  "cls": "Starting class name",
  "caps": ["STAT 50", "STAT 40"],
  "weaponReq": ["STAT 18"],
  "loadouts": [
    {
      "id": "loadout-id",
      "label": "Loadout Name",
      "weaponWt": 12.5,
      "endReq": 35,
      "armor": "Armor set name",
      "pros": ["pro 1", "pro 2"],
      "cons": ["con 1"]
    }
  ],
  "phases": [
    {
      "name": "Early Game",
      "range": "Levels 1-40",
      "stats": {"VIT": 15, "END": 20, "STR": 18},
      "sn": "Short note about stat priority for this phase",
      "weapons": [
        {
          "n": "Weapon Name",
          "ap": 200,
          "wt": 8.5,
          "ef": "Bleed 45",
          "st": "status type",
          "eq": "Main Hand",
          "d": "Description",
          "loc": "Where to find it",
          "up": "Upgrade path",
          "tip": "Pro tip"
        }
      ],
      "armor": [],
      "acc": [],
      "spells": [],
      "dmg": {"ps": 200, "sp": 180, "bs": 400, "n": "Damage context note"}
    },
    <phase2>,
    <phase3>
  ]
}

Include phases 1, 2, and 3 only (Early Game, Core Weapon, Key Accessories).
Be specific with item locations, upgrade paths, and tips. Use web search to verify current patch accuracy. No placeholder text.`;

      let parsed: { ok: true; value: Partial<Build> } | { ok: false; error: string };

      if (appSettings.dualAi) {
        // ── Dual-AI: Perplexity researches → Claude structures ───────────────
        let researchContext = "";
        try {
          const researchResp = await pplx.chat.completions.create({
            model: SONAR_PRO,
            stream: false as const,
            max_tokens: 4000,
            messages: [
              {
                role: "user",
                content: `Search the web for "${body.gameName} ${body.buildDescription} build guide" and "${body.gameName} weapons wiki" and "${body.gameName} items locations".

List the REAL confirmed items for a ${body.buildDescription} build in ${body.gameName}:
- Weapons (name, AP, location, upgrade path)
- Armor sets (name, defense values, location)
- Accessories/rings (name, effect, location)
- Spells if relevant (name, damage, location)
- Stat requirements and progression (levels 1→endgame)

Only include items you found confirmed in search results. Exact in-game names only.`,
              },
            ],
          });
          researchContext = extractText(researchResp as PplxResponse);
        } catch {
          researchContext = "(Web research unavailable — use knowledge cache and game expertise)";
        }
        parsed = await claudeJson<Partial<Build>>(
          systemContent,
          `${userContent}\n\nPERPLEXITY RESEARCH (confirmed real items from web search — use these as ground truth):\n${researchContext.substring(0, 6000)}`,
          false
        );
      } else {
        // ── Single-AI: Perplexity sonar-pro with JSON schema ─────────────────
        const sonarResp = await pplx.chat.completions.create({
          model: SONAR_PRO,
          stream: false as const,
          max_tokens: 8000,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          response_format: { type: "json_schema", json_schema: { schema: STEP1_SCHEMA, name: "build_step1" } } as any,
          messages: [
            { role: "system", content: systemContent },
            { role: "user", content: userContent },
          ],
        });
        const raw = extractText(sonarResp as PplxResponse);
        const pr = parseJsonResponse<Partial<Build>>(raw);
        parsed = pr.ok ? pr : { ok: false, error: pr.error };
      }

      if (!parsed.ok) {
        return res.status(422).json({
          error: `Failed to parse AI response: ${parsed.error}`,
          raw: "",
        });
      }

      res.json({ ok: true, partial: parsed.value });
    } catch (err) {
      res.status(500).json({ error: friendlyPplxError(err) });
    }
  });

  // ── POST /api/generate/step2 — phases 4-7 + NG+ cycles ───────────────────
  // Model: sonar-reasoning-pro (CoT reasoning — replaces Claude extended thinking)
  // IMPORTANT: sonar-reasoning-pro emits <think>...</think> before the JSON.
  // parseJsonResponse already strips these via stripThinking() in parse-json.ts.
  app.post("/api/generate/step2", async (req, res) => {
    try {
      const body = req.body as GenerateStep2Request;
      const knowledgeBlock = buildKnowledgeBlock(body.gameKey);

      const systemContent = `You are an expert soulslike game build guide author specializing in late-game optimization and NG+ strategies.

${knowledgeBlock}

CRITICAL ACCURACY RULES — FOLLOW THESE ABOVE ALL ELSE:
- ONLY use items that ACTUALLY EXIST in ${body.gameName}. Search the web before including any item name.
- NEVER invent, combine, or approximate item names. If uncertain, search first — if still uncertain, omit it.
- Every weapon, armor piece, ring, and accessory must be a real item obtainable in ${body.gameName}.
- Every "loc" must be a specific real in-game location — never vague or generic.
- NG+ notes must reflect actual game mechanics, not invented difficulty modifiers.

CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }. No prose, no markdown fences — pure JSON only.`;

      const userContent = `Search the web for "${body.gameName} late game items" and "${body.gameName} endgame build guide" BEFORE generating anything. Only include items confirmed by search results.

Complete the build guide for ${body.gameName} by generating phases 4-7 including NG+ cycles.

Build key: ${body.buildKey}
Build so far: ${JSON.stringify(body.partialBuild).substring(0, 2000)}

Generate JSON:
{
  "phases_4_to_7": [
    {
      "name": "Unlock Spells",
      "range": "Levels 60-80",
      "stats": {"VIT": 25, "END": 35, "STR": 40},
      "sn": "Short note",
      "weapons": [],
      "armor": [],
      "acc": [],
      "spells": [],
      "dmg": {"ps": 300, "sp": 260, "bs": 600, "n": "note"}
    },
    <phase5_mid_to_late>,
    <phase6_endgame>,
    {
      "name": "NG+",
      "range": "NG+1 and beyond",
      "stats": {"VIT": 40, "END": 40},
      "sn": "NG+ focus note",
      "weapons": [],
      "armor": [],
      "acc": [],
      "spells": [],
      "dmg": {"ps": 0, "sp": 0, "bs": 0, "n": "same as endgame"},
      "ngCycles": [
        {
          "label": "NG+1",
          "stats": {"VIT": 40},
          "notes": "Detailed NG+1 notes with strategy changes"
        },
        {"label": "NG+3", "stats": {}, "notes": "..."},
        {"label": "NG+5", "stats": {}, "notes": "..."},
        {"label": "NG+7", "stats": {}, "notes": "..."}
      ]
    }
  ]
}

Be detailed about late-game item locations and NG+ strategy changes. No placeholder text.`;

      let parsed2: { ok: true; value: { phases_4_to_7: Build["phases"] } } | { ok: false; error: string };

      if (appSettings.dualAi) {
        // Claude extended thinking — best for complex multi-phase planning
        parsed2 = await claudeJson<{ phases_4_to_7: Build["phases"] }>(systemContent, userContent, true);
      } else {
        // sonar-reasoning-pro — CoT, strips <think> tags via parseJsonResponse
        const sonarResp = await pplx.chat.completions.create({
          model: SONAR_REASONING,
          stream: false as const,
          max_tokens: 8000,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          response_format: { type: "json_schema", json_schema: { schema: STEP2_SCHEMA, name: "build_step2" } } as any,
          messages: [
            { role: "system", content: systemContent },
            { role: "user", content: userContent },
          ],
        });
        const raw = extractText(sonarResp as PplxResponse);
        const pr = parseJsonResponse<{ phases_4_to_7: Build["phases"] }>(raw);
        parsed2 = pr.ok ? pr : { ok: false, error: pr.error };
      }

      if (!parsed2.ok) {
        return res.status(422).json({ error: `Step 2 parse failed: ${parsed2.error}`, raw: "" });
      }

      res.json({ ok: true, phases47: parsed2.value.phases_4_to_7 });
    } catch (err) {
      res.status(500).json({ error: friendlyPplxError(err) });
    }
  });

  // ── POST /api/generate/step3 — sim, oth, ref (graceful fallback) ──────────
  // Model: sonar-pro (web search enriches similar/alt build suggestions)
  app.post("/api/generate/step3", async (req, res) => {
    try {
      const body = req.body as GenerateStep3Request;
      const knowledgeBlock = buildKnowledgeBlock(body.gameKey);

      const systemContent = `You are an expert soulslike build author creating Similar Builds, Alternative OP Builds, and Quick Reference tables in JSON format.

${knowledgeBlock}

CRITICAL ACCURACY RULES — FOLLOW THESE ABOVE ALL ELSE:
- ONLY reference items, builds, and strategies that ACTUALLY EXIST in ${body.gameName}.
- Search the web to verify every item name, build concept, and location before including it.
- NEVER invent item names, combine real names, or use approximate names. Real names only.
- Similar and Other OP builds must be real community-known archetypes for ${body.gameName}, not invented.
- Quick Reference items must all be real obtainable items with accurate stats.

CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }. Pure JSON only.`;

      const userContent = `Search the web for "${body.gameName} best builds" and "${body.gameName} overpowered weapons" BEFORE generating anything. Only reference real confirmed items and community builds.

Generate the final sections for this ${body.gameName} build guide.

Build: ${JSON.stringify(body.partialBuild).substring(0, 1500)}

Generate JSON:
{
  "sim": [
    {
      "label": "Similar Build Name",
      "sub": "Short subtitle",
      "icon": "emoji",
      "a": "#hexcolor",
      "cls": "class",
      "why": "Why it's similar",
      "ph": [
        {"name": "Early", "stats": {"DEX": 20}, "weapons": ["Weapon A"]},
        {"name": "Mid", "stats": {"DEX": 35}, "weapons": ["Weapon B"]},
        {"name": "End", "stats": {"DEX": 40}, "weapons": ["Weapon C"]}
      ],
      "key": ["Item 1", "Item 2", "Item 3"],
      "steps": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"]
    },
    <second_similar_build>
  ],
  "oth": [
    <two_other_op_builds_same_structure>
  ],
  "ref": [
    {
      "n": "Item Name",
      "i": "Type (Sword/Ring/etc)",
      "w": 5.0,
      "ap": 250,
      "st": "Status effect",
      "ar": "Armor rating or —",
      "s": "Scaling",
      "a": "Affinity/infusion"
    }
  ]
}

Generate 2 sim, 2 oth, 5 ref entries.`;

      type Step3Result = { sim: Build["sim"]; oth: Build["oth"]; ref: Build["ref"] };
      let parsed3: { ok: true; value: Step3Result } | { ok: false; error: string };

      if (appSettings.dualAi) {
        parsed3 = await claudeJson<Step3Result>(systemContent, userContent, false);
      } else {
        const sonarResp = await pplx.chat.completions.create({
          model: SONAR_PRO,
          stream: false as const,
          max_tokens: 8000,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          response_format: { type: "json_schema", json_schema: { schema: STEP3_SCHEMA, name: "build_step3" } } as any,
          messages: [
            { role: "system", content: systemContent },
            { role: "user", content: userContent },
          ],
        });
        const raw = extractText(sonarResp as PplxResponse);
        const pr = parseJsonResponse<Step3Result>(raw);
        parsed3 = pr.ok ? pr : { ok: false, error: pr.error };
      }

      if (!parsed3.ok) {
        return res.json({ ok: true, sim: [], oth: [], ref: [] });
      }

      res.json({
        ok: true,
        sim: parsed3.value.sim ?? [],
        oth: parsed3.value.oth ?? [],
        ref: parsed3.value.ref ?? [],
      });
    } catch {
      res.json({ ok: true, sim: [], oth: [], ref: [] });
    }
  });

  // ── POST /api/generate/finalize — save the completed build ────────────────
  app.post("/api/generate/finalize", (req, res) => {
    try {
      const body = req.body as Build & { _customGameName?: string; _customGameKey?: string };
      const { _customGameName, _customGameKey, ...build } = body;
      const finalBuild = build as Build;

      if (!finalBuild.key || !finalBuild.gameKey) {
        return res.status(400).json({ error: "Missing build key or gameKey" });
      }

      // If this is a custom game, create a dynamic game entry first
      if (_customGameName && _customGameKey) {
        const existingGames = storage.getDynamicGames();
        const alreadyExists = existingGames.some((g: any) => g.key === _customGameKey);
        if (!alreadyExists) {
          // Create a minimal game entry — stat info will be inferred from the build phases
          const phaseStats = finalBuild.phases?.[0]?.stats ?? {};
          const inferredStatKeys = Object.keys(phaseStats);
          storage.createDynamicGame({
            key: _customGameKey,
            data: JSON.stringify({
              key: _customGameKey,
              name: _customGameName,
              icon: finalBuild.icon ?? "🎮",
              statMax: 99,
              endgameBudget: 200,
              softCaps: Object.fromEntries(inferredStatKeys.map((k) => [k, null])),
              mats: [],
              weightInfo: [
                { label: "Light", range: "0–25%", note: "Fastest roll" },
                { label: "Medium", range: "25–50%", note: "Standard roll" },
                { label: "Heavy", range: "50–100%", note: "Slow roll" },
                { label: "Over", range: "100%+", note: "No dodge" },
              ],
              isCustom: true,
            }),
          });
        }
      }

      // Extract facts and update knowledge cache
      const facts = extractFactsFromBuild(finalBuild);
      const seedGame = SEED_GAMES.find((g) => g.key === finalBuild.gameKey);
      const gameName = _customGameName ?? seedGame?.name ?? finalBuild.gameKey;
      updateKnowledgeCache(finalBuild.gameKey, gameName, facts);

      // Normalize build — guarantee required arrays/fields are always present
      // so the frontend never crashes on missing data from partial AI responses
      const normalizedBuild: Build = {
        ...finalBuild,
        caps: Array.isArray(finalBuild.caps) ? finalBuild.caps : [],
        weaponReq: Array.isArray(finalBuild.weaponReq) ? finalBuild.weaponReq : [],
        loadouts: Array.isArray(finalBuild.loadouts) ? finalBuild.loadouts : [],
        sim: Array.isArray(finalBuild.sim) ? finalBuild.sim : [],
        oth: Array.isArray(finalBuild.oth) ? finalBuild.oth : [],
        ref: Array.isArray(finalBuild.ref) ? finalBuild.ref : [],
        phases: (finalBuild.phases ?? []).map((ph: any) => ({
          ...ph,
          stats: ph.stats ?? {},
          weapons: Array.isArray(ph.weapons) ? ph.weapons : [],
          armor: Array.isArray(ph.armor) ? ph.armor : [],
          acc: Array.isArray(ph.acc) ? ph.acc : [],
          spells: Array.isArray(ph.spells) ? ph.spells : [],
          dmg: ph.dmg ?? { ps: 0, sp: 0, bs: 0, n: "" },
          sn: ph.sn ?? "",
        })),
      };

      // Save build to DB — upsert in case the same key was generated before
      // (avoids UNIQUE constraint error on re-generation of same build description)
      const existingBuild = storage.getDynamicBuild(normalizedBuild.key);
      if (existingBuild) {
        storage.updateDynamicBuild(normalizedBuild.key, {
          key: normalizedBuild.key,
          gameKey: normalizedBuild.gameKey,
          data: JSON.stringify(normalizedBuild),
        });
      } else {
        storage.createDynamicBuild({
          key: normalizedBuild.key,
          gameKey: normalizedBuild.gameKey,
          data: JSON.stringify(normalizedBuild),
        });
      }

      res.json({ ok: true, build: normalizedBuild });
    } catch (err) {
      res.status(500).json({
        error: `Finalize failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  // ── POST /api/update — patch update flow (sonar-pro: grounded in live web) ─
  app.post("/api/update", async (req, res) => {
    try {
      const body = req.body as UpdateRequest;
      const knowledgeBlock = buildKnowledgeBlock(body.gameKey);
      const game = SEED_GAMES.find((g) => g.key === body.gameKey);

      const prompt = `You are a ${body.gameName} expert. Search for the latest patch notes and balance changes for this game right now.

${knowledgeBlock}

Return JSON:
{
  "patchVersion": "v1.5.40",
  "summary": "Brief summary of recent changes",
  "changes": ["Change 1", "Change 2", "Change 3"],
  "newFacts": [
    {
      "type": "WEAPON",
      "name": "Item Name",
      "location": "Where to find",
      "raw": "WEAPON: Item Name | AP:250 | Status:Bleed | Loc:location | Up:upgrade path"
    }
  ]
}

Focus on nerfs, buffs, stat changes, new items, and location changes in the most recent patches.
CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }.`;

      const response = await pplx.chat.completions.create({
        model: SONAR_PRO,
        stream: false as const,
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }],
        response_format: {
          type: "json_schema",
          json_schema: {
            schema: UPDATE_SCHEMA,
          },
        },
      });

      const rawText = extractText(response);
      const parsed = parseJsonResponse<{
        patchVersion: string;
        summary: string;
        changes: string[];
        newFacts: import("@shared/types").KnowledgeFact[];
      }>(rawText);

      if (!parsed.ok) {
        return res.status(422).json({
          error: `Update parse failed: ${parsed.error}`,
        });
      }

      const { patchVersion, summary, changes, newFacts } = parsed.value;

      // Merge into knowledge cache
      updateKnowledgeCache(
        body.gameKey,
        game?.name ?? body.gameName,
        newFacts ?? [],
        patchVersion
      );

      res.json({
        ok: true,
        patchVersion,
        summary,
        changes,
        count: newFacts?.length ?? 0,
      });
    } catch (err) {
      res.status(500).json({ error: friendlyPplxError(err) });
    }
  });

  // ── POST /api/learn — full 14-category knowledge database build ─────────────
  // Uses sonar-deep-research (20-40 internal searches per category) to build a
  // comprehensive item database: 8 distinct categories including SHIELD, CATALYST, BUFF.
  // Pre-pass: wiki-fetch.ts discovers real sources (Trello, Fextralife, Fandom) and
  // seeds the cache with verified names BEFORE the AI category queries run.
  // Researcher → Synthesizer: deep-research gathers, sonar-reasoning-pro validates.
  // ── GET /api/learn/progress — SSE stream for learn progress events ─────────
  app.get("/api/learn/progress", (req, res) => {
    const gameKey = (req.query.gameKey as string) ?? "";
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Send a heartbeat every 15s so the connection stays alive
    const hb = setInterval(() => res.write(": heartbeat\n\n"), 15000);

    const handler = (ev: LearnProgressEvent) => {
      if (ev.gameKey !== gameKey) return;
      res.write(`data: ${JSON.stringify(ev)}\n\n`);
      if (ev.done || ev.error) {
        clearInterval(hb);
        res.end();
        learnEmitter.off("progress", handler);
      }
    };
    learnEmitter.on("progress", handler);

    req.on("close", () => {
      clearInterval(hb);
      learnEmitter.off("progress", handler);
    });
  });

  app.post("/api/learn", async (req, res) => {
    try {
      const { gameKey, gameName, hintUrl } = req.body as {
        gameKey: string;
        gameName: string;
        /** Optional URL supplied by user (e.g. a Trello board link) — used as priority source */
        hintUrl?: string;
      };
      if (!gameKey || !gameName) return res.status(400).json({ error: "gameKey and gameName required" });

      const emit = (stage: string, detail?: string) =>
        learnEmitter.emit("progress", { gameKey, stage, detail } satisfies LearnProgressEvent);

      // ── Wiki pre-pass — run before AI queries ─────────────────────────────
      // Discovers real item sources (Trello, Fextralife, Fandom, etc.) and seeds
      // the cache with verified names so the AI has a factual foundation.
      // Skipped if the cache already has ≥50 facts (already learned or seeded).
      let preFacts = 0;
      let preSources: string[] = [];
      const existingCache = storage.getKnowledgeCache(gameKey);
      let existingCount = 0;
      if (existingCache) {
        try { existingCount = (JSON.parse(existingCache.facts) as unknown[]).length; } catch { /* ignore */ }
      }
      if (existingCount < 50 || hintUrl) {
        try {
          emit("Wiki pre-pass", `Finding real item sources for ${gameName}...`);
          const prePass = await fetchWikiPrePass(gameName, gameKey, pplx, hintUrl);
          if (prePass.facts.length > 0) {
            updateKnowledgeCache(gameKey, gameName, prePass.facts, `Wiki pre-pass — ${prePass.facts.length} items`);
            preFacts = prePass.facts.length;
            preSources = prePass.sourcesUsed;
            emit("Wiki pre-pass done", `${preFacts} items from ${prePass.sourcesUsed.length} source(s)`);
          } else {
            emit("Wiki pre-pass done", "No structured sources found — continuing with AI");
          }
        } catch {
          // Pre-pass is non-fatal — AI queries continue regardless
          emit("Wiki pre-pass skipped", "Error during pre-pass — continuing with AI");
        }
      }

      const RULES = `\nRules:\n- EXHAUSTIVE — every item in ${gameName} including rare, DLC, NG+-exclusive\n- Exact in-game names only\n- loc: specific zone + NPC/boss/chest — never "Various", "Exploration", "N/A"\n- ALL numeric values required (AP, weight, damage, scaling, buildup)\n- Output ONLY item lines in exact format — no headers, no markdown\n- Each line MUST start with the EXACT prefix shown (e.g. WEAPON:, ARMOR:, GEM:) — never omit or change it`;

      // Damage/scaling format: full +0 to +10 table
      const WPN = `WEAPON: Name — [weapon type]; AP: N(+0)/N(+1)/N(+2)/N(+3)/N(+4)/N(+5)/N(+6)/N(+7)/N(+8)/N(+9)/N(+10); scaling: G(+0)/G(+1)/G(+2)/G(+3)/G(+4)/G(+5)/G(+6)/G(+7)/G(+8)/G(+9)/G(+10) where G=letter grade; status: [TYPE N(+0)/N(+5)/N(+10) buildup or "none"]; weight: N — loc: [zone + source] — stat: [STR N / DEX N / INT N / FTH N / ARC N; upgrade mat]`;
      const SHD = `SHIELD: Name — [type: small/medium/great/parrying]; stability: N(+0)/N(+5)/N(+10); guard boost: N%; block: N% phys / N% magic / N% fire / N% lightning / N% holy; weight: N — loc: [zone + source] — stat: [STR N; upgrade mat]`;
      const CAT = `CATALYST: Name — [type: staff/seal/wand]; spell buff: N(+0)/N(+5)/N(+10); scaling: G(+0)/G(+5)/G(+10); weight: N — loc: [zone + source] — stat: [INT N / FTH N / ARC N]`;
      // Armor: ALL 5 defense stats + poise + weight
      const ARM = `ARMOR: Name — [piece: helm/chest/gauntlets/leggings]; set: [set name]; physical def: N; magic def: N; fire def: N; lightning def: N; holy def: N; poise: N; weight: N — loc: [zone + source]`;
      const RNG = `RING/ACC: Name — [precise effect WITH NUMBERS: "+15% Bleed dmg", "+60 buildup/hit", "+20 Stamina"] — loc: [zone + source]`;
      const SPL = `SPELL: Name — [school]; damage: N per cast; effect: [precise]; FP: N — loc: [NPC + zone] — stat: [N STAT required; scales with STAT]`;
      const BUF = `BUFF: Name — [school]; effect: [WITH NUMBERS: "+15% dmg 60s", "heals 300 HP"]; duration: Ns; FP: N — loc: [NPC + zone] — stat: [N STAT required]`;
      const GEM = `GEM: Name — [type: ash of war/infusion/whetblade]; effect: [precise description WITH NUMBERS]; compatible with: [weapon types]; affinity options: [list] — loc: [zone + source]`;
      const UPG = `UPGRADE: Name — [type: smithing stone/somber/titanite/bone/etc.]; tier: +N to +N; quantity per run: N; weight: N — loc: [zone + source, drop rate if farmable]`;
      const MAP_T = `MAP: Name — [type: area/region/dungeon/legacy dungeon]; connects to: [adjacent areas]; key landmarks: [boss, NPC, shortcut]; unlock: [how to reach] — note: [shortcuts or secrets]`;
      const LRE = `LORE: Name — [type: NPC/questline/item lore/story event]; summary: [2-3 sentences]; reward: [items/endings unlocked]; steps: [brief sequence] — loc: [where NPC/event is found]`;

      const categories = [
        // ── Weapons ────────────────────────────────────────────────────────────
        { name: "physical & quality weapons", prompt: `Search ${gameName} wiki. List EVERY physical weapon: swords, greatswords, daggers, axes, hammers, maces, clubs, fists. CRITICAL: each line MUST start with WEAPON: (colon required). Include full +0 to +10 AP table and scaling grade table.\n${WPN}${RULES}` },
        { name: "colossal & ultra-great weapons", prompt: `Search ${gameName} wiki. List EVERY colossal weapon, ultra-greatsword, great hammer, colossal axe. CRITICAL: start each line with WEAPON:. Full damage table required.\n${WPN}${RULES}` },
        { name: "polearms, halberds, spears & ranged", prompt: `Search ${gameName} wiki. List EVERY polearm, halberd, spear, lance, whip, bow, crossbow, greatbow. CRITICAL: start each line with WEAPON:. Include damage at each upgrade level.\n${WPN}${RULES}` },
        { name: "status & elemental weapons", prompt: `Search ${gameName} wiki. List EVERY weapon with status/elemental: Bleed, Poison, Frost, Fire, Lightning, Holy, Scarlet Rot, Madness. CRITICAL: start each line with WEAPON:. Status buildup MUST be shown at each upgrade level (+0 through +10).\n${WPN}${RULES}` },
        { name: "catalysts, staves & seals", prompt: `Search ${gameName} wiki. List EVERY casting tool: staves, seals, wands, catalysts, foci. CRITICAL: each line MUST start with CATALYST: (not WEAPON:).\n${CAT}${RULES}` },
        { name: "shields & offhand", prompt: `Search ${gameName} wiki. List EVERY shield: small, medium, greatshield, parrying, torch, lantern. CRITICAL: each line MUST start with SHIELD: (not WEAPON:). Include all block percentages.\n${SHD}${RULES}` },
        // ── Armor ──────────────────────────────────────────────────────────────
        { name: "light & medium armor", prompt: `Search ${gameName} wiki. List EVERY light and medium armor piece (helm, chest, gauntlets, leggings for each set). CRITICAL: each line MUST start with ARMOR:. ALL 5 defense stats (physical, magic, fire, lightning, holy) + poise + weight REQUIRED.\n${ARM}${RULES}` },
        { name: "heavy, boss & special armor", prompt: `Search ${gameName} wiki. List EVERY heavy armor, boss armor set, unique armor, DLC armor. CRITICAL: start each line with ARMOR:. All 5 defense stats required. loc MUST say exactly how to obtain.\n${ARM}${RULES}` },
        { name: "unique missable & NG+ armor", prompt: `Search ${gameName} wiki. List EVERY missable, questline, covenant, NG+-exclusive armor. CRITICAL: start each line with ARMOR:. All 5 defense stats required. loc must be very specific.\n${ARM}${RULES}` },
        // ── Rings / Spells ─────────────────────────────────────────────────────
        { name: "rings, talismans & accessories", prompt: `Search ${gameName} wiki. List EVERY ring, talisman, amulet, charm, accessory. Effects MUST include exact numbers. Start each line with RING/ACC:.\n${RNG}${RULES}` },
        { name: "offensive spells", prompt: `Search ${gameName} wiki. List EVERY offensive spell/sorcery/incantation/pyromancy. CRITICAL: each line MUST start with SPELL: (not WEAPON: or MECHANIC:). Damage must be real numbers.\n${SPL}${RULES}` },
        { name: "support & buff spells", prompt: `Search ${gameName} wiki. List EVERY buff/heal/support/utility spell. CRITICAL: each line MUST start with BUFF: (not SPELL:). Effect magnitudes must be numbers.\n${BUF}${RULES}` },
        // ── Progression / World ────────────────────────────────────────────────
        { name: "endgame, final bosses & NG+", prompt: `Search ${gameName} wiki for final bosses, their drops, NG+ cycle changes, NG+-exclusive items, recommended stats per NG+ tier. CRITICAL: start each line with BUILD:.\nBUILD: Name — [drops/unlocks]; rec level: N; key stats: [VIG N / STR N] — loc: [area or NG+N]${RULES}` },
        { name: "unique legendary & boss weapons", prompt: `Search ${gameName} wiki. List EVERY unique/legendary weapon, boss weapon, remembrance weapon. CRITICAL: start each line with WEAPON:. Note "unique/uninfusable" in type. Include full damage table.\n${WPN}${RULES}` },
        // ── New categories ─────────────────────────────────────────────────────
        { name: "ashes of war & infusion gems", prompt: `Search ${gameName} wiki. List EVERY ash of war, infusion gem, whetblade, and affinity-modifying item. CRITICAL: each line MUST start with GEM: — NOT WEAPON: or MECHANIC:.\n${GEM}${RULES}` },
        { name: "upgrade materials & farming", prompt: `Search ${gameName} wiki. List EVERY upgrade material: smithing stones, somber stones, titanite shards, bone fragments, upgrade gems, and special mats. CRITICAL: each line MUST start with UPGRADE:.\n${UPG}${RULES}` },
        { name: "areas, maps & navigation", prompt: `Search ${gameName} wiki. List EVERY major area, region, legacy dungeon, catacomb, cave, and dungeon. CRITICAL: each line MUST start with MAP:. Include shortcuts, key bosses, and how to unlock.\n${MAP_T}${RULES}` },
        { name: "lore, NPC questlines & story", prompt: `Search ${gameName} wiki. List EVERY major NPC questline, story event, ending, and lore item. CRITICAL: each line MUST start with LORE: — do NOT use MECHANIC: for NPCs or questlines.\n${LRE}${RULES}` },
      ];

      const allFacts: import("@shared/types").KnowledgeFact[] = [];
      const categoryResults: { name: string; count: number }[] = [];

      // Run categories in parallel batches of 3
      const CONCURRENT = 3;
      const totalBatches = Math.ceil(categories.length / CONCURRENT);
      for (let i = 0; i < categories.length; i += CONCURRENT) {
        const batch = categories.slice(i, i + CONCURRENT);
        const batchNum = Math.floor(i / CONCURRENT) + 1;
        emit(
          `Batch ${batchNum}/${totalBatches}`,
          batch.map((c) => c.name).join(" · ")
        );
        const LEARN_TIMEOUT_MS = 300_000; // 5 min per category
        const results = await Promise.allSettled(
          batch.map((cat) => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), LEARN_TIMEOUT_MS);
            return pplx.chat.completions.create(
              {
                model: SONAR_DEEP,
                stream: false as const,
                max_tokens: 8000,
                messages: [{ role: "user", content: cat.prompt }],
              },
              { signal: controller.signal }
            ).finally(() => clearTimeout(timer));
          })
        );
        for (let j = 0; j < results.length; j++) {
          const r = results[j];
          if (r.status === "fulfilled") {
            const text = extractText(r.value as PplxResponse);
            const facts = parseLearnLines(text, gameKey, gameName);
            allFacts.push(...facts);
            categoryResults.push({ name: batch[j].name, count: facts.length });
          } else {
            categoryResults.push({ name: batch[j].name, count: 0 });
          }
        }
        emit(
          `Batch ${batchNum}/${totalBatches} done`,
          `${allFacts.length} facts so far`
        );
      }

      emit("Synthesis pass", `Deduplicating & validating ${allFacts.length} facts...`);
      // Synthesis pass: sonar-reasoning-pro validates classification and deduplicates.
      // Send per-category summaries (not raw lines) to stay within token budget while
      // giving the model full coverage visibility across all 18 categories.
      let finalFacts = allFacts;
      if (allFacts.length > 0) {
        try {
          // Group facts by type for summary
          const byType: Record<string, string[]> = {};
          for (const f of allFacts) {
            (byType[f.type] ??= []).push(f.name);
          }
          const categorySummary = Object.entries(byType)
            .map(([type, names]) => {
              const sample = names.slice(0, 8).join(", ");
              return `${type} (${names.length} items): ${sample}${names.length > 8 ? "..." : ""}`;
            })
            .join("\n");

          // Send a manageable sample of raw lines (3000 items max) for dedup check
          const sampleLines = allFacts.slice(0, 3000).map((f) => f.raw).join("\n");

          const synthPrompt = `You are validating a ${gameName} item database. 18 categories were searched, producing ${allFacts.length} facts.

COVERAGE SUMMARY:
${categorySummary}

SAMPLE LINES (first 3000 of ${allFacts.length}):
${sampleLines}

Tasks:
1. REMOVE exact duplicates from the sample (same item name + same type — keep version with more numeric data)
2. REMOVE vague placeholders like "AP: ~N" or "damage: varies"
3. FIX misclassified prefixes:
   - Shields MUST be SHIELD: (not WEAPON:)
   - Casting tools MUST be CATALYST: (not WEAPON:)
   - Support spells MUST be BUFF: (not SPELL:)
   - Ashes of War MUST be GEM: (not WEAPON: or MECHANIC:)
   - Upgrade mats MUST be UPGRADE: (not ITEM:)
   - Areas/dungeons MUST be MAP: (not MECHANIC:)
   - NPC questlines MUST be LORE: (not MECHANIC:)
4. Output ONLY cleaned item lines, one per line. No commentary.

Category breakdown: ${categoryResults.map((c) => `${c.name}:${c.count}`).join(", ")}`;

          // Claude synthesis — better classification validation than sonar-reasoning-pro.
          // Returns plain text lines (not JSON), so we call Claude directly.
          const claudeMsg = await claude.messages.create({
            model: CLAUDE_MODEL,
            max_tokens: 12000,
            system: "You are a database validator. Output ONLY cleaned item lines, one per line. No JSON, no markdown, no commentary.",
            messages: [{ role: "user", content: synthPrompt }],
          });
          const claudeText = claudeMsg.content
            .filter((b) => b.type === "text")
            .map((b) => (b as { type: "text"; text: string }).text)
            .join("");
          const synthFacts = parseLearnLines(claudeText, gameKey, gameName);
          if (synthFacts.length >= allFacts.length * 0.35) {
            finalFacts = synthFacts;
          }
        } catch {
          // non-fatal — use raw facts
        }
      }

      if (finalFacts.length > 0) {
        updateKnowledgeCache(gameKey, gameName, finalFacts);
      }

      learnEmitter.emit("progress", {
        gameKey,
        stage: "Complete",
        detail: `${finalFacts.length} facts cached`,
        done: true,
      } satisfies LearnProgressEvent);

      // Count by category for response
      const breakdown: Record<string, number> = {};
      for (const f of finalFacts) {
        breakdown[f.type] = (breakdown[f.type] ?? 0) + 1;
      }

      return res.json({
        ok: true,
        total: finalFacts.length,
        breakdown,
        categories: categoryResults,
        // Pre-pass results for UI display
        preFacts,
        preSources,
      });
    } catch (err) {
      const msg = friendlyPplxError(err);
      learnEmitter.emit("progress", {
        gameKey: (req.body as { gameKey?: string })?.gameKey ?? "",
        stage: "Error",
        detail: msg,
        done: true,
        error: msg,
      } satisfies LearnProgressEvent);
      res.status(500).json({ error: msg });
    }
  });

  // ── GET/POST /api/team-log — AI inter-agent communication channel ────────────
  // Claude writes summaries; Perplexity reads them as context for next search session.
  const teamLogPath = resolve("team-log.json");

  app.get("/api/team-log", (_req, res) => {
    try {
      const entries = JSON.parse(readFileSync(teamLogPath, "utf8"));
      res.json({ ok: true, entries });
    } catch { res.json({ ok: true, entries: [] }); }
  });

  app.post("/api/team-log", (req, res) => {
    try {
      const { from, message, type = "info" } = req.body as { from: string; message: string; type?: string };
      let entries: unknown[] = [];
      try { entries = JSON.parse(readFileSync(teamLogPath, "utf8")); } catch { entries = []; }
      entries = [...entries, { from, message, type, ts: Date.now() }].slice(-80);
      writeFileSync(teamLogPath, JSON.stringify(entries, null, 2));
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ── POST /api/export — export all builds as JSON ──────────────────────────
  app.post("/api/export", (_req, res) => {
    const hiddenKeys = new Set(
      storage.getHiddenStaticBuilds().map((h) => h.buildKey)
    );
    const dynamicBuildsData = storage.getDynamicBuilds();
    const dynamicGamesData = storage.getDynamicGames();

    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      hiddenSeedBuilds: Array.from(hiddenKeys),
      dynamicGames: dynamicGamesData.map((g) => JSON.parse(g.data)),
      dynamicBuilds: dynamicBuildsData.map((b) => JSON.parse(b.data)),
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="master-build-codex-export-${Date.now()}.json"`
    );
    res.json(exportData);
  });

  // ── POST /api/import — import builds from JSON ────────────────────────────
  app.post("/api/import", (req, res) => {
    try {
      const data = req.body as {
        version: number;
        hiddenSeedBuilds?: string[];
        dynamicGames?: Game[];
        dynamicBuilds?: Build[];
      };

      let imported = 0;

      // Restore hidden seeds
      if (data.hiddenSeedBuilds) {
        for (const key of data.hiddenSeedBuilds) {
          storage.hideStaticBuild(key);
        }
      }

      // Import dynamic games
      if (data.dynamicGames) {
        for (const game of data.dynamicGames) {
          const existing = storage.getDynamicGame(game.key);
          if (!existing) {
            storage.createDynamicGame({
              key: game.key,
              data: JSON.stringify(game),
            });
            imported++;
          }
        }
      }

      // Import dynamic builds
      if (data.dynamicBuilds) {
        for (const build of data.dynamicBuilds) {
          const existing = storage.getDynamicBuild(build.key);
          if (!existing) {
            storage.createDynamicBuild({
              key: build.key,
              gameKey: build.gameKey,
              data: JSON.stringify(build),
            });
            imported++;
          }
        }
      }

      res.json({ ok: true, imported });
    } catch (err) {
      res.status(400).json({
        error: `Import failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });
}
