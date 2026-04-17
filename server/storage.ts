/**
 * storage.ts — IStorage implementation backed by sql.js
 *
 * Uses raw SQL via getDb() / saveToDisk() instead of Drizzle ORM because
 * Drizzle has no sql.js adapter (it targets better-sqlite3 / node-postgres).
 * TypeScript types (DynamicBuild, DynamicGame, etc.) still come from
 * @shared/schema so the rest of the app is unaffected.
 */

import { getDb, saveToDisk } from "./db";
import {
  type DynamicBuild,
  type DynamicGame,
  type HiddenStaticBuild,
  type KnowledgeCache,
  type InsertDynamicBuild,
  type InsertDynamicGame,
  type InsertHiddenStaticBuild,
  type InsertKnowledgeCache,
} from "@shared/schema";

// ── Tiny query helpers ────────────────────────────────────────────────────────

/** Run a SELECT and return all rows as typed objects. */
function queryAll<T>(sql: string, params: (string | number | null)[] = []): T[] {
  // sql.js Statement API: bind → step loop → getAsObject → free
  const stmt = getDb().prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return rows;
}

/** Run a SELECT and return the first row or undefined. */
function queryOne<T>(sql: string, params: (string | number | null)[] = []): T | undefined {
  const rows = queryAll<T>(sql, params);
  return rows[0];
}

/** Run an INSERT / UPDATE / DELETE; returns the last inserted row id. */
function run(sql: string, params: (string | number | null)[] = []): number {
  getDb().run(sql, params);
  // last_insert_rowid() is the reliable way to get the new id
  const [[id]] = getDb().exec("SELECT last_insert_rowid()")[0]?.values ?? [[0]];
  return id as number;
}

// ── Row shapes returned by sql.js (snake_case columns) ───────────────────────

interface BuildRow {
  id: number;
  key: string;
  game_key: string;
  data: string;
  created_at: number;
}

interface GameRow {
  id: number;
  key: string;
  data: string;
  created_at: number;
}

interface HiddenRow {
  id: number;
  build_key: string;
}

interface CacheRow {
  id: number;
  game_key: string;
  facts: string;
  patch_note: string | null;
  updated_at: number;
}

// ── Row → domain-type mappers ─────────────────────────────────────────────────

function rowToBuild(r: BuildRow): DynamicBuild {
  return {
    id: r.id,
    key: r.key,
    gameKey: r.game_key,
    data: r.data,
    createdAt: new Date(r.created_at * 1000),
  };
}

function rowToGame(r: GameRow): DynamicGame {
  return {
    id: r.id,
    key: r.key,
    data: r.data,
    createdAt: new Date(r.created_at * 1000),
  };
}

function rowToHidden(r: HiddenRow): HiddenStaticBuild {
  return { id: r.id, buildKey: r.build_key };
}

function rowToCache(r: CacheRow): KnowledgeCache {
  return {
    id: r.id,
    gameKey: r.game_key,
    facts: r.facts,
    patchNote: r.patch_note ?? null,
    updatedAt: new Date(r.updated_at * 1000),
  };
}

// ── IStorage interface ────────────────────────────────────────────────────────

export interface IStorage {
  // Dynamic builds
  getDynamicBuilds(gameKey?: string): DynamicBuild[];
  getDynamicBuild(key: string): DynamicBuild | undefined;
  createDynamicBuild(data: InsertDynamicBuild): DynamicBuild;
  updateDynamicBuild(key: string, data: InsertDynamicBuild): DynamicBuild;
  deleteDynamicBuild(key: string): void;

  // Dynamic games
  getDynamicGames(): DynamicGame[];
  getDynamicGame(key: string): DynamicGame | undefined;
  createDynamicGame(data: InsertDynamicGame): DynamicGame;
  deleteDynamicGame(key: string): void;

  // Hidden static builds
  getHiddenStaticBuilds(): HiddenStaticBuild[];
  hideStaticBuild(buildKey: string): void;
  unhideStaticBuild(buildKey: string): void;

  // Knowledge cache
  getKnowledgeCache(gameKey: string): KnowledgeCache | undefined;
  upsertKnowledgeCache(data: InsertKnowledgeCache): KnowledgeCache;
}

// ── Implementation ────────────────────────────────────────────────────────────

export class SQLiteStorage implements IStorage {
  // ── Dynamic builds ──────────────────────────────────────────────────────────

  getDynamicBuilds(gameKey?: string): DynamicBuild[] {
    if (gameKey) {
      return queryAll<BuildRow>(
        "SELECT * FROM dynamic_builds WHERE game_key = ?",
        [gameKey]
      ).map(rowToBuild);
    }
    return queryAll<BuildRow>("SELECT * FROM dynamic_builds").map(rowToBuild);
  }

  getDynamicBuild(key: string): DynamicBuild | undefined {
    const row = queryOne<BuildRow>(
      "SELECT * FROM dynamic_builds WHERE key = ?",
      [key]
    );
    return row ? rowToBuild(row) : undefined;
  }

  createDynamicBuild(data: InsertDynamicBuild): DynamicBuild {
    const id = run(
      "INSERT INTO dynamic_builds (key, game_key, data, created_at) VALUES (?, ?, ?, unixepoch())",
      [data.key, data.gameKey, data.data]
    );
    saveToDisk();
    const row = queryOne<BuildRow>(
      "SELECT * FROM dynamic_builds WHERE id = ?",
      [id]
    )!;
    return rowToBuild(row);
  }

  updateDynamicBuild(key: string, data: InsertDynamicBuild): DynamicBuild {
    getDb().run(
      "UPDATE dynamic_builds SET game_key = ?, data = ? WHERE key = ?",
      [data.gameKey, data.data, key]
    );
    saveToDisk();
    const row = queryOne<BuildRow>(
      "SELECT * FROM dynamic_builds WHERE key = ?",
      [key]
    )!;
    return rowToBuild(row);
  }

  deleteDynamicBuild(key: string): void {
    getDb().run("DELETE FROM dynamic_builds WHERE key = ?", [key]);
    saveToDisk();
  }

  // ── Dynamic games ───────────────────────────────────────────────────────────

  getDynamicGames(): DynamicGame[] {
    return queryAll<GameRow>("SELECT * FROM dynamic_games").map(rowToGame);
  }

  getDynamicGame(key: string): DynamicGame | undefined {
    const row = queryOne<GameRow>(
      "SELECT * FROM dynamic_games WHERE key = ?",
      [key]
    );
    return row ? rowToGame(row) : undefined;
  }

  createDynamicGame(data: InsertDynamicGame): DynamicGame {
    const id = run(
      "INSERT INTO dynamic_games (key, data, created_at) VALUES (?, ?, unixepoch())",
      [data.key, data.data]
    );
    saveToDisk();
    const row = queryOne<GameRow>(
      "SELECT * FROM dynamic_games WHERE id = ?",
      [id]
    )!;
    return rowToGame(row);
  }

  deleteDynamicGame(key: string): void {
    getDb().run("DELETE FROM dynamic_games WHERE key = ?", [key]);
    saveToDisk();
  }

  // ── Hidden static builds ────────────────────────────────────────────────────

  getHiddenStaticBuilds(): HiddenStaticBuild[] {
    return queryAll<HiddenRow>("SELECT * FROM hidden_static_builds").map(rowToHidden);
  }

  hideStaticBuild(buildKey: string): void {
    const existing = queryOne<HiddenRow>(
      "SELECT * FROM hidden_static_builds WHERE build_key = ?",
      [buildKey]
    );
    if (!existing) {
      getDb().run(
        "INSERT INTO hidden_static_builds (build_key) VALUES (?)",
        [buildKey]
      );
      saveToDisk();
    }
  }

  unhideStaticBuild(buildKey: string): void {
    getDb().run(
      "DELETE FROM hidden_static_builds WHERE build_key = ?",
      [buildKey]
    );
    saveToDisk();
  }

  // ── Knowledge cache ─────────────────────────────────────────────────────────

  getKnowledgeCache(gameKey: string): KnowledgeCache | undefined {
    const row = queryOne<CacheRow>(
      "SELECT * FROM knowledge_cache WHERE game_key = ?",
      [gameKey]
    );
    return row ? rowToCache(row) : undefined;
  }

  upsertKnowledgeCache(data: InsertKnowledgeCache): KnowledgeCache {
    const existing = this.getKnowledgeCache(data.gameKey);
    if (existing) {
      getDb().run(
        "UPDATE knowledge_cache SET facts = ?, patch_note = ?, updated_at = unixepoch() WHERE game_key = ?",
        [data.facts, data.patchNote ?? null, data.gameKey]
      );
    } else {
      getDb().run(
        "INSERT INTO knowledge_cache (game_key, facts, patch_note, updated_at) VALUES (?, ?, ?, unixepoch())",
        [data.gameKey, data.facts, data.patchNote ?? null]
      );
    }
    saveToDisk();
    const row = queryOne<CacheRow>(
      "SELECT * FROM knowledge_cache WHERE game_key = ?",
      [data.gameKey]
    )!;
    return rowToCache(row);
  }
}

export const storage = new SQLiteStorage();
