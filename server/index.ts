import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { initDb, getDb } from "./db";
import { updateKnowledgeCache } from "./knowledge";
import { storage } from "./storage";
import { SEED_KNOWLEDGE } from "@shared/seed-knowledge";

// ── Schema (CREATE TABLE IF NOT EXISTS) ───────────────────────────────────────
// Runs once after initDb() resolves. Using IF NOT EXISTS means it is safe to
// call on every startup — existing data is never touched.
function runMigrations(): void {
  getDb().run(`
    CREATE TABLE IF NOT EXISTS dynamic_builds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      game_key TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
  getDb().run(`
    CREATE TABLE IF NOT EXISTS dynamic_games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      data TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
  getDb().run(`
    CREATE TABLE IF NOT EXISTS hidden_static_builds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      build_key TEXT NOT NULL UNIQUE
    );
  `);
  getDb().run(`
    CREATE TABLE IF NOT EXISTS knowledge_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_key TEXT NOT NULL UNIQUE,
      facts TEXT NOT NULL,
      patch_note TEXT,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
}

// Seed the knowledge cache on first run (only if a game has no cached facts yet).
// This gives the AI generation pipeline verified item data before any Learn session.
function seedKnowledgeCache() {
  const GAME_NAMES: Record<string, string> = {
    lotf: "Lords of the Fallen",
    ds1:  "Dark Souls",
  };
  for (const [gameKey, facts] of Object.entries(SEED_KNOWLEDGE)) {
    if (facts.length === 0) continue;
    const existing = storage.getKnowledgeCache(gameKey);
    let existingCount = 0;
    if (existing) {
      try { existingCount = (JSON.parse(existing.facts) as unknown[]).length; } catch { /* ignore */ }
    }
    // Only seed when the cache is empty so we never overwrite user-learned data
    if (existingCount === 0) {
      updateKnowledgeCache(
        gameKey,
        GAME_NAMES[gameKey] ?? gameKey,
        facts,
        "Seeded from wiki data on first startup"
      );
      console.log(`[seed] Seeded ${facts.length} facts for ${gameKey}`);
    } else {
      console.log(`[seed] Skipped ${gameKey} — already has ${existingCount} facts`);
    }
  }
}

const app = express();
const httpServer = createServer(app);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson as Record<string, unknown>;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  // ── 1. Init database (WASM load + open/create file) ────────────────────────
  await initDb();
  runMigrations();
  seedKnowledgeCache();

  // ── 2. Register API routes ──────────────────────────────────────────────────
  await registerRoutes(httpServer, app);

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const status = (err as { status?: number; statusCode?: number })?.status
      ?? (err as { statusCode?: number })?.statusCode
      ?? 500;
    const message = (err as { message?: string })?.message ?? "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // ── 3. Frontend (Vite dev server or static files) ──────────────────────────
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ── 4. Listen ───────────────────────────────────────────────────────────────
  // Default to 5000 — the only port not firewalled in this environment.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    { port, host: "0.0.0.0", reusePort: true },
    () => { log(`serving on port ${port}`); }
  );
})();
