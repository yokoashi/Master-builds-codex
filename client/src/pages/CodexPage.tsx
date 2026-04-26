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
import ThemePicker from "@/components/ThemePicker";
import SetupScreen from "@/components/SetupScreen";
import { useTheme } from "@/hooks/use-theme";

const TABS = ["Your Build", "Materials", "Similar", "Other OP", "Quick Ref"] as const;
type Tab = typeof TABS[number];

interface CodexPageProps {
  configMasks?: { perplexity: string; claude: string; openRouter: string };
  onConfigUpdate?: () => void;
}

export default function CodexPage({ configMasks, onConfigUpdate }: CodexPageProps) {
  const { toast } = useToast();
  const { theme } = useTheme();
  const isGrimoire = theme === "grimoire";
  const [selectedGameKey, setSelectedGameKey] = useState<string>("lotf");
  const [selectedBuildKey, setSelectedBuildKey] = useState<string>("crimson-reaper");
  const [activeTab, setActiveTab] = useState<Tab>("Your Build");
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletePending, setDeletePending] = useState<Build | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [learnUrlsText, setLearnUrlsText] = useState<string>("");
  const [showLearnInput, setShowLearnInput] = useState(false);
  const [wikiTestResult, setWikiTestResult] = useState<string | null>(null);
  const [showKnowledge, setShowKnowledge] = useState(false);
  const [showLearnProgress, setShowLearnProgress] = useState(false);
  const [showTeamLog, setShowTeamLog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [teamLogInput, setTeamLogInput] = useState("");

  const { data: games = [] } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  const { data: allBuilds = [] } = useQuery<Build[]>({
    queryKey: ["/api/builds"],
  });

  // Learn research + synthesis modes (persisted in settings.json)
  const { data: settingsData, refetch: refetchSettings } = useQuery<{
    aiMode: string;
    learnSynthMode: "claude" | "openrouter";
    learnResearchMode: "perplexity" | "openrouter" | "claude";
  }>({ queryKey: ["/api/settings"] });
  const learnSynthMode = settingsData?.learnSynthMode ?? "claude";
  const learnResearchMode = settingsData?.learnResearchMode ?? "perplexity";

  const setLearnSynthMode = useMutation({
    mutationFn: (mode: "claude" | "openrouter") =>
      apiRequest("PATCH", "/api/settings", { learnSynthMode: mode }),
    onSuccess: () => refetchSettings(),
  });

  const setLearnResearchMode = useMutation({
    mutationFn: (mode: "perplexity" | "openrouter" | "claude") =>
      apiRequest("PATCH", "/api/settings", { learnResearchMode: mode }),
    onSuccess: () => refetchSettings(),
  });

  const { data: knowledgeInfo } = useQuery<{
    count: number;
    patchNote: string | null;
    updatedAt: string | null;
  }>({
    queryKey: [`/api/knowledge/${selectedGameKey}`],
  });

  type TeamLogEntry = { from: string; type: string; ts: number; message: string };
  const { data: teamLog = [], refetch: refetchTeamLog } = useQuery<TeamLogEntry[]>({
    queryKey: ["/api/team-log"],
    enabled: showTeamLog,
    refetchInterval: showTeamLog ? 15000 : false,
  });
  const teamLogMutation = useMutation({
    mutationFn: (message: string) =>
      apiRequest("POST", "/api/team-log", { from: "claude", type: "message", message }),
    onSuccess: () => { setTeamLogInput(""); refetchTeamLog(); },
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
        ...(() => {
          const urls = learnUrlsText.split(/[\n,]+/).map(u => u.trim()).filter(u => u.startsWith("http"));
          return urls.length > 0 ? { hintUrls: urls } : {};
        })(),
      }),
    onMutate: () => {
      setShowLearnInput(false);
      setShowLearnProgress(true);
      setLearnUrlsText("");
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

  const wikiTestMutation = useMutation({
    mutationFn: () => {
      const urls = learnUrlsText.split(/[\n,]+/).map(u => u.trim()).filter(u => u.startsWith("http"));
      const url = urls[0];
      if (!url) throw new Error("No URL to test");
      return apiRequest<{
        url: string; sourceType: string; elapsed_ms: number; total_facts: number;
        strategy4_available: boolean;
        by_type: Record<string, number>;
        structured_fields: Record<string, number>;
        sample: { type: string; name: string; ap?: number; physDef?: number; weight?: number; scalingTable?: string; status?: string; effect?: string; raw: string }[];
      }>("POST", "/api/debug/wiki-test", { url, gameKey: selectedGameKey });
    },
    onSuccess: (data) => {
      const sf = data.structured_fields;
      const sfStr = Object.entries(sf).filter(([,v]) => v > 0).map(([k,v]) => `${k}:${v}`).join(" ");
      const typeStr = Object.entries(data.by_type).map(([k,v]) => `${k}:${v}`).join(" ");
      const s4 = data.strategy4_available ? "Claude ✓" : "Claude ✗ (no key)";
      const lines = [
        `✓ ${data.total_facts} facts in ${data.elapsed_ms}ms (${data.sourceType}) [S4: ${s4}]`,
        `Types: ${typeStr || "none"}`,
        `Structured: ${sfStr || "NONE — stats columns not matching"}`,
        `Sample: ${data.sample.slice(0,3).map(f => `${f.name}(ap=${f.ap ?? "—"} wt=${f.weight ?? "—"} phys=${f.physDef ?? "—"})`).join(", ")}`,
      ];
      setWikiTestResult(lines.join("\n"));
    },
    onError: (err: Error) => setWikiTestResult(`✗ ${err.message}`),
  });

  const wikiInspectMutation = useMutation({
    mutationFn: () => {
      const urls = learnUrlsText.split(/[\n,]+/).map(u => u.trim()).filter(u => u.startsWith("http"));
      const url = urls[0];
      if (!url) throw new Error("No URL to inspect");
      return apiRequest<{
        url: string;
        tableCount: number;
        tables: { cls: string; headers: string[]; rows: string[][] }[];
        firstItemLink: string;
        itemPage: { url: string; title: string; infoboxRows: { key: string; val: string }[]; tableClasses: string[] } | null;
      }>("POST", "/api/debug/wiki-structure", { url });
    },
    onSuccess: (data) => {
      const lines: string[] = [`=== STRUCTURE: ${data.url} ===`, `Tables found: ${data.tableCount}`];
      data.tables.forEach((t, i) => {
        lines.push(`\nTable ${i+1} class="${t.cls}"`);
        lines.push(`  Headers: ${t.headers.join(" | ") || "(none)"}`);
        t.rows.slice(0,2).forEach((r, ri) => lines.push(`  Row${ri+1}: ${r.join(" | ")}`));
      });
      if (data.firstItemLink) {
        lines.push(`\nFirst item link: ${data.firstItemLink}`);
        if (data.itemPage) {
          lines.push(`Item page: "${data.itemPage.title}"`);
          lines.push(`Table classes: ${data.itemPage.tableClasses.join(", ") || "(none)"}`);
          lines.push(`Infobox rows:`);
          data.itemPage.infoboxRows.slice(0, 20).forEach(r => lines.push(`  [${r.key}] → ${r.val}`));
        }
      }
      setWikiTestResult(lines.join("\n"));
    },
    onError: (err: Error) => setWikiTestResult(`✗ ${err.message}`),
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
    <div className="flex flex-col h-screen overflow-hidden relative" style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
      {/* ── Title Bar / Menu Bar ─────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between flex-shrink-0 select-none"
        style={{
          background: "linear-gradient(180deg, #1c1710 0%, var(--color-card) 100%)",
          borderBottom: "1px solid #2e2418",
          minHeight: 30,
          paddingLeft: 12,
          paddingRight: 16,
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-xs font-bold tracking-[0.2em] uppercase"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-gold)", opacity: 0.85 }}
          >
            ✦ Codex
          </span>
          <span style={{ color: "#2e2418" }}>│</span>
          <span className="text-xs" style={{ color: "var(--color-dim)" }}>
            {knowledgeInfo && knowledgeInfo.count > 0
              ? `${knowledgeInfo.count} facts · ${currentGame?.name ?? selectedGameKey}${knowledgeInfo.patchNote ? ` · ${knowledgeInfo.patchNote}` : ""}`
              : "Master Build Codex"}
          </span>
          {updateStatus && (
            <span className="text-xs" style={{ color: "var(--color-gold)" }}>{updateStatus}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: "var(--color-dim2)" }}>
          <ThemePicker />
          <button
            onClick={() => setShowSettings(true)}
            title="API Key Settings"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-dim)",
              cursor: "pointer",
              fontSize: "0.8rem",
              padding: "2px 4px",
              lineHeight: 1,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-bright)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-dim)"; }}
          >
            ⚙
          </button>
          <span style={{ color: "#2e2418" }}>│</span>
          {["File", "Edit", "View", "Window", "Help"].map((m) => (
            <span key={m} className="hover:text-white/60 cursor-default transition-colors px-0.5">{m}</span>
          ))}
        </div>
      </div>

      {/* ── Main Layout: Sidebar + Content ───────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* ── Left Sidebar ──────────────────────────────────────────────────── */}
        <aside
          className="flex flex-col flex-shrink-0"
          style={{
            width: 218,
            background: "linear-gradient(180deg, #171310 0%, #141009 100%)",
            borderRight: "1px solid #272018",
          }}
        >
          {/* Brand header */}
          <div
            className="px-4 py-3 flex-shrink-0 flex items-center gap-2"
            style={{ borderBottom: "1px solid #222018" }}
          >
            <span style={{ color: hexToRgba(accent, 0.8), fontSize: "1rem" }}>⚔</span>
            <div>
              <p
                className="text-sm font-bold tracking-[0.22em] uppercase leading-none"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-bright)" }}
              >
                CODEX
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-dim2)", letterSpacing: "0.05em" }}>
                Build Guide
              </p>
            </div>
          </div>

          {/* Game + Build list */}
          <div className="flex-1 overflow-y-auto py-2">
            {buildsByGame.map(({ game, builds: gameBuilds }) => {
              const isGameActive = selectedGameKey === game.key;
              return (
                <div key={game.key} className="mb-0.5">
                  {/* Game header */}
                  <button
                    data-testid={`sidebar-game-${game.key}`}
                    onClick={() => setSelectedGameKey(game.key)}
                    className="w-full text-left px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all flex items-center gap-2"
                    style={
                      isGameActive
                        ? {
                            color: accent,
                            background: `linear-gradient(90deg, ${hexToRgba(accent, 0.12)} 0%, transparent 100%)`,
                            borderLeft: `2px solid ${accent}`,
                            paddingLeft: 10,
                          }
                        : { color: "var(--color-dim)", borderLeft: "2px solid transparent", paddingLeft: 10 }
                    }
                  >
                    <span>{game.icon}</span>
                    <span>{game.name}</span>
                    {game.isCustom && <span style={{ color: "var(--color-gold)", fontSize: "0.55rem" }}>✦ AI</span>}
                  </button>

                  {/* Builds under active game */}
                  {isGameActive && gameBuilds.map((build) => {
                    const isActive = build.key === selectedBuildKey;
                    return (
                      <button
                        key={build.key}
                        data-testid={`sidebar-build-${build.key}`}
                        onClick={() => setSelectedBuildKey(build.key)}
                        className="w-full text-left py-2 text-xs transition-all flex flex-col gap-0.5"
                        style={
                          isActive
                            ? {
                                background: `linear-gradient(90deg, ${hexToRgba(build.accent, 0.14)} 0%, transparent 100%)`,
                                borderLeft: `2px solid ${build.accent}`,
                                paddingLeft: 22,
                                paddingRight: 10,
                              }
                            : {
                                borderLeft: "2px solid transparent",
                                paddingLeft: 22,
                                paddingRight: 10,
                                opacity: 0.75,
                              }
                        }
                      >
                        <span
                          className="font-medium leading-tight"
                          style={{ color: isActive ? build.accent : "var(--color-text)" }}
                        >
                          {build.icon} {build.label}
                          {build.isAI && <span className="ml-1" style={{ color: "var(--color-gold)", fontSize: "0.55rem" }}>✦ AI</span>}
                        </span>
                        {build.sub && (
                          <span className="leading-tight truncate" style={{ color: "var(--color-dim)", fontSize: "0.63rem" }}>
                            {build.sub}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {isGameActive && gameBuilds.length === 0 && (
                    <p className="py-2 text-xs italic" style={{ color: "var(--color-dim2)", paddingLeft: 22 }}>
                      No builds yet
                    </p>
                  )}

                  {/* Separator between games */}
                  {!isGameActive && <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #221c14, transparent)", margin: "2px 12px" }} />}
                </div>
              );
            })}
          </div>

          {/* Sidebar bottom actions */}
          <div
            className="px-3 py-2.5 flex-shrink-0 space-y-1.5"
            style={{
              borderTop: "1px solid #222018",
              background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.2))",
            }}
          >
            <button
              data-testid="btn-add-build"
              onClick={() => setShowAddModal(true)}
              className="w-full px-2 py-2 rounded text-xs font-semibold tracking-wide transition-all hover:opacity-90 flex items-center justify-center gap-1.5"
              style={{
                background: `linear-gradient(135deg, ${hexToRgba(accent, 0.18)} 0%, ${hexToRgba(accent, 0.08)} 100%)`,
                border: `1px solid ${hexToRgba(accent, 0.4)}`,
                color: accent,
                fontFamily: "var(--font-display)",
                letterSpacing: "0.08em",
              }}
            >
              ✦ New Build
            </button>

            <div className="flex flex-col gap-1">
              {/* Research mode toggle — who runs the 18-category deep research phase */}
              <div className="flex items-center gap-1.5 mb-0.5">
                <span style={{ fontSize: "0.6rem", color: "var(--color-dim2)", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "var(--font-display)", flexShrink: 0 }}>Research</span>
                <div className="flex rounded overflow-hidden flex-1" style={{ border: "1px solid #2a2218" }}>
                  {([
                    { mode: "perplexity", label: "⚡ Pplx",   color: "#5591c7", title: "Perplexity sonar-deep-research — requires PERPLEXITY_API_KEY in Settings" },
                    { mode: "openrouter", label: "◈ OR",     color: "#4ade80", title: "Perplexity sonar-deep-research via OpenRouter — requires OPEN_ROUTER_API_KEY" },
                    { mode: "claude",     label: "✦ Claude", color: "#c084fc", title: "Claude reads your pasted wiki URLs and extracts items — uses your Claude API key (recommended)" },
                  ] as const).map(({ mode, label, color, title }, idx, arr) => {
                    const active = learnResearchMode === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() => setLearnResearchMode.mutate(mode)}
                        disabled={setLearnResearchMode.isPending}
                        title={title}
                        style={{
                          flex: 1,
                          padding: "2px 4px",
                          fontSize: "0.6rem",
                          fontFamily: "var(--font-display)",
                          letterSpacing: "0.04em",
                          background: active ? `rgba(${mode === "perplexity" ? "85,145,199" : mode === "openrouter" ? "74,222,128" : "192,132,252"},0.12)` : "transparent",
                          color: active ? color : "var(--color-dim2)",
                          borderRight: idx < arr.length - 1 ? "1px solid #2a2218" : "none",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Synthesis mode toggle — who validates the research data */}
              <div className="flex items-center gap-1.5 mb-0.5">
                <span style={{ fontSize: "0.6rem", color: "var(--color-dim2)", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "var(--font-display)", flexShrink: 0 }}>Synth</span>
                <div className="flex rounded overflow-hidden flex-1" style={{ border: "1px solid #2a2218" }}>
                  {([
                    { mode: "claude",      label: "✦ Claude",     color: "#e8c05a", title: "Claude validates & deduplicates research data" },
                    { mode: "openrouter",  label: "◈ OpenRouter",  color: "#4ade80", title: "OpenRouter ensemble validates research data (4 models + judge)" },
                  ] as const).map(({ mode, label, color, title }, idx, arr) => {
                    const active = learnSynthMode === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() => setLearnSynthMode.mutate(mode)}
                        disabled={setLearnSynthMode.isPending}
                        title={title}
                        style={{
                          flex: 1,
                          padding: "2px 4px",
                          fontSize: "0.6rem",
                          fontFamily: "var(--font-display)",
                          letterSpacing: "0.04em",
                          background: active ? `rgba(${mode === "claude" ? "232,192,90" : "74,222,128"},0.12)` : "transparent",
                          color: active ? color : "var(--color-dim2)",
                          borderRight: idx < arr.length - 1 ? "1px solid #2a2218" : "none",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  data-testid="btn-learn"
                  onClick={() => { showLearnInput ? learnMutation.mutate() : setShowLearnInput(true); }}
                  disabled={learnMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-2 py-1.5 rounded text-xs font-medium transition-all hover:bg-white/5 disabled:opacity-40"
                  style={{ border: "1px solid #302820", color: "var(--color-dim)" }}
                  title="Build item database (weapons, armor, spells, etc.)"
                >
                  🎓 {showLearnInput ? "Start" : "Learn"}
                </button>
                <button
                  data-testid="btn-update"
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending || learnMutation.isPending}
                  className="flex-1 px-2 py-1.5 rounded text-xs font-medium transition-all hover:bg-white/5 disabled:opacity-40"
                  style={{ border: "1px solid #302820", color: "var(--color-dim)" }}
                  title="Check for patch updates"
                >
                  ↻ Update
                </button>
              </div>
              {showLearnInput && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: "0.6rem", color: "var(--color-dim2)", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
                      Category URLs <span style={{ color: "var(--color-dim2)", fontWeight: 400 }}>(one per line — paste all at once)</span>
                    </span>
                    <button
                      onClick={() => { setShowLearnInput(false); setLearnUrlsText(""); }}
                      className="px-1.5 py-0.5 rounded text-xs hover:bg-white/5"
                      style={{ color: "var(--color-dim)", border: "1px solid #302820" }}
                    >✕</button>
                  </div>
                  <textarea
                    data-testid="input-learn-hint-urls"
                    value={learnUrlsText}
                    onChange={(e) => setLearnUrlsText(e.target.value)}
                    placeholder={"https://wiki.fextralife.com/Weapons\nhttps://wiki.fextralife.com/Magic\nhttps://wiki.fextralife.com/Shields\nhttps://wiki.fextralife.com/Armor\nhttps://wiki.fextralife.com/Rings\nhttps://wiki.fextralife.com/Runes"}
                    rows={5}
                    className="w-full px-2 py-1.5 rounded text-xs resize-none"
                    style={{ background: "var(--color-bg)", border: "1px solid #302820", color: "var(--color-text)", outline: "none", lineHeight: "1.5" }}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) learnMutation.mutate(); }}
                  />
                  <div className="flex items-center justify-between gap-1">
                    <p style={{ fontSize: "0.6rem", color: "var(--color-dim2)" }}>
                      {learnUrlsText.split(/[\n,]+/).filter(u => u.trim().startsWith("http")).length > 0
                        ? `${learnUrlsText.split(/[\n,]+/).filter(u => u.trim().startsWith("http")).length} URL${learnUrlsText.split(/[\n,]+/).filter(u => u.trim().startsWith("http")).length === 1 ? "" : "s"} ready · Ctrl+Enter to start`
                        : "Paste category pages for accurate extraction, or leave empty to let AI search the web"}
                    </p>
                    {learnUrlsText.trim().startsWith("http") && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => { setWikiTestResult(null); wikiTestMutation.mutate(); }}
                          disabled={wikiTestMutation.isPending || wikiInspectMutation.isPending}
                          className="px-1.5 py-0.5 rounded text-xs hover:bg-white/5"
                          style={{ color: "var(--color-dim)", border: "1px solid #302820", fontSize: "0.6rem" }}
                          title="Test first URL — shows fact count and structured field coverage"
                        >
                          {wikiTestMutation.isPending ? "Testing..." : "Test"}
                        </button>
                        <button
                          onClick={() => { setWikiTestResult(null); wikiInspectMutation.mutate(); }}
                          disabled={wikiInspectMutation.isPending || wikiTestMutation.isPending}
                          className="px-1.5 py-0.5 rounded text-xs hover:bg-white/5"
                          style={{ color: "var(--color-dim)", border: "1px solid #302820", fontSize: "0.6rem" }}
                          title="Inspect first URL — dumps table classes, headers, and infobox structure"
                        >
                          {wikiInspectMutation.isPending ? "Inspecting..." : "Inspect"}
                        </button>
                      </div>
                    )}
                  </div>
                  {wikiTestResult && (
                    <pre
                      className="rounded p-2 text-xs whitespace-pre-wrap"
                      style={{ background: "var(--color-bg)", border: "1px solid #302820", color: "var(--color-dim2)", fontSize: "0.6rem", lineHeight: 1.5 }}
                    >{wikiTestResult}</pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── Content Area ──────────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Tab bar */}
          <div
            className="flex items-end flex-shrink-0 px-1 gap-0.5"
            style={{
              background: "linear-gradient(180deg, #171310 0%, var(--color-card) 100%)",
              borderBottom: `1px solid #272018`,
              minHeight: 38,
            }}
            role="tablist"
            aria-label="Build sections"
          >
            {TABS.map((tab) => {
              const icon = tab === "Your Build" ? "⚔" : tab === "Materials" ? "⚗" : tab === "Similar" ? "⊞" : tab === "Other OP" ? "★" : "◈";
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={isActive}
                  data-testid={`tab-${tab.replace(/ /g, "-").toLowerCase()}`}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3.5 py-1.5 text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 relative -mb-px",
                    isActive ? "rounded-t" : "hover:text-white/60"
                  )}
                  style={
                    isActive
                      ? {
                          color: accent,
                          background: "var(--color-bg)",
                          border: `1px solid #272018`,
                          borderBottom: `1px solid var(--color-bg)`,
                        }
                      : { color: "var(--color-dim2)", background: "transparent", border: "1px solid transparent" }
                  }
                >
                  <span style={{ opacity: isActive ? 1 : 0.6 }}>{icon}</span>
                  {tab}
                </button>
              );
            })}
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
                    twoColumn={isGrimoire}
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
            className="flex items-center justify-between flex-shrink-0 text-xs gap-4"
            style={{
              background: "linear-gradient(180deg, var(--color-card) 0%, #121008 100%)",
              borderTop: "1px solid #272018",
              minHeight: 30,
              paddingLeft: 12,
              paddingRight: 10,
            }}
          >
            <div className="flex items-center gap-2.5">
              {knowledgeInfo && knowledgeInfo.count > 0 ? (
                <button
                  onClick={() => setShowKnowledge(true)}
                  className="transition-colors hover:opacity-80 flex items-center gap-1"
                  style={{ background: "none", border: "none", padding: 0, color: "var(--color-dim)" }}
                  title="View cached knowledge"
                >
                  🧠 <span style={{ color: "var(--color-gold)", opacity: 0.75 }}>{knowledgeInfo.count}</span>
                  <span style={{ color: "var(--color-dim2)" }}> facts · {currentGame?.name ?? selectedGameKey}</span>
                </button>
              ) : (
                <span style={{ color: "var(--color-dim2)" }}>Ready</span>
              )}
              <span style={{ color: "#252018" }}>│</span>
              <button
                onClick={() => setShowTeamLog(true)}
                className="transition-all hover:opacity-90 flex items-center gap-1"
                style={{ background: "none", border: "none", padding: 0, color: "#4a9a4a" }}
                title="AI Team Log — Claude ↔ Perplexity"
              >
                📡 <span>Team Log</span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              {[
                { id: "btn-export", label: "💾", title: "Save", onClick: () => exportMutation.mutate() },
                { id: "btn-import", label: "📂", title: "Load", onClick: handleImport },
                { id: "btn-reset", label: "↺", title: "Reset", onClick: () => toast({ title: "Delete individual builds using the ✕ button on each build." }) },
              ].map(({ id, label, title, onClick }) => (
                <button
                  key={id}
                  data-testid={id}
                  onClick={onClick}
                  className="px-2 py-0.5 rounded transition-all hover:bg-white/5 flex items-center gap-1"
                  style={{ border: "1px solid #282018", color: "var(--color-dim2)" }}
                  title={title}
                >
                  {label} {title}
                </button>
              ))}
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

      {/* ── Settings Modal ──────────────────────────────────────────────────── */}
      {showSettings && (
        <SetupScreen
          asModal
          onComplete={() => { setShowSettings(false); onConfigUpdate?.(); }}
          onClose={() => setShowSettings(false)}
          savedMasks={configMasks}
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

      {showTeamLog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "stretch",
            justifyContent: "flex-end",
            pointerEvents: "auto",
          }}
          onClick={() => setShowTeamLog(false)}
        >
          <div
            className="flex flex-col h-full overflow-hidden"
            style={{ width: 520, background: "#0b120b", borderLeft: "1px solid #1e3a1e" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{ borderBottom: "1px solid #1e3a1e" }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#6db86d" }}>📡 AI Team Log</p>
                <p className="text-xs" style={{ color: "#3a5a3a" }}>Claude ↔ Perplexity · team-log.json · /api/team-log</p>
              </div>
              <button onClick={() => setShowTeamLog(false)}
                className="px-2 py-1 rounded text-xs hover:bg-white/5"
                style={{ color: "var(--color-dim)", border: "1px solid #2a3a2a" }}>✕</button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col-reverse gap-2">
              {teamLog.length === 0 && (
                <p className="text-xs text-center py-8" style={{ color: "#3a5a3a" }}>No messages yet.</p>
              )}
              {[...teamLog].reverse().map((entry, i) => (
                <div key={i} className="rounded px-3 py-2"
                  style={{
                    background: entry.from === "claude" ? "#0a1e2e" : "#1a0e2a",
                    border: `1px solid ${entry.from === "claude" ? "#1a3a5a" : "#3a1a5a"}`,
                  }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold"
                      style={{ color: entry.from === "claude" ? "#5ab8e8" : "#b85ae8" }}>
                      {entry.from === "claude" ? "🤖 Claude" : "🔍 Perplexity"}
                    </span>
                    {entry.type !== "message" && (
                      <span className="text-xs px-1 rounded" style={{ background: "#1e2e1e", color: "#6db86d" }}>
                        {entry.type}
                      </span>
                    )}
                    <span className="text-xs ml-auto" style={{ color: "#3a5a3a" }}>
                      {new Date(entry.ts).toLocaleString()}
                    </span>
                  </div>
                  <pre className="text-xs whitespace-pre-wrap break-words" style={{ color: "#c8d8c8", fontFamily: "inherit", maxHeight: 300, overflow: "auto" }}>
                    {entry.message}
                  </pre>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="flex-shrink-0 p-3" style={{ borderTop: "1px solid #1e3a1e" }}>
              <textarea
                value={teamLogInput}
                onChange={(e) => setTeamLogInput(e.target.value)}
                placeholder="Write a message to Perplexity... (Ctrl+Enter to send)"
                rows={3}
                className="w-full rounded px-3 py-2 text-xs resize-none mb-2"
                style={{ background: "#0d180d", border: "1px solid #2a4a2a", color: "#c8d8c8", outline: "none" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && teamLogInput.trim()) {
                    teamLogMutation.mutate(teamLogInput.trim());
                  }
                }}
              />
              <div className="flex justify-end">
                <button
                  onClick={() => { if (teamLogInput.trim()) teamLogMutation.mutate(teamLogInput.trim()); }}
                  disabled={teamLogMutation.isPending || !teamLogInput.trim()}
                  className="px-4 py-1.5 rounded text-xs font-medium disabled:opacity-50"
                  style={{ background: "#1a3a1a", border: "1px solid #3a6a3a", color: "#6db86d" }}>
                  Send to Team Log
                </button>
              </div>
            </div>
          </div>
        </div>
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
