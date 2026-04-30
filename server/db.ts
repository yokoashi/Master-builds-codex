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

// NOTE: We use a dynamic require() instead of a static import so that esbuild
// does NOT attempt to resolve or bundle sql.js at compile time. sql.js ships
// a WASM binary which confuses esbuild's resolver on some platforms. The JS
// is loaded at runtime from the path we control.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

// ESM does not provide require() — create one bound to this file's URL.
const require = createRequire(import.meta.url);

// ESM does not provide __dirname — recreate it from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// process.resourcesPath is injected by Electron (undefined in plain Node).
declare const process: NodeJS.Process & { resourcesPath?: string };

// ── DB file path (injected by Electron, falls back to cwd for dev) ──────────
const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "dev.db");

// ── sql.js types (import type only — zero runtime cost) ─────────────────────
import type { Database, SqlJsStatic } from "sql.js";
export type { Database };

// ── Module-level singleton ───────────────────────────────────────────────────
let _db: Database | null = null;

/**
 * Returns the initialised sql.js Database instance.
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
 * Locate sql-wasm.wasm and the correct CJS loader at runtime.
 *
 * build.ts copies sql-wasm.js as sql-wasm.cjs so Node never hits
 * ERR_REQUIRE_ESM (package.json has "type":"module" which makes .js = ESM).
 *
 * Returns { wasmPath, jsPath } with absolute paths to both files.
 */
function findSqlJsFiles(): { wasmPath: string; jsPath: string } {
  // Candidate directories, in priority order:
  const dirs: string[] = [
    // 1. Packaged Electron: asarUnpack lands files here
    ...(process.resourcesPath
      ? [path.join(process.resourcesPath, "app.asar.unpacked", "node_modules", "sql.js", "dist")]
      : []),
    // 2. Next to index.cjs (dist/) — build script copies them here
    __dirname,
    // 3. Dev: node_modules
    path.join(process.cwd(), "node_modules", "sql.js", "dist"),
  ];

  for (const dir of dirs) {
    const wasmPath = path.join(dir, "sql-wasm.wasm");
    // In production the JS was renamed to .cjs to avoid ERR_REQUIRE_ESM;
    // in dev (tsx) the original .js is used directly.
    const cjsPath = path.join(dir, "sql-wasm.cjs");
    const jsPath  = path.join(dir, "sql-wasm.js");
    const loaderPath = fs.existsSync(cjsPath) ? cjsPath : jsPath;
    if (fs.existsSync(wasmPath) && fs.existsSync(loaderPath)) {
      return { wasmPath, jsPath: loaderPath };
    }
  }

  // Last resort: resolve from node_modules normally (dev only)
  try {
    const pkg = require.resolve("sql.js");
    const dir = path.dirname(pkg);
    return {
      wasmPath: path.join(dir, "sql-wasm.wasm"),
      jsPath:   pkg,
    };
  } catch {
    throw new Error("Cannot locate sql.js — run npm install");
  }
}

/**
 * Async initialisation — loads WASM and opens (or creates) the DB file.
 * Must be awaited before any DB access.
 */
export async function initDb(): Promise<void> {
  if (_db) return; // already initialised

  const { wasmPath, jsPath } = findSqlJsFiles();

  // Dynamic require — bypasses esbuild's static resolver entirely.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const initSqlJs: (config?: { locateFile?: (f: string) => string }) => Promise<SqlJsStatic> =
    require(jsPath);  // eslint-disable-line @typescript-eslint/no-var-requires

  const SQL = await initSqlJs({
    locateFile: () => wasmPath,
  });

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(fileBuffer);
  } else {
    _db = new SQL.Database();
  }

  // Foreign key enforcement
  _db.run("PRAGMA foreign_keys = ON;");
}
