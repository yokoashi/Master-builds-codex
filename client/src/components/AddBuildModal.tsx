import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Game, Build, AiProvider } from "@shared/types";
import { slugify } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Props {
  game: Game;
  onClose: () => void;
  onCreated: (build: Build) => void;
}

type Mode = "full" | "semi" | "manual";
type Stage = "idle" | "step1" | "step2" | "step3" | "finalizing" | "done" | "error";

const STAGE_LABELS: Record<Stage, string> = {
  idle:       "",
  step1:      "Generating metadata + Early / Mid Game phases…",
  step2:      "Generating End Game + NG+ phases…",
  step3:      "Writing pros, cons & quick-ref…",
  finalizing: "Saving build…",
  done:       "Complete",
  error:      "Error — see details below",
};

const PROVIDER_DEFAULTS: Record<AiProvider, string> = {
  claude:      "claude-sonnet-4-6",
  pplx:        "sonar-pro",
  openrouter:  "",
};

const PROVIDER_LABELS: Record<AiProvider, string> = {
  claude:     "Claude",
  pplx:       "Perplexity",
  openrouter: "OpenRouter",
};

const DS1R_CLASSES = [
  "Warrior","Knight","Wanderer","Thief","Bandit",
  "Hunter","Sorcerer","Pyromancer","Cleric","Deprived",
];

const DS1R_STATS = ["VIT","ATT","END","STR","DEX","RES","INT","FTH"];

// ── Blank phase-stat seed template ────────────────────────────────────────────
function blankStats(): Record<string, number> {
  return Object.fromEntries(DS1R_STATS.map((s) => [s, 0]));
}

export default function AddBuildModal({ game, onClose, onCreated }: Props) {
  const { toast } = useToast();

  // ── Mode & Provider
  const [mode, setMode]         = useState<Mode>("full");
  const [provider, setProvider] = useState<AiProvider>("claude");
  const [model, setModel]       = useState(PROVIDER_DEFAULTS.claude);

  // ── Full AI / Semi-AI fields
  const [description, setDescription]       = useState("");
  const [preferredWeapon, setPreferredWeapon] = useState("");
  const [constraints, setConstraints]       = useState("");
  const [startingClass, setStartingClass]   = useState("");
  const [phase1Stats, setPhase1Stats]       = useState(blankStats());
  const [phase2Stats, setPhase2Stats]       = useState(blankStats());

  // ── Manual fields
  const [manualJson, setManualJson] = useState(() =>
    JSON.stringify(
      {
        key: "my-custom-build",
        gameKey: game.key,
        label: "My Custom Build",
        sub: "STR/DEX Quality Build",
        icon: "⚔️",
        accent: "#8b3a3a",
        playstyle: "Describe the playstyle here.",
        cls: "Knight",
        caps: ["STR 40", "END 40"],
        weaponReq: ["STR 14"],
        loadouts: null,
        phases: [
          {
            name: "Early Game", range: "SL 1-30",
            stats: { VIT: 14, ATT: 8, END: 20, STR: 16, DEX: 14, RES: 11, INT: 9, FTH: 9 },
            sn: "Early game strategy.", weapons: [], armor: [], acc: [], spells: [],
            dmg: { ps: 150, sp: 100, bs: 300, n: "Early damage" },
          },
          {
            name: "Mid Game", range: "SL 30-60",
            stats: { VIT: 20, ATT: 8, END: 28, STR: 25, DEX: 20, RES: 11, INT: 9, FTH: 9 },
            sn: "Mid game strategy.", weapons: [], armor: [], acc: [], spells: [],
            dmg: { ps: 250, sp: 180, bs: 480, n: "Mid damage" },
          },
          {
            name: "End Game", range: "SL 80-120",
            stats: { VIT: 40, ATT: 8, END: 40, STR: 40, DEX: 40, RES: 11, INT: 9, FTH: 9 },
            sn: "Endgame strategy.", weapons: [], armor: [], acc: [], spells: [],
            dmg: { ps: 400, sp: 300, bs: 800, n: "Peak damage" },
          },
          {
            name: "NG+", range: "NG+1 and beyond",
            stats: { VIT: 50, ATT: 8, END: 40, STR: 40, DEX: 40, RES: 11, INT: 9, FTH: 9 },
            sn: "NG+ strategy.", weapons: [], armor: [], acc: [], spells: [],
            dmg: { ps: 400, sp: 300, bs: 800, n: "Same damage; enemies scale" },
            ngCycles: [
              { label: "NG+1", stats: { VIT: 50 }, notes: "~20% harder" },
              { label: "NG+7", stats: { VIT: 65 }, notes: "~150% harder" },
            ],
          },
        ],
        pros: ["Advantage 1", "Advantage 2"],
        cons: ["Weakness 1", "Weakness 2"],
        ref: [],
        isAI: false,
      },
      null, 2,
    ),
  );
  const [manualError, setManualError] = useState("");

  // ── Pipeline state
  const [stage, setStage]     = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // ── Codex status (from new /api/codex endpoint)
  const { data: codexData } = useQuery<{ loaded: boolean; entryCount: number }>({
    queryKey: ["/api/codex", game.key],
    queryFn: () => apiRequest<{ loaded: boolean; entryCount: number }>("GET", `/api/codex/${game.key}`),
  });
  const codexLoaded  = codexData?.loaded ?? false;
  const entryCount   = codexData?.entryCount ?? 0;

  // ── Provider change handler ───────────────────────────────────────────────
  function handleProviderChange(p: AiProvider) {
    setProvider(p);
    setModel(PROVIDER_DEFAULTS[p]);
  }

  // ── Semi-AI stat setter ───────────────────────────────────────────────────
  function updateStat(
    phase: "phase1" | "phase2",
    stat: string,
    val: string,
  ) {
    const n = parseInt(val, 10) || 0;
    if (phase === "phase1") setPhase1Stats((prev) => ({ ...prev, [stat]: n }));
    else setPhase2Stats((prev) => ({ ...prev, [stat]: n }));
  }

  // ── Manual save ───────────────────────────────────────────────────────────
  async function handleManualSave() {
    setManualError("");
    let parsed: Build;
    try {
      parsed = JSON.parse(manualJson) as Build;
    } catch (e) {
      setManualError(`JSON parse error: ${String(e)}`);
      return;
    }
    if (!parsed.key || !parsed.label) {
      setManualError("Build must have key and label.");
      return;
    }
    setStage("finalizing");
    try {
      const build = await apiRequest<Build>("POST", "/api/generate/finalize", {
        gameKey: game.key,
        gameName: game.name,
        buildKey: parsed.key,
        step1: {
          ...parsed,
          phase1: parsed.phases?.[0],
          phase2: parsed.phases?.[1],
        },
        step2: {
          phase3: parsed.phases?.[2],
          phase4: parsed.phases?.[3],
        },
        step3: { pros: parsed.pros ?? [], cons: parsed.cons ?? [], ref: parsed.ref ?? [] },
      });
      setStage("done");
      onCreated(build);
    } catch (err) {
      setErrorMsg(String(err));
      setStage("error");
    }
  }

  // ── AI generation pipeline ────────────────────────────────────────────────
  async function handleGenerate() {
    if (!description.trim()) {
      toast({ title: "Describe your build first", variant: "destructive" });
      return;
    }

    setStage("step1");
    setErrorMsg("");

    try {
      const seedStats =
        mode === "semi"
          ? {
              phase1: Object.fromEntries(
                Object.entries(phase1Stats).filter(([, v]) => v > 0),
              ),
              phase2: Object.fromEntries(
                Object.entries(phase2Stats).filter(([, v]) => v > 0),
              ),
            }
          : undefined;

      const step1 = await apiRequest<Record<string, unknown>>("POST", "/api/generate/step1", {
        gameKey: game.key,
        gameName: game.name,
        buildDescription: description,
        provider,
        model,
        preferredWeapon: preferredWeapon || undefined,
        constraints: constraints || undefined,
        seedStats,
      });

      setStage("step2");

      const buildKey = (step1.key as string) || slugify(description);
      const step2 = await apiRequest<Record<string, unknown>>("POST", "/api/generate/step2", {
        gameKey: game.key,
        gameName: game.name,
        buildKey,
        partialBuild: step1,
        provider,
        model,
      });

      setStage("step3");

      let step3: { pros?: string[]; cons?: string[]; ref?: unknown[] } = {};
      try {
        step3 = await apiRequest<typeof step3>("POST", "/api/generate/step3", {
          gameKey: game.key,
          gameName: game.name,
          buildKey,
          partialBuild: { ...step1, ...step2 },
          provider,
          model,
        });
      } catch { /* non-fatal */ }

      setStage("finalizing");

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

  // ── UI helpers ─────────────────────────────────────────────────────────────
  const tabBtn = (m: Mode, label: string) => (
    <button
      key={m}
      onClick={() => setMode(m)}
      disabled={isRunning}
      className="flex-1 py-2 text-xs font-semibold rounded transition-all"
      style={{
        backgroundColor: mode === m ? "var(--color-crimson)" : "var(--color-card-2)",
        color: mode === m ? "#fff" : "var(--color-dim)",
      }}
    >
      {label}
    </button>
  );

  const providerBtn = (p: AiProvider) => (
    <button
      key={p}
      onClick={() => handleProviderChange(p)}
      disabled={isRunning}
      className="flex-1 py-1.5 text-xs rounded transition-all"
      style={{
        backgroundColor: provider === p ? "var(--color-card-hi)" : "transparent",
        color: provider === p ? "var(--color-bright)" : "var(--color-dim)",
        border: `1px solid ${provider === p ? "var(--color-gold)" : "var(--color-card-hi)"}`,
      }}
    >
      {PROVIDER_LABELS[p]}
    </button>
  );

  const inputCls = "w-full rounded px-3 py-2 text-sm outline-none";
  const inputStyle = {
    backgroundColor: "var(--color-card-2)",
    color: "var(--color-text)",
    border: "1px solid var(--color-card-hi)",
  };
  const labelCls = "block text-xs font-medium mb-1 uppercase tracking-wider";
  const labelStyle = { color: "var(--color-dim)" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
    >
      <div
        className="w-full max-w-lg rounded-lg shadow-2xl flex flex-col max-h-[90vh]"
        style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-card-hi)" }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: "var(--color-card-hi)" }}>
          <div>
            <h2 className="font-display text-base font-bold" style={{ color: "var(--color-bright)" }}>
              New Build
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-dim)" }}>{game.name}</p>
          </div>
          <button onClick={onClose} disabled={isRunning} className="text-sm px-2 py-1 rounded hover:opacity-80" style={{ color: "var(--color-dim)" }}>✕</button>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────────── */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">

          {/* Codex status pill */}
          <div className="flex items-center gap-2 px-3 py-2 rounded text-xs" style={{ backgroundColor: "var(--color-card-hi)" }}>
            {codexLoaded ? (
              <>
                <span style={{ color: "var(--color-gold)" }}>✓</span>
                <span style={{ color: "var(--color-text)" }}>Codex loaded — {entryCount.toLocaleString()} entries</span>
              </>
            ) : (
              <>
                <span style={{ color: "var(--color-crimson)" }}>⚠</span>
                <span style={{ color: "var(--color-dim)" }}>No codex — import one via the sidebar for accurate item data</span>
              </>
            )}
          </div>

          {/* Mode tabs */}
          <div>
            <p className={labelCls} style={labelStyle}>Mode</p>
            <div className="flex gap-1">
              {tabBtn("full",   "Full AI")}
              {tabBtn("semi",   "Semi-AI")}
              {tabBtn("manual", "Manual")}
            </div>
          </div>

          {/* ── MANUAL mode ─────────────────────────────────────────────── */}
          {mode === "manual" && (
            <>
              <div>
                <label className={labelCls} style={labelStyle}>Build JSON</label>
                <textarea
                  value={manualJson}
                  onChange={(e) => setManualJson(e.target.value)}
                  disabled={isRunning}
                  rows={14}
                  spellCheck={false}
                  className={`${inputCls} font-mono text-[11px] resize-y`}
                  style={inputStyle}
                />
                {manualError && (
                  <p className="text-[10px] mt-1" style={{ color: "var(--color-crimson)" }}>{manualError}</p>
                )}
              </div>
            </>
          )}

          {/* ── FULL AI + SEMI-AI shared fields ──────────────────────────── */}
          {mode !== "manual" && (
            <>
              {/* AI Provider */}
              <div>
                <p className={labelCls} style={labelStyle}>AI Provider</p>
                <div className="flex gap-1">
                  {providerBtn("claude")}
                  {providerBtn("pplx")}
                  {providerBtn("openrouter")}
                </div>
              </div>

              {/* Model (shown only for openrouter, or if user wants to override) */}
              {provider === "openrouter" && (
                <div>
                  <label className={labelCls} style={labelStyle}>
                    OpenRouter Model <span style={{ color: "var(--color-dim2)" }}>(required)</span>
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    disabled={isRunning}
                    placeholder="e.g. anthropic/claude-sonnet-4-5, openai/gpt-4o"
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>
              )}

              {/* Build concept */}
              <div>
                <label className={labelCls} style={labelStyle}>Build Concept *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isRunning}
                  rows={3}
                  placeholder="e.g. Fast DEX katana bleed build focusing on Uchigatana, light armor, and pyromancy for burst damage"
                  className={`${inputCls} resize-none`}
                  style={inputStyle}
                />
              </div>

              {/* Preferred weapon */}
              <div>
                <label className={labelCls} style={labelStyle}>
                  Preferred Weapon <span style={{ color: "var(--color-dim2)" }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={preferredWeapon}
                  onChange={(e) => setPreferredWeapon(e.target.value)}
                  disabled={isRunning}
                  placeholder="e.g. Uchigatana, Zweihander, Black Knight Halberd"
                  className={inputCls}
                  style={inputStyle}
                />
              </div>

              {/* Semi-AI extra fields */}
              {mode === "semi" && (
                <>
                  <div>
                    <label className={labelCls} style={labelStyle}>
                      Item Constraints <span style={{ color: "var(--color-dim2)" }}>(optional)</span>
                    </label>
                    <textarea
                      value={constraints}
                      onChange={(e) => setConstraints(e.target.value)}
                      disabled={isRunning}
                      rows={2}
                      placeholder="e.g. Must use Havel's Ring, avoid magic items, use Dragon Crest Shield"
                      className={`${inputCls} resize-none`}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <p className={labelCls} style={labelStyle}>Early Game Stats (Phase 1) — leave 0 to let AI decide</p>
                    <div className="grid grid-cols-4 gap-2">
                      {DS1R_STATS.map((stat) => (
                        <div key={stat}>
                          <label className="block text-[10px] mb-0.5 text-center" style={{ color: "var(--color-dim)" }}>{stat}</label>
                          <input
                            type="number"
                            min={0} max={99}
                            value={phase1Stats[stat] || ""}
                            onChange={(e) => updateStat("phase1", stat, e.target.value)}
                            disabled={isRunning}
                            placeholder="0"
                            className="w-full rounded px-2 py-1.5 text-sm text-center outline-none"
                            style={inputStyle}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className={labelCls} style={labelStyle}>Mid Game Stats (Phase 2) — leave 0 to let AI decide</p>
                    <div className="grid grid-cols-4 gap-2">
                      {DS1R_STATS.map((stat) => (
                        <div key={stat}>
                          <label className="block text-[10px] mb-0.5 text-center" style={{ color: "var(--color-dim)" }}>{stat}</label>
                          <input
                            type="number"
                            min={0} max={99}
                            value={phase2Stats[stat] || ""}
                            onChange={(e) => updateStat("phase2", stat, e.target.value)}
                            disabled={isRunning}
                            placeholder="0"
                            className="w-full rounded px-2 py-1.5 text-sm text-center outline-none"
                            style={inputStyle}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls} style={labelStyle}>
                      Starting Class <span style={{ color: "var(--color-dim2)" }}>(optional)</span>
                    </label>
                    <select
                      value={startingClass}
                      onChange={(e) => setStartingClass(e.target.value)}
                      disabled={isRunning}
                      className={inputCls}
                      style={{ ...inputStyle, appearance: "none" }}
                    >
                      <option value="">Let AI decide</option>
                      {DS1R_CLASSES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </>
          )}

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

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="px-5 py-3 border-t flex gap-2 justify-end flex-shrink-0" style={{ borderColor: "var(--color-card-hi)" }}>
          <button
            onClick={onClose}
            disabled={isRunning}
            className="text-xs px-4 py-2 rounded transition-all hover:opacity-80"
            style={{ backgroundColor: "var(--color-card-hi)", color: "var(--color-dim)" }}
          >
            Cancel
          </button>
          {mode === "manual" ? (
            <button
              onClick={handleManualSave}
              disabled={isRunning}
              className="text-xs px-5 py-2 rounded font-semibold transition-all hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: "var(--color-crimson)", color: "#fff" }}
            >
              {isRunning ? "Saving…" : "Save Build"}
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={isRunning || !description.trim() || (provider === "openrouter" && !model.trim())}
              className="text-xs px-5 py-2 rounded font-semibold transition-all hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: "var(--color-crimson)", color: "#fff" }}
            >
              {isRunning ? "Generating…" : "Generate Build"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
