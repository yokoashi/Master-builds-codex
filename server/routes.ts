import type { Express } from "express";
import type { Server } from "http";
import Perplexity from "@perplexity-ai/perplexity_ai";
import { storage } from "./storage";
import {
  extractFactsFromBuild,
  updateKnowledgeCache,
  buildKnowledgeBlock,
  shouldSkipWebSearch,
} from "./knowledge";
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

// ── Perplexity client ────────────────────────────────────────────────────────
const pplx = new Perplexity({
  apiKey: process.env.PERPLEXITY_API_KEY ?? "",
});

// Model selection:
// sonar-pro       — 200K context, built-in web search, best for factual generation
// sonar-reasoning-pro — 128K context, Chain-of-Thought reasoning (replaces Claude extended thinking)
const SONAR_PRO = "sonar-pro";
const SONAR_REASONING = "sonar-reasoning-pro";

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

  // ── POST /api/generate/step1 — metadata + loadouts + phases 1-3 ───────────
  // Model: sonar-pro (200K context, web search grounded item locations)
  app.post("/api/generate/step1", async (req, res) => {
    try {
      const body = req.body as GenerateStep1Request;
      const knowledgeBlock = buildKnowledgeBlock(body.gameKey);

      const systemContent = `You are an expert soulslike game build guide author. You create detailed, accurate build guides in structured JSON format. You know every item location, upgrade path, stat cap, and mechanic intimately. Use your web search capability to verify item locations and current patch values.

${knowledgeBlock}

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

      const userContent = `Create the first part of a build guide for ${body.gameName}.

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

      const response = await pplx.chat.completions.create({
        model: SONAR_PRO,
        stream: false as const,
        max_tokens: 8000,
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: userContent },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            schema: STEP1_SCHEMA,
          },
        },
      });

      const rawText = extractText(response);
      const parsed = parseJsonResponse<Partial<Build>>(rawText);

      if (!parsed.ok) {
        return res.status(422).json({
          error: `Failed to parse AI response: ${parsed.error}`,
          raw: rawText.substring(0, 500),
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

      const systemContent = `You are an expert soulslike game build guide author specializing in late-game optimization and NG+ strategies. Use deep reasoning to plan optimal stat allocation across phases 4-7 and NG+ cycles. Use web search to verify late-game item locations and boss strategies.

${knowledgeBlock}

CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }. No prose, no markdown fences — pure JSON only.`;

      const userContent = `Complete the build guide for ${body.gameName} by generating phases 4-7 including NG+ cycles.

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

      const response = await pplx.chat.completions.create({
        model: SONAR_REASONING,
        stream: false as const,
        max_tokens: 8000,
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: userContent },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            schema: STEP2_SCHEMA,
          },
        },
      });

      const rawText = extractText(response);
      // Note: <think> blocks are stripped inside parseJsonResponse via stripThinking()
      const parsed = parseJsonResponse<{ phases_4_to_7: Build["phases"] }>(rawText);

      if (!parsed.ok) {
        return res.status(422).json({
          error: `Step 2 parse failed: ${parsed.error}`,
          raw: rawText.substring(0, 500),
        });
      }

      res.json({ ok: true, phases47: parsed.value.phases_4_to_7 });
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

      const systemContent = `You are an expert soulslike build author creating Similar Builds, Alternative OP Builds, and Quick Reference tables in JSON format. Use web search to find community-recommended builds and item data.

${knowledgeBlock}

CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }. Pure JSON only.`;

      const userContent = `Generate the final sections for this ${body.gameName} build guide.

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

      const response = await pplx.chat.completions.create({
        model: SONAR_PRO,
        stream: false as const,
        max_tokens: 8000,
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: userContent },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            schema: STEP3_SCHEMA,
          },
        },
      });

      const rawText = extractText(response);
      const parsed = parseJsonResponse<{
        sim: Build["sim"];
        oth: Build["oth"];
        ref: Build["ref"];
      }>(rawText);

      // Graceful fallback: if step3 fails, return empty arrays
      if (!parsed.ok) {
        return res.json({ ok: true, sim: [], oth: [], ref: [] });
      }

      res.json({
        ok: true,
        sim: parsed.value.sim ?? [],
        oth: parsed.value.oth ?? [],
        ref: parsed.value.ref ?? [],
      });
    } catch {
      // Graceful fallback — step3 is non-critical
      res.json({ ok: true, sim: [], oth: [], ref: [] });
    }
  });

  // ── POST /api/generate/finalize — save the completed build ────────────────
  app.post("/api/generate/finalize", (req, res) => {
    try {
      const body = req.body as Build & { _customGameName?: string; _customGameKey?: string };
      const { _customGameName, _customGameKey, ...build } = body as any;
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

      // Save build to DB
      storage.createDynamicBuild({
        key: normalizedBuild.key,
        gameKey: normalizedBuild.gameKey,
        data: JSON.stringify(normalizedBuild),
      });

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
        max_tokens: 4000,
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
