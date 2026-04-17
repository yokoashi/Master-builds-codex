import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";
import path from "path";

// DB_PATH is injected by Electron main process so the DB always lands
// next to the exe regardless of what process.cwd() resolves to.
// Falls back to dev.db in cwd for local npm run dev.
const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), "dev.db");
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrency
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
