/**
 * wiki-fetch.ts
 *
 * Dynamic wiki source discovery and parsing for /api/learn.
 * Runs as a pre-pass before the AI category queries so every game —
 * not just the seeded ones — starts with real item names in the cache.
 *
 * Source priority order:
 *   1. Trello (public board JSON API — exact card text, zero hallucination)
 *   2. Fextralife wiki (souls/elden-style games — best structured data)
 *   3. Fandom / Gamepedia (broadest coverage)
 *   4. Google Sites / Notion / community docs
 *   5. Reddit pinned/wiki posts (last resort)
 *
 * Returns KnowledgeFact[] ready to merge into knowledge_cache.
 */

import type { KnowledgeFact } from "@shared/types";
import Perplexity from "@perplexity-ai/perplexity_ai";

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface PplxResponse {
  choices: Array<{ message: { content: string | null | unknown[] } }>;
}

function extractText(r: PplxResponse): string {
  const c = r.choices?.[0]?.message?.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return c
      .map((ch) =>
        typeof (ch as { text?: string }).text === "string"
          ? (ch as { text: string }).text
          : ""
      )
      .join("");
  }
  return "";
}

// Safe fetch with timeout + size cap (no native AbortSignal.timeout in all Node versions)
async function safeFetch(url: string, timeoutMs = 12000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MasterBuildCodex/1.0)" },
    });
    if (!resp.ok) return "";
    // Cap at 400 KB to keep parsing fast
    const reader = resp.body?.getReader();
    if (!reader) return await resp.text();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      total += value.byteLength;
      if (total > 400_000) break;
    }
    reader.cancel().catch(() => { /* ignore */ });
    return new TextDecoder().decode(
      chunks.reduce((a, b) => {
        const merged = new Uint8Array(a.length + b.length);
        merged.set(a);
        merged.set(b, a.length);
        return merged;
      }, new Uint8Array(0))
    );
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

// ─── Source discovery ─────────────────────────────────────────────────────────

export interface DiscoveredSource {
  url: string;
  type: "trello" | "fextralife" | "fandom" | "generic";
  label: string;
}

/**
 * Ask sonar-pro (live web search) to find the best item-list sources for a game.
 * Returns up to 3 ranked sources.
 */
export async function discoverSources(
  gameName: string,
  pplx: Perplexity
): Promise<DiscoveredSource[]> {
  const prompt = `Find the best online sources for a complete item/weapon/armor/accessory list for the game "${gameName}".

Search for all of these and return the best URLs:
1. "${gameName}" trello board (common for Roblox / early-access games)
2. "${gameName}" fextralife wiki weapons list
3. "${gameName}" fandom wiki items
4. "${gameName}" wiki items guide

Reply in this EXACT format (one line per source, up to 3):
SOURCE: <full URL> | TYPE: <trello|fextralife|fandom|generic> | LABEL: <short description>

Only include URLs that actually contain item lists. Skip homepage links or search pages.
Prefer pages that list many items in a table or list format.`;

  try {
    const resp = await pplx.chat.completions.create({
      model: "sonar-pro",
      stream: false as const,
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const text = extractText(resp as PplxResponse);
    const sources: DiscoveredSource[] = [];

    for (const line of text.split("\n")) {
      const m = line.match(
        /SOURCE:\s*(https?:\/\/\S+)\s*\|\s*TYPE:\s*(trello|fextralife|fandom|generic)\s*\|\s*LABEL:\s*(.+)/i
      );
      if (m) {
        sources.push({
          url: m[1].trim(),
          type: m[2].toLowerCase() as DiscoveredSource["type"],
          label: m[3].trim(),
        });
      }
      if (sources.length >= 3) break;
    }

    // Sort: Trello first (most structured), then fextralife, fandom, generic
    const ORDER: Record<DiscoveredSource["type"], number> = {
      trello: 0,
      fextralife: 1,
      fandom: 2,
      generic: 3,
    };
    sources.sort((a, b) => ORDER[a.type] - ORDER[b.type]);
    return sources;
  } catch {
    return [];
  }
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

/**
 * Parse a public Trello board via the JSON API.
 * Converts card titles and descriptions into KnowledgeFact entries.
 */
async function parseTrello(
  url: string,
  gameKey: string
): Promise<KnowledgeFact[]> {
  // Extract board ID from URL: trello.com/b/{boardId}/...
  const boardMatch = url.match(/trello\.com\/b\/([A-Za-z0-9]+)/);
  if (!boardMatch) return [];

  const boardId = boardMatch[1];
  const jsonUrl = `https://trello.com/b/${boardId}.json`;
  const raw = await safeFetch(jsonUrl, 20000);
  if (!raw) return [];

  let board: {
    lists?: Array<{ id: string; name: string; closed?: boolean }>;
    cards?: Array<{
      name: string;
      desc?: string;
      idList: string;
      closed?: boolean;
    }>;
  };
  try {
    board = JSON.parse(raw);
  } catch {
    return [];
  }

  const lists = board.lists ?? [];
  const cards = board.cards ?? [];
  const facts: KnowledgeFact[] = [];

  // Build a map of list id → list name for context
  const listNames = new Map<string, string>(
    lists.filter((l) => !l.closed).map((l) => [l.id, l.name])
  );

  // Heuristic: classify list name to a KnowledgeFact type
  function classifyList(listName: string): KnowledgeFact["type"] | null {
    const n = listName.toLowerCase();
    if (/weapon|sword|blade|katana|axe|gun|rifle|bow|lance|dagger|knife|hammer|spear|fist|claw/.test(n)) return "WEAPON";
    if (/shield|block|offhand/.test(n)) return "SHIELD";
    if (/staff|wand|catalyst|seal|tome|grimoire|focus/.test(n)) return "CATALYST";
    if (/armor|armour|helm|chest|set|outfit|clothing|gear/.test(n)) return "ARMOR";
    if (/ring|accessory|amulet|talisman|charm|pendant|badge|medal/.test(n)) return "RING";
    if (/spell|magic|sorcery|skill|ability|technique|art|jutsu|zanpakuto|bankai|shikai/.test(n)) return "SPELL";
    if (/buff|support|heal|utility|passive/.test(n)) return "BUFF";
    if (/boss|enemy|mob|raid|dungeon/.test(n)) return "BUILD";
    if (/item|material|drop|reward|consumable|upgrade|evolution/.test(n)) return "ITEM";
    if (/mechanic|system|guide|info|how/.test(n)) return "MECHANIC";
    return null;
  }

  for (const card of cards) {
    if (card.closed) continue;
    const listName = listNames.get(card.idList) ?? "";
    const type = classifyList(listName);
    if (!type) continue;

    const name = card.name.trim();
    if (!name || name.length < 2 || name.length > 120) continue;

    // Extract any useful numbers/text from the description
    const descSnippet = (card.desc ?? "").slice(0, 200).replace(/\n/g, " ").trim();
    const raw = `${type}: ${name}${descSnippet ? ` | ${descSnippet}` : ""} | Loc:${listName}`;

    facts.push({ type, name, location: listName, raw });
  }

  return facts;
}

/**
 * Parse a Fextralife or Fandom wiki page.
 * These pages list items in <li>, <tr>, or heading patterns — we extract
 * item names via simple heuristics (no HTML parser needed).
 */
async function parseWikiPage(
  url: string,
  gameKey: string,
  sourceType: "fextralife" | "fandom" | "generic"
): Promise<KnowledgeFact[]> {
  const html = await safeFetch(url, 15000);
  if (!html) return [];

  const facts: KnowledgeFact[] = [];

  // Strip HTML tags, decode entities
  const stripHtml = (s: string) =>
    s
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .replace(/&#\d+;/g, "")
      .replace(/\s+/g, " ")
      .trim();

  // Infer type from URL path
  function inferTypeFromUrl(u: string): KnowledgeFact["type"] {
    const p = u.toLowerCase();
    if (/shield|offhand/.test(p)) return "SHIELD";
    if (/catalyst|staff|seal|wand/.test(p)) return "CATALYST";
    if (/armor|armour|helm|chest/.test(p)) return "ARMOR";
    if (/ring|accessory|talisman|amulet/.test(p)) return "RING";
    if (/spell|sorcery|incantation|pyro|miracle/.test(p)) return "SPELL";
    if (/buff|support|heal/.test(p)) return "BUFF";
    if (/boss|enemy/.test(p)) return "BUILD";
    return "WEAPON";
  }

  const urlType = inferTypeFromUrl(url);

  // Strategy 1: extract <li> and <td> text, filter for item-like lines
  const cellPattern = /<(?:li|td|th)[^>]*>([\s\S]*?)<\/(?:li|td|th)>/gi;
  let match: RegExpExecArray | null;
  const seen = new Set<string>();

  while ((match = cellPattern.exec(html)) !== null) {
    const text = stripHtml(match[1]);
    // Item names are typically 3-80 chars, mixed case, no purely numeric
    if (
      text.length < 3 ||
      text.length > 80 ||
      /^\d+$/.test(text) || // pure number
      /^(level|stat|str|dex|int|fth|arc|vig|end|agl|atk|def|weight|location|description|effect|name|type|upgrade|notes?|source|how to|where|wiki|edit|sign in|log in|search|navigation|contents?|categories?)$/i.test(text)
    ) continue;

    // Require at least one uppercase letter (item names have capitals)
    if (!/[A-Z]/.test(text)) continue;
    // Reject pure navigation text
    if (/^\s*(home|back|next|prev|top|menu|header|footer)\s*$/i.test(text)) continue;

    const name = text.slice(0, 80).trim();
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());

    const raw = `${urlType}: ${name} | Loc:${new URL(url).pathname.split("/").pop() ?? "wiki"}`;
    facts.push({ type: urlType, name, raw });
  }

  // Strategy 2: For Fextralife specifically, also grab h2/h3 section headers
  // as category context and any following item links
  if (sourceType === "fextralife") {
    const linkPattern = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    while ((match = linkPattern.exec(html)) !== null) {
      const href = match[1];
      const text = stripHtml(match[2]).trim();
      // Fextralife item links are usually /[GameName]/[ItemName]
      if (
        text.length > 3 &&
        text.length < 60 &&
        /[A-Z]/.test(text) &&
        !seen.has(text.toLowerCase()) &&
        href.includes("/") &&
        !href.startsWith("http") // relative links only (same-wiki items)
      ) {
        seen.add(text.toLowerCase());
        const raw = `${urlType}: ${text} | Loc:wiki`;
        facts.push({ type: urlType, name: text, raw });
      }
      if (facts.length > 800) break;
    }
  }

  return facts.slice(0, 600);
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Discover sources for a game and parse them into KnowledgeFact[].
 * Called from /api/learn as a pre-pass before the AI category queries.
 *
 * @param gameName   Human-readable game name (e.g. "Type Soul", "Elden Ring")
 * @param gameKey    Short key used in knowledge_cache (e.g. "type-soul", "eldenring")
 * @param pplx       Perplexity client (reuse the one from routes.ts)
 * @param hintUrl    Optional user-supplied URL (e.g. a Trello link pasted in UI)
 * @returns          Array of facts + list of sources that were used
 */
export async function fetchWikiPrePass(
  gameName: string,
  gameKey: string,
  pplx: Perplexity,
  hintUrl?: string
): Promise<{ facts: KnowledgeFact[]; sourcesUsed: string[] }> {
  // 1. Build source list — start with any user-supplied hint
  let sources: DiscoveredSource[] = [];

  if (hintUrl) {
    const type = hintUrl.includes("trello.com")
      ? "trello"
      : hintUrl.includes("fextralife.com")
      ? "fextralife"
      : hintUrl.includes("fandom.com") || hintUrl.includes("gamepedia.com")
      ? "fandom"
      : "generic";
    sources.push({ url: hintUrl, type, label: "User-supplied link" });
  }

  // 2. Discover additional sources via sonar-pro (always run — finds extras)
  const discovered = await discoverSources(gameName, pplx);
  for (const s of discovered) {
    // Don't add if we already have the same URL
    if (!sources.some((x) => x.url === s.url)) {
      sources.push(s);
    }
  }

  // Deduplicate by domain (don't hit fextralife 3 times)
  const seenDomains = new Set<string>();
  sources = sources.filter((s) => {
    try {
      const host = new URL(s.url).hostname;
      if (seenDomains.has(host)) return false;
      seenDomains.add(host);
      return true;
    } catch {
      return false;
    }
  });

  // Cap at 4 sources (avoid very long pre-pass)
  sources = sources.slice(0, 4);

  // 3. Fetch and parse all sources in parallel
  const allFacts: KnowledgeFact[] = [];
  const sourcesUsed: string[] = [];

  await Promise.allSettled(
    sources.map(async (src) => {
      let facts: KnowledgeFact[] = [];
      if (src.type === "trello") {
        facts = await parseTrello(src.url, gameKey);
      } else {
        facts = await parseWikiPage(src.url, gameKey, src.type);
      }
      if (facts.length > 0) {
        allFacts.push(...facts);
        sourcesUsed.push(`${src.label} (${src.url}) → ${facts.length} items`);
      }
    })
  );

  // 4. Deduplicate by name (case-insensitive)
  const seen = new Map<string, KnowledgeFact>();
  for (const f of allFacts) {
    const key = f.name.toLowerCase().trim();
    // Keep whichever has the longer raw string (more info)
    const existing = seen.get(key);
    if (!existing || f.raw.length > existing.raw.length) {
      seen.set(key, f);
    }
  }

  return {
    facts: Array.from(seen.values()),
    sourcesUsed,
  };
}
