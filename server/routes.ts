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
    const resp = await claude.messages.create({
      model: model || CLAUDE_MODEL,
      max_tokens: 8000,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userPrompt }],
    });
    return resp.content.find((b) => b.type === "text")?.text ?? "";
  }

  // PPLX and OpenRouter: OpenAI-compatible chat completions
  const baseURL = provider === "pplx"
    ? "https://api.perplexity.ai"
    : "https://openrouter.ai/api/v1";
  const apiKey = provider === "pplx"
    ? (process.env.PPLX_API_KEY ?? "")
    : (process.env.OPENROUTER_API_KEY ?? "");
  const resolvedModel = model || (provider === "pplx" ? PPLX_MODEL : "anthropic/claude-sonnet-4-5");

  const oa = new OpenAI({ baseURL, apiKey });
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

// ── System prompt builder (injects full codex, provider-aware size limit) ─────
function buildSystemPrompt(gameKey: string, gameName: string, provider: AiProvider, extra = ""): string {
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

  // POST /api/generate/step1 — metadata + Early Game (phase1) + Mid Game (phase2)
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
  "key": "kebab-case-build-name",
  "gameKey": "${gameKey}",
  "label": "Build Name",
  "sub": "Short Subtitle",
  "icon": "single emoji",
  "accent": "#hexcolor",
  "playstyle": "2-3 sentence playstyle overview",
  "cls": "Starting class name",
  "caps": ["STAT 40", "STAT 50"],
  "weaponReq": ["STR 14", "DEX 10"],
  "loadouts": null,
  "phase1": {
    "name": "Early Game",
    "range": "SL 1-30",
    "stats": { "VIT": 14, "ATT": 8, "END": 20, "STR": 16, "DEX": 14, "RES": 11, "INT": 9, "FTH": 9 },
    "sn": "Strategy summary for early game (2-3 sentences)",
    "weapons": [
      { "n": "Weapon Name", "ap": 150, "wt": 6.0, "ef": "Effect or null", "st": "Status or null",
        "eq": "Right Hand", "d": "Role in build", "loc": "Exact location",
        "up": "Upgrade path", "tip": "Build tip", "lore": "Lore note", "durability": 200 }
    ],
    "armor": [ { "n": "...", "wt": 4.0, "eq": "Chest", "d": "...", "loc": "...", "up": "None", "tip": "...", "lore": "...", "durability": 300 } ],
    "acc":   [ { "n": "Ring Name", "wt": 0.0, "eq": "Ring", "d": "...", "loc": "...", "up": "None", "tip": "...", "lore": "..." } ],
    "spells": [],
    "dmg": { "ps": 180, "sp": 150, "bs": 360, "n": "Damage context note" }
  },
  "phase2": {
    "name": "Mid Game",
    "range": "SL 30-60",
    "stats": { "VIT": 20, "ATT": 10, "END": 28, "STR": 20, "DEX": 20, "RES": 11, "INT": 9, "FTH": 9 },
    "sn": "Mid game strategy",
    "weapons": [], "armor": [], "acc": [], "spells": [],
    "dmg": { "ps": 250, "sp": 210, "bs": 500, "n": "Damage context" }
  }
}

Rules:
- Every item loc must be a real ${gameName} location or drop source
- Include lore and durability for every item
- Rings go in "acc" array; spells/pyromancies/miracles go in "spells"
- Stats must fit the soul level range
- accent must be a dark hex color`;

    try {
      const text   = await callAI(provider, model, systemPrompt, userPrompt);
      console.log(`[step1] AI response (first 600 chars): ${text.slice(0, 600)}`);
      const parsed = parseJson(text);
      // Validate that the critical phase keys are present
      const p = parsed as Record<string, unknown>;
      if (!p.phase1 && !p.phase2) {
        console.error("[step1] MISSING phases in parsed response:", JSON.stringify(p).slice(0, 400));
        return res.status(500).json({ error: "AI did not return phase1/phase2. Try again or check your codex." });
      }
      res.json(parsed);
    } catch (err) {
      console.error("Step1 error:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/generate/step2 — End Game (phase3) + NG+ (phase4)
  app.post("/api/generate/step2", async (req, res) => {
    const body = req.body as GenerateStep2Request;
    const { gameKey, gameName, partialBuild, provider, model } = body;

    const systemPrompt = buildSystemPrompt(
      gameKey, gameName, provider,
      `Continue the "${partialBuild.label}" build. Generate the final two phases.`,
    );

    const userPrompt = `CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }.

Build so far: ${JSON.stringify({
  label: partialBuild.label,
  cls: partialBuild.cls,
  caps: partialBuild.caps,
  phase1: (partialBuild as Record<string, unknown>).phase1,
  phase2: (partialBuild as Record<string, unknown>).phase2,
}, null, 2)}

Generate phase3 (End Game) and phase4 (NG+) for this ${gameName} build.

{
  "phase3": {
    "name": "End Game",
    "range": "SL 80-120",
    "stats": { "VIT": 40, "ATT": 16, "END": 40, "STR": 40, "DEX": 40, "RES": 11, "INT": 9, "FTH": 9 },
    "sn": "Endgame strategy — soft caps, final gear choices",
    "weapons": [ { "n": "...", "ap": 400, "wt": 6.0, "ef": null, "st": null, "eq": "Right Hand", "d": "...", "loc": "...", "up": "+15 standard", "tip": "...", "lore": "...", "durability": 200 } ],
    "armor": [], "acc": [], "spells": [],
    "dmg": { "ps": 400, "sp": 350, "bs": 800, "n": "Peak damage context" }
  },
  "phase4": {
    "name": "NG+",
    "range": "NG+1 and beyond",
    "stats": { "VIT": 50, "ATT": 16, "END": 40, "STR": 40, "DEX": 40, "RES": 11, "INT": 9, "FTH": 9 },
    "sn": "Same build; enemies scale harder each cycle",
    "weapons": [], "armor": [], "acc": [], "spells": [],
    "dmg": { "ps": 400, "sp": 350, "bs": 800, "n": "Same damage output; enemy HP/damage scales" },
    "ngCycles": [
      { "label": "NG+1", "stats": { "VIT": 50 }, "notes": "~20% HP/damage increase" },
      { "label": "NG+3", "stats": { "VIT": 55 }, "notes": "~50% HP increase — adapt positioning" },
      { "label": "NG+5", "stats": { "VIT": 60 }, "notes": "~90% HP increase — patience over aggression" },
      { "label": "NG+7", "stats": { "VIT": 65 }, "notes": "~150% HP increase — max difficulty" }
    ]
  }
}

Rules: all item locations must be real in ${gameName}. Include lore and durability for every item.`;

    try {
      const text   = await callAI(provider, model, systemPrompt, userPrompt);
      console.log(`[step2] AI response (first 600 chars): ${text.slice(0, 600)}`);
      const parsed = parseJson(text);
      const p = parsed as Record<string, unknown>;
      if (!p.phase3 && !p.phase4) {
        console.error("[step2] MISSING phases in parsed response:", JSON.stringify(p).slice(0, 400));
        return res.status(500).json({ error: "AI did not return phase3/phase4. Try again." });
      }
      res.json(parsed);
    } catch (err) {
      console.error("Step2 error:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/generate/step3 — pros / cons / quick-ref
  app.post("/api/generate/step3", async (req, res) => {
    const body = req.body as GenerateStep3Request;
    const { gameKey, gameName, partialBuild, provider, model } = body;

    const systemPrompt = buildSystemPrompt(gameKey, gameName, provider);

    const userPrompt = `CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }.

Build: "${partialBuild.label}" (${partialBuild.sub})
Playstyle: ${partialBuild.playstyle}
Caps: ${JSON.stringify(partialBuild.caps)}

{
  "pros": [ "Pro 1 — specific to this build", "Pro 2", "Pro 3", "Pro 4", "Pro 5" ],
  "cons": [ "Con 1 — honest weakness", "Con 2", "Con 3", "Con 4" ],
  "ref": [
    { "n": "Item Name", "i": "Type", "w": 5.0, "ap": 270, "st": "Bleed 45 or —", "ar": "Poise 12 or —", "s": "A/D or —", "a": "Sharp or —" }
  ]
}

Include the 5-8 most important items in ref. Pros/cons must be specific to this ${gameName} build.`;

    try {
      const text = await callAI(provider, model, systemPrompt, userPrompt);
      let parsed: { pros?: string[]; cons?: string[]; ref?: unknown[] } = {};
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
      step3: { pros: string[]; cons: string[]; ref: unknown[] };
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
      ].filter(Boolean) as Build["phases"],
      pros: step3?.pros ?? [],
      cons: step3?.cons ?? [],
      ref:  (step3?.ref as Build["ref"]) ?? [],
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
