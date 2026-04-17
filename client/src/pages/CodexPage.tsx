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
import KnowledgeViewer from "@/components/KnowledgeViewer";
import LearnProgress from "@/components/LearnProgress";

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
  const [learnHintUrl, setLearnHintUrl] = useState("");
  const [showLearnInput, setShowLearnInput] = useState(false);
  const [showKnowledge, setShowKnowledge] = useState(false);
  const [showLearnProgress, setShowLearnProgress] = useState(false);

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

  useEffect(() => {
    const gameBuild = allBuilds.find((b) => b.gameKey === selectedGameKey);
    if (gameBuild && !allBuilds.find((b) => b.key === selectedBuildKey && b.gameKey === selectedGameKey)) {
      setSelectedBuildKey(gameBuild.key);
    }
  }, [selectedGameKey, allBuilds]);

  const deleteMutation = useMutation({
    mutationFn: (key: string) => apiRequest("DELETE", `/api/builds/${key}`),
    onSuccess: (_data, deletedKey) => {
      queryClient.invalidateQueries({ queryKey: ["/api/builds"] }).then(() => {
        const fresh = queryClient.getQueryData<Build[]>(["/api/builds"]) ?? [];
        const remaining = fresh.filter(
          (b) => b.gameKey === selectedGameKey && b.key !== deletedKey
        );
        if (remaining.length > 0) setSelectedBuildKey(remaining[0].key);
      });
      setDeletePending(null);
      toast({ title: "Build deleted" });
    },
  });

  const learnMutation = useMutation({
    mutationFn: () =>
      apiRequest<{
        total: number;
        breakdown: Record<string, number>;
        preFacts?: number;
        preSources?: string[];
      }>("POST", "/api/learn", {
        gameKey: selectedGameKey,
        gameName: currentGame?.name ?? selectedGameKey,
        ...(learnHintUrl.trim() ? { hintUrl: learnHintUrl.trim() } : {}),
      }),
    onMutate: () => {
      setShowLearnInput(false);
      setShowLearnProgress(true);
      setUpdateStatus(null);
    },
    onSuccess: (data: {
      total: number;
      breakdown: Record<string, number>;
      preFacts?: number;
      preSources?: string[];
    }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge/${selectedGameKey}`] });
      const bd = Object.entries(data.breakdown).map(([k, v]) => `${k}:${v}`).join(" ");
      const preNote = data.preFacts ? ` (+${data.preFacts} wiki)` : "";
      setUpdateStatus(`✓ Learned ${data.total}${preNote} — ${bd}`);
      setTimeout(() => setUpdateStatus(null), 14000);
    },
    onError: (err: Error) => {
      setUpdateStatus(`✗ Learn failed: ${err.message}`);
      setTimeout(() => setUpdateStatus(null), 6000);
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
      setUpdateStatus(`✓ Updated (${data.patchVersion}) — ${data.count} changes`);
      setTimeout(() => setUpdateStatus(null), 6000);
    },
    onError: (err: Error) => {
      setUpdateStatus(`✗ ${err.message}`);
      setTimeout(() => setUpdateStatus(null), 5000);
    },
  });

  type ExportData = {
    version: number;
    exportedAt: string;
    hiddenSeedBuilds: string[];
    dynamicGames: Game[];
    dynamicBuilds: Build[];
  };

  const exportMutation = useMutation({
    mutationFn: () => apiRequest<ExportData>("POST", "/api/export"),
    onSuccess: (data: ExportData) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
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

  const accent = currentBuild?.accent ?? "#d64545";

  // Group builds by game for sidebar
  const buildsByGame = games.map((game) => ({
    game,
    builds: allBuilds.filter((b) => b.gameKey === game.key),
  }));

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
      {/* ── Menu Bar ──────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-0.5 text-xs flex-shrink-0 select-none"
        style={{
          background: "var(--color-card)",
          borderBottom: "1px solid #2a2318",
          minHeight: 28,
        }}
      >
        <div className="flex items-center gap-4">
          {/* Patch/version note */}
          <span style={{ color: "var(--color-dim)" }}>
            {knowledgeInfo && knowledgeInfo.count > 0
              ? `✦ ${knowledgeInfo.count} facts cached for ${currentGame?.name ?? selectedGameKey}${knowledgeInfo.patchNote ? ` · ${knowledgeInfo.patchNote}` : ""}`
              : `Master Build Codex`}
          </span>
          {updateStatus && (
            <span style={{ color: "var(--color-gold)" }}>{updateStatus}</span>
          )}
        </div>
        {/* Menu items */}
        <div className="flex items-center gap-4" style={{ color: "var(--color-dim)" }}>
          {[
            { label: "File", items: [] },
            { label: "Edit", items: [] },
            { label: "View", items: [] },
            { label: "Window", items: [] },
            { label: "Help", items: [] },
          ].map((m) => (
            <span
              key={m.label}
              className="hover:text-white cursor-default transition-colors px-1"
            >
              {m.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Main Layout: Sidebar + Content ───────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* ── Left Sidebar ──────────────────────────────────────────────────── */}
        <aside
          className="flex flex-col flex-shrink-0 overflow-y-auto"
          style={{
            width: 200,
            background: "var(--color-card)",
            borderRight: "1px solid #2a2318",
          }}
        >
          {/* CODEX brand */}
          <div
            className="px-4 py-3 flex-shrink-0"
            style={{ borderBottom: "1px solid #2a2318" }}
          >
            <p
              className="text-base font-bold tracking-widest"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-bright)" }}
            >
              CODEX
            </p>
          </div>

          {/* Game + Build list */}
          <div className="flex-1 overflow-y-auto py-2">
            {buildsByGame.map(({ game, builds: gameBuilds }) => (
              <div key={game.key} className="mb-1">
                {/* Game header */}
                <button
                  data-testid={`sidebar-game-${game.key}`}
                  onClick={() => setSelectedGameKey(game.key)}
                  className={cn(
                    "w-full text-left px-4 py-1.5 text-xs font-semibold uppercase tracking-widest transition-colors",
                    selectedGameKey === game.key
                      ? "hover:opacity-90"
                      : "hover:bg-white/5"
                  )}
                  style={
                    selectedGameKey === game.key
                      ? { color: accent, background: hexToRgba(accent, 0.06) }
                      : { color: "var(--color-dim)" }
                  }
                >
                  {game.icon} {game.name}
                </button>

                {/* Builds under this game — only show if game is selected */}
                {selectedGameKey === game.key && gameBuilds.map((build) => {
                  const isActive = build.key === selectedBuildKey;
                  return (
                    <button
                      key={build.key}
                      data-testid={`sidebar-build-${build.key}`}
                      onClick={() => setSelectedBuildKey(build.key)}
                      className={cn(
                        "w-full text-left px-4 py-2 text-xs transition-colors flex flex-col gap-0.5",
                        isActive ? "" : "hover:bg-white/5"
                      )}
                      style={
                        isActive
                          ? {
                              background: hexToRgba(build.accent, 0.1),
                              borderLeft: `2px solid ${build.accent}`,
                              paddingLeft: 14,
                            }
                          : {
                              borderLeft: "2px solid transparent",
                              paddingLeft: 14,
                            }
                      }
                    >
                      <span
                        className="font-medium leading-tight"
                        style={{ color: isActive ? build.accent : "var(--color-text)" }}
                      >
                        {build.icon} {build.label}
                      </span>
                      {build.sub && (
                        <span
                          className="text-xs leading-tight truncate"
                          style={{ color: "var(--color-dim)", fontSize: "0.65rem" }}
                        >
                          {build.sub}
                        </span>
                      )}
                    </button>
                  );
                })}

                {selectedGameKey === game.key && gameBuilds.length === 0 && (
                  <p className="px-4 py-2 text-xs" style={{ color: "var(--color-dim)" }}>
                    No builds yet
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Sidebar bottom actions */}
          <div
            className="px-3 py-2 flex-shrink-0 space-y-1.5"
            style={{ borderTop: "1px solid #2a2318" }}
          >
            <button
              data-testid="btn-add-build"
              onClick={() => setShowAddModal(true)}
              className="w-full px-2 py-1.5 rounded text-xs font-medium transition-all hover:opacity-90 flex items-center justify-center gap-1"
              style={{
                background: hexToRgba(accent, 0.12),
                border: `1px solid ${hexToRgba(accent, 0.35)}`,
                color: accent,
              }}
            >
              + Add Build
            </button>

            {/* Learn button */}
            <div className="flex flex-col gap-1">
              <div className="flex gap-1">
                <button
                  data-testid="btn-learn"
                  onClick={() => {
                    if (showLearnInput) {
                      learnMutation.mutate();
                    } else {
                      setShowLearnInput((v) => !v);
                    }
                  }}
                  disabled={learnMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-2 py-1.5 rounded text-xs font-medium transition-all hover:bg-white/5 disabled:opacity-50"
                  style={{ border: "1px solid #3a3028", color: "var(--color-dim)" }}
                  title="Build item database (weapons, armor, spells, etc.)"
                >
                  🎓 {showLearnInput ? "Go" : "Learn"}
                </button>
                <button
                  data-testid="btn-update"
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending || learnMutation.isPending}
                  className="flex-1 px-2 py-1.5 rounded text-xs font-medium transition-all hover:bg-white/5 disabled:opacity-50"
                  style={{ border: "1px solid #3a3028", color: "var(--color-dim)" }}
                  title="Check for patch updates"
                >
                  ↻ Update
                </button>
              </div>
              {showLearnInput && (
                <div className="flex gap-1">
                  <input
                    data-testid="input-learn-hint-url"
                    type="url"
                    value={learnHintUrl}
                    onChange={(e) => setLearnHintUrl(e.target.value)}
                    placeholder="Wiki URL (optional)"
                    className="flex-1 min-w-0 px-2 py-1 rounded text-xs"
                    style={{
                      background: "var(--color-bg)",
                      border: "1px solid #3a3028",
                      color: "var(--color-text)",
                      outline: "none",
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") learnMutation.mutate(); }}
                  />
                  <button
                    onClick={() => { setShowLearnInput(false); setLearnHintUrl(""); }}
                    className="px-1.5 py-1 rounded text-xs hover:bg-white/5"
                    style={{ color: "var(--color-dim)", border: "1px solid #3a3028" }}
                  >✕</button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── Content Area ──────────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Tab bar */}
          <div
            className="flex items-center flex-shrink-0 px-2"
            style={{
              background: "var(--color-card)",
              borderBottom: "1px solid #2a2318",
              minHeight: 36,
            }}
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
                  "px-4 py-1.5 text-xs font-medium transition-all border-b-2 -mb-px whitespace-nowrap flex items-center gap-1.5",
                  activeTab === tab ? "" : "hover:text-white/70 border-transparent"
                )}
                style={
                  activeTab === tab
                    ? { color: accent, borderColor: accent }
                    : { color: "var(--color-dim)" }
                }
              >
                {tab === "Your Build" && "⚔"}
                {tab === "Materials" && "⚗"}
                {tab === "Similar" && "⊞"}
                {tab === "Other OP" && "★"}
                {tab === "Quick Ref" && "◈"}
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Learn progress panel — shown while learn is running */}
            {showLearnProgress && currentGame && (
              <div className="mb-4">
                <LearnProgress
                  gameKey={selectedGameKey}
                  gameName={currentGame.name}
                  accent={accent}
                  onDone={() => {
                    setShowLearnProgress(false);
                    queryClient.invalidateQueries({ queryKey: [`/api/knowledge/${selectedGameKey}`] });
                  }}
                />
              </div>
            )}

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
                <p className="text-base mb-2">No builds found for this game.</p>
                <p className="text-sm">Click <strong>+ Add Build</strong> to generate one with AI.</p>
              </div>
            )}
          </div>

          {/* ── Bottom Status Bar ─────────────────────────────────────────── */}
          <div
            className="flex items-center justify-between px-4 flex-shrink-0 text-xs gap-4"
            style={{
              background: "var(--color-card)",
              borderTop: "1px solid #2a2318",
              minHeight: 32,
            }}
          >
            <div className="flex items-center gap-1" style={{ color: "var(--color-dim)" }}>
              {knowledgeInfo && knowledgeInfo.count > 0 ? (
                <button
                  onClick={() => setShowKnowledge(true)}
                  className="hover:text-white transition-colors cursor-pointer"
                  style={{ background: "none", border: "none", padding: 0 }}
                  title="View cached knowledge"
                >
                  🧠 {knowledgeInfo.count} facts · {currentGame?.name ?? selectedGameKey}
                </button>
              ) : (
                <span>Ready</span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                data-testid="btn-export"
                onClick={() => exportMutation.mutate()}
                className="px-2.5 py-1 rounded transition-all hover:bg-white/5 flex items-center gap-1"
                style={{ border: "1px solid #3a3028", color: "var(--color-dim)" }}
              >
                💾 Save
              </button>
              <button
                data-testid="btn-import"
                onClick={handleImport}
                className="px-2.5 py-1 rounded transition-all hover:bg-white/5 flex items-center gap-1"
                style={{ border: "1px solid #3a3028", color: "var(--color-dim)" }}
              >
                📂 Load
              </button>
              <button
                data-testid="btn-reset"
                onClick={() => toast({ title: "Reset: delete individual builds using the ✕ button on each build." })}
                className="px-2.5 py-1 rounded transition-all hover:bg-white/5 flex items-center gap-1"
                style={{ border: "1px solid #3a3028", color: "var(--color-dim)" }}
              >
                ↺ Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
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

      {showKnowledge && currentGame && (
        <KnowledgeViewer
          gameKey={selectedGameKey}
          gameName={currentGame.name}
          accent={accent}
          onClose={() => setShowKnowledge(false)}
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
