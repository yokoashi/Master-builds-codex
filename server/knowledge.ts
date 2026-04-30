import { storage } from "./storage";

// Max chars injected into a prompt (~30K tokens, well within any provider's context)
const MAX_CODEX_CHARS = 120_000;

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
 * Returns the full raw codex text (truncated if huge).
 */
export function buildKnowledgeBlock(gameKey: string): string {
  const raw = storage.getCodexRaw(gameKey);
  if (!raw) {
    return "No codex loaded for this game. Generate the build using general game knowledge only.";
  }
  const text =
    raw.rawText.length > MAX_CODEX_CHARS
      ? raw.rawText.slice(0, MAX_CODEX_CHARS) + "\n[...codex truncated at 120K chars...]"
      : raw.rawText;
  return `=== GAME CODEX ===\nUse ONLY items, locations, and mechanics found in this codex.\n\n${text}`;
}
