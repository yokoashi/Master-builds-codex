import { db } from "./db";
import {
  dynamicBuilds,
  dynamicGames,
  hiddenStaticBuilds,
  knowledgeCache,
  type DynamicBuild,
  type DynamicGame,
  type HiddenStaticBuild,
  type KnowledgeCache,
  type InsertDynamicBuild,
  type InsertDynamicGame,
  type InsertHiddenStaticBuild,
  type InsertKnowledgeCache,
} from "@shared/schema";
import { eq } from "drizzle-orm";

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

export class SQLiteStorage implements IStorage {
  // Dynamic builds
  getDynamicBuilds(gameKey?: string): DynamicBuild[] {
    if (gameKey) {
      return db
        .select()
        .from(dynamicBuilds)
        .where(eq(dynamicBuilds.gameKey, gameKey))
        .all();
    }
    return db.select().from(dynamicBuilds).all();
  }

  getDynamicBuild(key: string): DynamicBuild | undefined {
    return db
      .select()
      .from(dynamicBuilds)
      .where(eq(dynamicBuilds.key, key))
      .get();
  }

  createDynamicBuild(data: InsertDynamicBuild): DynamicBuild {
    return db.insert(dynamicBuilds).values(data).returning().get();
  }

  updateDynamicBuild(key: string, data: InsertDynamicBuild): DynamicBuild {
    return db
      .update(dynamicBuilds)
      .set({ gameKey: data.gameKey, data: data.data })
      .where(eq(dynamicBuilds.key, key))
      .returning()
      .get();
  }

  deleteDynamicBuild(key: string): void {
    db.delete(dynamicBuilds).where(eq(dynamicBuilds.key, key)).run();
  }

  // Dynamic games
  getDynamicGames(): DynamicGame[] {
    return db.select().from(dynamicGames).all();
  }

  getDynamicGame(key: string): DynamicGame | undefined {
    return db
      .select()
      .from(dynamicGames)
      .where(eq(dynamicGames.key, key))
      .get();
  }

  createDynamicGame(data: InsertDynamicGame): DynamicGame {
    return db.insert(dynamicGames).values(data).returning().get();
  }

  deleteDynamicGame(key: string): void {
    db.delete(dynamicGames).where(eq(dynamicGames.key, key)).run();
  }

  // Hidden static builds
  getHiddenStaticBuilds(): HiddenStaticBuild[] {
    return db.select().from(hiddenStaticBuilds).all();
  }

  hideStaticBuild(buildKey: string): void {
    const existing = db
      .select()
      .from(hiddenStaticBuilds)
      .where(eq(hiddenStaticBuilds.buildKey, buildKey))
      .get();
    if (!existing) {
      db.insert(hiddenStaticBuilds).values({ buildKey }).run();
    }
  }

  unhideStaticBuild(buildKey: string): void {
    db.delete(hiddenStaticBuilds)
      .where(eq(hiddenStaticBuilds.buildKey, buildKey))
      .run();
  }

  // Knowledge cache
  getKnowledgeCache(gameKey: string): KnowledgeCache | undefined {
    return db
      .select()
      .from(knowledgeCache)
      .where(eq(knowledgeCache.gameKey, gameKey))
      .get();
  }

  upsertKnowledgeCache(data: InsertKnowledgeCache): KnowledgeCache {
    const existing = this.getKnowledgeCache(data.gameKey);
    if (existing) {
      return db
        .update(knowledgeCache)
        .set({ facts: data.facts, patchNote: data.patchNote, updatedAt: new Date() })
        .where(eq(knowledgeCache.gameKey, data.gameKey))
        .returning()
        .get();
    }
    return db.insert(knowledgeCache).values(data).returning().get();
  }
}

export const storage = new SQLiteStorage();
