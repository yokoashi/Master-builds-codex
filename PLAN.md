# Master Build Codex — Implementation Plan

## Clarified Decisions

| Question | Answer |
|----------|--------|
| Web search | Anthropic built-in `web_search_20250305` tool |
| `mats` shape | `MaterialCategory[]` with `category + items[{name,location,notes?}]` |
| `weightInfo` shape | `{light,medium,heavy,note,thresholds?}` strings |
| `Variant.ph` | Full `Phase[]` (3 entries) — same schema as main build phases |
| `RefRow` fields | `n`=name, `i`=icon, `w`=weapon, `ap`=AP, `st`=status, `ar`=armor, `s`=style, `a`=accent |
| Generation | SSE streaming — 3 step events over a single POST to `/api/generate` |

---

## Project Structure

```
master-builds-codex/
├── app/
│   ├── (codex)/
│   │   ├── page.tsx                   # Server component — loads DB data, passes to shell
│   │   ├── layout.tsx                 # Cinzel + DM Sans fonts, dark bg, metadata
│   │   └── components/
│   │       ├── CodexShell.tsx         # "use client" — all UI state lives here
│   │       ├── GameSelector.tsx
│   │       ├── BuildSelector.tsx
│   │       ├── ActionBar.tsx
│   │       ├── CacheStatusBar.tsx
│   │       ├── TabBar.tsx
│   │       ├── MainBuildTab.tsx
│   │       ├── PhaseButtons.tsx
│   │       ├── NgCycleSelector.tsx
│   │       ├── LoadoutSelector.tsx
│   │       ├── StatBar.tsx
│   │       ├── ItemCard.tsx
│   │       ├── DamageBox.tsx
│   │       ├── SectionLabel.tsx
│   │       ├── MaterialsTab.tsx
│   │       ├── VariantTab.tsx         # Shared for Similar + Other OP
│   │       ├── VariantCard.tsx        # Full-phase expandable card
│   │       ├── QuickRefTab.tsx
│   │       ├── AddBuildModal.tsx      # Full AI / Semi-AI / Manual tabs
│   │       ├── SemiAiStatSteppers.tsx # Stat steppers + budget bar
│   │       ├── ManualBuildForm.tsx    # 3-stage manual form
│   │       ├── GenerationProgress.tsx # SSE step labels + spinner
│   │       └── ConfirmModal.tsx       # Reusable — never window.confirm
│   ├── api/
│   │   ├── generate/
│   │   │   └── route.ts               # POST — SSE streaming, 3-step pipeline
│   │   ├── update/
│   │   │   └── route.ts               # POST — patch update with web search
│   │   ├── builds/
│   │   │   ├── route.ts               # GET ?game=X, POST
│   │   │   └── [id]/
│   │   │       └── route.ts           # DELETE
│   │   ├── games/
│   │   │   └── route.ts               # GET, POST
│   │   ├── hidden/
│   │   │   ├── route.ts               # GET, POST
│   │   │   └── [gameKey]/[buildKey]/
│   │   │       └── route.ts           # DELETE (restore)
│   │   └── knowledge/
│   │       └── [gameKey]/
│   │           └── route.ts           # GET, PUT
│   └── globals.css
├── lib/
│   ├── types.ts                       # All TypeScript interfaces
│   ├── colors.ts                      # Color palette constants
│   ├── parse-json.ts                  # 4-strategy robust JSON parser
│   ├── knowledge.ts                   # extractFactsFromBuild, updateKnowledgeCache, buildKnowledgeBlock
│   ├── prompts.ts                     # All 3 step prompt templates + update prompt
│   ├── anthropic.ts                   # Anthropic client singleton + streaming helper
│   └── db.ts                          # Prisma client singleton
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── __tests__/
│   ├── parse-json.test.ts
│   ├── knowledge.test.ts
│   └── stat-budget.test.ts
├── CLAUDE.md
├── PLAN.md
├── DEPLOY.md
├── .env.example
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## TypeScript Interfaces (`lib/types.ts`)

```ts
// ── Items ──────────────────────────────────────────────────────────────────
interface Item {
  n: string;       // name
  ap?: string;     // attack power
  wt?: string;     // weight
  ef?: string;     // effect (accessories/spells)
  st?: string;     // status buildup
  eq: boolean;     // equipped (true) vs alternative (false)
  d: string;       // description
  loc: string;     // location
  up: string;      // upgrade path
  tip: string;     // tip
}

// ── Phase ──────────────────────────────────────────────────────────────────
interface Phase {
  name: string;
  range: string;
  stats: Record<string, number>;
  sn: string;                         // stat note (1-2 sentences)
  weapons: Item[];
  armor: Item[];
  acc: Item[];
  spells: Item[];
  dmg: { ps: string; sp: string; bs: string; n: string };
  ngCycles?: NgCycle[];               // only on phase 7
}

interface NgCycle {
  label: string;                      // "NG+1" | "NG+3" | "NG+5" | "NG+7"
  stats: Record<string, number>;
  notes: string;
}

// ── Build ──────────────────────────────────────────────────────────────────
interface Loadout {
  id: string;
  label: string;
  weaponWt: string;
  endReq: string;
  armor: string;
  pros: string;
  cons: string;
}

interface KeyItem {
  i: string;   // item name
  d: string;   // description + location
}

interface Variant {
  label: string;
  sub: string;
  icon: string;
  a: string;          // accent color hex
  cls: string;
  why: string;
  ph: Phase[];        // exactly 3 full Phase objects
  key: KeyItem[];     // 3+ key items
  steps: string[];    // 5+ progression steps
}

interface RefRow {
  n: string;    // build name
  i: string;    // icon emoji
  w: string;    // endgame weapon
  ap: string;   // attack power
  st: string;   // status
  ar: string;   // armor
  s: string;    // style summary
  a: string;    // accent color hex
}

interface Build {
  key: string;
  gameKey: string;
  label: string;
  sub: string;
  icon: string;
  accent: string;
  playstyle: string;
  cls: string;
  caps: string;
  weaponReq: string;
  loadouts: Loadout[] | null;
  phases: Phase[];              // always 7
  sim: Variant[];
  oth: Variant[];
  ref: RefRow[];
  isAI?: boolean;
}

// ── Game ───────────────────────────────────────────────────────────────────
interface MaterialItem {
  name: string;
  location: string;
  notes?: string;
}

interface MaterialCategory {
  category: string;
  items: MaterialItem[];
}

interface WeightInfo {
  light: string;
  medium: string;
  heavy: string;
  note: string;
}

interface Game {
  key: string;
  name: string;
  icon: string;
  statMax: number;
  endgameBudget: number;
  softCaps: Record<string, number | null>;
  mats: MaterialCategory[];
  weightInfo: WeightInfo;
  isCustom?: boolean;
}

// ── Knowledge Cache ────────────────────────────────────────────────────────
interface KnowledgeCacheEntry {
  gameKey: string;
  gameName: string;
  facts: string[];
  patchNote?: string | null;
  lastUpdated: number;     // Unix ms
}
```

---

## Database Schema (`prisma/schema.prisma`)

```prisma
datasource db {
  provider = "sqlite"         // change to "postgresql" for production
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// AI-generated builds (stored as JSON blobs)
model DynamicBuild {
  id        String   @id @default(cuid())
  gameKey   String
  buildKey  String
  data      Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([gameKey, buildKey])
}

// AI-generated custom games (e.g. Elden Ring added by user)
model DynamicGame {
  id        String   @id @default(cuid())
  gameKey   String   @unique
  data      Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Soft-deleted static seed builds
model HiddenStaticBuild {
  id       String @id @default(cuid())
  gameKey  String
  buildKey String

  @@unique([gameKey, buildKey])
}

// Per-game knowledge cache (facts extracted from generated builds + patch updates)
model KnowledgeCache {
  id          String   @id @default(cuid())
  gameKey     String   @unique
  gameName    String
  facts       Json     // string[] — capped at 200 per game
  patchNote   String?
  lastUpdated DateTime @default(now()) @updatedAt
}
```

> SQLite stores `Json` as serialized text. Postgres uses `jsonb` automatically when `provider = "postgresql"`.

---

## API Routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/builds?game=X` | — | All dynamic builds for a game |
| POST | `/api/builds` | — | Save a generated build |
| DELETE | `/api/builds/[id]` | — | Delete a dynamic build |
| GET | `/api/games` | — | All dynamic games |
| POST | `/api/games` | — | Save a new dynamic game |
| GET | `/api/hidden` | — | List hidden static build identifiers |
| POST | `/api/hidden` | — | Hide a static build `{gameKey, buildKey}` |
| DELETE | `/api/hidden/[gameKey]/[buildKey]` | — | Restore (un-hide) a static build |
| GET | `/api/knowledge/[gameKey]` | — | Get cache entry |
| PUT | `/api/knowledge/[gameKey]` | — | Merge new facts into cache |
| POST | `/api/generate` | — | SSE streaming build generation |
| POST | `/api/update` | — | Patch update + web search |

### `/api/generate` — SSE Event Protocol

Client sends:
```json
{
  "targetGame": "lotf",
  "customGameName": "",
  "mode": "ai" | "semi" | "manual",
  "text": "...",
  "referenceUrl": "...",
  "semiForm": { ... },
  "manualForm": { ... }
}
```

Server streams `data: <json>\n\n` events:
```
{type:"step_start", step:1, message:"Researching & generating early progression..."}
{type:"step_done",  step:1, partial:{label,sub,icon,accent,playstyle,cls,caps,weaponReq,loadouts,ph:[ph1,ph2,ph3]}}
{type:"step_start", step:2, message:"Generating late-game phases (extended thinking)..."}
{type:"step_done",  step:2, partial:{ph:[ph4,ph5,ph6,ph7]}}
{type:"step_start", step:3, message:"Generating similar builds & reference table..."}
{type:"step_done",  step:3, partial:{sim,oth,ref}}
{type:"saved",      buildId:"cuid", gameKey:"lotf", buildKey:"custom_xyz"}
{type:"error",      message:"..."}
```

After `saved`, client navigates to `/?game=<gameKey>&build=<buildKey>`.

---

## State Management

| State | Location | Rationale |
|-------|----------|-----------|
| `activeGame`, `activeBuild` | URL search params (`?game=X&build=Y`) | Deep links + browser back/forward |
| `activeTab` | URL search param (`&tab=main`) | Deep-linkable tabs |
| `phaseIndex`, `ngCycleIndex`, `loadoutId` | React state in `CodexShell` | Ephemeral UI; no benefit in URL |
| Modal open/close, progress events | React state in modal components | Local UI |
| All build/game/cache data | Server state — fetched in `page.tsx`, passed as props | DB is single source of truth |

Mutations call the API routes, then `router.refresh()` to re-fetch server data. No Zustand, no Context needed.

---

## Prompt Caching Strategy

The Anthropic SDK `cache_control: { type: "ephemeral" }` is applied to stable content blocks:

1. **System block** — JSON schema definition (same for all builds of a given game)
2. **Knowledge block** — The `KNOWN FACTS` block from `buildKnowledgeBlock()` (changes only when cache is updated, stable within a session)
3. **Game rules block** — statMax, softCaps, stat keys (stable per game)

Variable blocks (user description, mode constraints, reference URL) are **not** cached.

Cache control requires using the `messages` API with an array of content blocks rather than a plain string prompt.

---

## Extended Thinking (Step 2)

Step 2 uses:
```ts
thinking: { type: "enabled", budget_tokens: 5000 }
```

- Web search is **disabled** for Step 2
- The `thinking` content block is stripped before the `step_done` SSE event is streamed to the client (only the JSON text block is sent)
- Extended thinking requires `max_tokens >= budget_tokens + expected_output_tokens` — set `max_tokens: 8000` (5000 thinking + 3000 output)

---

## JSON Parser (`lib/parse-json.ts`)

Four strategies applied in order to each candidate text block:

1. **Parse as-is** — `JSON.parse(text)`
2. **Trim to first `{` / last `}`** — strip preamble and postamble
3. **Walk forward tracking depth + string state** — find longest balanced `{...}` object
4. **Repair truncation** — close unterminated strings, pop unclosed `{[` from a stack

Candidate order: last text block first → each block individually (longest first) → all blocks concatenated.

---

## Knowledge System (`lib/knowledge.ts`)

```ts
// Extract facts from a newly generated build
extractFactsFromBuild(build: Build): string[]

// Merge new facts into DB cache, dedup by 40-char prefix, cap at 200
updateKnowledgeCache(gameKey, gameName, newFacts, patchNote?): Promise<void>

// Format last 80 facts as a prompt prefix block
buildKnowledgeBlock(gameKey): Promise<string>
```

The knowledge block is injected into **all 3 step prompts**. Web search in Step 1 is skipped when the cache has 20+ facts AND no reference URL AND the game is not new.

---

## Seed Data (`prisma/seed.ts`)

### Lords of the Fallen
- `statMax: 75`, `endgameBudget: 155`
- `softCaps: { END: 40, STR: 50, AGI: 50, RAD: 50, INF: 50 }`
- Builds: **Crimson Reaper** (bleed STR/RAD) + **Wither Reaper** (umbral INF/RAD)
- Both builds: 7 full phases including `ngCycles` on phase 7 (NG+1/+3/+5/+7)
- `mats`: 4 upgrade tiers (Small Fragments → Deralium Chunks)
- `weightInfo`: light/medium/heavy + Crafter's Essence note

### Dark Souls
- `statMax: 99`, `endgameBudget: 200`
- `softCaps: { VIT: 50, ATT: 50, END: 40, STR: 40, DEX: 40, INT: 50, FTH: 50 }`
- Build: **Sharp Uchigatana** (DEX katana)
- `mats`: 4 titanite tiers
- `weightInfo`: 25%/50%/100% roll thresholds

---

## Component Breakdown

### `page.tsx` (Server Component)
- Reads `searchParams.game` and `searchParams.build`
- Fetches in parallel: `DynamicBuild[]`, `DynamicGame[]`, `HiddenStaticBuild[]`, `KnowledgeCache[]`
- Merges with static seed data, filtering hidden builds
- Passes `initialData`, `initialGame`, `initialBuild` to `<CodexShell>`

### `CodexShell` (Client Component)
- URL param sync via `useSearchParams` + `router.push`
- Renders game selector → build selector → action bar → cache bar → tab bar → tab content
- Opens modals via local state flags
- After mutations: calls `router.refresh()` to re-fetch server data

### `AddBuildModal`
- Mode pills: Full AI / Semi-AI / Manual
- All three modes share: target game picker, custom game name input, reference URL field
- **Full AI**: plain textarea
- **Semi-AI**: `<SemiAiStatSteppers>` — grid of stat steppers, budget bar (green → accent → red), soft-cap checkmarks
- **Manual**: `<ManualBuildForm>` — 3-stage tabs, stats grid, weapon/armor/acc/spell rows with +/− buttons
- On submit: opens SSE connection, renders `<GenerationProgress>`

### `GenerationProgress`
- Listens to SSE stream
- Shows step labels: "Researching… → Thinking… → Variants…"
- Displays spinner + elapsed time
- On `saved` event: calls `router.push(?game=X&build=Y)`, closes modal

### `StatBar`
- Horizontal fill bar, accent color
- Soft cap marker: white vertical tick at `(softCap/statMax)*100%` position
- Previous phase ghost bar in `accent + 33` opacity
- Green `+N` gain badge if value increased

### `ItemCard`
- Collapsed: icon dot (accent if equipped, gray if alt), name, AP, status badge, weight, effect snippet, expand arrow
- Expanded: description paragraph, then LOCATION / UPGRADE / TIPS blocks with left border

### `VariantCard`
- Self-contained: has its own phase selector (3 tabs: Early/Mid/End)
- Each phase renders full `Item[]` arrays via `<ItemCard>`
- Expandable sections for Key Items and Progression Steps

### `ConfirmModal`
- Props: `title`, `description`, `confirmLabel`, `onConfirm`, `onCancel`
- Backdrop click cancels
- Red confirm button for destructive, accent for neutral

---

## Auth Approach

**Skipped for v1.** Single-user deployment, no sessions. All data is global to the instance. Auth can be layered on top in v2 (NextAuth + per-user row isolation).

---

## Deployment Plan

Full instructions in `DEPLOY.md`. Summary:

1. Push to GitHub; connect repo to Vercel
2. In Vercel dashboard → Environment Variables:
   - `ANTHROPIC_API_KEY` = your key
   - `DATABASE_URL` = Neon or Vercel Postgres connection string
3. In `prisma/schema.prisma`: change `provider = "sqlite"` to `provider = "postgresql"`
4. In Vercel Build Command: `prisma migrate deploy && prisma db seed && next build`
5. Enable preview deployments for all branches
6. Production deployment on push to `main`

---

## Build Phases

### Phase 1 — Scaffold + CLAUDE.md + Seed Data + Read-only UI
- `npx create-next-app@latest` with TypeScript + Tailwind
- Install deps: `@anthropic-ai/sdk`, `prisma`, `@prisma/client`
- Write `lib/types.ts`, `lib/colors.ts`
- Write `prisma/schema.prisma` + `prisma/seed.ts` (full LotF + DS seed data)
- Write `CLAUDE.md`
- Build full read-only UI: all components, all tabs, static data only (no DB, no AI)
- URL param routing works, all 5 tabs render correctly

### Phase 2 — Persistence Layer
- `prisma migrate dev --name init`
- `prisma db seed`
- `lib/db.ts` singleton
- All API routes (builds, games, hidden, knowledge)
- `page.tsx` fetches from DB + merges with seed
- Delete build → API → DB → `router.refresh()`
- Reset button restores hidden + removes dynamic builds

### Phase 3 — AI Generation API Routes
- `lib/parse-json.ts` + tests
- `lib/knowledge.ts` + tests
- `lib/prompts.ts` prompt templates
- `lib/anthropic.ts` SSE helper + prompt caching setup
- `POST /api/generate` — 3-step SSE pipeline with extended thinking on step 2
- `GenerationProgress` component consuming the SSE stream
- Full AI + Semi-AI + Manual modes working end-to-end

### Phase 4 — Knowledge Cache + Patch Update
- Knowledge extraction runs server-side after each successful generation
- `PUT /api/knowledge/[gameKey]` merges and persists facts
- `POST /api/update` — web search for patch notes, merges into cache
- Cache status bar shows fact count + patch note
- Update button shows ⟳ Checking… → ✓ Updated (v1.x) — N changes cached

### Phase 5 — Import/Export + Polish + Deploy Config
- Export: generate JSON blob + `<a download>` trigger
- Import: `FileReader` → parse → POST to each relevant API route
- `DEPLOY.md`
- `.env.example`
- `next.config.ts` tuning (image domains, function timeout)
- Final accessibility pass, mobile layout check
- Stat budget enforcement tests
