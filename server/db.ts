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

  // sql.js needs the WASM binary path.
  // In production (esbuild bundle): sql-wasm.wasm is copied next to index.cjs
  // → use __dirname which resolves to the dist/ directory.
  // In dev (tsx): fall back to node_modules/sql.js/dist/sql-wasm.wasm.
  const prodWasm = path.join(__dirname, "sql-wasm.wasm");
  const devWasm = path.join(
    path.dirname(require.resolve("sql.js")),
    "sql-wasm.wasm"
  );
  const wasmPath = fs.existsSync(prodWasm) ? prodWasm : devWasm;

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
