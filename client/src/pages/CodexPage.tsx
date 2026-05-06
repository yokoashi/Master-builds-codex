import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Game, Build } from "@shared/types";
import { cn, hexToRgba } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import BuildTab from "@/components/BuildTab";
import MaterialsTab from "@/components/MaterialsTab";
import ProgressionTab from "@/components/ProgressionTab";
import ProsConsTab from "@/components/ProsConsTab";
import QuickRefTab from "@/components/QuickRefTab";
import AddBuildModal from "@/components/AddBuildModal";
import DeleteModal from "@/components/DeleteModal";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

const TAB_KEYS = ["build", "progression", "materials", "prosCons", "quickRef"] as const;
type TabKey = typeof TAB_KEYS[number];

const DEFAULT_TAB_LABELS: Record<TabKey, string> = {
  build:       "Your Build",
  progression: "Progression",
  materials:   "Materials",
  prosCons:    "Pros & Cons",
  quickRef:    "Quick Ref",
};

export default function CodexPage() {
  const { toast } = useToast();

  const [selectedGameKey, setSelectedGameKey] = useState<string>("ds1r");
  const [selectedBuildKey, setSelectedBuildKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("build");
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletePending, setDeletePending] = useState<Build | null>(null);
  const [importingCodex, setImportingCodex] = useState(false);

  const importFileRef = useRef<HTMLInputElement>(null);
  const codexFileRef = useRef<HTMLInputElement>(null);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: games = [] } = useQuery<Game[]>({ queryKey: ["/api/games"] });
  const { data: allBuilds = [] } = useQuery<Build[]>({ queryKey: ["/api/builds"] });

  const builds = allBuilds.filter((b) => b.gameKey === selectedGameKey);
  const game = games.find((g) => g.key === selectedGameKey) ?? null;
  const build = builds.find((b) => b.key === selectedBuildKey) ?? builds[0] ?? null;

  const tabLabel = (key: TabKey) => build?.tabNames?.[key] ?? DEFAULT_TAB_LABELS[key];

  // ── Codex status ──────────────────────────────────────────────────────────────
  const { data: codexData } = useQuery<{ loaded: boolean; entryCount: number }>({
    queryKey: ["/api/codex", selectedGameKey],
    queryFn: () => apiRequest<{ loaded: boolean; entryCount: number }>("GET", `/api/codex/${selectedGameKey}`),
  });
  const codexLoaded = codexData?.loaded ?? false;
  const entryCount  = codexData?.entryCount ?? 0;

  // Build counts per game (for sidebar badge)
  const buildCountByGame = (gameKey: string) =>
    allBuilds.filter((b) => b.gameKey === gameKey).length;

  // ── Delete mutation ──────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (key: string) => apiRequest("DELETE", `/api/builds/${key}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/builds"] });
      setSelectedBuildKey(null);
      setDeletePending(null);
      toast({ title: "Chapter deleted" });
    },
  });

  // ── Export ──────────────────────────────────────────────────────────────────
  async function handleExport() {
    try {
      const data = await apiRequest<Record<string, unknown>>("POST", "/api/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `builds-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export complete" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  }

  // ── Import builds ────────────────────────────────────────────────────────────
  function handleImportBuilds(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target!.result as string) as Record<string, unknown>;
        const result = await apiRequest<{ importedBuilds: number; importedGames: number; importedFacts: number }>("POST", "/api/import", data);
        queryClient.invalidateQueries({ queryKey: ["/api/builds"] });
        queryClient.invalidateQueries({ queryKey: ["/api/games"] });
        toast({ title: `Imported: ${result.importedBuilds} chapters, ${result.importedGames} books` });
      } catch {
        toast({ title: "Import failed", description: "Invalid file format", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ── Import codex JSON ────────────────────────────────────────────────────────
  function handleCodexImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !game) return;
    setImportingCodex(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const codex = JSON.parse(ev.target!.result as string) as Record<string, unknown>;
        const result = await apiRequest<{ ok: boolean; entryCount: number }>("POST", "/api/codex/import", {
          gameKey: game.key,
          gameName: game.name,
          codex,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/codex", selectedGameKey] });
        toast({ title: `Codex loaded`, description: `${result.entryCount.toLocaleString()} entries indexed for ${game.name}` });
      } catch {
        toast({ title: "Codex import error", description: "Invalid JSON or server error", variant: "destructive" });
      } finally {
        setImportingCodex(false);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const accentColor = build?.accent ?? "var(--color-accent)";

  // ── Game select ──────────────────────────────────────────────────────────────
  function selectGame(key: string) {
    setSelectedGameKey(key);
    setSelectedBuildKey(null);
    setActiveTab("build");
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}>

      {/* Hidden file inputs */}
      <input ref={importFileRef} type="file" accept=".json" className="hidden" onChange={handleImportBuilds} />
      <input ref={codexFileRef} type="file" accept=".json" className="hidden" onChange={handleCodexImport} />

      {/* ══════════════════════════════════════════════════════════════════════
          SIDEBAR
          ══════════════════════════════════════════════════════════════════════ */}
      <aside
        className="w-56 flex-shrink-0 flex flex-col border-r"
        style={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)" }}
      >
        {/* ── Brand ──────────────────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded flex items-center justify-center text-[11px] font-bold flex-shrink-0"
              style={{ backgroundColor: "var(--color-accent)", color: "#fff", fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}
            >
              MC
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--color-bright)", fontFamily: "var(--font-display)" }}>
                Master Codex
              </p>
              <p className="text-[9px] italic" style={{ color: "var(--color-dim)" }}>
                A library of trials
              </p>
            </div>
          </div>
        </div>

        {/* ── Books list ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <p className="text-[8px] uppercase tracking-[0.30em] font-semibold mb-3 px-1" style={{ color: "var(--color-dim2)" }}>
            Books
          </p>

          <div className="space-y-0.5">
            {games.map((g, gi) => {
              const isActiveGame = selectedGameKey === g.key;
              const gameBuilds = allBuilds.filter((b) => b.gameKey === g.key);
              return (
                <div key={g.key}>
                  {/* Game entry */}
                  <button
                    onClick={() => selectGame(g.key)}
                    className="w-full text-left flex items-start gap-2.5 px-2 py-2 rounded transition-all hover:opacity-90"
                    style={{
                      backgroundColor: isActiveGame ? hexToRgba("#c03a30", 0.06) : "transparent",
                    }}
                  >
                    <span
                      className="flex-shrink-0 font-display text-[9px] font-bold mt-0.5"
                      style={{ color: isActiveGame ? "var(--color-accent)" : "var(--color-dim2)", minWidth: 16 }}
                    >
                      {ROMAN[gi] ?? String(gi + 1)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-tight truncate"
                        style={{ color: isActiveGame ? "var(--color-bright)" : "var(--color-text)" }}>
                        {g.name}
                      </p>
                      {buildCountByGame(g.key) > 0 && (
                        <p className="text-[9px] mt-0.5" style={{ color: "var(--color-dim)" }}>
                          {buildCountByGame(g.key)} chapter{buildCountByGame(g.key) !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </button>

                  {/* Chapters under active game */}
                  {isActiveGame && gameBuilds.length > 0 && (
                    <div className="ml-6 mt-0.5 mb-1 space-y-px">
                      {gameBuilds.map((b) => {
                        const isActiveBuild = build?.key === b.key;
                        return (
                          <button
                            key={b.key}
                            onClick={() => { setSelectedBuildKey(b.key); setActiveTab("build"); }}
                            className="w-full text-left flex items-start gap-2 px-2 py-1.5 rounded transition-all"
                            style={{
                              borderLeft: `2px solid ${isActiveBuild ? b.accent ?? "var(--color-accent)" : "var(--color-border)"}`,
                              backgroundColor: isActiveBuild ? hexToRgba(b.accent ?? "#c03a30", 0.07) : "transparent",
                            }}
                          >
                            <span className="text-sm leading-none flex-shrink-0 mt-px">{b.icon}</span>
                            <div className="min-w-0">
                              <p
                                className="text-xs font-medium leading-tight truncate"
                                style={{ color: isActiveBuild ? "var(--color-bright)" : "var(--color-text)" }}
                              >
                                {b.label}
                              </p>
                              {b.sub && (
                                <p className="text-[9px] italic truncate mt-0.5" style={{ color: "var(--color-dim)" }}>
                                  {b.sub}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="px-4 pt-3 pb-4 border-t" style={{ borderColor: "var(--color-border)" }}>
          {/* Decorative divider */}
          <p className="text-center text-[11px] mb-2.5" style={{ color: "var(--color-dim2)" }}>✦</p>
          <p className="text-[9px] italic text-center mb-3 leading-relaxed" style={{ color: "var(--color-dim)" }}>
            Begin a new chapter —<br />let the codex be written
          </p>

          <button
            onClick={() => setShowAddModal(true)}
            className="w-full text-xs py-2 rounded font-semibold transition-all hover:opacity-90 mb-3"
            style={{ backgroundColor: "var(--color-accent)", color: "#fff" }}
          >
            + New Chapter
          </button>

          {/* Codex + Knowledge stats */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.15em]">
              <button
                onClick={() => codexFileRef.current?.click()}
                className="hover:opacity-80 transition-opacity"
                style={{ color: "var(--color-dim)" }}
                title="Import codex JSON"
              >
                {importingCodex ? "Importing…" : "Codex"}
              </button>
              <span style={{ color: codexLoaded ? "var(--color-gold)" : "var(--color-dim2)" }}>
                {codexLoaded ? `${entryCount.toLocaleString()} facts` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.15em]">
              <button
                onClick={handleExport}
                className="hover:opacity-80 transition-opacity"
                style={{ color: "var(--color-dim)" }}
              >
                Export
              </button>
              <button
                onClick={() => importFileRef.current?.click()}
                className="hover:opacity-80 transition-opacity"
                style={{ color: "var(--color-dim)" }}
              >
                Import
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN CONTENT
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {build ? (
          <>
            {/* ── Breadcrumb header ─────────────────────────────────────── */}
            <div
              className="flex-shrink-0 px-6 py-3 border-b flex items-center justify-between gap-4"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-card)" }}
            >
              {/* Breadcrumb */}
              <div className="flex items-center text-[9px] uppercase tracking-[0.20em] min-w-0">
                <span style={{ color: "var(--color-dim)" }}>Codex</span>
                <span className="breadcrumb-sep">/</span>
                <span className="truncate" style={{ color: "var(--color-dim)" }}>{game?.name}</span>
                <span className="breadcrumb-sep">/</span>
                <span className="truncate font-semibold" style={{ color: "var(--color-bright)" }}>{build.label}</span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {build.isAI && (
                  <span className="text-[9px] px-2 py-0.5 rounded uppercase tracking-widest font-bold"
                    style={{ backgroundColor: hexToRgba("#d4a030", 0.12), color: "var(--color-gold)", border: "1px solid rgba(212,160,48,0.25)" }}>
                    AI
                  </span>
                )}
                <button
                  onClick={() => codexFileRef.current?.click()}
                  className="text-[9px] px-2.5 py-1.5 rounded uppercase tracking-widest font-medium transition-all hover:opacity-90"
                  style={{ color: "var(--color-dim)", backgroundColor: "var(--color-card-hi)", border: "1px solid var(--color-border)" }}
                  title={codexLoaded ? `${entryCount.toLocaleString()} codex entries` : "Import codex"}
                >
                  Knowledge
                </button>
                <button
                  onClick={handleExport}
                  className="text-[9px] px-2.5 py-1.5 rounded uppercase tracking-widest font-medium transition-all hover:opacity-90"
                  style={{ color: "var(--color-dim)", backgroundColor: "var(--color-card-hi)", border: "1px solid var(--color-border)" }}
                >
                  Export
                </button>
                <button
                  onClick={() => setDeletePending(build)}
                  className="text-[9px] px-2.5 py-1.5 rounded uppercase tracking-widest font-medium transition-all hover:opacity-90"
                  style={{ color: "var(--color-dim)", backgroundColor: "var(--color-card-hi)", border: "1px solid var(--color-border)" }}
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="text-[9px] px-3 py-1.5 rounded uppercase tracking-widest font-bold transition-all hover:opacity-90"
                  style={{ backgroundColor: "var(--color-accent)", color: "#fff" }}
                >
                  Begin Chapter
                </button>
              </div>
            </div>

            {/* ── Tab bar ───────────────────────────────────────────────── */}
            <div
              className="flex-shrink-0 flex border-b px-6 gap-0"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-card)" }}
            >
              {TAB_KEYS.map((key) => {
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(key)}
                    className="relative text-[10px] px-4 py-3 font-semibold transition-all whitespace-nowrap uppercase tracking-widest"
                    style={{ color: active ? "var(--color-bright)" : "var(--color-dim)", fontFamily: "var(--font-display)" }}
                  >
                    {tabLabel(key)}
                    {/* Active underline */}
                    {active && (
                      <>
                        <span
                          className="absolute bottom-0 left-0 right-0 h-px"
                          style={{ backgroundColor: accentColor }}
                        />
                        <span
                          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                          style={{ backgroundColor: accentColor, bottom: -2 }}
                        />
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── Tab content ──────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "var(--color-bg)" }}>
              {activeTab === "build"       && <BuildTab build={build} game={game} />}
              {activeTab === "progression" && <ProgressionTab build={build} />}
              {activeTab === "materials"   && <MaterialsTab build={build} game={game} />}
              {activeTab === "prosCons"    && <ProsConsTab build={build} />}
              {activeTab === "quickRef"    && <QuickRefTab build={build} />}
            </div>
          </>
        ) : (
          /* ── Empty state ──────────────────────────────────────────────── */
          <div className="flex-1 flex items-center justify-center flex-col gap-5">
            <div className="text-center">
              <p className="font-display text-3xl font-bold mb-2" style={{ color: "var(--color-dim2)" }}>
                {game?.icon ?? "🔥"}
              </p>
              <p className="font-display text-lg font-semibold mb-1" style={{ color: "var(--color-dim)" }}>
                {game?.name ?? "Dark Souls: Remastered"}
              </p>
              <p className="text-xs italic" style={{ color: "var(--color-dim2)" }}>
                {!codexLoaded
                  ? "Import a codex JSON to enable accurate AI generation"
                  : `${entryCount.toLocaleString()} codex entries loaded`}
              </p>
            </div>
            <div className="text-center" style={{ color: "var(--color-dim2)" }}>
              <p className="text-[9px] uppercase tracking-[0.25em] mb-3">
                ✦ ── ── ── ── ── ✦
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2.5 rounded font-semibold text-xs uppercase tracking-widest transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--color-accent)", color: "#fff", fontFamily: "var(--font-display)" }}
            >
              + Begin Chapter
            </button>
          </div>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {showAddModal && game && (
        <AddBuildModal
          game={game}
          onClose={() => setShowAddModal(false)}
          onCreated={(b) => {
            queryClient.invalidateQueries({ queryKey: ["/api/builds"] });
            setSelectedBuildKey(b.key);
            setShowAddModal(false);
            toast({ title: `${b.label} — chapter written` });
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
