import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Game, Build, KnowledgeFact } from "@shared/types";
import { slugify } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Props {
  game: Game;
  onClose: () => void;
  onCreated: (build: Build) => void;
}

type Stage = "idle" | "step1" | "step2" | "step3" | "finalizing" | "done" | "error";

const STAGE_LABELS: Record<Stage, string> = {
  idle: "",
  step1: "Generating metadata + early/mid phases…",
  step2: "Generating end game + NG+ phases…",
  step3: "Writing pros, cons & quick-ref…",
  finalizing: "Saving build…",
  done: "Complete",
  error: "Error — check your Claude API key and codex",
};

export default function AddBuildModal({ game, onClose, onCreated }: Props) {
  const { toast } = useToast();

  const [description, setDescription] = useState("");
  const [preferredWeapon, setPreferredWeapon] = useState("");
  const [statBudget, setStatBudget] = useState(game.endgameBudget ?? 150);
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // ── Knowledge cache ──────────────────────────────────────────────────────────
  const { data: knowledgeData } = useQuery<{ facts: KnowledgeFact[]; patchNote: string | null }>({
    queryKey: ["/api/knowledge", game.key],
    queryFn: () => apiRequest<{ facts: KnowledgeFact[]; patchNote: string | null }>("GET", `/api/knowledge/${game.key}`),
  });
  const facts = knowledgeData?.facts ?? [];
  const knowledgeBlock = facts.length > 0
    ? `GAME CODEX — ${game.name}\n\n${facts.slice(0, 80).map((f) => f.raw).join("\n")}`
    : `No codex loaded for ${game.name}. Generate based on general game knowledge.`;

  // ── Generate pipeline ────────────────────────────────────────────────────────
  async function handleGenerate() {
    if (!description.trim()) {
      toast({ title: "Describe your build first", variant: "destructive" });
      return;
    }

    setStage("step1");
    setErrorMsg("");

    try {
      // Step 1 — metadata + Early Game + Mid Game
      const step1 = await apiRequest<Record<string, unknown>>("POST", "/api/generate/step1", {
        gameKey: game.key,
        gameName: game.name,
        buildDescription: description,
        statBudget,
        preferredWeapon: preferredWeapon || undefined,
        knowledgeBlock,
      });

      setStage("step2");

      // Step 2 — End Game + NG+
      const buildKey = (step1.key as string) || slugify(description);
      const step2 = await apiRequest<Record<string, unknown>>("POST", "/api/generate/step2", {
        gameKey: game.key,
        gameName: game.name,
        buildKey,
        partialBuild: step1,
        knowledgeBlock,
      });

      setStage("step3");

      // Step 3 — pros/cons + ref (graceful fallback)
      let step3: { pros?: string[]; cons?: string[]; ref?: unknown[] } = { pros: [], cons: [], ref: [] };
      try {
        step3 = await apiRequest<{ pros?: string[]; cons?: string[]; ref?: unknown[] }>("POST", "/api/generate/step3", {
          gameKey: game.key,
          gameName: game.name,
          buildKey,
          partialBuild: { ...step1, ...step2 },
          knowledgeBlock,
        });
      } catch {
        // step3 failure is non-fatal
      }

      setStage("finalizing");

      // Finalize — assemble + save
      const build = await apiRequest<Build>("POST", "/api/generate/finalize", {
        gameKey: game.key,
        gameName: game.name,
        buildKey,
        step1,
        step2,
        step3,
      });

      setStage("done");
      onCreated(build);
    } catch (err) {
      setErrorMsg(String(err));
      setStage("error");
    }
  }

  const isRunning = stage !== "idle" && stage !== "done" && stage !== "error";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.75)" }}>
      <div
        className="w-full max-w-md rounded-lg shadow-2xl flex flex-col"
        style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-card-hi)" }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--color-card-hi)" }}>
          <div>
            <h2 className="font-display text-base font-bold" style={{ color: "var(--color-bright)" }}>
              Generate Build
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-dim)" }}>{game.name}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isRunning}
            className="text-sm px-2 py-1 rounded hover:opacity-80 transition-opacity"
            style={{ color: "var(--color-dim)" }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Codex status */}
          <div className="flex items-center gap-2 px-3 py-2 rounded text-xs" style={{ backgroundColor: "var(--color-card-hi)" }}>
            {facts.length > 0 ? (
              <>
                <span style={{ color: "var(--color-gold)" }}>✓</span>
                <span style={{ color: "var(--color-text)" }}>{facts.length} codex facts loaded</span>
              </>
            ) : (
              <>
                <span style={{ color: "var(--color-crimson)" }}>⚠</span>
                <span style={{ color: "var(--color-dim)" }}>No codex — import one via the sidebar for accurate item data</span>
              </>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-dim)" }}>
              Build Concept *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isRunning}
              rows={3}
              placeholder="e.g. Fast DEX katana bleed build focusing on the Uchigatana, light armor, and pyromancy for burst damage"
              className="w-full rounded px-3 py-2 text-sm resize-none outline-none"
              style={{
                backgroundColor: "var(--color-card-2)",
                color: "var(--color-text)",
                border: "1px solid var(--color-card-hi)",
              }}
            />
          </div>

          {/* Preferred weapon */}
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-dim)" }}>
              Preferred Weapon <span style={{ color: "var(--color-dim2)" }}>(optional)</span>
            </label>
            <input
              type="text"
              value={preferredWeapon}
              onChange={(e) => setPreferredWeapon(e.target.value)}
              disabled={isRunning}
              placeholder="e.g. Uchigatana, Zweihander, Black Knight Halberd…"
              className="w-full rounded px-3 py-2 text-sm outline-none"
              style={{
                backgroundColor: "var(--color-card-2)",
                color: "var(--color-text)",
                border: "1px solid var(--color-card-hi)",
              }}
            />
          </div>

          {/* Stat budget */}
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-dim)" }}>
              Target Soul Level: <strong style={{ color: "var(--color-bright)" }}>SL {statBudget}</strong>
            </label>
            <input
              type="range"
              min={40}
              max={200}
              step={5}
              value={statBudget}
              onChange={(e) => setStatBudget(Number(e.target.value))}
              disabled={isRunning}
              className="w-full"
              style={{ accentColor: "var(--color-crimson)" }}
            />
            <div className="flex justify-between text-[10px] mt-0.5" style={{ color: "var(--color-dim)" }}>
              <span>SL 40</span>
              <span>SL 120 (PvP)</span>
              <span>SL 200</span>
            </div>
          </div>

          {/* Progress / error */}
          {stage !== "idle" && (
            <div
              className={`px-3 py-2 rounded text-xs ${isRunning ? "animate-pulse" : ""}`}
              style={{
                backgroundColor: stage === "error" ? "rgba(214,69,69,0.1)" : "var(--color-card-hi)",
                color: stage === "error" ? "var(--color-crimson)" : "var(--color-gold)",
                border: `1px solid ${stage === "error" ? "rgba(214,69,69,0.3)" : "transparent"}`,
              }}
            >
              {STAGE_LABELS[stage]}
              {stage === "error" && errorMsg && (
                <div className="mt-1 text-[10px] opacity-70 break-all">{errorMsg}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex gap-2 justify-end" style={{ borderColor: "var(--color-card-hi)" }}>
          <button
            onClick={onClose}
            disabled={isRunning}
            className="text-xs px-4 py-2 rounded transition-all hover:opacity-80"
            style={{ backgroundColor: "var(--color-card-hi)", color: "var(--color-dim)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isRunning || !description.trim()}
            className="text-xs px-5 py-2 rounded font-semibold transition-all hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "var(--color-crimson)", color: "#fff" }}
          >
            {isRunning ? "Generating…" : "Generate Build"}
          </button>
        </div>
      </div>
    </div>
  );
}
