/**
 * Robust JSON parser with 4 strategies + multi-block extraction.
 * Never relies on model producing clean JSON — always defensive.
 */

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/** Strategy 1: Parse as-is */
function tryDirect(text: string): unknown {
  return JSON.parse(text);
}

/** Strategy 2: From first { to last } */
function tryBraceExtract(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("No braces");
  return JSON.parse(text.substring(start, end + 1));
}

/** Strategy 3: Walk forward tracking depth, find longest balanced object */
function tryDepthWalk(text: string): unknown {
  let best: string | null = null;
  let bestLen = 0;

  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "{") continue;

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let j = i; j < text.length; j++) {
      const ch = text[j];
      if (escape) { escape = false; continue; }
      if (ch === "\\" && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{" || ch === "[") depth++;
      else if (ch === "}" || ch === "]") {
        depth--;
        if (depth === 0) {
          const candidate = text.substring(i, j + 1);
          if (candidate.length > bestLen) {
            try {
              JSON.parse(candidate);
              best = candidate;
              bestLen = candidate.length;
            } catch { /* keep searching */ }
          }
          break;
        }
      }
    }
  }

  if (!best) throw new Error("No balanced object found");
  return JSON.parse(best);
}

/** Strategy 4: Repair truncation */
function tryRepair(text: string): unknown {
  const start = text.indexOf("{");
  if (start === -1) throw new Error("No opening brace");

  let fragment = text.substring(start);

  // Close unterminated strings
  let inString = false;
  let escape = false;
  for (const ch of fragment) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') inString = !inString;
  }
  if (inString) fragment += '"';

  // Count unclosed brackets and braces
  const stack: string[] = [];
  inString = false;
  escape = false;
  for (const ch of fragment) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") {
      if (stack.length) stack.pop();
    }
  }

  // Close all open brackets in reverse
  let closers = "";
  while (stack.length) {
    const open = stack.pop()!;
    closers += open === "{" ? "}" : "]";
  }

  return JSON.parse(fragment + closers);
}

function extractTextBlocks(raw: string): string[] {
  // Remove markdown fences
  const withoutFences = raw.replace(/```(?:json)?\n?/g, "").replace(/```/g, "");

  // Split by double newlines into candidate blocks, filter to ones containing {
  const blocks = withoutFences
    .split(/\n\n+/)
    .filter((b) => b.includes("{") && b.trim().length > 2);

  return blocks;
}

function tryAllStrategies(text: string): unknown {
  const strategies = [tryDirect, tryBraceExtract, tryDepthWalk, tryRepair];
  for (const strategy of strategies) {
    try {
      return strategy(text);
    } catch { /* try next */ }
  }
  throw new Error("All strategies failed");
}

/**
 * Strip <think>...</think> blocks produced by sonar-reasoning-pro.
 * These appear BEFORE the JSON payload and must be removed first.
 */
export function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

export function parseJsonResponse<T = unknown>(raw: string): ParseResult<T> {
  if (!raw || raw.trim().length === 0) {
    return { ok: false, error: "Empty response" };
  }

  // Strip sonar-reasoning-pro <think> blocks before any parsing
  raw = stripThinking(raw);

  // Try the full raw text first (strategies 1-4)
  try {
    const value = tryAllStrategies(raw);
    return { ok: true, value: value as T };
  } catch { /* fall through to block extraction */ }

  // Extract candidate blocks
  const blocks = extractTextBlocks(raw);

  // Try last block first (model often puts JSON at end)
  if (blocks.length > 0) {
    try {
      const value = tryAllStrategies(blocks[blocks.length - 1]);
      return { ok: true, value: value as T };
    } catch { /* try others */ }
  }

  // Try each block individually, longest first
  const sortedBlocks = [...blocks].sort((a, b) => b.length - a.length);
  for (const block of sortedBlocks) {
    try {
      const value = tryAllStrategies(block);
      return { ok: true, value: value as T };
    } catch { /* try next */ }
  }

  // Try all blocks concatenated
  const concatenated = blocks.join("\n");
  try {
    const value = tryAllStrategies(concatenated);
    return { ok: true, value: value as T };
  } catch { /* give up */ }

  return {
    ok: false,
    error: `Could not parse JSON from response (${raw.length} chars)`,
  };
}

// ── Tests (run with: npx tsx server/parse-json.ts) ───────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const tests: Array<{ name: string; input: string; expectOk: boolean }> = [
    {
      name: "Clean JSON",
      input: '{"key":"value"}',
      expectOk: true,
    },
    {
      name: "JSON with preamble",
      input: 'Here is the result:\n\n{"key":"value"}',
      expectOk: true,
    },
    {
      name: "JSON in markdown fence",
      input: '```json\n{"key":"value"}\n```',
      expectOk: true,
    },
    {
      name: "Truncated JSON (missing closing braces)",
      input: '{"key":"value","nested":{"a":1',
      expectOk: true,
    },
    {
      name: "Multi-block with valid JSON at end",
      input: "Some text here\n\nMore text\n\n{\"final\":true}",
      expectOk: true,
    },
    {
      name: "Unterminated string",
      input: '{"key":"unfinished',
      expectOk: true,
    },
    {
      name: "Completely invalid",
      input: "No JSON here at all just text",
      expectOk: false,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = parseJsonResponse(test.input);
    const pass = result.ok === test.expectOk;
    console.log(`${pass ? "✓" : "✗"} ${test.name}: ${result.ok ? "OK" : result.error}`);
    if (pass) passed++;
    else failed++;
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
}
