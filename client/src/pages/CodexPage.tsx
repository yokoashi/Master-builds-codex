import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Game, Build } from "@shared/types";
import { cn, hexToRgba } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import BuildTab from "@/components/BuildTab";
import MaterialsTab from "@/components/MaterialsTab";
import SimilarTab from "@/components/SimilarTab";
import OtherTab from "@/components/OtherTab";
import QuickRefTab from "@/components/QuickRefTab";
import AddBuildModal from "@/components/AddBuildModal";
import DeleteModal from "@/components/DeleteModal";

const TABS = ["Your Build", "Materials", "Similar", "Other OP", "Quick Ref"] as const;
type Tab = typeof TABS[number];

export default function CodexPage() {
  const { toast } = useToast();
  const [selectedGameKey, setSelectedGameKey] = useState<string>("lotf");
  const [selectedBuildKey, setSelectedBuildKey] = useState<string>("crimson-reaper");
  const [activeTab, setActiveTab] = useState<Tab>("Your Build");
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletePending, setDeletePending] = useState<Build | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  // Keep selection in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const g = params.get("game");
    const b = params.get("build");
    if (g) setSelectedGameKey(g);
    if (b) setSelectedBuildKey(b);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("game", selectedGameKey);
    url.searchParams.set("build", selectedBuildKey);
    window.history.replaceState({}, "", url.toString());
  }, [selectedGameKey, selectedBuildKey]);

  const { data: games = [] } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  const { data: allBuilds = [] } = useQuery<Build[]>({
    queryKey: ["/api/builds"],
  });

  const { data: knowledgeInfo } = useQuery<{
    count: number;
    patchNote: string | null;
    updatedAt: string | null;
  }>({
    queryKey: [`/api/knowledge/${selectedGameKey}`],
  });

  const builds = allBuilds.filter((b) => b.gameKey === selectedGameKey);
  const currentGame = games.find((g) => g.key === selectedGameKey);
  const currentBuild = builds.find((b) => b.key === selectedBuildKey) ?? builds[0] ?? null;

  // When switching games, auto-select first build of that game
  useEffect(() => {
    const gameBuild = allBuilds.find((b) => b.gameKey === selectedGameKey);
    if (gameBuild && !allBuilds.find((b) => b.key === selectedBuildKey && b.gameKey === selectedGameKey)) {
      setSelectedBuildKey(gameBuild.key);
    }
  }, [selectedGameKey, allBuilds]);

  const deleteMutation = useMutation({
    mutationFn: (key: string) => apiRequest("DELETE", `/api/builds/${key}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/builds"] });
      setDeletePending(null);
      const remaining = builds.filter((b) => b.key !== currentBuild?.key);
      if (remaining.length > 0) setSelectedBuildKey(remaining[0].key);
      toast({ title: "Build deleted" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ patchVersion: string; count: number }>("POST", "/api/update", {
        gameKey: selectedGameKey,
        gameName: currentGame?.name ?? selectedGameKey,
        knowledgeBlock: "",
      }),
    onMutate: () => setUpdateStatus("⟳ Checking..."),
    onSuccess: (data: { patchVersion: string; count: number }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge/${selectedGameKey}`] });
      setUpdateStatus(`✓ Updated (${data.patchVersion}) — ${data.count} changes cached`);
      setTimeout(() => setUpdateStatus(null), 6000);
    },
    onError: (err: Error) => {
      setUpdateStatus(`✗ ${err.message}`);
      setTimeout(() => setUpdateStatus(null), 5000);
    },
  });

  const exportMutation = useMutation({
    mutationFn: () => apiRequest<Blob>("POST", "/api/export"),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `master-build-codex-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Exported successfully" });
    },
  });

  function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        await apiRequest("POST", "/api/import", data);
        queryClient.invalidateQueries({ queryKey: ["/api/builds"] });
        queryClient.invalidateQueries({ queryKey: ["/api/games"] });
        toast({ title: "Import successful" });
      } catch (err) {
        toast({
          title: "Import failed",
          description: err instanceof Error ? err.message : "Invalid file",
          variant: "destructive",
        });
      }
    };
    input.click();
  }

  function handleReset() {
    // This is handled by the reset button which shows a modal
    // For now just reload seed data by clearing dynamic builds
    toast({ title: "Reset: use the delete button on individual builds to remove them." });
  }

  const accent = currentBuild?.accent ?? "#d64545";
  const accentBg = hexToRgba(accent, 0.08);
  const accentBorder = hexToRgba(accent, 0.3);

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      <div className="mx-auto px-4 py-8" style={{ maxWidth: 920 }}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="mb-8">
          <p className="text-xs tracking-[0.25em] uppercase mb-1" style={{ color: accent, fontFamily: "var(--font-display)" }}>
            ✦ AI-Powered Build Guide
          </p>
          <h1
            className="text-4xl font-bold mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-bright)" }}
          >
            MASTER BUILD CODEX
          </h1>
          <p className="text-sm mb-4" style={{ color: "var(--color-dim)" }}>
            OP Soulslike Builds — AI-Generated &amp; Community-Verified
          </p>
          <hr style={{ borderColor: accentBorder }} />
        </header>

        {/* ── Game Selector ───────────────────────────────────────────────── */}
        <section className="mb-4" aria-label="Game selector">
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--color-dim)" }}>
            Game
          </p>
          <div className="flex flex-wrap gap-2" data-testid="game-selector">
            {games.map((game) => {
              const isActive = game.key === selectedGameKey;
              return (
                <button
                  key={game.key}
                  data-testid={`game-btn-${game.key}`}
                  onClick={() => setSelectedGameKey(game.key)}
                  className={cn(
                    "px-3 py-1.5 rounded text-sm font-medium transition-all",
                    isActive
                      ? "text-white"
                      : "hover:bg-white/5"
                  )}
                  style={
                    isActive
                      ? { background: accentBg, border: `1px solid ${accentBorder}`, color: accent }
                      : { border: "1px solid #2a2318", color: "var(--color-dim)" }
                  }
                >
                  {game.icon} {game.name}
                  {game.isCustom && (
                    <span className="ml-1 text-xs" style={{ color: "var(--color-gold)" }}>✦ AI</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Build Selector ─────────────────────────────────────────────── */}
        <section className="mb-4" aria-label="Build selector">
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--color-dim)" }}>
            Build
          </p>
          <div className="flex flex-wrap gap-2" data-testid="build-selector">
            {builds.map((build) => {
              const isActive = build.key === selectedBuildKey;
              return (
                <button
                  key={build.key}
                  data-testid={`build-btn-${build.key}`}
                  onClick={() => setSelectedBuildKey(build.key)}
                  className={cn(
                    "px-3 py-1.5 rounded text-sm font-medium transition-all",
                    isActive ? "" : "hover:bg-white/5"
                  )}
                  style={
                    isActive
                      ? {
                          background: hexToRgba(build.accent, 0.12),
                          border: `1px solid ${hexToRgba(build.accent, 0.4)}`,
                          color: build.accent,
                        }
                      : { border: "1px solid #2a2318", color: "var(--color-dim)" }
                  }
                >
                  {build.icon} {build.label}
                  {build.isAI && (
                    <span className="ml-1 text-xs" style={{ color: "var(--color-gold)" }}>✦ AI</span>
                  )}
                </button>
              );
            })}
            {builds.length === 0 && (
              <span className="text-sm" style={{ color: "var(--color-dim)" }}>
                No builds for this game yet.
              </span>
            )}
          </div>
        </section>

        {/* ── Action Buttons ─────────────────────────────────────────────── */}
        <section className="flex flex-wrap gap-2 mb-4">
          <button
            data-testid="btn-add-build"
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 rounded text-sm font-medium transition-all hover:bg-white/10"
            style={{ border: "1px solid var(--color-crimson)", color: "var(--color-crimson)" }}
          >
            + Add Build
          </button>
          <button
            data-testid="btn-update"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="px-3 py-1.5 rounded text-sm font-medium transition-all hover:bg-white/5 disabled:opacity-50"
            style={{ border: "1px solid #3a3028", color: "var(--color-dim)" }}
          >
            ↻ Update
          </button>
          <button
            data-testid="btn-export"
            onClick={() => exportMutation.mutate()}
            className="px-3 py-1.5 rounded text-sm font-medium transition-all hover:bg-white/5"
            style={{ border: "1px solid #3a3028", color: "var(--color-dim)" }}
          >
            💾 Save
          </button>
          <button
            data-testid="btn-import"
            onClick={handleImport}
            className="px-3 py-1.5 rounded text-sm font-medium transition-all hover:bg-white/5"
            style={{ border: "1px solid #3a3028", color: "var(--color-dim)" }}
          >
            📂 Load
          </button>
          <button
            data-testid="btn-reset"
            onClick={handleReset}
            className="px-3 py-1.5 rounded text-sm font-medium transition-all hover:bg-white/5"
            style={{ border: "1px solid #3a3028", color: "var(--color-dim)" }}
          >
            ↺ Reset
          </button>
        </section>

        {/* ── Knowledge Cache Status Bar ─────────────────────────────────── */}
        {(knowledgeInfo && knowledgeInfo.count > 0) && (
          <div
            className="mb-4 px-3 py-2 rounded text-xs flex items-center gap-2"
            style={{ background: hexToRgba("#e8c05a", 0.08), border: `1px solid ${hexToRgba("#e8c05a", 0.2)}` }}
            data-testid="cache-status-bar"
          >
            <span>🧠</span>
            <span style={{ color: "var(--color-gold)" }}>
              {knowledgeInfo.count} facts cached for {currentGame?.name ?? selectedGameKey}
              {knowledgeInfo.patchNote && ` · ${knowledgeInfo.patchNote}`}
            </span>
            {updateStatus && (
              <span className="ml-2" style={{ color: "var(--color-dim)" }}>
                {updateStatus}
              </span>
            )}
          </div>
        )}
        {updateStatus && (!knowledgeInfo || knowledgeInfo.count === 0) && (
          <div
            className="mb-4 px-3 py-2 rounded text-xs"
            style={{ background: hexToRgba("#e8c05a", 0.05), border: `1px solid ${hexToRgba("#e8c05a", 0.15)}` }}
          >
            <span style={{ color: "var(--color-dim)" }}>{updateStatus}</span>
          </div>
        )}

        {/* ── Tab Bar ────────────────────────────────────────────────────── */}
        <div
          className="flex gap-0 mb-6 border-b"
          style={{ borderColor: "#2a2318" }}
          role="tablist"
          aria-label="Build sections"
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              data-testid={`tab-${tab.replace(/ /g, "-").toLowerCase()}`}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px",
                activeTab === tab ? "" : "hover:text-white/70 border-transparent"
              )}
              style={
                activeTab === tab
                  ? { color: accent, borderColor: accent }
                  : { color: "var(--color-dim)" }
              }
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Tab Content ────────────────────────────────────────────────── */}
        {currentBuild && currentGame ? (
          <div role="tabpanel">
            {activeTab === "Your Build" && (
              <BuildTab
                build={currentBuild}
                game={currentGame}
                onDelete={() => setDeletePending(currentBuild)}
              />
            )}
            {activeTab === "Materials" && (
              <MaterialsTab game={currentGame} accent={accent} />
            )}
            {activeTab === "Similar" && (
              <SimilarTab build={currentBuild} accent={accent} />
            )}
            {activeTab === "Other OP" && (
              <OtherTab build={currentBuild} accent={accent} />
            )}
            {activeTab === "Quick Ref" && (
              <QuickRefTab build={currentBuild} accent={accent} />
            )}
          </div>
        ) : (
          <div className="text-center py-16" style={{ color: "var(--color-dim)" }}>
            <p className="text-lg mb-2">No builds found for this game.</p>
            <p className="text-sm">Click <strong>+ Add Build</strong> to generate one with AI.</p>
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showAddModal && currentGame && (
        <AddBuildModal
          game={currentGame}
          onClose={() => setShowAddModal(false)}
          onCreated={(build) => {
            queryClient.invalidateQueries({ queryKey: ["/api/builds"] });
            queryClient.invalidateQueries({ queryKey: [`/api/knowledge/${currentGame.key}`] });
            setSelectedBuildKey(build.key);
            setShowAddModal(false);
          }}
        />
      )}

      {deletePending && (
        <DeleteModal
          build={deletePending}
          onConfirm={() => deleteMutation.mutate(deletePending.key)}
          onCancel={() => setDeletePending(null)}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
