import { storage } from "./storage";

// Per-provider char limits (leave ~10K chars for prompts on top)
// Claude Sonnet 4.6: 200K token ctx ≈ 800K chars; use 600K to be safe
// PPLX sonar-pro:    127K token ctx ≈ 500K chars; use 400K
// OpenRouter:        varies; default conservatively to 80K
export const CODEX_CHAR_LIMITS: Record<string, number> = {
  claude:     600_000,
  pplx:       400_000,
  openrouter:  80_000,
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

/**
 * Build the knowledge block injected into every AI system prompt.
 * maxChars defaults to 600K (Claude); pass a smaller value for other providers.
 */
export function buildKnowledgeBlock(gameKey: string, maxChars = 600_000): string {
  const raw = storage.getCodexRaw(gameKey);
  if (!raw) {
    return "No codex loaded for this game. Generate the build using general game knowledge only.";
  }
  const truncated = raw.rawText.length > maxChars;
  const text = truncated
    ? raw.rawText.slice(0, maxChars) + `\n[...codex truncated — ${raw.rawText.length.toLocaleString()} chars total, showing first ${maxChars.toLocaleString()}...]`
    : raw.rawText;
  return `=== GAME CODEX ===\nUse ONLY items, locations, and mechanics found in this codex.\n\n${text}`;
}
