import { storage } from "./storage";

// Per-provider char limits for the FORMATTED text (compact text is ~3x smaller
// than pretty-printed JSON and ~1.5x smaller than minified JSON).
// Claude Sonnet 4.6: 200K token ctx; 150K chars ≈ 38K tokens, leaves 160K for output
// PPLX sonar-pro:    127K token ctx; 80K chars ≈ 20K tokens
// OpenRouter:        varies; 40K chars is conservative
export const CODEX_CHAR_LIMITS: Record<string, number> = {
  claude:     150_000,
  pplx:        80_000,
  openrouter:  40_000,
};

/**
 * Count leaf entries in the imported codex so the UI can show a meaningful number.
 * Walks one level deep; arrays contribute their length, scalars count as 1.
 */
export function countCodexEntries(codex: Record<string, unknown>): number {
  let count = 0;
  for (const val of Object.values(codex)) {
    if (Array.isArray(val)) {
      count += val.length;
    } else if (val && typeof val === "object") {
      for (const sub of Object.values(val as Record<string, unknown>)) {
        if (Array.isArray(sub)) count += sub.length;
        else count += 1;
      }
    } else {
      count += 1;
    }
  }
  return count;
}

// ── Compact text formatter ─────────────────────────────────────────────────────
// Converts a game codex JSON into compact one-line-per-item text.
// Compared with pretty-printed JSON: ~3-4x fewer tokens.
// Compared with minified JSON: ~1.5-2x fewer tokens.
//
// Output example:
//   [WEAPONS]
//   Uchigatana | type:Katana | req:STR10/DEX14 | AR:90 | scaling:D/C | bleed:33 | loc:Kill Undead Merchant | up:Standard+15
//   Longsword  | type:Straight | req:STR10/DEX10 | AR:100 | scaling:C/C | loc:Undead Merchant

// Known name-field aliases across various codex schemas
const NAME_KEYS = ["name", "n", "title", "label", "id", "key", "Name"];

function extractName(obj: Record<string, unknown>): [string, string] {
  for (const k of NAME_KEYS) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).length > 0) {
      return [k, String(v)];
    }
  }
  // Fallback: first non-object string value
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string" && v.length > 0 && v.length < 80) {
      return [k, v];
    }
  }
  return ["", ""];
}

function formatValue(v: unknown, depth = 0): string {
  if (v === null || v === undefined || v === "" || v === false) return "";
  if (typeof v === "boolean") return v ? "yes" : "";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") {
    // Truncate very long strings (lore/description text)
    return v.length > 120 ? v.slice(0, 117) + "…" : v;
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return "";
    const items = v.map((i) => (typeof i === "object" ? formatItemCompact(i as Record<string, unknown>, depth + 1) : String(i)));
    return `[${items.join(", ")}]`;
  }
  if (typeof v === "object") {
    if (depth > 0) {
      // Flatten nested object: {str:10, dex:14} → "STR10/DEX14"
      return Object.entries(v as Record<string, unknown>)
        .filter(([, sv]) => sv !== null && sv !== undefined && sv !== "")
        .map(([sk, sv]) => `${sk.toUpperCase()}${sv}`)
        .join("/");
    }
    return formatItemCompact(v as Record<string, unknown>, depth + 1);
  }
  return String(v);
}

function formatItemCompact(obj: Record<string, unknown>, depth = 0): string {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return String(obj ?? "");
  }

  const [nameKey, displayName] = extractName(obj);
  const parts: string[] = [];
  if (displayName) parts.push(displayName);

  for (const [k, v] of Object.entries(obj)) {
    if (k === nameKey) continue;
    const formatted = formatValue(v, depth);
    if (!formatted) continue;
    parts.push(depth === 0 ? `${k}:${formatted}` : formatted);
  }

  return parts.join(" | ");
}

function formatSection(sectionKey: string, value: unknown, depth = 0): string {
  if (value === null || value === undefined) return "";

  const header = sectionKey.replace(/_/g, " ").toUpperCase();
  const pad = "  ".repeat(depth);

  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    const lines: string[] = [`${pad}[${header}]`];
    for (const item of value) {
      if (item === null || item === undefined) continue;
      if (typeof item === "object" && !Array.isArray(item)) {
        const line = formatItemCompact(item as Record<string, unknown>);
        if (line) lines.push(`${pad}  ${line}`);
      } else {
        lines.push(`${pad}  ${String(item)}`);
      }
    }
    return lines.join("\n");
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const lines: string[] = [`${pad}[${header}]`];
    for (const [k, v] of Object.entries(obj)) {
      const sub = formatSection(k, v, depth + 1);
      if (sub) lines.push(sub);
    }
    return lines.join("\n");
  }

  // Scalar top-level value
  return `${pad}${header}: ${value}`;
}

/**
 * Convert a parsed codex JSON into compact text for AI injection.
 * Falls back to raw minified JSON if parsing fails.
 */
export function formatCodexForAI(rawJsonOrText: string): string {
  let codex: Record<string, unknown>;
  try {
    codex = JSON.parse(rawJsonOrText) as Record<string, unknown>;
  } catch {
    return rawJsonOrText; // already formatted or un-parseable — use as-is
  }

  const sections: string[] = [];
  for (const [key, value] of Object.entries(codex)) {
    const formatted = formatSection(key, value);
    if (formatted) sections.push(formatted);
  }
  return sections.join("\n\n");
}

/**
 * Build the knowledge block injected into every AI system prompt.
 * Converts the stored JSON to compact text, then truncates to maxChars.
 */
export function buildKnowledgeBlock(gameKey: string, maxChars = 150_000): string {
  const raw = storage.getCodexRaw(gameKey);
  if (!raw) {
    return "No codex loaded for this game. Generate the build using general game knowledge only.";
  }

  const formatted = formatCodexForAI(raw.rawText);
  const truncated  = formatted.length > maxChars;
  const text = truncated
    ? formatted.slice(0, maxChars) +
      `\n[...codex truncated: ${formatted.length.toLocaleString()} chars formatted, showing first ${maxChars.toLocaleString()}...]`
    : formatted;

  return `=== GAME CODEX ===\nUse ONLY items, locations, and mechanics found in this codex.\n\n${text}`;
}
