import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Game, Build, KnowledgeFact } from "@shared/types";
import { cn, hexToRgba } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import BuildTab from "@/components/BuildTab";
import MaterialsTab from "@/components/MaterialsTab";
import ProsConsTab from "@/components/ProsConsTab";
import QuickRefTab from "@/components/QuickRefTab";
import AddBuildModal from "@/components/AddBuildModal";
import DeleteModal from "@/components/DeleteModal";

const TABS = ["Your Build", "Materials", "Pros & Cons", "Quick Ref"] as const;
type Tab = typeof TABS[number];

export default function CodexPage() {
  const { toast } = useToast();

  const [selectedGameKey, setSelectedGameKey] = useState<string>("ds1r");
  const [selectedBuildKey, setSelectedBuildKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Your Build");
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletePending, setDeletePending] = useState<Build | null>(null);
  const [importingCodex, setImportingCodex] = useState(false);
  const [codexImportStatus, setCodexImportStatus] = useState<string | null>(null);

  const importFileRef = useRef<HTMLInputElement>(null);
  const codexFileRef = useRef<HTMLInputElement>(null);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: games = [] } = useQuery<Game[]>({ queryKey: ["/api/games"] });
  const { data: allBuilds = [] } = useQuery<Build[]>({ queryKey: ["/api/builds"] });

  const builds = allBuilds.filter((b) => b.gameKey === selectedGameKey);
  const game = games.find((g) => g.key === selectedGameKey) ?? null;
  const build = builds.find((b) => b.key === selectedBuildKey) ?? builds[0] ?? null;

  // ── Knowledge cache ──────────────────────────────────────────────────────────
  const { data: knowledgeData } = useQuery<{ facts: KnowledgeFact[]; patchNote: string | null }>({
    queryKey: ["/api/knowledge", selectedGameKey],
    queryFn: () => apiRequest<{ facts: KnowledgeFact[]; patchNote: string | null }>("GET", `/api/knowledge/${selectedGameKey}`),
  });
  const factCount = knowledgeData?.facts?.length ?? 0;

  // ── Delete mutation ──────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (key: string) => apiRequest("DELETE", `/api/builds/${key}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/builds"] });
      setSelectedBuildKey(null);
      setDeletePending(null);
      toast({ title: "Build deleted" });
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
        toast({ title: `Imported: ${result.importedBuilds} builds, ${result.importedGames} games` });
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
        const result = await apiRequest<{ ok: boolean; factCount: number }>("POST", "/api/codex/import", {
          gameKey: game.key,
          gameName: game.name,
          codex,
        });
        setCodexImportStatus(`${result.factCount} facts loaded`);
        queryClient.invalidateQueries({ queryKey: ["/api/knowledge", selectedGameKey] });
        toast({ title: `Codex loaded`, description: `${result.factCount} facts indexed for ${game.name}` });
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
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}>
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

        {/* Game selector */}
        <div className="px-3 py-3 border-b" style={{ borderColor: "var(--color-card-hi)" }}>
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--color-dim)" }}>Game</p>
          <div className="flex flex-col gap-1">
            {games.map((g) => (
              <button
                key={g.key}
                onClick={() => { setSelectedGameKey(g.key); setSelectedBuildKey(null); setActiveTab("Your Build"); }}
                className="text-left px-2 py-1.5 rounded text-xs font-medium transition-all"
                style={
                  selectedGameKey === g.key
                    ? { backgroundColor: "var(--color-card-2)", color: "var(--color-bright)", borderLeft: "2px solid var(--color-crimson)" }
                    : { color: "var(--color-text)", opacity: 0.6 }
                }
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
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-dim)" }}>Builds</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-xs px-2 py-0.5 rounded font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--color-crimson)", color: "#fff" }}
              title="Generate a new build with AI"
            >
              + New
            </button>
          </div>

          {builds.length === 0 && (
            <div className="px-2 py-4 text-center">
              <p className="text-xs mb-1" style={{ color: "var(--color-dim)" }}>No builds yet</p>
              {factCount === 0 && (
                <p className="text-xs" style={{ color: "var(--color-dim)" }}>
                  Import a codex first to enable AI generation
                </p>
              )}
            </div>
          )}

          {builds.map((b) => (
            <button
              key={b.key}
              onClick={() => { setSelectedBuildKey(b.key); setActiveTab("Your Build"); }}
              className="w-full text-left px-2 py-2 rounded mb-0.5 transition-all"
              style={
                build?.key === b.key
                  ? { backgroundColor: "var(--color-card-hi)", borderLeft: `2px solid ${b.accent}`, opacity: 1 }
                  : { opacity: 0.6 }
              }
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-base leading-none">{b.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: build?.key === b.key ? "var(--color-bright)" : "var(--color-text)" }}>
                    {b.label}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: "var(--color-dim)" }}>{b.sub}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Bottom actions */}
        <div className="px-3 py-3 border-t space-y-1.5" style={{ borderColor: "var(--color-card-hi)" }}>
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-xs" style={{ color: "var(--color-dim)" }}>
              {importingCodex ? "Importing…" : codexImportStatus ?? (factCount > 0 ? `${factCount} facts` : "No codex")}
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

            {/* Tab bar */}
            <div
              className="flex-shrink-0 flex border-b px-5 gap-1"
              style={{ borderColor: "var(--color-card-hi)", backgroundColor: "var(--color-card)" }}
            >
              {TABS.map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "text-xs px-3 py-2.5 font-medium transition-all border-b-2",
                    activeTab === tab ? "border-current" : "border-transparent opacity-50 hover:opacity-80"
                  )}
                  style={{ color: activeTab === tab ? accentColor : "var(--color-text)" }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "Your Build" && <BuildTab build={build} game={game} />}
              {activeTab === "Materials" && <MaterialsTab build={build} game={game} />}
              {activeTab === "Pros & Cons" && <ProsConsTab build={build} />}
              {activeTab === "Quick Ref" && <QuickRefTab build={build} />}
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center flex-col gap-4">
            <p className="font-display text-2xl" style={{ color: "var(--color-dim)" }}>
              {game?.icon ?? "🔥"} {game?.name ?? "Dark Souls: Remastered"}
            </p>
            <p className="text-sm" style={{ color: "var(--color-dim)" }}>
              {factCount === 0
                ? "Import a codex JSON, then generate your first build"
                : `${factCount} facts loaded — generate a build to get started`}
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2 rounded font-medium text-sm transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--color-crimson)", color: "#fff" }}
            >
              + Generate Build
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
            toast({ title: `${b.label} created` });
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
