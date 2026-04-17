/**
 * db.ts — sql.js SQLite (pure WebAssembly, zero native binaries)
 *
 * Replaces better-sqlite3 which required a native .node binary compiled
 * for a specific Node/Electron ABI version, causing ERR_DLOPEN_FAILED
 * on every fresh Electron build.
 *
 * sql.js loads SQLite as a WASM module — works in any Node version,
 * any Electron version, no Visual Studio, no node-gyp, no ABI issues.
 *
 * Persistence: sql.js keeps the DB in memory. We write it to disk after
 * every mutating operation via exportDatabase() / saveToDisk().
 */

import initSqlJs, { type Database } from "sql.js";
import fs from "fs";
import path from "path";

// ── DB file path (injected by Electron, falls back to cwd for dev) ──────────
const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "dev.db");

// ── Module-level singleton ───────────────────────────────────────────────────
let _db: Database | null = null;

/**
 * Returns the initialised sql.js Database instance.
 * Initialisation is synchronous after the one-time async WASM load.
 * Call `await initDb()` once at server startup before using `getDb()`.
 */
export function getDb(): Database {
  if (!_db) throw new Error("Database not initialised — call initDb() first");
  return _db;
}

/**
 * Persist the in-memory database to disk. Call after every write.
 */
export function saveToDisk(): void {
  if (!_db) return;
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

/**
 * Async initialisation — loads WASM and opens (or creates) the DB file.
 * Must be awaited before any DB access.
 */
export async function initDb(): Promise<void> {
  if (_db) return; // already initialised

  // Locate sql-wasm.wasm. We try three locations in order:
  //   1. Next to this bundle's output (dist/sql-wasm.wasm) — production
  //   2. sql.js package dist/ folder — dev (tsx) and fallback
  //   3. Electron asar-unpacked path — packaged Electron
  const candidates = [
    path.join(__dirname, "sql-wasm.wasm"),
    path.join(__dirname, "node_modules", "sql.js", "dist", "sql-wasm.wasm"),
    // Resolve from sql.js package root → dist/
    (() => {
      try {
        // require.resolve gives us the package main (dist/sql-wasm.js)
        const pkgMain = require.resolve("sql.js");
        return path.join(path.dirname(pkgMain), "sql-wasm.wasm");
      } catch { return ""; }
    })(),
  ].filter(Boolean);

  const wasmPath = candidates.find((p) => fs.existsSync(p)) ?? candidates[0];

  const SQL = await initSqlJs({
    locateFile: () => wasmPath,
  });

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(fileBuffer);
  } else {
    _db = new SQL.Database();
  }

  // WAL mode is not applicable to sql.js (in-memory), but foreign keys are
  _db.run("PRAGMA foreign_keys = ON;");
}
