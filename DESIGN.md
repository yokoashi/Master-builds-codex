# Master Build Codex — Design Reference

> This file is for Claude to read before making UI or architectural changes.
> Keep it up to date whenever significant design decisions are made.

---

## What This App Is

A multi-game soulslike build guide with:
- **AI-generated builds** (3-step pipeline via Claude / Perplexity / OpenRouter)
- **Persistent SQLite storage** (sql.js WASM, zero native binaries)
- **Knowledge cache** (per-game codex of item facts that seeds AI prompts)
- **6-phase build structure** per build (Early / Early-Mid / Mid / Late / End / NG+)

Runs as both a **web app** (Vite + Express dev server) and a packaged **Electron desktop app**.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS v3 |
| Routing | Wouter (hash-based: `/#/`) — no Next.js |
| Data fetching | TanStack Query v5 (`useQuery` / `useMutation`) |
| Backend | Express 5 (ESM, tsx dev / esbuild CJS prod) |
| Database | sql.js (SQLite as WASM — no native binaries) |
| AI | Anthropic SDK (Claude), OpenAI-compat (Perplexity, OpenRouter) |
| Desktop | Electron 33, electron-builder |

---

## File Structure (what each file does)

```
client/src/
  App.tsx                   Router setup (hash-based via wouter)
  index.css                 ALL colors as CSS custom properties — never hardcode hex in components
  pages/
    CodexPage.tsx           Only page — sidebar + tab shell + all modal wiring
  components/
    BuildTab.tsx            "Your Build" tab — phase tabs, stat bars, item cards
    ProgressionTab.tsx      "Progression" tab — phase timeline, stat diffs, questlines
    MaterialsTab.tsx        "Materials" tab — item index by category with questline steps
    ProsConsTab.tsx         "Pros & Cons" tab
    QuickRefTab.tsx         "Quick Ref" tab — compact table of all items
    ItemCard.tsx            Expandable item card — used in BuildTab; shows steps if present
    StatBar.tsx             Stat bar with soft-cap markers
    VariantCard.tsx         Collapsible variant build card
    AddBuildModal.tsx       AI generation modal (Full / Semi-AI / Manual modes)
    DeleteModal.tsx         Confirmation modal (NEVER use window.confirm)
  lib/
    queryClient.ts          TanStack Query client + apiRequest() helper
    utils.ts                cn(), hexToRgba(), slugify()

server/
  index.ts                  Express server entry + migration runner (runMigrations)
  routes.ts                 All API routes + AI generation pipeline
  storage.ts                SQLiteStorage class implementing IStorage
  db.ts                     sql.js init (handles ESM dev + esbuild CJS Electron)
  knowledge.ts              Knowledge cache: extract/update/build/count
  parse-json.ts             4-strategy JSON parser (handles truncated AI responses)

shared/
  schema.ts                 Drizzle table definitions + Zod schemas
  types.ts                  TypeScript interfaces used by both client and server
  seed-data.ts              Static seed games + builds (Dark Souls: Remastered etc.)

script/
  build.ts                  esbuild + Vite production build script

electron/
  main.ts                   Electron main process — spawns Express server as child process
  preload.ts                Electron preload (contextIsolation: true)
```

---

## Color System

**Never hardcode hex colors in components.** All colors are CSS custom properties defined in `client/src/index.css`:

| Variable | Usage |
|----------|-------|
| `--color-bg` | Page background |
| `--color-card` | Sidebar, modals, card backgrounds |
| `--color-card-hi` | Elevated card surface (item cards, expanded panels) |
| `--color-card-2` | Secondary surface (badges, inputs) |
| `--color-text` | Default body text |
| `--color-bright` | Headings, item names, highlighted text |
| `--color-dim` | Labels, metadata, secondary text |
| `--color-dim2` | De-emphasised — weights, slot names |
| `--color-crimson` | Primary action color (buttons, errors) |
| `--color-gold` | Accent highlights, AI badge |
| `--color-purple` | Effect/passive text on items |

Each build has its own `accent` hex (e.g. `#8b4a8a`). Use `hexToRgba(accent, 0.08)` for translucent tinted backgrounds.

---

## Data Model

### Build
```typescript
{
  key: string            // kebab-case unique ID
  gameKey: string        // e.g. "ds1r"
  label: string          // "Pure Magic Sorcerer"
  sub: string            // "Vinheim Dragon School Arcane Master"
  icon: string           // single emoji
  accent: string         // hex color for this build's theme
  playstyle: string      // 2-3 sentence overview
  cls: string            // starting class
  caps: string[]         // ["INT 50", "END 40"] — soft cap targets
  weaponReq: string[]    // ["STR 10", "DEX 14"]
  loadouts: Loadout[] | null
  phases: Phase[]        // 6 phases: Early Game, Early-Mid Game, Mid Game, Late Game, End Game, NG+
  pros: string[]
  cons: string[]
  ref: RefRow[]          // quick-ref table rows
  isAI?: boolean
}
```

### Phase
```typescript
{
  name: string           // "Early Game" | "Early-Mid Game" | "Mid Game" | "Late Game" | "End Game" | "NG+"
  range: string          // "SL 1-20"
  stats: Record<string, number>  // { VIT: 14, ATT: 8, ... }
  sn: string             // strategy note (2-3 sentences)
  weapons: Item[]
  armor: Item[]
  acc: Item[]            // rings, accessories, talismans
  spells: Item[]
  dmg: { ps: number; sp: number; bs: number; n: string }
  ngCycles?: NgCycle[]   // only on NG+ phase
}
```

### Item
```typescript
{
  n: string              // item name
  ap?: number            // attack power / AR
  wt?: number            // weight
  ef?: string            // passive effect
  st?: string            // status buildup (Bleed, Poison, etc.)
  eq: string             // equip slot ("Right Hand", "Chest", "Ring", etc.)
  d: string              // role in this build
  loc: string            // where/how to obtain
  up: string             // upgrade path ("Standard +15", "Lightning +5", etc.)
  tip: string            // build-specific tip
  lore?: string          // short lore blurb
  durability?: number    // base durability stat
  steps?: string[]       // step-by-step questline guide — only for complex acquisitions
                         // e.g. ["Free Logan from Sen's Fortress", "Buy catalyst from him"]
                         // OMIT (null/undefined) for simple drops or merchant purchases
}
```

---

## Tab Structure

`CodexPage.tsx` renders a 5-tab bar:

| Tab | Component | Description |
|-----|-----------|-------------|
| Your Build | `BuildTab` | Phase selector + stat bars + expandable item cards |
| Progression | `ProgressionTab` | Phase timeline with stat diffs, new gear per phase, questline section |
| Materials | `MaterialsTab` | Item index by category (Weapons / Armor / Rings / Spells) with questline steps |
| Pros & Cons | `ProsConsTab` | Two-column list |
| Quick Ref | `QuickRefTab` | Compact sortable table |

### BuildTab phase navigation
- 6 phases: Early Game (I) → Early-Mid Game (II) → Mid Game (III) → Late Game (IV) → End Game (V) → NG+
- Phase label uses Roman numerals I–V for non-NG+ phases; NG+ detected by `/ng\+|new.?game/i`
- Each phase has its own item cards (via `ItemCard`) with expand/collapse
- Soft-cap markers shown in `StatBar`

### ProgressionTab
- Vertical timeline with spine + dots
- Per phase: stat targets (diffs ≥ 3 points from previous phase), new items, strategy note
- Bottom section: all questline items (items with `steps` OR complex `loc` text)
- Questline detection: `steps?.length > 0` OR loc contains "quest/rescuing/freeing/talk to" or loc > 90 chars with "after"

### MaterialsTab
- Sections: Weapons, Armor, Rings & Accessories, Spells
- Each item is a collapsible row (expand for details)
- Questline items get a "QUESTLINE" badge; shows numbered steps if `item.steps` exists
- Bottom: Upgrade Materials list + Equip Load Tiers (from game data)

---

## AI Generation Pipeline

3-step async pipeline in `server/routes.ts`:

```
Step 1 → /api/generate/step1
  Generates: metadata (key, label, cls, caps, etc.) + phase1 (Early) + phase2 (Early-Mid) + phase3 (Mid)
  System prompt: full codex block (cacheable) + instruction block
  Output: partialBuild with phase1 + phase2 + phase3

Step 2 → /api/generate/step2
  Generates: phase4 (Late Game) + phase5 (End Game) + phase6 (NG+) with ngCycles
  System prompt: full codex block (cache HIT from step1) + instruction block
  Output: { phase4, phase5, phase6 }

Step 3 → /api/generate/step3
  Generates: pros, cons, ref (quick-ref rows)
  System prompt: LIGHT — no codex (build data already in user message)
  Non-fatal: if this fails, empty arrays are used
  Output: { pros, cons, ref }

Finalize → /api/generate/finalize
  Assembles all steps into Build (phases: [phase1..phase6].filter(Boolean)), saves to DB
  Extracts knowledge facts into cache
```

### Cost Optimisation (important — don't regress this)
The codex can be 100K+ chars (expensive tokens). Two techniques keep cost down:

**1. Prompt cache split** — `callAI` splits the Claude system prompt at the `"\n\nYou are an expert"` boundary into:
- Block 1: codex only, `cache_control: ephemeral` — **identical** across all steps for same game
- Block 2: instruction text, no cache_control — varies per step
After step1 caches the codex, step2 gets a cache-read hit (~10% cost). This saves ~60% of codex input cost.

**2. Light prompt for step3** — pros/cons/ref don't need the codex. `buildSystemPrompt(light=true)` omits it entirely.

**`CODEX_CHAR_LIMITS`** in `knowledge.ts`:
- claude: 150,000 chars (~37K tokens)
- pplx: 80,000 chars
- openrouter: 40,000 chars

### JSON Robustness
- AI often returns truncated JSON — `parse-json.ts` tries 4 strategies:
  1. Direct parse
  2. Brace extract (first `{` to last `}`)
  3. **Repair** (closes unclosed braces — runs BEFORE depth-walk to preserve outer build object)
  4. Depth-walk (finds longest balanced sub-object — last resort)
- `normaliseStep1` / `normaliseStep2` handle 6+ structural variants AIs use instead of the exact schema
- Bare-phase detection: if the parsed top-level object looks like a phase (`sn`+`weapons`+`dmg` keys), it's promoted to `phase1` rather than erroring

### Creative Naming Rules (enforced in step1 prompt)
- `label`: evocative proper title rooted in game lore — NOT a stat description. e.g. "Voidwalker", "The Iron Heretic", "Daughter of Chaos"
- `sub`: poetic subtitle — archetype, lore fragment, or thematic phrase. e.g. "Keeper of the First Flame"
- `accent`: dark hex matching the build theme (deep crimson for fire, dark violet for sorcery, etc.)
- Bad examples explicitly flagged in prompt: "Pure STR Build", "Magic Sorcerer Build"

---

## Electron Architecture

```
Electron main process (electron/main.ts)
  → spawns: node dist/index.cjs (Express server as child process)
  → polls HTTP until server responds
  → creates BrowserWindow loading http://localhost:5000
  → on quit: kills server process

Express server (dist/index.cjs)
  → serves Vite-built client from dist/public
  → handles all /api/* routes
  → reads DB_PATH from env (userData/codex.db in packaged app)
```

### ESM vs CJS gotcha
- Dev: tsx runs server as ESM — `import.meta.url` works, `require` needs `createRequire`
- Prod: esbuild bundles to CJS — `import.meta` becomes `{}`, so `import.meta.url` is `undefined`
- Fix in `db.ts`: `const _metaUrl = (import.meta as {url?:string}).url` — falls back to `process.argv[1]`

---

## UI Patterns

### Component conventions
- All data from React Query + `/api` routes — no localStorage, no sessionStorage
- `apiRequest<T>(method, path, body?)` from `lib/queryClient.ts` for all fetches
- Modal pattern: `DeleteModal` for confirmations — **never** `window.confirm`
- All list state is server-authoritative — invalidate `queryClient` after mutations

### Styling conventions
- Tailwind utility classes for layout + spacing
- CSS custom properties (`var(--color-*)`) for all colors
- `hexToRgba(accent, alpha)` for tinted surfaces using the build's accent color
- `font-display` class for headings (tracks wide, uppercase feel)
- Expandable cards: border changes to `hexToRgba(accent, 0.25)` + subtle glow when open

### Section headers pattern
```tsx
<div className="flex items-center gap-2 mb-2">
  <span className="text-base">{icon}</span>
  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-dim)" }}>
    Section Name
  </span>
  <span className="text-[10px] px-1.5 py-px rounded ml-1"
    style={{ backgroundColor: "var(--color-card-2)", color: "var(--color-dim)" }}>
    {count}
  </span>
  <div className="flex-1 h-px ml-1" style={{ backgroundColor: "var(--color-card-2)" }} />
</div>
```

### Phase timeline pattern (ProgressionTab)
- Vertical spine: absolute `left-2.5 top-3 bottom-3 w-px` with `hexToRgba(accent, 0.25)`
- Phase dots: absolute `-left-6` circle, filled accent for first phase, hollow for rest
- Phase cards: border opacity decreases with phase index (most prominent = phase 1)

---

## Known Constraints

- **No `localStorage`/`sessionStorage`** — blocked in deployment iframe
- **No `window.confirm/alert/prompt`** — blocked; use `<DeleteModal>`
- **`max_tokens` minimum 8000** on all AI calls — never lower
- **No literal `...` in AI prompts** — use `<phase2>` style markers
- **sql.js WASM** must be in `asarUnpack` in electron-builder config to load from Electron
- **ESM/CJS dual mode** — any server file using `import.meta.url` needs the `_metaUrl` guard
- **Don't regress the prompt cache split** — the codex block must stay identical across step1/step2 for cache hits to work. Any change that appends game-specific data to the codex block will break it.

### Env Var Names (must match between electron/main.ts and server/routes.ts)
| Config key | Env var set by Electron | Env var read by routes.ts |
|-----------|------------------------|--------------------------|
| CLAUDE_API_KEY | `CLAUDE_API_KEY` | `process.env.CLAUDE_API_KEY` |
| PERPLEXITY_API_KEY | `PERPLEXITY_API_KEY` | `process.env.PERPLEXITY_API_KEY` (fallback: PPLX_API_KEY) |
| OPEN_ROUTER_API_KEY | `OPEN_ROUTER_API_KEY` | `process.env.OPEN_ROUTER_API_KEY` (fallback: OPENROUTER_API_KEY) |

---

## Planned Improvements (TODO)

- [ ] **Questline data quality**: Most existing builds have `steps: null` — questline steps only appear in newly-generated builds. Consider a `/api/update` pass to enrich existing items.
- [ ] **Phase customisation**: Let users edit phase stats/items in-app without regenerating
- [ ] **Build comparison**: Side-by-side phase view for two builds of the same game
- [ ] **Search / filter**: Filter builds by weapon type, playstyle, class
- [ ] **Game-specific stat names**: Currently hardcoded to DS1R stat labels (VIT/ATT/END etc.) — needs abstraction for other souls games
- [ ] **Progression tab enrichment**: Show boss gates between phases (e.g. "Defeat Sif to reach Dukes Archives")
- [ ] **Materials quantity**: Add recommended quantities for upgrade materials (e.g. "15x Titanite Shard")
- [ ] **Mobile layout**: Sidebar collapses to bottom nav on small screens
