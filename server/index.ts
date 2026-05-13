import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { initDb, getDb } from "./db";

// ── Schema (CREATE TABLE IF NOT EXISTS) ───────────────────────────────────────
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
  getDb().run(`
    CREATE TABLE IF NOT EXISTS codex_raw (
      game_key TEXT NOT NULL UNIQUE,
      raw_text TEXT NOT NULL,
      entry_count INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
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
  await initDb();
  runMigrations();

  await registerRoutes(httpServer, app);

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const status =
      (err as { status?: number; statusCode?: number })?.status ??
      (err as { statusCode?: number })?.statusCode ??
      500;
    const message =
      (err as { message?: string })?.message ?? "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    { port, host: "0.0.0.0", reusePort: true },
    () => { log(`serving on port ${port}`); }
  );
  // AI generation routes can take 60-120s — extend socket timeout so the
  // connection isn't dropped mid-response by the OS or a reverse proxy.
  httpServer.setTimeout(180_000);
  httpServer.keepAliveTimeout = 185_000;
})();
