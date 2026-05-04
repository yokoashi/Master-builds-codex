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
import { useTheme, THEMES } from "@/lib/theme";
import BookmarkTabs, { type BookmarkTab } from "@/components/BookmarkTabs";

const BOOKMARK_TO_TAB: Record<BookmarkTab, TabKey> = {
  overview: "build", materials: "materials", proscons: "prosCons",
  stats: "progression", tips: "quickRef",
};
const TAB_TO_BOOKMARK: Record<TabKey, BookmarkTab> = {
  build: "overview", progression: "stats", materials: "materials",
  prosCons: "proscons", quickRef: "tips",
};

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
  const { theme, setTheme } = useTheme();

  const [selectedGameKey, setSelectedGameKey] = useState<string>("ds1r");
  const [selectedBuildKey, setSelectedBuildKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("build");
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletePending, setDeletePending] = useState<Build | null>(null);
  const [importingCodex, setImportingCodex] = useState(false);
  const [codexImportStatus, setCodexImportStatus] = useState<string | null>(null);
  const [linking, setLinking] = useState<'off'|'in'|'out'>('off');

  function handleGameSelect(key: string) {
    if (theme === 'myst' && key !== selectedGameKey) {
      setLinking('in');
      setTimeout(() => {
        setSelectedGameKey(key);
        setSelectedBuildKey(null);
        setActiveTab("build");
        setLinking('out');
        setTimeout(() => setLinking('off'), 350);
      }, 220);
    } else {
      setSelectedGameKey(key);
      setSelectedBuildKey(null);
      setActiveTab("build");
    }
  }

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
  const codexLoaded  = codexData?.loaded ?? false;
  const entryCount   = codexData?.entryCount ?? 0;

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
    setCodexImportStatus("Parsing codex…");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const codex = JSON.parse(ev.target!.result as string) as Record<string, unknown>;
        const result = await apiRequest<{ ok: boolean; entryCount: number }>("POST", "/api/codex/import", {
          gameKey: game.key,
          gameName: game.name,
          codex,
        });
        setCodexImportStatus(`${result.entryCount.toLocaleString()} entries`);
        queryClient.invalidateQueries({ queryKey: ["/api/codex", selectedGameKey] });
        toast({ title: `Codex loaded`, description: `${result.entryCount.toLocaleString()} entries indexed for ${game.name}` });
      } catch {
        setCodexImportStatus("Parse failed");
        toast({ title: "Codex import error", description: "Invalid JSON or server error", variant: "destructive" });
      } finally {
        setImportingCodex(false);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const accentColor = build?.accent ?? "#d64545";

  return (
    <div
      className={cn("flex overflow-hidden", theme !== 'myst' && "h-screen")}
      style={{
        backgroundColor: 'transparent',
        color: "var(--color-text)",
        ...(theme === 'myst' ? {
          height: '78vh',
          marginTop: '8vh',
          boxShadow: '0 0 120px rgba(0,0,0,0.98), 0 30px 80px rgba(0,0,0,0.85)',
        } : {}),
      }}
    >
      {/* Linking animation overlay */}
      {linking !== 'off' && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex: 9998,
            backgroundColor: "#050a0f",
            opacity: linking === 'in' ? 1 : 0,
            transition: linking === 'in' ? 'opacity 0.22s linear' : 'opacity 0.35s linear',
            transitionTimingFunction: 'linear',
          }}
        />
      )}

      {/* Hidden file inputs */}
      <input ref={importFileRef} type="file" accept=".json" className="hidden" onChange={handleImportBuilds} />
      <input ref={codexFileRef} type="file" accept=".json" className="hidden" onChange={handleCodexImport} />

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className="w-52 flex-shrink-0 flex flex-col border-r"
        style={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-card-hi)" }}
      >
        {/* Brand */}
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--color-card-hi)" }}>
          <h1 className="font-display text-sm font-bold tracking-widest uppercase" style={{ color: "var(--color-bright)" }}>
            Build Codex
          </h1>
        </div>

        {/* Book selector */}
        <div className="px-3 py-3 border-b" style={{ borderColor: "var(--color-card-hi)" }}>
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--color-dim)" }}>
            {theme === 'myst' ? 'Ages Written' : 'Book'}
          </p>
          <div className="flex flex-col gap-1">
            {games.map((g) => (
              <button
                key={g.key}
                onClick={() => handleGameSelect(g.key)}
                className={theme === 'myst'
                  ? cn("myst-age-entry w-full text-left", selectedGameKey === g.key && "active")
                  : "text-left px-2 py-1.5 rounded text-xs font-medium transition-all"
                }
                style={theme !== 'myst' ? (
                  selectedGameKey === g.key
                    ? { backgroundColor: "var(--color-card-2)", color: "var(--color-bright)", borderLeft: "2px solid var(--color-crimson)" }
                    : { color: "var(--color-text)", opacity: 0.6 }
                ) : undefined}
              >
                <span className="mr-1.5">{g.icon}</span>
                {g.name}
              </button>
            ))}
          </div>
        </div>

        {/* Builds list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="flex items-center justify-between px-1 mb-2">
            <p className={theme === 'myst' ? "myst-section-label flex-1" : "text-xs uppercase tracking-widest"} style={theme !== 'myst' ? { color: "var(--color-dim)" } : undefined}>
              {theme === 'myst' ? 'Chapters Inscribed' : 'Chapters'}
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-xs px-2 py-0.5 rounded font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--color-crimson)", color: "#fff" }}
              title="Write a new chapter with AI"
            >
              {theme === 'myst' ? '→ Link' : '+ New'}
            </button>
          </div>

          {builds.length === 0 && (
            <div className="px-2 py-4 text-center">
              <p className="text-xs mb-1" style={{ color: "var(--color-dim)" }}>
                {theme === 'myst' ? 'No ages inscribed' : 'No chapters yet'}
              </p>
              {!codexLoaded && (
                <p className="text-xs" style={{ color: "var(--color-dim)" }}>
                  Import a codex first to enable AI generation
                </p>
              )}
            </div>
          )}

          {builds.map((b) => (
            <button
              key={b.key}
              onClick={() => { setSelectedBuildKey(b.key); setActiveTab("build"); }}
              className={theme === 'myst'
                ? cn("myst-chapter-entry w-full text-left", build?.key === b.key && "active")
                : "w-full text-left px-2 py-2 rounded mb-0.5 transition-all"
              }
              style={theme !== 'myst' ? (
                build?.key === b.key
                  ? { backgroundColor: "var(--color-card-hi)", borderLeft: `2px solid ${b.accent}`, opacity: 1 }
                  : { opacity: 0.6 }
              ) : undefined}
            >
              {theme === 'myst' ? (
                <span>{b.label}</span>
              ) : (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base leading-none">{b.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: build?.key === b.key ? "var(--color-bright)" : "var(--color-text)" }}>
                      {b.label}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: "var(--color-dim)" }}>{b.sub}</p>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Bottom actions */}
        <div className="px-3 py-3 border-t space-y-1.5" style={{ borderColor: "var(--color-card-hi)" }}>
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-xs" style={{ color: "var(--color-dim)" }}>
              {importingCodex ? "Importing…" : codexImportStatus ?? (codexLoaded ? `${entryCount.toLocaleString()} entries` : "No codex")}
            </span>
            <button
              onClick={() => codexFileRef.current?.click()}
              className="text-[10px] px-1.5 py-0.5 rounded font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--color-card-2)", color: "var(--color-gold)", border: "1px solid var(--color-dim2)" }}
              title="Import a codex JSON to power AI generation"
            >
              Codex
            </button>
          </div>
          <button
            onClick={handleExport}
            className="w-full text-left text-xs px-2 py-1.5 rounded transition-all hover:opacity-90"
            style={{ backgroundColor: "var(--color-card-2)", color: "var(--color-text)" }}
          >
            ↑ Export Builds
          </button>
          <button
            onClick={() => importFileRef.current?.click()}
            className="w-full text-left text-xs px-2 py-1.5 rounded transition-all hover:opacity-90"
            style={{ backgroundColor: "var(--color-card-2)", color: "var(--color-text)" }}
          >
            ↓ Import Builds
          </button>
          {/* Theme switcher */}
          <div className="flex gap-1 pt-1">
            {THEMES.map((t) => (
              <button
                key={t.key}
                onClick={() => setTheme(t.key)}
                className="flex-1 text-[10px] px-1.5 py-1 rounded font-medium transition-none"
                style={{
                  backgroundColor: theme === t.key ? t.accent : "var(--color-card-2)",
                  color: theme === t.key ? "#fff" : "var(--color-dim)",
                  border: `1px solid ${theme === t.key ? t.accent : "var(--color-dim2)"}`,
                  opacity: theme === t.key ? 1 : 0.7,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {build ? (
          <>
            {/* Build header */}
            <div
              className="flex-shrink-0 px-5 py-3 border-b flex items-center gap-4"
              style={{
                borderColor: "var(--color-card-hi)",
                background: `linear-gradient(90deg, ${hexToRgba(accentColor, 0.08)} 0%, transparent 60%)`,
              }}
            >
              <span className="text-2xl">{build.icon}</span>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-lg font-bold leading-tight" style={{ color: "var(--color-bright)" }}>
                  {build.label}
                </h2>
                <p className="text-xs" style={{ color: "var(--color-dim)" }}>{build.sub}</p>
              </div>
              <div className="flex items-center gap-2">
                {build.isAI && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: "var(--color-card-2)", color: "var(--color-gold)" }}>
                    AI
                  </span>
                )}
                <button
                  onClick={() => setDeletePending(build)}
                  className="text-xs px-2 py-1 rounded transition-all hover:opacity-90"
                  style={{ color: "var(--color-dim)", backgroundColor: "var(--color-card-hi)" }}
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Tab bar — hidden in Myst (replaced by ribbon bookmarks) */}
            {theme !== 'myst' && (
              <div
                className="flex-shrink-0 flex border-b px-5 gap-1"
                style={{ borderColor: "var(--color-card-hi)", backgroundColor: "var(--color-card)" }}
              >
                {TAB_KEYS.map((key) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={activeTab === key}
                    onClick={() => setActiveTab(key)}
                    className={cn(
                      "text-xs px-3 py-2.5 font-medium transition-all border-b-2 whitespace-nowrap",
                      activeTab === key ? "border-current" : "border-transparent opacity-50 hover:opacity-80"
                    )}
                    style={{ color: activeTab === key ? accentColor : "var(--color-text)" }}
                  >
                    {tabLabel(key)}
                  </button>
                ))}
              </div>
            )}

            {/* Myst ribbon bookmarks — fixed to right edge of the app */}
            {theme === 'myst' && (
              <div style={{ position: 'fixed', right: 0, top: '8vh', height: '78vh', zIndex: 50 }}>
                <BookmarkTabs
                  active={TAB_TO_BOOKMARK[activeTab]}
                  onChange={(bk) => setActiveTab(BOOKMARK_TO_TAB[bk])}
                />
              </div>
            )}

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "build"       && <BuildTab build={build} game={game} />}
              {activeTab === "progression" && <ProgressionTab build={build} />}
              {activeTab === "materials"   && <MaterialsTab build={build} game={game} />}
              {activeTab === "prosCons"    && <ProsConsTab build={build} />}
              {activeTab === "quickRef"    && <QuickRefTab build={build} />}
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center flex-col gap-4">
            <p className="font-display text-2xl" style={{ color: "var(--color-dim)" }}>
              {game?.icon ?? "🔥"} {game?.name ?? "Dark Souls: Remastered"}
            </p>
            <p className="text-sm" style={{ color: "var(--color-dim)" }}>
              {theme === 'myst'
                ? (!codexLoaded ? "Import a codex JSON, then inscribe your first age" : `${entryCount.toLocaleString()} codex entries loaded — link to your first age`)
                : (!codexLoaded ? "Import a codex JSON, then write your first chapter" : `${entryCount.toLocaleString()} codex entries loaded — begin your first chapter`)}
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2 rounded font-medium text-sm transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--color-crimson)", color: "#fff" }}
            >
              {theme === 'myst' ? '+ Inscribe New Age' : '+ Begin Chapter'}
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
