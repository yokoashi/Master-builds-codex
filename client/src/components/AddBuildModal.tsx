import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Game, Build } from "@shared/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { hexToRgba, slugify } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Mode = "full" | "semi" | "manual";

interface ManualPhaseForm {
  stats: Record<string, string>;
  weapons: { n: string; st: string }[];
  armor: { n: string }[];
  acc: { n: string; ef: string }[];
  spells: { n: string; ef: string }[];
}

interface Props {
  game: Game;
  onClose: () => void;
  onCreated: (build: Build) => void;
}

export default function AddBuildModal({ game, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("full");
  const [description, setDescription] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Custom game state
  const [customGameName, setCustomGameName] = useState("");

  // Semi-AI state
  const [buildName, setBuildName] = useState("");
  const [playstyle, setPlaystyle] = useState("");
  const [preferredWeapon, setPreferredWeapon] = useState("");
  const [semiNotes, setSemiNotes] = useState("");
  const [semiAccent, setSemiAccent] = useState("");
  const [semiStats, setSemiStats] = useState<Record<string, number>>(
    Object.fromEntries(Object.keys(game.softCaps).map((k) => [k, 10]))
  );

  // Manual mode state
  const [manualLabel, setManualLabel] = useState("");
  const [manualSub, setManualSub] = useState("");
  const [manualIcon, setManualIcon] = useState("⚔️");
  const [manualCls, setManualCls] = useState("");
  const [manualPlaystyle, setManualPlaystyle] = useState("");
  const [manualPhaseIdx, setManualPhaseIdx] = useState(0);
  const [manualPhases, setManualPhases] = useState<ManualPhaseForm[]>([
    { stats: {}, weapons: [{ n: "", st: "" }], armor: [{ n: "" }], acc: [{ n: "", ef: "" }], spells: [] },
    { stats: {}, weapons: [{ n: "", st: "" }], armor: [{ n: "" }], acc: [{ n: "", ef: "" }], spells: [] },
    { stats: {}, weapons: [{ n: "", st: "" }], armor: [{ n: "" }], acc: [{ n: "", ef: "" }], spells: [] },
  ]);

  const statKeys = Object.keys(game.softCaps);
  const effectiveBudget = game.endgameBudget;
  const totalSemiStats = Object.values(semiStats).reduce((a, b) => a + b, 0);
  const budgetUsed = totalSemiStats;
  const budgetPct = Math.min(100, (budgetUsed / effectiveBudget) * 100);
  const overBudget = budgetUsed > effectiveBudget;

  function adjustStat(stat: string, delta: number) {
    setSemiStats((prev) => {
      const newVal = Math.max(0, Math.min(game.statMax, (prev[stat] ?? 0) + delta));
      if (delta > 0) {
        const newTotal =
          Object.values(prev).reduce((a, b) => a + b, 0) - (prev[stat] ?? 0) + newVal;
        if (newTotal > effectiveBudget) return prev;
      }
      return { ...prev, [stat]: newVal };
    });
  }

  function updateManualStat(phIdx: number, key: string, val: string) {
    setManualPhases((prev) => {
      const phases = [...prev];
      phases[phIdx] = { ...phases[phIdx], stats: { ...phases[phIdx].stats, [key]: val } };
      return phases;
    });
  }

  function updateManualItem<K extends keyof ManualPhaseForm>(
    phIdx: number,
    category: K,
    itemIdx: number,
    field: string,
    val: string
  ) {
    setManualPhases((prev) => {
      const phases = [...prev];
      const items = [...(phases[phIdx][category] as any[])];
      items[itemIdx] = { ...items[itemIdx], [field]: val };
      phases[phIdx] = { ...phases[phIdx], [category]: items };
      return phases;
    });
  }

  function addManualItem<K extends keyof ManualPhaseForm>(phIdx: number, category: K, blank: any) {
    setManualPhases((prev) => {
      const phases = [...prev];
      const items = [...(phases[phIdx][category] as any[]), blank];
      phases[phIdx] = { ...phases[phIdx], [category]: items };
      return phases;
    });
  }

  function removeManualItem<K extends keyof ManualPhaseForm>(phIdx: number, category: K, itemIdx: number) {
    setManualPhases((prev) => {
      const phases = [...prev];
      const items = [...(phases[phIdx][category] as any[])];
      items.splice(itemIdx, 1);
      phases[phIdx] = { ...phases[phIdx], [category]: items };
      return phases;
    });
  }

  const knowledgeQuery = useQuery<{ count: number }>({
    queryKey: [`/api/knowledge/${game.key}`],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const knowledgeBlock = ""; // backend builds this server-side
      // AbortController with a 3-minute total timeout for the full 3-step pipeline
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3 * 60 * 1000);

      const isCustom = customGameName.trim().length > 0;
      const targetGameKey = isCustom ? `custom_${Date.now()}` : game.key;
      const targetGameName = isCustom ? customGameName.trim() : game.name;

      // Build mode-specific description / constraints
      let buildDescription: string;
      let manualSkeleton: object | undefined;

      if (mode === "full") {
        buildDescription = description;
      } else if (mode === "semi") {
        const statTargets = Object.entries(semiStats)
          .filter(([, v]) => v > 0)
          .map(([k, v]) => `${k}:${v}`)
          .join(", ");
        const lines = [`Endgame stat targets: ${statTargets}`];
        if (buildName.trim()) lines.unshift(`Build name: ${buildName.trim()}`);
        if (playstyle.trim()) lines.push(`Playstyle: ${playstyle.trim()}`);
        if (preferredWeapon.trim()) lines.push(`Preferred main weapon: ${preferredWeapon.trim()}`);
        if (semiNotes.trim()) lines.push(`Additional notes: ${semiNotes.trim()}`);
        if (semiAccent.trim()) lines.push(`Use this accent color: ${semiAccent.trim()}`);
        lines.push(`Total stat budget: ~${effectiveBudget}. DO NOT exceed this across all stats combined.`);
        buildDescription = lines.join("\n");
      } else {
        // manual
        buildDescription = `Manual build: ${manualLabel.trim()} — ${manualPlaystyle.trim() || "(AI fills in playstyle)"}`;
        manualSkeleton = {
          label: manualLabel.trim(),
          sub: manualSub.trim() || "(generate fitting subtitle)",
          icon: manualIcon.trim() || "⚔️",
          cls: manualCls.trim() || "(pick best starting class)",
          playstyle: manualPlaystyle.trim() || "(write 3-4 sentences describing the playstyle)",
          user_phases: manualPhases.map((ph, i) => ({
            stage: ["Early", "Mid", "Endgame"][i],
            stats: Object.fromEntries(
              Object.entries(ph.stats)
                .filter(([, v]) => v !== "" && v != null)
                .map(([k, v]) => [k, parseInt(v) || 0])
            ),
            weapons: ph.weapons.filter((w) => w.n.trim()).map((w) => ({ n: w.n.trim(), st: w.st.trim() })),
            armor: ph.armor.filter((a) => a.n.trim()).map((a) => ({ n: a.n.trim() })),
            acc: ph.acc.filter((a) => a.n.trim()).map((a) => ({ n: a.n.trim(), ef: a.ef.trim() })),
            spells: ph.spells.filter((s) => s.n.trim()).map((s) => ({ n: s.n.trim(), ef: s.ef.trim() })),
          })),
        };
      }

      // Step 1
      setGenerationStatus("🔍 Step 1/3 — Generating metadata + early phases...");
      const step1Result = await apiRequest<{ ok: boolean; partial: Partial<Build>; error?: string }>(
        "POST",
        "/api/generate/step1",
        {
          gameKey: targetGameKey,
          gameName: targetGameName,
          buildDescription,
          statBudget: effectiveBudget,
          seedStats: mode === "semi" ? semiStats : undefined,
          preferredWeapon: mode === "semi" ? preferredWeapon : undefined,
          referenceUrl: referenceUrl || undefined,
          knowledgeBlock,
          mode,
          manualSkeleton,
          isCustomGame: isCustom,
        }
      );

      if (!step1Result.ok || !step1Result.partial) {
        throw new Error(step1Result.error ?? "Step 1 failed");
      }

      const partial = step1Result.partial;

      // Step 2
      setGenerationStatus("⚙️ Step 2/3 — Extended thinking: generating late-game + NG+ phases...");
      const step2Result = await apiRequest<{ ok: boolean; phases47: Build["phases"]; error?: string }>(
        "POST",
        "/api/generate/step2",
        {
          gameKey: targetGameKey,
          gameName: targetGameName,
          buildKey: partial.key ?? slugify(buildDescription.substring(0, 40)),
          partialBuild: partial,
          knowledgeBlock,
        }
      );

      if (!step2Result.ok) {
        throw new Error(step2Result.error ?? "Step 2 failed");
      }

      // Merge phases
      const phases3 = partial.phases ?? [];
      const phases47 = step2Result.phases47 ?? [];
      const allPhases = [...phases3, ...phases47].slice(0, 7);

      const partialWithAllPhases: Partial<Build> = { ...partial, phases: allPhases };

      // Step 3 (graceful)
      setGenerationStatus("📋 Step 3/3 — Generating similar builds + quick ref...");
      const step3Result = await apiRequest<{ ok: boolean; sim: Build["sim"]; oth: Build["oth"]; ref: Build["ref"] }>(
        "POST",
        "/api/generate/step3",
        {
          gameKey: targetGameKey,
          gameName: targetGameName,
          buildKey: partial.key ?? "generated",
          partialBuild: partialWithAllPhases,
          knowledgeBlock,
        }
      );

      // Deduplicate key — append timestamp suffix so re-generating a similar build
      // description doesn't collide with an existing build in the DB.
      const existingBuildsData = queryClient.getQueryData<Build[]>(["/api/builds"]) ?? [];
      const rawKey = partial.key ?? slugify(`${targetGameKey}-${Date.now()}`);
      const keyExists = existingBuildsData.some((b) => b.key === rawKey);
      const uniqueKey = keyExists ? `${rawKey}-${Date.now()}` : rawKey;

      // Assemble final build
      const finalBuild: Build = {
        key: uniqueKey,
        gameKey: targetGameKey,
        label: partial.label ?? "Generated Build",
        sub: partial.sub ?? "",
        icon: partial.icon ?? "⚔️",
        accent: (mode === "semi" && semiAccent.trim()) ? semiAccent.trim() : (partial.accent ?? "#d64545"),
        playstyle: partial.playstyle ?? "",
        cls: partial.cls ?? "Unknown",
        caps: partial.caps ?? [],
        weaponReq: partial.weaponReq ?? [],
        loadouts: partial.loadouts ?? null,
        phases: allPhases,
        sim: step3Result.sim ?? [],
        oth: step3Result.oth ?? [],
        ref: step3Result.ref ?? [],
        isAI: true,
      };

      // Finalize (save + extract facts)
      setGenerationStatus("💾 Saving...");
      try {
        await apiRequest("POST", "/api/generate/finalize", {
          ...finalBuild,
          _customGameName: isCustom ? targetGameName : undefined,
          _customGameKey: isCustom ? targetGameKey : undefined,
        });
      } finally {
        clearTimeout(timeoutId);
      }
      return finalBuild;
    },
    onSuccess: (build: Build) => {
      setGenerationStatus(null);
      queryClient.invalidateQueries({ queryKey: ["/api/builds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge/${game.key}`] });
      onCreated(build);
      toast({ title: `Build "${build.label}" created!` });
    },
    onError: (err: Error) => {
      setGenerationStatus(null);
      setError(err.message);
    },
  });

  const accentColor = "#d64545";
  const isManualBlocked = mode === "manual" && !manualLabel.trim();
  const isSemiBlocked = mode === "semi" && budgetUsed === 0;
  const isFullBlocked = mode === "full" && !description.trim();
  const isBlocked = isFullBlocked || isSemiBlocked || isManualBlocked || overBudget;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Add new build"
    >
      <div
        className="rounded-lg w-full overflow-y-auto"
        style={{
          background: "var(--color-card)",
          border: "1px solid #3a3028",
          maxWidth: 640,
          maxHeight: "90vh",
        }}
        data-testid="add-build-modal"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: "#3a3028" }}
        >
          <h2
            className="text-lg font-bold"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-bright)" }}
          >
            Add Build
          </h2>
          <button
            onClick={onClose}
            disabled={generateMutation.isPending}
            className="text-sm px-2 py-1 rounded hover:bg-white/5 transition-all"
            style={{ color: "var(--color-dim)" }}
            data-testid="btn-close-modal"
          >
            ✕
          </button>
        </div>

        {/* Mode pills */}
        <div className="flex gap-2 p-4 pb-0">
          {(["full", "semi", "manual"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              data-testid={`mode-pill-${m}`}
              className="px-3 py-1 rounded text-sm font-medium transition-all capitalize"
              style={
                mode === m
                  ? {
                      background: hexToRgba(accentColor, 0.15),
                      border: `1px solid ${accentColor}`,
                      color: accentColor,
                    }
                  : { border: "1px solid #3a3028", color: "var(--color-dim)" }
              }
            >
              {m === "full" ? "✦ Full AI" : m === "semi" ? "◐ Semi-AI" : "✎ Manual"}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* Knowledge status */}
          {knowledgeQuery.data && knowledgeQuery.data.count > 0 && (
            <div
              className="mb-4 px-3 py-2 rounded text-xs"
              style={{
                background: hexToRgba("#e8c05a", 0.07),
                border: `1px solid ${hexToRgba("#e8c05a", 0.2)}`,
                color: "var(--color-gold)",
              }}
            >
              🧠 {knowledgeQuery.data.count} cached facts will be used — less searching required
            </div>
          )}

          {/* ── Target Game (shared) ──────────────────────────────────────── */}
          <div className="mb-4">
            <label className="text-xs uppercase tracking-widest block mb-1" style={{ color: "var(--color-dim)" }}>
              Game — {game.name} selected
            </label>
            <input
              data-testid="input-custom-game"
              value={customGameName}
              onChange={(e) => setCustomGameName(e.target.value)}
              placeholder="…or type a different game name (e.g. 'Elden Ring', 'Bloodborne') to add it"
              className="w-full rounded px-3 py-2 text-sm"
              style={{
                background: "var(--color-card-hi)",
                border: `1px solid ${customGameName.trim() ? accentColor : "#3a3028"}`,
                color: "var(--color-text)",
              }}
            />
          </div>

          {/* ── Full AI mode ─────────────────────────────────────────────── */}
          {mode === "full" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-widest block mb-1" style={{ color: "var(--color-dim)" }}>
                  Build Description
                </label>
                <textarea
                  data-testid="input-build-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the build you want — weapon type, stat focus, playstyle..."
                  rows={4}
                  className="w-full rounded px-3 py-2 text-sm resize-none"
                  style={{
                    background: "var(--color-card-hi)",
                    border: "1px solid #3a3028",
                    color: "var(--color-text)",
                  }}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest block mb-1" style={{ color: "var(--color-dim)" }}>
                  Reference URL (optional)
                </label>
                <input
                  data-testid="input-reference-url"
                  type="url"
                  value={referenceUrl}
                  onChange={(e) => setReferenceUrl(e.target.value)}
                  placeholder="https://fextralife.com/... or wiki link"
                  className="w-full rounded px-3 py-2 text-sm"
                  style={{
                    background: "var(--color-card-hi)",
                    border: "1px solid #3a3028",
                    color: "var(--color-text)",
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Semi-AI mode ─────────────────────────────────────────────── */}
          {mode === "semi" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase tracking-widest block mb-1" style={{ color: "var(--color-dim)" }}>
                    Build Name
                  </label>
                  <input
                    data-testid="input-build-name"
                    value={buildName}
                    onChange={(e) => setBuildName(e.target.value)}
                    placeholder="e.g. Shadow Dancer"
                    className="w-full rounded px-3 py-2 text-sm"
                    style={{
                      background: "var(--color-card-hi)",
                      border: "1px solid #3a3028",
                      color: "var(--color-text)",
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest block mb-1" style={{ color: "var(--color-dim)" }}>
                    Preferred Weapon
                  </label>
                  <input
                    data-testid="input-preferred-weapon"
                    value={preferredWeapon}
                    onChange={(e) => setPreferredWeapon(e.target.value)}
                    placeholder="e.g. Katana, Greatsword..."
                    className="w-full rounded px-3 py-2 text-sm"
                    style={{
                      background: "var(--color-card-hi)",
                      border: "1px solid #3a3028",
                      color: "var(--color-text)",
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest block mb-1" style={{ color: "var(--color-dim)" }}>
                  Playstyle Notes
                </label>
                <input
                  data-testid="input-playstyle"
                  value={playstyle}
                  onChange={(e) => setPlaystyle(e.target.value)}
                  placeholder="e.g. Fast-rolling bleed assassin with critical hit focus"
                  className="w-full rounded px-3 py-2 text-sm"
                  style={{
                    background: "var(--color-card-hi)",
                    border: "1px solid #3a3028",
                    color: "var(--color-text)",
                  }}
                />
              </div>

              {/* Stat steppers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-widest" style={{ color: "var(--color-dim)" }}>
                    Endgame Stat Targets
                  </label>
                  <span
                    className="text-xs"
                    style={{ color: overBudget ? "var(--color-crimson)" : "var(--color-green)" }}
                  >
                    {budgetUsed} / {effectiveBudget} pts
                    {overBudget ? " (over budget!)" : ""}
                  </span>
                </div>

                {/* Budget bar */}
                <div className="mb-3 h-1.5 rounded-full" style={{ background: "#2a2318" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${budgetPct}%`,
                      background: overBudget
                        ? "var(--color-crimson)"
                        : budgetPct > 80
                        ? "var(--color-gold)"
                        : "var(--color-green)",
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(semiStats).map(([stat, val]) => {
                    const cap = game.softCaps[stat];
                    const atCap = cap !== null && val >= cap;
                    return (
                      <div key={stat} className="flex items-center gap-2">
                        <span
                          className="w-8 text-xs font-medium flex-shrink-0"
                          style={{ color: atCap ? accentColor : "var(--color-dim)" }}
                        >
                          {stat}
                          {atCap && " ✓"}
                        </span>
                        <button
                          data-testid={`stat-minus-${stat}`}
                          onClick={() => adjustStat(stat, -5)}
                          disabled={val <= 0}
                          className="w-6 h-6 rounded text-xs disabled:opacity-30 hover:bg-white/10 transition-all flex-shrink-0"
                          style={{ border: "1px solid #3a3028", color: "var(--color-dim)" }}
                        >
                          −
                        </button>
                        <span
                          className="w-6 text-center text-sm font-medium flex-shrink-0"
                          style={{ color: "var(--color-bright)" }}
                          data-testid={`stat-value-${stat}`}
                        >
                          {val}
                        </span>
                        <button
                          data-testid={`stat-plus-${stat}`}
                          onClick={() => adjustStat(stat, 5)}
                          disabled={val >= game.statMax || overBudget}
                          className="w-6 h-6 rounded text-xs disabled:opacity-30 hover:bg-white/10 transition-all flex-shrink-0"
                          style={{ border: "1px solid #3a3028", color: "var(--color-dim)" }}
                        >
                          +
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Additional notes + accent */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase tracking-widest block mb-1" style={{ color: "var(--color-dim)" }}>
                    Additional Notes
                  </label>
                  <textarea
                    data-testid="input-semi-notes"
                    value={semiNotes}
                    onChange={(e) => setSemiNotes(e.target.value)}
                    placeholder="e.g. no spells, must use shield, PvE only..."
                    rows={2}
                    className="w-full rounded px-3 py-2 text-sm resize-none"
                    style={{
                      background: "var(--color-card-hi)",
                      border: "1px solid #3a3028",
                      color: "var(--color-text)",
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest block mb-1" style={{ color: "var(--color-dim)" }}>
                    Accent Color (optional)
                  </label>
                  <input
                    data-testid="input-semi-accent"
                    value={semiAccent}
                    onChange={(e) => setSemiAccent(e.target.value)}
                    placeholder="#hex or color name"
                    className="w-full rounded px-3 py-2 text-sm"
                    style={{
                      background: "var(--color-card-hi)",
                      border: "1px solid #3a3028",
                      color: "var(--color-text)",
                    }}
                  />
                  {semiAccent.trim() && (
                    <div
                      className="mt-1 h-1.5 rounded-full"
                      style={{ background: semiAccent.trim() }}
                    />
                  )}
                </div>
              </div>

              {/* Reference URL for semi mode */}
              <div>
                <label className="text-xs uppercase tracking-widest block mb-1" style={{ color: "var(--color-dim)" }}>
                  Reference URL (optional)
                </label>
                <input
                  data-testid="input-reference-url-semi"
                  type="url"
                  value={referenceUrl}
                  onChange={(e) => setReferenceUrl(e.target.value)}
                  placeholder="https://fextralife.com/... or wiki link"
                  className="w-full rounded px-3 py-2 text-sm"
                  style={{
                    background: "var(--color-card-hi)",
                    border: "1px solid #3a3028",
                    color: "var(--color-text)",
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Manual mode ──────────────────────────────────────────────── */}
          {mode === "manual" && (
            <div className="space-y-3">
              <div
                className="px-3 py-2 rounded text-xs"
                style={{
                  background: hexToRgba(accentColor, 0.07),
                  border: `1px solid ${hexToRgba(accentColor, 0.2)}`,
                  color: "var(--color-text)",
                }}
              >
                You define the skeleton — name, items, stats per stage. AI fills in damage estimates, locations, upgrade paths, descriptions, NG+ phase, and variants.
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs uppercase tracking-widest block mb-1" style={{ color: "var(--color-dim)" }}>
                    Build Name *
                  </label>
                  <input
                    data-testid="input-manual-label"
                    value={manualLabel}
                    onChange={(e) => setManualLabel(e.target.value)}
                    placeholder="e.g. Iron Vanguard"
                    className="w-full rounded px-3 py-2 text-sm"
                    style={{
                      background: "var(--color-card-hi)",
                      border: `1px solid ${manualLabel.trim() ? accentColor : "#3a3028"}`,
                      color: "var(--color-text)",
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest block mb-1" style={{ color: "var(--color-dim)" }}>
                    Icon
                  </label>
                  <input
                    data-testid="input-manual-icon"
                    value={manualIcon}
                    onChange={(e) => setManualIcon(e.target.value)}
                    maxLength={3}
                    className="w-full rounded px-3 py-2 text-center"
                    style={{
                      background: "var(--color-card-hi)",
                      border: "1px solid #3a3028",
                      color: "var(--color-text)",
                      fontSize: "1.2rem",
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs uppercase tracking-widest block mb-1" style={{ color: "var(--color-dim)" }}>
                    Subtitle
                  </label>
                  <input
                    data-testid="input-manual-sub"
                    value={manualSub}
                    onChange={(e) => setManualSub(e.target.value)}
                    placeholder="e.g. STR/RAD Bleed Build"
                    className="w-full rounded px-3 py-2 text-sm"
                    style={{
                      background: "var(--color-card-hi)",
                      border: "1px solid #3a3028",
                      color: "var(--color-text)",
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest block mb-1" style={{ color: "var(--color-dim)" }}>
                    Starting Class
                  </label>
                  <input
                    data-testid="input-manual-cls"
                    value={manualCls}
                    onChange={(e) => setManualCls(e.target.value)}
                    placeholder="Or leave for AI"
                    className="w-full rounded px-3 py-2 text-sm"
                    style={{
                      background: "var(--color-card-hi)",
                      border: "1px solid #3a3028",
                      color: "var(--color-text)",
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest block mb-1" style={{ color: "var(--color-dim)" }}>
                  Playstyle Description
                </label>
                <textarea
                  data-testid="input-manual-playstyle"
                  value={manualPlaystyle}
                  onChange={(e) => setManualPlaystyle(e.target.value)}
                  placeholder="Describe your vision, or leave blank for AI to generate..."
                  rows={2}
                  className="w-full rounded px-3 py-2 text-sm resize-none"
                  style={{
                    background: "var(--color-card-hi)",
                    border: "1px solid #3a3028",
                    color: "var(--color-text)",
                  }}
                />
              </div>

              {/* Phase tabs */}
              <div>
                <label className="text-xs uppercase tracking-widest block mb-2" style={{ color: "var(--color-dim)" }}>
                  Stages
                </label>
                <div className="flex gap-2 mb-3">
                  {["Early Game", "Mid Game", "Endgame"].map((name, i) => (
                    <button
                      key={i}
                      onClick={() => setManualPhaseIdx(i)}
                      className="flex-1 py-1.5 rounded text-xs font-medium transition-all"
                      style={
                        manualPhaseIdx === i
                          ? {
                              background: hexToRgba(accentColor, 0.15),
                              border: `1px solid ${accentColor}`,
                              color: accentColor,
                            }
                          : { border: "1px solid #3a3028", color: "var(--color-dim)" }
                      }
                    >
                      {name}
                    </button>
                  ))}
                </div>

                {/* Active phase form */}
                {(() => {
                  const ph = manualPhases[manualPhaseIdx];
                  return (
                    <div
                      className="rounded p-3 space-y-3"
                      style={{ background: "var(--color-card-hi)", border: "1px solid #2a2318" }}
                    >
                      {/* Stats */}
                      <div>
                        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--color-dim)" }}>
                          Stats <span style={{ fontWeight: 400, textTransform: "none" }}>(blank = AI infers)</span>
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {statKeys.map((k) => (
                            <div key={k} className="flex flex-col items-center">
                              <span className="text-xs mb-1" style={{ color: "var(--color-dim)" }}>{k}</span>
                              <input
                                type="number"
                                min="0"
                                max={game.statMax}
                                value={ph.stats[k] ?? ""}
                                onChange={(e) => updateManualStat(manualPhaseIdx, k, e.target.value)}
                                placeholder="–"
                                className="w-full rounded text-center text-sm py-1"
                                style={{
                                  background: "var(--color-card)",
                                  border: `1px solid ${ph.stats[k] ? hexToRgba(accentColor, 0.5) : "#2a2318"}`,
                                  color: "var(--color-bright)",
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Weapons */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs uppercase tracking-widest" style={{ color: "var(--color-dim)" }}>Weapons</span>
                          <button
                            onClick={() => addManualItem(manualPhaseIdx, "weapons", { n: "", st: "" })}
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ border: `1px solid ${hexToRgba(accentColor, 0.4)}`, color: accentColor }}
                          >+</button>
                        </div>
                        {ph.weapons.map((w, i) => (
                          <div key={i} className="flex gap-1.5 mb-1.5">
                            <input
                              value={w.n}
                              onChange={(e) => updateManualItem(manualPhaseIdx, "weapons", i, "n", e.target.value)}
                              placeholder="Weapon name"
                              className="flex-1 rounded px-2 py-1 text-sm"
                              style={{ background: "var(--color-card)", border: "1px solid #2a2318", color: "var(--color-text)" }}
                            />
                            <input
                              value={w.st}
                              onChange={(e) => updateManualItem(manualPhaseIdx, "weapons", i, "st", e.target.value)}
                              placeholder="Status"
                              className="w-20 rounded px-2 py-1 text-sm"
                              style={{ background: "var(--color-card)", border: "1px solid #2a2318", color: "var(--color-text)" }}
                            />
                            {ph.weapons.length > 1 && (
                              <button
                                onClick={() => removeManualItem(manualPhaseIdx, "weapons", i)}
                                className="px-2 rounded text-sm"
                                style={{ border: "1px solid #2a2318", color: "var(--color-dim)" }}
                              >×</button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Armor */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs uppercase tracking-widest" style={{ color: "var(--color-dim)" }}>Armor</span>
                          <button
                            onClick={() => addManualItem(manualPhaseIdx, "armor", { n: "" })}
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ border: `1px solid ${hexToRgba(accentColor, 0.4)}`, color: accentColor }}
                          >+</button>
                        </div>
                        {ph.armor.map((a, i) => (
                          <div key={i} className="flex gap-1.5 mb-1.5">
                            <input
                              value={a.n}
                              onChange={(e) => updateManualItem(manualPhaseIdx, "armor", i, "n", e.target.value)}
                              placeholder="Armor set name"
                              className="flex-1 rounded px-2 py-1 text-sm"
                              style={{ background: "var(--color-card)", border: "1px solid #2a2318", color: "var(--color-text)" }}
                            />
                            {ph.armor.length > 1 && (
                              <button
                                onClick={() => removeManualItem(manualPhaseIdx, "armor", i)}
                                className="px-2 rounded text-sm"
                                style={{ border: "1px solid #2a2318", color: "var(--color-dim)" }}
                              >×</button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Accessories */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs uppercase tracking-widest" style={{ color: "var(--color-dim)" }}>Accessories / Rings</span>
                          <button
                            onClick={() => addManualItem(manualPhaseIdx, "acc", { n: "", ef: "" })}
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ border: `1px solid ${hexToRgba(accentColor, 0.4)}`, color: accentColor }}
                          >+</button>
                        </div>
                        {ph.acc.map((a, i) => (
                          <div key={i} className="flex gap-1.5 mb-1.5">
                            <input
                              value={a.n}
                              onChange={(e) => updateManualItem(manualPhaseIdx, "acc", i, "n", e.target.value)}
                              placeholder="Ring / accessory name"
                              className="flex-1 rounded px-2 py-1 text-sm"
                              style={{ background: "var(--color-card)", border: "1px solid #2a2318", color: "var(--color-text)" }}
                            />
                            <input
                              value={a.ef}
                              onChange={(e) => updateManualItem(manualPhaseIdx, "acc", i, "ef", e.target.value)}
                              placeholder="Effect"
                              className="flex-1 rounded px-2 py-1 text-sm"
                              style={{ background: "var(--color-card)", border: "1px solid #2a2318", color: "var(--color-text)" }}
                            />
                            {ph.acc.length > 1 && (
                              <button
                                onClick={() => removeManualItem(manualPhaseIdx, "acc", i)}
                                className="px-2 rounded text-sm"
                                style={{ border: "1px solid #2a2318", color: "var(--color-dim)" }}
                              >×</button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Spells */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs uppercase tracking-widest" style={{ color: "var(--color-dim)" }}>Spells / Buffs</span>
                          <button
                            onClick={() => addManualItem(manualPhaseIdx, "spells", { n: "", ef: "" })}
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ border: `1px solid ${hexToRgba(accentColor, 0.4)}`, color: accentColor }}
                          >+</button>
                        </div>
                        {ph.spells.length === 0 && (
                          <p className="text-xs italic" style={{ color: "var(--color-dim)" }}>No spells — click + to add</p>
                        )}
                        {ph.spells.map((s, i) => (
                          <div key={i} className="flex gap-1.5 mb-1.5">
                            <input
                              value={s.n}
                              onChange={(e) => updateManualItem(manualPhaseIdx, "spells", i, "n", e.target.value)}
                              placeholder="Spell name"
                              className="flex-1 rounded px-2 py-1 text-sm"
                              style={{ background: "var(--color-card)", border: "1px solid #2a2318", color: "var(--color-text)" }}
                            />
                            <input
                              value={s.ef}
                              onChange={(e) => updateManualItem(manualPhaseIdx, "spells", i, "ef", e.target.value)}
                              placeholder="Effect"
                              className="flex-1 rounded px-2 py-1 text-sm"
                              style={{ background: "var(--color-card)", border: "1px solid #2a2318", color: "var(--color-text)" }}
                            />
                            <button
                              onClick={() => removeManualItem(manualPhaseIdx, "spells", i)}
                              className="px-2 rounded text-sm"
                              style={{ border: "1px solid #2a2318", color: "var(--color-dim)" }}
                            >×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="mt-3 px-3 py-2 rounded text-xs"
              style={{
                background: hexToRgba("#d64545", 0.1),
                border: "1px solid #d64545",
                color: "var(--color-crimson)",
              }}
              data-testid="generation-error"
            >
              {error}
            </div>
          )}

          {/* Generation status */}
          {generationStatus && (
            <div
              className="mt-3 px-3 py-2 rounded text-xs"
              style={{
                background: hexToRgba("#e8c05a", 0.08),
                border: `1px solid ${hexToRgba("#e8c05a", 0.2)}`,
                color: "var(--color-gold)",
              }}
              data-testid="generation-status"
            >
              {generationStatus}
            </div>
          )}

          {/* Generate button */}
          <button
            data-testid="btn-generate"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || isBlocked}
            className="mt-4 w-full py-2.5 rounded font-medium text-sm transition-all disabled:opacity-40"
            style={{
              background: hexToRgba(accentColor, 0.15),
              border: `1px solid ${accentColor}`,
              color: accentColor,
            }}
          >
            {generateMutation.isPending
              ? "Generating..."
              : mode === "manual"
              ? "✎ Build It with AI"
              : mode === "semi"
              ? "◐ Generate from Targets"
              : "✦ Generate Full Build"}
          </button>
          {generateMutation.isPending && (
            <p className="mt-2 text-xs text-center italic" style={{ color: "var(--color-dim)" }}>
              Running 3 AI calls — usually 30–90 seconds.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
