/**
 * seed-knowledge.ts
 *
 * Seed facts cleared — use the Learn button to build a full, accurate database.
 * The seeder in server/index.ts only inserts when the cache is empty, so
 * running Learn will populate everything fresh from the AI pipeline.
 */

import type { KnowledgeFact } from "./types";

/** Map of gameKey → seed facts (intentionally empty) */
export const SEED_KNOWLEDGE: Record<string, KnowledgeFact[]> = {};
