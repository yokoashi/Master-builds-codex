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

// Minimal interface for an OpenAI-compatible client (e.g. openRouter)
// Lets us avoid importing the full OpenAI SDK here.
interface OaiCompatClient {
  chat: {
    completions: {
      create(params: {
        model: string;
        max_tokens: number;
        messages: Array<{ role: string; content: string }>;
      }): Promise<{ choices: Array<{ message: { content: string | null } }> }>;
    };
  };
}

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
 * Accepts either a native Perplexity client or an OpenAI-compatible client (e.g. OpenRouter).
 * When orClient is provided, uses perplexity/sonar-pro via OpenRouter instead.
 * Returns up to 3 ranked sources.
 */
export async function discoverSources(
  gameName: string,
  pplx: Perplexity,
  orClient?: OaiCompatClient
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
    let text: string;
    if (orClient) {
      // Use OpenRouter's sonar-pro when OR research mode is active
      const resp = await orClient.chat.completions.create({
        model: "perplexity/sonar-pro",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      });
      text = resp.choices?.[0]?.message?.content ?? "";
    } else {
      const resp = await pplx.chat.completions.create({
        model: "sonar-pro",
        stream: false as const,
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      });
      text = extractText(resp as PplxResponse);
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- text declared above
    if (!text) return [];
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

// ─── Detail-page extraction ───────────────────────────────────────────────────
//
// After parsing the index page, we fetch up to DETAIL_PAGE_BUDGET individual
// item pages (e.g. /Lords-of-the-Fallen/Pieta-Sword) in batches. Each page is
// mined for its infobox (AP, weight, scaling, location, effect) and first
// paragraph of description, producing a much richer KnowledgeFact than the
// bare item name that strategy 2 used to collect.

const DETAIL_PAGE_BUDGET = 60;            // cap per source to bound crawl time
const DETAIL_BATCH_SIZE = 5;              // concurrent detail-page fetches
const DETAIL_PAGE_TIMEOUT_MS = 8000;      // per-page fetch timeout

// Strip tags + decode common HTML entities. Hoisted to module scope so both
// parseWikiPage and extractDetailInfo can use it.
function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Extract infobox-like key/value pairs and a short description from a wiki
// detail page. Works on both Fextralife table infoboxes and Fandom aside
// portable-infoboxes.
interface DetailInfo {
  title: string;                  // real article title
  description: string;            // first paragraph, trimmed
  fields: Record<string, string>; // infobox key/value pairs
  inferredType: KnowledgeFact["type"] | null; // from Type/Category fields
}

function extractDetailInfo(html: string): DetailInfo {
  // ── Title ────────────────────────────────────────────────────────────────
  let title = "";
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) title = stripHtml(h1[1]).slice(0, 120);
  if (!title) {
    const ttl = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (ttl) title = stripHtml(ttl[1]).split(/[|\-—–]/)[0].trim().slice(0, 120);
  }

  // ── Infobox key/value scrape ─────────────────────────────────────────────
  // Fextralife uses tables: <tr><th>Key</th><td>Value</td></tr>
  // Fandom uses aside.portable-infobox with h3.pi-data-label + div.pi-data-value
  const fields: Record<string, string> = {};

  const trPattern = /<tr[^>]*>[\s\S]*?<th[^>]*>([\s\S]*?)<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = trPattern.exec(html)) !== null) {
    const k = stripHtml(m[1]).toLowerCase().replace(/[:\s]+$/, "");
    const v = stripHtml(m[2]);
    if (k && v && k.length < 30 && v.length < 200) fields[k] = v;
  }

  const pPattern = /<h3[^>]*class="[^"]*pi-data-label[^"]*"[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<div[^>]*class="[^"]*pi-data-value[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  while ((m = pPattern.exec(html)) !== null) {
    const k = stripHtml(m[1]).toLowerCase().replace(/[:\s]+$/, "");
    const v = stripHtml(m[2]);
    if (k && v && k.length < 30 && v.length < 200) fields[k] = v;
  }

  // ── Description: first <p> in the article body ──────────────────────────
  let description = "";
  const pMatch = html.match(/<p[^>]*>([\s\S]{40,600}?)<\/p>/i);
  if (pMatch) description = stripHtml(pMatch[1]).slice(0, 300);

  // ── Infer type from Type/Category fields ────────────────────────────────
  const typeText = (fields.type ?? fields.category ?? fields["weapon type"] ?? fields["armor type"] ?? "").toLowerCase();
  let inferredType: KnowledgeFact["type"] | null = null;
  if (typeText) {
    if (/shield|block/.test(typeText)) inferredType = "SHIELD";
    else if (/staff|catalyst|seal|wand|talisman-?of|chalice|tome/.test(typeText)) inferredType = "CATALYST";
    else if (/ring|amulet|pendant|charm|necklace|accessor/.test(typeText)) inferredType = "RING";
    else if (/helm|chest|gauntlet|leg|armor|armour|robe|set|hood|mask|plate/.test(typeText)) inferredType = "ARMOR";
    else if (/spell|sorcery|miracle|pyromancy|incantation|hex/.test(typeText)) inferredType = "SPELL";
    else if (/buff|heal|support|utility/.test(typeText)) inferredType = "BUFF";
    else if (/sword|axe|bow|crossbow|spear|lance|hammer|dagger|fist|claw|katana|scythe|whip|flail|gun|rifle|greatsword|greataxe|halberd|pike/.test(typeText)) inferredType = "WEAPON";
  }

  return { title, description, fields, inferredType };
}

// Fetch one detail page and convert it into an enriched KnowledgeFact.
// Returns null on error (caller just skips it).
async function fetchDetailPage(
  url: string,
  fallbackName: string,
  fallbackType: KnowledgeFact["type"]
): Promise<KnowledgeFact | null> {
  const html = await safeFetch(url, DETAIL_PAGE_TIMEOUT_MS);
  if (!html) return null;

  const info = extractDetailInfo(html);
  const name = (info.title || fallbackName).trim();
  if (!name || name.length < 2 || name.length > 120) return null;

  const type = info.inferredType ?? fallbackType;

  // Compose rich raw line with the most useful infobox fields first
  const parts: string[] = [`${type}: ${name}`];
  const importantKeys = [
    "attack", "attack rating", "ap", "damage",
    "weight", "wt",
    "scaling", "requirement", "requirements",
    "type", "weapon type", "armor type",
    "physical", "magic", "fire", "lightning", "dark", "holy",
    "bleed", "poison", "frostbite", "rot",
    "fp cost", "fp", "stamina",
    "location", "loc", "how to find", "acquired", "drops from",
    "effect", "description",
  ];
  const usedKeys = new Set<string>();
  for (const k of importantKeys) {
    const v = info.fields[k];
    if (v && !usedKeys.has(k)) {
      parts.push(`${k}: ${v.slice(0, 80)}`);
      usedKeys.add(k);
    }
  }
  if (info.description) {
    const desc = info.description.slice(0, 160);
    parts.push(`desc: ${desc}`);
  }

  // Location hint: try the URL segment as a fallback
  let locHint = "";
  try {
    const u = new URL(url);
    locHint = u.pathname.split("/").filter(Boolean).slice(-2, -1)[0] ?? "";
  } catch { /* ignore */ }
  if (locHint) parts.push(`src: ${locHint}`);

  const raw = parts.join(" | ").slice(0, 500);
  const location = info.fields.location ?? info.fields.loc ?? info.fields["how to find"] ?? undefined;

  return { type, name, raw, ...(location ? { location } : {}) };
}

// Fetch many detail pages in parallel batches so one slow server doesn't stall
// the entire crawl.
async function fetchDetailPagesBatched(
  targets: { url: string; fallbackName: string; fallbackType: KnowledgeFact["type"] }[]
): Promise<KnowledgeFact[]> {
  const results: KnowledgeFact[] = [];
  for (let i = 0; i < targets.length; i += DETAIL_BATCH_SIZE) {
    const slice = targets.slice(i, i + DETAIL_BATCH_SIZE);
    const settled = await Promise.allSettled(
      slice.map((t) => fetchDetailPage(t.url, t.fallbackName, t.fallbackType))
    );
    for (const s of settled) {
      if (s.status === "fulfilled" && s.value) results.push(s.value);
    }
  }
  return results;
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
  let html = await safeFetch(url, 15000);
  if (!html) return [];

  // ── Step 1: strip chrome sections entirely before any content parsing ────────
  // Remove <nav>, <header>, <aside>, <footer>, <script>, <style>, <noscript>,
  // and common wiki sidebar/navbox class patterns so their <li>/<a> tags
  // never reach the item-extraction logic.
  html = html
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    // Fextralife-specific sidebar/navbox patterns
    .replace(/<div[^>]+class="[^"]*(?:sidebar|navbox|wiki-nav|site-nav|toc|breadcrumb|footer-nav|global-nav|left-menu|right-menu|top-nav|bottom-nav|ad-|advertisement|cookie|banner|notification)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "")
    // Fandom-specific chrome
    .replace(/<div[^>]+class="[^"]*(?:page-header|wds-global-navigation|global-footer|mw-navigation|mw-head|mw-panel|catlinks|printfooter|siteSub|contentSub|jump-to-nav)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");

  const facts: KnowledgeFact[] = [];

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

  // ── Nav/UI text blocklist ─────────────────────────────────────────────────
  // Single-word blocklist — anything matching this is wiki chrome, not an item.
  const NAV_BLOCK = /^(level|stat|str|dex|int|fth|arc|vig|end|agl|atk|def|weight|location|description|effect|name|type|upgrade|notes?|source|how\s+to|where|wiki|edit|sign\s*in|log\s*(?:in|out)|search|navigation|contents?|categories?|home|back|next|prev|top|menu|header|footer|sidebar|share|tweet|discord|reddit|youtube|facebook|twitter|instagram|twitch|privacy|terms|contact|about|advertis\w*|cookie|vip|chat|forum|news|reviews|guides|patch|dlc|blog|hub|shop|to-?do|gestures?|controls?|combat|faq|classes?|builds?|pve|pvp|general|character|creation|respec|stats?|status|effects?|items?|equipment|weapons?\s+damage|damage\s+types?|wikis?|all\s+wikis?|wiki\s+home|sign\s+in\s+now|new\s+new|secrets?|pumpkin|patch\s+event|mirror|distortion|patchnotes?|community|trending|popular|recent|changes?|history|discussion|talk|user|special|file|template|help|project|portal|main\s+page|random|donate|toolbox|print|permanent|cite|create|account|watch|view|source|read|classic|mobile|desktop|accessibility|preferences|watchlist|contributions|upload|logs?|version|redirect|lock|unlock|permissions?|javascript|tags?|members?|settings?|platforms?|rename|delete|javascript|feeds?|rss|atom|sitemap|robots|favicon|manifest|service[-\s]worker|sw\.js|login|logout|signin|signout|register|password|forgot|reset|verify|confirm|subscribe|unsubscribe|newsletter|captcha|recaptcha|token|session|csrf|nonce|api|json|xml|rdf|sparql|query|endpoint)$/i;

  // Multi-word wiki admin/nav phrases that slip past the single-word filter
  const NAV_PHRASE_MULTI = /^(visit\s+discord|create\s+new\s+page|recent\s+changes|edit\s+open\s+graph|clear\s+page\s+cache|clear\s+comments\s+cache|file\s+manager|page\s+manager|wiki\s+templates?|comments?\s+approval|wiki\s+settings?|wiki\s+manager|create\s+wiki|release\s+date|new\s+page|sign\s+in|log\s+in|sign\s+out|log\s+out|all\s+wikis?|wiki\s+home|main\s+page|edit\s+source|view\s+history|read\s+more|see\s+also|external\s+links?|related\s+pages?|quick\s+nav|table\s+of\s+contents|jump\s+to\s+nav|jump\s+to\s+search|get\s+help|what\s+links\s+here|special\s+pages?|printable\s+version|permanent\s+link|cite\s+this\s+page|wikidata\s+item|in\s+other\s+languages?|on\s+this\s+page|new\s+section|add\s+topic|leave\s+message|user\s+contributions?|talk\s+page|user\s+talk|upload\s+file|my\s+talk|my\s+contributions?|my\s+preferences|my\s+watchlist|how\s+to\s+edit|getting\s+started|community\s+portal|village\s+pump|help\s+centre|help\s+center|about\s+(?:the\s+)?wiki|disclaimer|terms\s+of\s+(?:use|service)|privacy\s+policy|cookie\s+policy|manage\s+cookies?|contact\s+us|advertise\s+with\s+us|fan\s+feed|explore\s+properties?|fandom\s+(?:apps?|home|store|studio|university)|trending\s+pages?)$/i;

  // Multi-word nav/meta patterns: 3+ words ending in wiki/guide/page/etc.
  const NAV_PHRASE = /^(\w+\s+){3,}(wiki|guide|info|page|list|hub|home|news|blog)$/i;

  // Date patterns: "October 13, 2023", "2023-10-13", "13/10/2023", etc.
  const DATE_PATTERN = /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d|\d{4}[-/]\d{2}[-/]\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}/i;

  // Use a map so Strategy 3 (rich detail pages) can overwrite Strategy 1 (thin names).
  // Key = lowercased item name. Final output comes from this map.
  const factMap = new Map<string, KnowledgeFact>();

  // Hoist URL parse — used in every Strategy 1 iteration
  const pageSlug = (() => { try { return new URL(url).pathname.split("/").pop() ?? "wiki"; } catch { return "wiki"; } })();

  // ── Strategy 1: extract <li> and <td> text ───────────────────────────────
  const cellPattern = /<(?:li|td|th)[^>]*>([\s\S]*?)<\/(?:li|td|th)>/gi;
  let match: RegExpExecArray | null;

  while ((match = cellPattern.exec(html)) !== null) {
    const text = stripHtml(match[1]);
    const trimmed = text.trim();
    if (
      text.length < 3 ||
      text.length > 80 ||
      /^\d+$/.test(text) ||
      NAV_BLOCK.test(trimmed) ||
      NAV_PHRASE.test(trimmed) ||
      NAV_PHRASE_MULTI.test(trimmed) ||
      DATE_PATTERN.test(trimmed)
    ) continue;
    if (!/[A-Z]/.test(text)) continue;

    const name = text.slice(0, 80).trim();
    const nameKey = name.toLowerCase();
    // Only add if not already present — Strategy 3 will overwrite with richer version
    if (!factMap.has(nameKey)) {
      const raw = `${urlType}: ${name} | Loc:${pageSlug}`;
      factMap.set(nameKey, { type: urlType, name, raw });
    }
  }

  // ── Strategy 2: collect detail-page links from Fextralife + Fandom ───────
  // On both wikis, item pages live at predictable URL patterns. We collect
  // up to DETAIL_PAGE_BUDGET URLs here, then deep-crawl them below.
  const detailTargets: { url: string; fallbackName: string; fallbackType: KnowledgeFact["type"] }[] = [];
  const detailSeen = new Set<string>();

  if (sourceType === "fextralife" || sourceType === "fandom") {
    const linkPattern = /<a[^>]+href="([^"#?]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    // Block nav/admin paths. NOTE: "wiki" is intentionally NOT in this list —
    // Fandom item pages live at /wiki/ItemName and must be allowed through.
    // Fandom special namespaces are blocked via the colon-namespace pattern below.
    const navPathBlock = /\/(home|blog|forum|news|guides?|reviews?|shop|vip|search|login|logout|register|account|special|help|chat|discord|twitch|youtube|facebook|twitter|instagram|reddit|patch|dlc|edit|history|talk|upload|file|template|portal|project|main[-_]page|random|donate|preferences|watchlist|contributions|accessibility|version|category)(?:\/|$)/i;
    // Fandom colon-namespaces: /wiki/Special:RandomPage, /wiki/User:foo, etc.
    const fandomNsBlock = /\/wiki\/(?:Special|User|Talk|File|Template|Help|Forum|Category|Portal|Project|MediaWiki|Module):/i;

    const baseUrl = new URL(url);

    while ((match = linkPattern.exec(html)) !== null) {
      const href = match[1].trim();
      const text = stripHtml(match[2]).trim();

      // Normalise to absolute URL
      let absolute: string;
      try {
        absolute = new URL(href, baseUrl).toString();
      } catch { continue; }

      // Stay on the same host (don't wander off the wiki)
      let absUrl: URL;
      try { absUrl = new URL(absolute); } catch { continue; }
      if (absUrl.hostname !== baseUrl.hostname) continue;

      const pathParts = absUrl.pathname.split("/").filter(Boolean);
      if (pathParts.length < 2) continue;
      if (navPathBlock.test(absUrl.pathname)) continue;
      if (fandomNsBlock.test(absUrl.pathname)) continue;

      // Text must look like an item name (not UI chrome)
      if (
        text.length < 3 ||
        text.length > 60 ||
        !/[A-Z]/.test(text) ||
        NAV_BLOCK.test(text.trim()) ||
        NAV_PHRASE.test(text.trim()) ||
        NAV_PHRASE_MULTI.test(text.trim()) ||
        DATE_PATTERN.test(text.trim())
      ) continue;

      const dedupKey = absUrl.pathname.toLowerCase();
      if (detailSeen.has(dedupKey)) continue;
      detailSeen.add(dedupKey);

      detailTargets.push({ url: absolute, fallbackName: text, fallbackType: urlType });
      if (detailTargets.length >= DETAIL_PAGE_BUDGET) break;
    }
  }

  // ── Strategy 3: deep-crawl each detail page for infobox + description ────
  // Strategy 3 overwrites Strategy 1 thin facts — infobox data is richer.
  if (detailTargets.length > 0) {
    const enriched = await fetchDetailPagesBatched(detailTargets);
    for (const f of enriched) {
      // Always set — overwrites any thin Strategy 1 fact for the same name
      factMap.set(f.name.toLowerCase(), f);
    }
  }

  return Array.from(factMap.values()).slice(0, 800);
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
function classifyHintUrl(url: string): DiscoveredSource["type"] {
  if (url.includes("trello.com")) return "trello";
  if (url.includes("fextralife.com")) return "fextralife";
  if (url.includes("fandom.com") || url.includes("gamepedia.com")) return "fandom";
  return "generic";
}

function isWikiHomepage(url: string): boolean {
  try {
    const p = new URL(url).pathname.replace(/\+/g, " ").toLowerCase().trim();
    return (
      p === "/" || p === "" ||
      p.endsWith("wiki") || p.endsWith("wiki/") ||
      p.endsWith("main_page") || p.endsWith("main page") ||
      p.endsWith("index") || p.endsWith("home") ||
      /\/[a-z0-9 +_-]+ wiki\/?$/.test(p) ||
      /\/wiki\/main.?page\/?$/i.test(p)
    );
  } catch { return false; }
}

export async function fetchWikiPrePass(
  gameName: string,
  gameKey: string,
  pplx: Perplexity,
  /** One or more category-specific URLs (weapons page, armor page, etc.)
   *  or a legacy single URL string — both forms accepted. */
  hintUrls?: string | string[],
  orClient?: OaiCompatClient
): Promise<{ facts: KnowledgeFact[]; sourcesUsed: string[] }> {
  // Normalise to array
  const hintList: string[] = hintUrls
    ? (Array.isArray(hintUrls) ? hintUrls : [hintUrls]).filter((u) => u?.trim())
    : [];

  // 1. Build source list — start with any user-supplied hint URLs.
  // Category-specific pages (weapons, armor, rings…) each become their own
  // source with the correct type inferred from the URL. Homepages are skipped
  // (they contain only navigation chrome — source discovery finds the real pages).
  let sources: DiscoveredSource[] = [];

  for (const hintUrl of hintList) {
    if (isWikiHomepage(hintUrl)) continue; // skip homepage — let discoverSources find item pages
    sources.push({
      url: hintUrl,
      type: classifyHintUrl(hintUrl),
      label: "User-supplied link",
    });
  }

  // 2. Discover additional sources via sonar-pro (always run — finds extras)
  // When orClient is provided, source discovery uses OR's perplexity/sonar-pro instead.
  const discovered = await discoverSources(gameName, pplx, orClient);
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
