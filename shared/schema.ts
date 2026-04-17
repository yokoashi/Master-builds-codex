import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Dynamic Builds (AI-generated + imported) ──────────────────────────────────
export const dynamicBuilds = sqliteTable("dynamic_builds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  gameKey: text("game_key").notNull(),
  data: text("data").notNull(), // JSON: Build
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const insertDynamicBuildSchema = createInsertSchema(dynamicBuilds).omit({
  id: true,
  createdAt: true,
});
export type InsertDynamicBuild = z.infer<typeof insertDynamicBuildSchema>;
export type DynamicBuild = typeof dynamicBuilds.$inferSelect;

// ── Dynamic Games (custom AI-generated games) ─────────────────────────────────
export const dynamicGames = sqliteTable("dynamic_games", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  data: text("data").notNull(), // JSON: Game
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const insertDynamicGameSchema = createInsertSchema(dynamicGames).omit({
  id: true,
  createdAt: true,
});
export type InsertDynamicGame = z.infer<typeof insertDynamicGameSchema>;
export type DynamicGame = typeof dynamicGames.$inferSelect;

// ── Hidden Static Builds (user-hidden seed builds) ────────────────────────────
export const hiddenStaticBuilds = sqliteTable("hidden_static_builds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  buildKey: text("build_key").notNull().unique(),
});

export const insertHiddenStaticBuildSchema = createInsertSchema(
  hiddenStaticBuilds
).omit({ id: true });
export type InsertHiddenStaticBuild = z.infer<
  typeof insertHiddenStaticBuildSchema
>;
export type HiddenStaticBuild = typeof hiddenStaticBuilds.$inferSelect;

// ── Knowledge Cache ───────────────────────────────────────────────────────────
export const knowledgeCache = sqliteTable("knowledge_cache", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameKey: text("game_key").notNull().unique(),
  facts: text("facts").notNull(), // JSON: KnowledgeFact[]
  patchNote: text("patch_note"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const insertKnowledgeCacheSchema = createInsertSchema(
  knowledgeCache
).omit({ id: true, updatedAt: true });
export type InsertKnowledgeCache = z.infer<typeof insertKnowledgeCacheSchema>;
export type KnowledgeCache = typeof knowledgeCache.$inferSelect;
