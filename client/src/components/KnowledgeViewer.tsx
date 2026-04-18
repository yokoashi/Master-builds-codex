import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { KnowledgeFact } from "@shared/types";
import { hexToRgba } from "@/lib/utils";

interface Props {
  gameKey: string;
  gameName: string;
  accent: string;
  onClose: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  ALL: "◈",
  WEAPON: "⚔",
  SHIELD: "🛡",
  CATALYST: "✦",
  ARMOR: "🧥",
  RING: "◎",
  SPELL: "✺",
  BUFF: "⬆",
  ITEM: "◉",
  MECHANIC: "⚙",
  BUILD: "★",
  GEM: "💎",
  UPGRADE: "🪨",
  MAP: "🗺",
  LORE: "📖",
};

const CATEGORY_COLORS: Record<string, string> = {
  WEAPON: "#d64545",
  SHIELD: "#5591c7",
  CATALYST: "#b370d8",
  ARMOR: "#8a8070",
  RING: "#e8c05a",
  SPELL: "#b370d8",
  BUFF: "#6daa45",
  ITEM: "#5591c7",
  MECHANIC: "#8a8070",
  BUILD: "#e8c05a",
  GEM: "#4ecdc4",
  UPGRADE: "#c9a96e",
  MAP: "#5ab870",
  LORE: "#a8a0d8",
};

// Ordered display for category tabs
const CAT_ORDER = [
  "ALL",
  "WEAPON", "SHIELD", "CATALYST",
  "ARMOR",
  "RING", "SPELL", "BUFF",
  "BUILD", "ITEM", "MECHANIC",
  "GEM", "UPGRADE", "MAP", "LORE",
];

const PAGE_SIZE = 50;

/** Format a defense stat number, showing — if undefined */
function def(v: number | undefined): string {
  return v !== undefined ? String(v) : "—";
}


export default function KnowledgeViewer({ gameKey, gameName, accent, onClose }: Props) {
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [confirmClear, setConfirmClear] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const clearMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/knowledge/${gameKey}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge/${gameKey}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge/${gameKey}/facts`] });
      setConfirmClear(false);
    },
  });

  const { data, isLoading } = useQuery<{
    facts: KnowledgeFact[];
    patchNote: string | null;
    updatedAt: string | null;
  }>({
    queryKey: [`/api/knowledge/${gameKey}/facts`],
    staleTime: 30_000,
  });

  const facts = data?.facts ?? [];

  // Build ordered category list based on what actually exists in data
  const categories = useMemo(() => {
    const seen = new Set<string>(facts.map((f) => f.type));
    return CAT_ORDER.filter((c) => c === "ALL" || seen.has(c));
  }, [facts]);

  // Filter by category + search
  const filtered = useMemo(() => {
    let result = facts;
    if (activeCategory !== "ALL") {
      result = result.filter((f) => f.type === activeCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.location ?? "").toLowerCase().includes(q) ||
          (f.effect ?? "").toLowerCase().includes(q) ||
          (f.status ?? "").toLowerCase().includes(q) ||
          (f.requirements ?? "").toLowerCase().includes(q) ||
          f.raw.toLowerCase().includes(q)
      );
    }
    return result;
  }, [facts, activeCategory, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Determine display mode based on active category
  const isArmorView = activeCategory === "ARMOR";
  const isWeaponView = activeCategory === "WEAPON" || activeCategory === "SHIELD" || activeCategory === "CATALYST";
  const isTextView = activeCategory === "MAP" || activeCategory === "LORE" || activeCategory === "MECHANIC";
  const isGemView = activeCategory === "GEM" || activeCategory === "UPGRADE";

  function handleCategoryChange(cat: string) {
    setActiveCategory(cat);
    setPage(1);
    setExpandedRow(null);
  }

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
    setExpandedRow(null);
  }

  function toggleExpand(i: number) {
    setExpandedRow(expandedRow === i ? null : i);
  }

  return (
    /* Overlay — fixed so it escapes overflow:hidden ancestors in Electron */
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "stretch",
        justifyContent: "flex-end",
        background: "rgba(0,0,0,0.55)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div
        className="flex flex-col h-full overflow-hidden"
        style={{
          width: "min(880px, 100vw)",
          background: "var(--color-bg)",
          borderLeft: "1px solid #2a2318",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ background: "var(--color-card)", borderBottom: "1px solid #2a2318" }}
        >
          <div>
            <p
              className="text-sm font-semibold"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-bright)" }}
            >
              Knowledge Cache — {gameName}
            </p>
            {data?.patchNote && (
              <p className="text-xs mt-0.5" style={{ color: "var(--color-dim)" }}>
                {data.patchNote}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: "var(--color-gold)" }}>
              {facts.length} facts
            </span>
            {!confirmClear ? (
              <button
                onClick={() => setConfirmClear(true)}
                className="px-2 py-1 rounded text-xs hover:bg-white/10 transition-colors"
                style={{ border: "1px solid #3a3028", color: "var(--color-dim)" }}
                title="Clear all cached facts for this game"
              >
                🗑 Clear
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-xs" style={{ color: "#d64545" }}>Clear all {facts.length} facts?</span>
                <button
                  onClick={() => clearMutation.mutate()}
                  disabled={clearMutation.isPending}
                  className="px-2 py-1 rounded text-xs transition-colors disabled:opacity-50"
                  style={{ background: hexToRgba("#d64545", 0.15), border: "1px solid #d64545", color: "#d64545" }}
                >
                  {clearMutation.isPending ? "Clearing..." : "Yes, clear"}
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-1 rounded text-xs hover:bg-white/10 transition-colors"
                  style={{ border: "1px solid #3a3028", color: "var(--color-dim)" }}
                >
                  Cancel
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="px-2 py-1 rounded text-xs hover:bg-white/10 transition-colors"
              style={{ border: "1px solid #3a3028", color: "var(--color-dim)" }}
              aria-label="Close knowledge viewer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search */}
        <div
          className="px-4 py-2 flex-shrink-0"
          style={{ borderBottom: "1px solid #2a2318" }}
        >
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name, location, effect, status..."
            className="w-full px-3 py-1.5 rounded text-sm"
            style={{
              background: "var(--color-card)",
              border: "1px solid #3a3028",
              color: "var(--color-text)",
              outline: "none",
            }}
          />
        </div>

        {/* Category tabs */}
        <div
          className="flex gap-0 overflow-x-auto flex-shrink-0 px-2"
          style={{ borderBottom: "1px solid #2a2318", background: "var(--color-card)" }}
        >
          {categories.map((cat) => {
            const count = cat === "ALL" ? facts.length : facts.filter((f) => f.type === cat).length;
            const isActive = activeCategory === cat;
            const color = cat === "ALL" ? accent : (CATEGORY_COLORS[cat] ?? accent);
            return (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className="px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px flex items-center gap-1"
                style={
                  isActive
                    ? { color, borderColor: color }
                    : { color: "var(--color-dim)", borderColor: "transparent" }
                }
              >
                <span>{CATEGORY_ICONS[cat] ?? "·"}</span>
                {cat}
                <span
                  className="text-xs px-1 rounded"
                  style={{
                    background: isActive ? hexToRgba(color, 0.15) : "transparent",
                    color: isActive ? color : "var(--color-dim)",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm" style={{ color: "var(--color-dim)" }}>Loading cache...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm" style={{ color: "var(--color-dim)" }}>
                {facts.length === 0
                  ? "No facts cached yet. Use the Learn button to build the database."
                  : "No results match your search."}
              </p>
            </div>
          ) : isTextView ? (
            /* ── Text/lore view (MAP, LORE, MECHANIC) ── */
            <div className="p-4 space-y-2">
              {pageSlice.map((fact, i) => {
                const catColor = CATEGORY_COLORS[fact.type] ?? accent;
                return (
                  <div
                    key={i}
                    className="rounded p-3 cursor-pointer hover:bg-white/[0.03] transition-colors"
                    style={{ border: "1px solid #2a2318", background: "var(--color-card)" }}
                    onClick={() => toggleExpand(i)}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{
                          background: hexToRgba(catColor, 0.12),
                          border: `1px solid ${hexToRgba(catColor, 0.3)}`,
                          color: catColor,
                          fontSize: "0.6rem",
                          fontFamily: "var(--font-display)",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {fact.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold" style={{ color: "var(--color-bright)" }}>
                          {fact.name}
                        </p>
                        {fact.location && (
                          <p className="text-xs mt-0.5" style={{ color: "var(--color-dim)" }}>
                            📍 {fact.location}
                          </p>
                        )}
                        {(expandedRow === i) && (
                          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--color-text)", opacity: 0.75 }}>
                            {fact.effect || fact.raw}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : isArmorView ? (
            /* ── Armor view: all 5 defense stats ── */
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr style={{ background: "var(--color-card)", borderBottom: "1px solid #2a2318" }}>
                  <th className="text-left px-4 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)", width: "22%" }}>Name</th>
                  <th className="text-left px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)", width: "8%" }}>Type</th>
                  <th className="text-center px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "#d64545", width: "7%" }}>Phys</th>
                  <th className="text-center px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "#5591c7", width: "7%" }}>Mag</th>
                  <th className="text-center px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "#e87d3e", width: "7%" }}>Fire</th>
                  <th className="text-center px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "#e8c05a", width: "7%" }}>Lgt</th>
                  <th className="text-center px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "#a8a0d8", width: "7%" }}>Holy</th>
                  <th className="text-center px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)", width: "7%" }}>Poise</th>
                  <th className="text-center px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)", width: "6%" }}>Wt</th>
                  <th className="text-left px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)" }}>Location</th>
                </tr>
              </thead>
              <tbody>
                {pageSlice.map((fact, i) => {
                  const catColor = CATEGORY_COLORS[fact.type] ?? accent;
                  return (
                    <tr
                      key={i}
                      style={{ borderBottom: "1px solid #1e1a14" }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-2 font-medium" style={{ color: "var(--color-bright)" }}>{fact.name}</td>
                      <td className="px-2 py-2">
                        <span
                          className="px-1.5 py-0.5 rounded"
                          style={{
                            background: hexToRgba(catColor, 0.12),
                            border: `1px solid ${hexToRgba(catColor, 0.3)}`,
                            color: catColor,
                            fontSize: "0.6rem",
                            fontFamily: "var(--font-display)",
                          }}
                        >
                          {fact.type}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center" style={{ color: "#d64545" }}>{def(fact.physDef)}</td>
                      <td className="px-2 py-2 text-center" style={{ color: "#5591c7" }}>{def(fact.magicDef)}</td>
                      <td className="px-2 py-2 text-center" style={{ color: "#e87d3e" }}>{def(fact.fireDef)}</td>
                      <td className="px-2 py-2 text-center" style={{ color: "#e8c05a" }}>{def(fact.lightningDef)}</td>
                      <td className="px-2 py-2 text-center" style={{ color: "#a8a0d8" }}>{def(fact.holyDef)}</td>
                      <td className="px-2 py-2 text-center" style={{ color: "var(--color-dim)" }}>{def(fact.poise)}</td>
                      <td className="px-2 py-2 text-center" style={{ color: "var(--color-dim)" }}>{fact.weight !== undefined ? fact.weight : "—"}</td>
                      <td className="px-2 py-2" style={{ color: "var(--color-dim)" }}>{fact.location || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : isWeaponView ? (
            /* ── Weapon view: AP table, scaling, status buildup ── */
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr style={{ background: "var(--color-card)", borderBottom: "1px solid #2a2318" }}>
                  <th className="text-left px-4 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)", width: "18%" }}>Name</th>
                  <th className="text-left px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)", width: "8%" }}>Type</th>
                  <th className="text-left px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "#d64545", width: "22%" }}>AP (+0 → +10)</th>
                  <th className="text-left px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "#6daa45", width: "18%" }}>Scaling</th>
                  <th className="text-left px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "#b370d8", width: "14%" }}>Status</th>
                  <th className="text-left px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)" }}>Req / Location</th>
                </tr>
              </thead>
              <tbody>
                {pageSlice.map((fact, i) => {
                  const catColor = CATEGORY_COLORS[fact.type] ?? accent;
                  return (
                    <tr
                      key={i}
                      style={{ borderBottom: "1px solid #1e1a14" }}
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => toggleExpand(i)}
                    >
                      <td className="px-4 py-2 font-medium" style={{ color: "var(--color-bright)" }}>{fact.name}</td>
                      <td className="px-2 py-2">
                        <span
                          className="px-1.5 py-0.5 rounded"
                          style={{
                            background: hexToRgba(catColor, 0.12),
                            border: `1px solid ${hexToRgba(catColor, 0.3)}`,
                            color: catColor,
                            fontSize: "0.6rem",
                            fontFamily: "var(--font-display)",
                          }}
                        >
                          {fact.type}
                        </span>
                      </td>
                      <td className="px-2 py-2 font-mono" style={{ color: "#d64545", fontSize: "0.65rem" }}>
                        {fact.damageTable
                          ? <span title={fact.damageTable}>{fact.damageTable.slice(0, 40)}{fact.damageTable.length > 40 ? "…" : ""}</span>
                          : fact.ap ? `~${fact.ap}` : "—"}
                      </td>
                      <td className="px-2 py-2 font-mono" style={{ color: "#6daa45", fontSize: "0.65rem" }}>
                        {fact.scalingTable
                          ? <span title={fact.scalingTable}>{fact.scalingTable.slice(0, 25)}{fact.scalingTable.length > 25 ? "…" : ""}</span>
                          : "—"}
                      </td>
                      <td className="px-2 py-2" style={{ color: "#b370d8" }}>
                        {fact.statusTable
                          ? <span title={fact.statusTable}>{fact.status || "Buildup"} ↑</span>
                          : fact.status || "—"}
                      </td>
                      <td className="px-2 py-2" style={{ color: "var(--color-dim)" }}>
                        {expandedRow === i ? (
                          <div className="space-y-0.5">
                            {fact.requirements && <p><span style={{ color: "var(--color-dim)", opacity: 0.6 }}>Req:</span> {fact.requirements}</p>}
                            {fact.location && <p><span style={{ color: "var(--color-dim)", opacity: 0.6 }}>Loc:</span> {fact.location}</p>}
                            {fact.weight !== undefined && <p><span style={{ color: "var(--color-dim)", opacity: 0.6 }}>Wt:</span> {fact.weight}</p>}
                            {fact.upgrade && <p><span style={{ color: "var(--color-dim)", opacity: 0.6 }}>Up:</span> {fact.upgrade}</p>}
                          </div>
                        ) : (
                          <span
                            className="truncate block"
                            style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          >
                            {fact.requirements || fact.location || fact.upgrade || "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : isGemView ? (
            /* ── Gem/Upgrade view ── */
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr style={{ background: "var(--color-card)", borderBottom: "1px solid #2a2318" }}>
                  <th className="text-left px-4 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)", width: "22%" }}>Name</th>
                  <th className="text-left px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)", width: "8%" }}>Type</th>
                  <th className="text-left px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)", width: "30%" }}>Effect</th>
                  <th className="text-left px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)", width: "8%" }}>Qty</th>
                  <th className="text-left px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)" }}>Location</th>
                </tr>
              </thead>
              <tbody>
                {pageSlice.map((fact, i) => {
                  const catColor = CATEGORY_COLORS[fact.type] ?? accent;
                  return (
                    <tr
                      key={i}
                      style={{ borderBottom: "1px solid #1e1a14" }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-2 font-medium" style={{ color: "var(--color-bright)" }}>{fact.name}</td>
                      <td className="px-2 py-2">
                        <span
                          className="px-1.5 py-0.5 rounded"
                          style={{
                            background: hexToRgba(catColor, 0.12),
                            border: `1px solid ${hexToRgba(catColor, 0.3)}`,
                            color: catColor,
                            fontSize: "0.6rem",
                            fontFamily: "var(--font-display)",
                          }}
                        >
                          {fact.type}
                        </span>
                      </td>
                      <td className="px-2 py-2" style={{ color: "var(--color-dim)" }}>
                        <span
                          className="block truncate"
                          title={fact.effect || fact.raw}
                          style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                          {fact.effect || "—"}
                        </span>
                      </td>
                      <td className="px-2 py-2" style={{ color: "var(--color-gold)" }}>{fact.quantity || "—"}</td>
                      <td className="px-2 py-2" style={{ color: "var(--color-dim)" }}>{fact.location || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            /* ── Default / ALL view: mixed table showing most-useful fields ── */
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr style={{ background: "var(--color-card)", borderBottom: "1px solid #2a2318" }}>
                  <th className="text-left px-4 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)", width: "20%" }}>Name</th>
                  <th className="text-left px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)", width: "9%" }}>Type</th>
                  <th className="text-left px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)", width: "18%" }}>Location</th>
                  <th className="text-left px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)", width: "9%" }}>AP / Def</th>
                  <th className="text-left px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)", width: "12%" }}>Status / Effect</th>
                  <th className="text-left px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)" }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {pageSlice.map((fact, i) => {
                  const catColor = CATEGORY_COLORS[fact.type] ?? accent;
                  // Pick the most useful summary value for "AP / Def" column
                  const apDefValue = fact.damageTable
                    ? fact.damageTable.split("/")[0] + "→" + fact.damageTable.split("/").slice(-1)[0]
                    : fact.physDef !== undefined
                    ? `P:${fact.physDef}`
                    : fact.ap
                    ? `+${fact.ap}`
                    : "—";
                  return (
                    <tr
                      key={i}
                      style={{ borderBottom: "1px solid #1e1a14" }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-2 font-medium" style={{ color: "var(--color-bright)" }}>{fact.name}</td>
                      <td className="px-2 py-2">
                        <span
                          className="px-1.5 py-0.5 rounded"
                          style={{
                            background: hexToRgba(catColor, 0.12),
                            border: `1px solid ${hexToRgba(catColor, 0.3)}`,
                            color: catColor,
                            fontSize: "0.6rem",
                            fontFamily: "var(--font-display)",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {fact.type}
                        </span>
                      </td>
                      <td className="px-2 py-2" style={{ color: "var(--color-dim)" }}>{fact.location || "—"}</td>
                      <td className="px-2 py-2 font-mono" style={{ color: catColor, fontSize: "0.65rem" }}>{apDefValue}</td>
                      <td className="px-2 py-2" style={{ color: "var(--color-purple)" }}>
                        {fact.statusTable
                          ? <span title={fact.statusTable}>{fact.status || "Buildup"}↑</span>
                          : fact.status || fact.effect || "—"}
                      </td>
                      <td className="px-2 py-2" style={{ color: "var(--color-dim)", maxWidth: 200 }}>
                        <span
                          className="truncate block"
                          title={fact.scalingTable || fact.requirements || fact.upgrade || fact.raw}
                          style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                          {fact.scalingTable
                            ? `Scaling: ${fact.scalingTable.slice(0, 20)}`
                            : fact.requirements || fact.upgrade || fact.raw.slice(0, 60)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination footer */}
        {filtered.length > PAGE_SIZE && (
          <div
            className="flex items-center justify-between px-4 py-2 flex-shrink-0 text-xs"
            style={{ background: "var(--color-card)", borderTop: "1px solid #2a2318" }}
          >
            <span style={{ color: "var(--color-dim)" }}>
              {filtered.length} results · page {safePage} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-2 py-1 rounded disabled:opacity-30 hover:bg-white/5 transition-colors"
                style={{ border: "1px solid #3a3028", color: "var(--color-dim)" }}
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-2 py-1 rounded disabled:opacity-30 hover:bg-white/5 transition-colors"
                style={{ border: "1px solid #3a3028", color: "var(--color-dim)" }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
