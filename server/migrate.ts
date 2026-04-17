import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "dev.db");
const sqlite = new Database(dbPath);

sqlite.pragma("journal_mode = WAL");

// Create tables manually (simple approach without drizzle-kit push)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS dynamic_builds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    game_key TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS dynamic_games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS hidden_static_builds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    build_key TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS knowledge_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_key TEXT NOT NULL UNIQUE,
    facts TEXT NOT NULL,
    patch_note TEXT,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

console.log("Database tables created/verified.");
sqlite.close();
