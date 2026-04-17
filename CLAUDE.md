# Master Build Codex — CLAUDE.md

## Project Overview

Multi-game soulslike build guide with AI-powered build generation, persistent storage, and a knowledge cache system.

**Stack:** Express + Vite + React + TypeScript + Tailwind CSS + Drizzle ORM (SQLite) + Anthropic SDK

---

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── App.tsx                  # Router setup (hash-based)
│   │   ├── index.css                # Custom dark theme palette
│   │   ├── components/
│   │   │   ├── BuildTab.tsx         # Main build view (phases, stats, items)
│   │   │   ├── MaterialsTab.tsx     # Materials & weight info
│   │   │   ├── SimilarTab.tsx       # Similar builds
│   │   │   ├── OtherTab.tsx         # Other OP builds
│   │   │   ├── QuickRefTab.tsx      # Quick reference table
│   │   │   ├── ItemCard.tsx         # Expandable item with loc/up/tip
│   │   │   ├── StatBar.tsx          # Stat bar with soft cap markers
│   │   │   ├── VariantCard.tsx      # Collapsible variant build card
│   │   │   ├── AddBuildModal.tsx    # AI generation (Full/Semi/Manual)
│   │   │   └── DeleteModal.tsx      # In-app confirm modal (never window.confirm)
│   │   ├── pages/
│   │   │   └── CodexPage.tsx        # Main page with all selectors + tabs
│   │   └── lib/
│   │       ├── queryClient.ts       # TanStack Query + apiRequest helper
│   │       └── utils.ts             # cn, hexToRgba, slugify, etc.
├── server/
│   ├── index.ts                     # Express server + migration runner
│   ├── routes.ts                    # All API routes
│   ├── storage.ts                   # SQLiteStorage implementing IStorage
│   ├── db.ts                        # Drizzle + better-sqlite3 setup
│   ├── knowledge.ts                 # Knowledge cache: extract/update/build
│   └── parse-json.ts                # 4-strategy JSON parser with tests
├── shared/
│   ├── schema.ts                    # Drizzle table definitions + Zod schemas
│   ├── types.ts                     # TypeScript interfaces (Build, Game, Phase, etc.)
│   └── seed-data.ts                 # Static seed games + builds
└── dev.db                           # SQLite database (auto-created on startup)
```

---

## Code Style Rules

- **Prefer composition.** Small, focused components. Colocate components with their feature.
- **No client state for persisted data.** Use React Query + backend API. No `localStorage`, `sessionStorage`, or `indexedDB`.
- **URL params for selection state.** `?game=lotf&build=crimson-reaper` — makes deep links work.
- **In-app modals only.** Never `window.confirm`, `window.alert`, or `window.prompt`. All confirmations use `<DeleteModal>` pattern.
- **Server components by default** — this is React (not Next.js), so: minimize client-side state, prefer data from React Query.
- **TypeScript strict mode.** No `any` without a comment explaining why.
- **All prompts use placeholders** like `<phase2>`, `<phase3>` — never literal `...` ellipsis.
- **max_tokens on all Claude calls: 8000.** Never lower.

---

## Running the Project

```bash
# Development
npm run dev           # Starts Express + Vite on port 5000

# Type checking
npm run check

# Production build
npm run build
npm start
```

---

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/games | All games (seed + dynamic) |
| GET | /api/builds?gameKey=X | All builds (seed + dynamic, minus hidden) |
| DELETE | /api/builds/:key | Delete (or hide) a build |
| GET | /api/knowledge/:gameKey | Knowledge cache status |
| POST | /api/generate/step1 | Metadata + phases 1-3 |
| POST | /api/generate/step2 | Phases 4-7 + NG+ cycles (extended thinking) |
| POST | /api/generate/step3 | Sim, oth, ref (graceful fallback) |
| POST | /api/generate/finalize | Save build + extract knowledge facts |
| POST | /api/update | Patch update → knowledge cache |
| POST | /api/export | Export all builds as JSON download |
| POST | /api/import | Import builds from JSON |

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `dynamic_builds` | AI-generated + imported builds (JSON blob) |
| `dynamic_games` | Custom AI-generated games (JSON blob) |
| `hidden_static_builds` | Seed builds the user has deleted |
| `knowledge_cache` | Per-game fact cache (up to 200 facts, JSON) |

Tables are created via `runMigrations()` in `server/index.ts` on startup (no migration files needed).

---

## AI Generation Pipeline

Three-step pipeline in `server/routes.ts`:

1. **Step 1** — metadata + loadouts + phases 1–3. Web search enabled (unless 20+ cached facts + no referenceUrl).
2. **Step 2** — phases 4–7 + NG+ cycles. Extended thinking enabled (`budget_tokens: 5000`). Web search disabled.
3. **Step 3** — sim (2), oth (2), ref (5). Web search disabled. Graceful fallback to empty arrays if this step fails.

All prompts:
- Start with `"CRITICAL OUTPUT FORMAT: Your ENTIRE response must be a single JSON object. Start with { and end with }."`
- Use `<phase2>` placeholders, never `...`
- Include the knowledge block as the first section of the system prompt
- Use `cache_control: { type: "ephemeral" }` on the system prompt text block

---

## Knowledge Cache System

`server/knowledge.ts`:

- **extractFactsFromBuild(build)** — walks all 7 phases, extracts WEAPON/ARMOR/RING/SPELL items with name/location/upgrade/AP/status/effect
- **updateKnowledgeCache(gameKey, gameName, newFacts, patchNote?)** — merges with dedup by 40-char prefix, caps at 200 facts
- **buildKnowledgeBlock(gameKey)** — formats last 80 facts as prompt prefix
- **shouldSkipWebSearch(gameKey, referenceUrl?, isNewCustomGame?)** — returns true if 20+ cached facts AND no referenceUrl AND not a new custom game

---

## What NOT To Do

- ❌ No `localStorage`, `sessionStorage`, `window.storage` — they are blocked in the deployment iframe
- ❌ No `window.confirm`, `window.alert`, `window.prompt` — also blocked; use in-app modals
- ❌ No `max_tokens` below 8000 on any Claude call
- ❌ No literal `...` ellipsis in prompts — use `<phase2>` style markers
- ❌ No `any` TypeScript without a comment
- ❌ Don't hardcode hex colors in components — use the CSS custom property palette from `index.css`
- ❌ Don't fetch from raw `fetch()` in React — use `apiRequest()` from `lib/queryClient.ts`

---

## Deployment

See `DEPLOY.md` for step-by-step Vercel deployment instructions.
