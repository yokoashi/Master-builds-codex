import type { Express } from "express";
import type { Server } from "http";
import Anthropic from "@anthropic-ai/sdk";
import { storage } from "./storage";
import {
  extractFactsFromCodex,
  updateKnowledgeCache,
  buildKnowledgeBlock,
} from "./knowledge";
import { parseJsonResponse } from "./parse-json";

function parseJson<T = Record<string, unknown>>(text: string): T {
  const result = parseJsonResponse<T>(text);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
import { SEED_GAMES, SEED_BUILDS } from "@shared/seed-data";
import type {
  Build,
  Game,
  GenerateStep1Request,
  GenerateStep2Request,
  GenerateStep3Request,
  KnowledgeFact,
} from "@shared/types";

// ── AI Client ─────────────────────────────────────────────────────────────────
const claude = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY ?? "",
});
const CLAUDE_MODEL = "claude-sonnet-4-6";

// ── Route registration ────────────────────────────────────────────────────────
export async function registerRoutes(
  _server: Server,
  app: Express
): Promise<void> {

  // ── GET /api/games ──────────────────────────────────────────────────────────
  app.get("/api/games", (_req, res) => {
    const dynamic = storage
      .getDynamicGames()
      .map((r) => JSON.parse(r.data) as Game);
    res.json([...SEED_GAMES, ...dynamic]);
  });

  // ── GET /api/builds ─────────────────────────────────────────────────────────
  app.get("/api/builds", (req, res) => {
    const gameKey = req.query.gameKey as string | undefined;
    const hidden = new Set(
      storage.getHiddenStaticBuilds().map((h) => h.buildKey)
    );
    const seed = SEED_BUILDS.filter(
      (b) => (!gameKey || b.gameKey === gameKey) && !hidden.has(b.key)
    );
    const dynamic = storage
      .getDynamicBuilds(gameKey)
      .map((r) => JSON.parse(r.data) as Build);
    res.json([...seed, ...dynamic]);
  });

  // ── DELETE /api/builds/:key ─────────────────────────────────────────────────
  app.delete("/api/builds/:key", (req, res) => {
    const key = req.params.key;
    const isSeed = SEED_BUILDS.some((b) => b.key === key);
    if (isSeed) {
      storage.hideStaticBuild(key);
    } else {
      storage.deleteDynamicBuild(key);
    }
    res.json({ ok: true });
  });

  // ── GET /api/knowledge/:gameKey ─────────────────────────────────────────────
  app.get("/api/knowledge/:gameKey", (req, res) => {
    const cache = storage.getKnowledgeCache(req.params.gameKey);
    if (!cache) return res.json({ facts: [], patchNote: null, updatedAt: null });
    let facts: KnowledgeFact[] = [];
    try { facts = JSON.parse(cache.facts); } catch { /* ignore */ }
    return res.json({ facts, patchNote: cache.patchNote, updatedAt: cache.updatedAt });
  });

  // ── POST /api/codex/import ──────────────────────────────────────────────────
  // Import a codex JSON file — parses it into KnowledgeFacts and stores in cache.
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
      const facts = extractFactsFromCodex(codex);
      updateKnowledgeCache(gameKey, gameName, facts, `Codex imported for ${gameName}`);
      return res.json({ ok: true, factCount: facts.length });
    } catch (err) {
      console.error("Codex import error:", err);
      return res.status(500).json({ error: "Failed to parse codex" });
    }
  });

  // ── POST /api/generate/step1 ────────────────────────────────────────────────
  // Metadata + Early Game and Mid Game phases.
  app.post("/api/generate/step1", async (req, res) => {
    const body = req.body as GenerateStep1Request;
    const { gameKey, gameName, buildDescription, statBudget, seedStats, preferredWeapon, knowledgeBlock } = body;

    const systemPrompt = `${knowledgeBlock}

You are an expert ${gameName} build guide writer. You have the full game codex above.
Your job is to generate a highly detailed, accurate build guide in JSON format.
Use ONLY items and mechanics from the codex. Every item must have a real location in the game.`;

    const userPrompt = `CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }.

Generate a ${gameName} build guide for: "${buildDescription}"
Stat budget: ${statBudget} total stat points
${seedStats ? `Seed stats: ${JSON.stringify(seedStats)}` : ""}
${preferredWeapon ? `Preferred weapon: ${preferredWeapon}` : ""}

Return this exact JSON structure (phase1 = Early Game, phase2 = Mid Game):

{
  "key": "kebab-case-build-name",
  "gameKey": "${gameKey}",
  "label": "Build Name",
  "sub": "Short Subtitle (e.g. STR/DEX Quality Build)",
  "icon": "single emoji",
  "accent": "#hexcolor",
  "playstyle": "2-3 sentence playstyle overview",
  "cls": "Starting class name",
  "caps": ["STAT 40", "STAT 50"],
  "weaponReq": ["STR 14", "DEX 10"],
  "loadouts": null,
  "phase1": {
    "name": "Early Game",
    "range": "SL 1–30",
    "stats": { "VIT": 14, "ATT": 8, "END": 20, "STR": 16, "DEX": 14, "RES": 11, "INT": 9, "FTH": 9 },
    "sn": "Strategy summary for this phase (2-3 sentences)",
    "weapons": [
      {
        "n": "Weapon Name",
        "ap": 150,
        "wt": 6.0,
        "ef": "Effect or null",
        "st": "Status buildup or null",
        "eq": "Right Hand",
        "d": "Role in the build",
        "loc": "Exact location or how to acquire",
        "up": "Upgrade path (e.g. +5 standard)",
        "tip": "Build-specific tip",
        "lore": "One sentence lore note",
        "durability": 200
      }
    ],
    "armor": [ <same Item structure> ],
    "acc": [ <rings/accessories using same Item structure> ],
    "spells": [ <spells using same Item structure, ap = spell damage> ],
    "dmg": { "ps": 180, "sp": 150, "bs": 360, "n": "Damage context note" }
  },
  "phase2": {
    "name": "Mid Game",
    "range": "SL 30–60",
    "stats": { "VIT": 20, "ATT": 10, "END": 28, "STR": 20, "DEX": 20, "RES": 11, "INT": 9, "FTH": 9 },
    "sn": "Strategy for mid game",
    "weapons": [ <Item[]> ],
    "armor": [ <Item[]> ],
    "acc": [ <Item[]> ],
    "spells": [ <Item[]> ],
    "dmg": { "ps": 250, "sp": 210, "bs": 500, "n": "Damage context" }
  }
}

Rules:
- All item locations must be real in ${gameName}
- Include lore and durability for every item
- Rings go in "acc" array
- Spells / pyromancies / miracles go in "spells" array
- Stats must make sense for the phase level range
- accent must be a dark hex color fitting the build theme`;

    try {
      const response = await claude.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 8000,
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userPrompt }],
      });
      const text = response.content.find((b) => b.type === "text")?.text ?? "";
      const parsed = parseJson(text);
      res.json(parsed);
    } catch (err) {
      console.error("Step1 error:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  // ── POST /api/generate/step2 ────────────────────────────────────────────────
  // End Game and NG+ phases (extended thinking enabled).
  app.post("/api/generate/step2", async (req, res) => {
    const body = req.body as GenerateStep2Request;
    const { gameKey, gameName, partialBuild, knowledgeBlock } = body;

    const systemPrompt = `${knowledgeBlock}

You are an expert ${gameName} build guide writer. You have the full game codex above.
Continue building the "${partialBuild.label}" build guide. Generate the final two phases.`;

    const userPrompt = `CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }.

Existing build so far:
${JSON.stringify({ label: partialBuild.label, cls: partialBuild.cls, caps: partialBuild.caps, phase1: (partialBuild as Record<string, unknown>).phase1, phase2: (partialBuild as Record<string, unknown>).phase2 }, null, 2)}

Now generate phase3 (End Game) and phase4 (NG+) for this ${gameName} build.

{
  "phase3": {
    "name": "End Game",
    "range": "SL 80–120",
    "stats": { ... },
    "sn": "Endgame strategy — what to focus on, which soft caps to hit",
    "weapons": [ <fully upgraded, lore + durability included> ],
    "armor": [ <Item[]> ],
    "acc": [ <Item[]> ],
    "spells": [ <Item[]> ],
    "dmg": { "ps": 0, "sp": 0, "bs": 0, "n": "Peak damage context" }
  },
  "phase4": {
    "name": "NG+",
    "range": "NG+1 and beyond",
    "stats": { ... },
    "sn": "NG+ strategy — same build, what changes",
    "weapons": [],
    "armor": [],
    "acc": [],
    "spells": [],
    "dmg": { "ps": 0, "sp": 0, "bs": 0, "n": "Same peak damage, enemy scaling increases" },
    "ngCycles": [
      { "label": "NG+1", "stats": { ... }, "notes": "~20% HP increase, strategy notes" },
      { "label": "NG+3", "stats": { ... }, "notes": "~50% HP increase, notes" },
      { "label": "NG+5", "stats": { ... }, "notes": "~90% HP increase, notes" },
      { "label": "NG+7", "stats": { ... }, "notes": "~150% HP increase, notes" }
    ]
  }
}

Rules: All items must have real locations in the game. Include lore and durability for every item.`;

    try {
      const response = await claude.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 8000,
        thinking: { type: "enabled", budget_tokens: 5000 },
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userPrompt }],
      });
      const text = response.content.find((b) => b.type === "text")?.text ?? "";
      const parsed = parseJson(text);
      res.json(parsed);
    } catch (err) {
      console.error("Step2 error:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  // ── POST /api/generate/step3 ────────────────────────────────────────────────
  // Pros/cons + quick-ref rows.
  app.post("/api/generate/step3", async (req, res) => {
    const body = req.body as GenerateStep3Request;
    const { gameName, partialBuild, knowledgeBlock } = body;

    const systemPrompt = `${knowledgeBlock}

You are an expert ${gameName} build guide writer with the full game codex above.`;

    const userPrompt = `CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }.

Build: "${partialBuild.label}" (${partialBuild.sub})
Playstyle: ${partialBuild.playstyle}
Caps: ${JSON.stringify(partialBuild.caps)}

Generate pros, cons, and quick-reference rows for this build.

{
  "pros": [
    "Pro 1 — specific and accurate to this build",
    "Pro 2",
    "Pro 3",
    "Pro 4",
    "Pro 5"
  ],
  "cons": [
    "Con 1 — honest weakness of this build",
    "Con 2",
    "Con 3",
    "Con 4"
  ],
  "ref": [
    {
      "n": "Item Name",
      "i": "Type (Weapon/Ring/Armor/Spell)",
      "w": 5.0,
      "ap": 270,
      "st": "Status or —",
      "ar": "Armor rating or —",
      "s": "Scaling grade or —",
      "a": "Affinity or —"
    }
  ]
}

Include the 5-8 most important items in ref (main weapons, key rings, core armor, main spell).
Pros and cons must be specific to this ${gameName} build — not generic platitudes.`;

    try {
      const response = await claude.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 8000,
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userPrompt }],
      });
      const text = response.content.find((b) => b.type === "text")?.text ?? "";
      let parsed: { pros?: string[]; cons?: string[]; ref?: unknown[] } = {};
      try { parsed = parseJson<{ pros?: string[]; cons?: string[]; ref?: unknown[] }>(text); } catch {
        parsed = { pros: [], cons: [], ref: [] };
      }
      res.json(parsed);
    } catch (err) {
      console.error("Step3 error:", err);
      res.json({ pros: [], cons: [], ref: [] });
    }
  });

  // ── POST /api/generate/finalize ─────────────────────────────────────────────
  // Assemble the full Build object, save, and extract facts from its items.
  app.post("/api/generate/finalize", async (req, res) => {
    const { gameKey, gameName, buildKey, step1, step2, step3 } = req.body as {
      gameKey: string;
      gameName: string;
      buildKey: string;
      step1: Record<string, unknown>;
      step2: Record<string, unknown>;
      step3: { pros: string[]; cons: string[]; ref: unknown[] };
    };

    const build: Build = {
      key: buildKey,
      gameKey,
      label: String(step1.label ?? ""),
      sub: String(step1.sub ?? ""),
      icon: String(step1.icon ?? "⚔️"),
      accent: String(step1.accent ?? "#888888"),
      playstyle: String(step1.playstyle ?? ""),
      cls: String(step1.cls ?? ""),
      caps: (step1.caps as string[]) ?? [],
      weaponReq: (step1.weaponReq as string[]) ?? [],
      loadouts: null,
      phases: [
        step1.phase1,
        step1.phase2,
        step2.phase3,
        step2.phase4,
      ].filter(Boolean) as Build["phases"],
      pros: step3.pros ?? [],
      cons: step3.cons ?? [],
      ref: (step3.ref as Build["ref"]) ?? [],
      isAI: true,
    };

    try {
      storage.createDynamicBuild({ key: build.key, gameKey, data: JSON.stringify(build) });
    } catch {
      // Build may already exist (re-finalize) — that's fine
    }

    // Extract facts from all phase items and cache them
    try {
      const { extractFactsFromBuild } = await import("./knowledge");
      const newFacts = extractFactsFromBuild(build);
      if (newFacts.length > 0) {
        updateKnowledgeCache(gameKey, gameName, newFacts);
      }
    } catch (err) {
      console.error("Fact extraction error (non-fatal):", err);
    }

    res.json(build);
  });

  // ── POST /api/export ────────────────────────────────────────────────────────
  app.post("/api/export", (_req, res) => {
    const dynamic = storage.getDynamicBuilds().map((r) => JSON.parse(r.data) as Build);
    const games = storage.getDynamicGames().map((r) => JSON.parse(r.data) as Game);
    const knowledge: Record<string, KnowledgeFact[]> = {};
    for (const g of [...SEED_GAMES, ...games]) {
      const cache = storage.getKnowledgeCache(g.key);
      if (cache) {
        try { knowledge[g.key] = JSON.parse(cache.facts); } catch { /* ignore */ }
      }
    }
    res.json({ builds: dynamic, games, knowledge, exportedAt: new Date().toISOString() });
  });

  // ── POST /api/import ────────────────────────────────────────────────────────
  app.post("/api/import", (req, res) => {
    const { builds = [], games = [], knowledge = {} } = req.body as {
      builds: Build[];
      games: Game[];
      knowledge: Record<string, KnowledgeFact[]>;
    };

    let importedBuilds = 0;
    let importedGames = 0;
    let importedFacts = 0;

    for (const g of games) {
      try {
        storage.createDynamicGame({ key: g.key, data: JSON.stringify(g) });
        importedGames++;
      } catch { /* skip duplicates */ }
    }

    for (const b of builds) {
      try {
        storage.createDynamicBuild({ key: b.key, gameKey: b.gameKey, data: JSON.stringify(b) });
        importedBuilds++;
      } catch { /* skip duplicates */ }
    }

    for (const [gameKey, facts] of Object.entries(knowledge)) {
      if (Array.isArray(facts) && facts.length > 0) {
        updateKnowledgeCache(gameKey, gameKey, facts);
        importedFacts += facts.length;
      }
    }

    res.json({ importedBuilds, importedGames, importedFacts });
  });
}
