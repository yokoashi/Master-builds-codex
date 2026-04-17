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
};

const PAGE_SIZE = 50;

export default function KnowledgeViewer({ gameKey, gameName, accent, onClose }: Props) {
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [confirmClear, setConfirmClear] = useState(false);

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

  // Collect unique categories from the data
  const categories = useMemo(() => {
    const seen = new Set<string>();
    facts.forEach((f) => seen.add(f.type));
    return ["ALL", ...Array.from(seen).sort()];
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
          f.raw.toLowerCase().includes(q)
      );
    }
    return result;
  }, [facts, activeCategory, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleCategoryChange(cat: string) {
    setActiveCategory(cat);
    setPage(1);
  }

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div
        className="flex flex-col h-full overflow-hidden"
        style={{
          width: "min(760px, 100vw)",
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
            placeholder="Search by name, location, effect..."
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
          ) : (
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr style={{ background: "var(--color-card)", borderBottom: "1px solid #2a2318" }}>
                  <th className="text-left px-4 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)", width: "22%" }}>
                    Name
                  </th>
                  <th className="text-left px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)", width: "9%" }}>
                    Type
                  </th>
                  <th className="text-left px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)", width: "20%" }}>
                    Location
                  </th>
                  <th className="text-left px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)", width: "8%" }}>
                    AP
                  </th>
                  <th className="text-left px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)", width: "14%" }}>
                    Status / Effect
                  </th>
                  <th className="text-left px-2 py-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-dim)" }}>
                    Notes
                  </th>
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
                      {/* Name */}
                      <td className="px-4 py-2 font-medium" style={{ color: "var(--color-bright)" }}>
                        {fact.name}
                      </td>
                      {/* Type badge */}
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
                      {/* Location */}
                      <td className="px-2 py-2" style={{ color: "var(--color-dim)" }}>
                        {fact.location || "—"}
                      </td>
                      {/* AP */}
                      <td className="px-2 py-2" style={{ color: fact.ap ? catColor : "var(--color-dim)" }}>
                        {fact.ap ? `+${fact.ap}` : "—"}
                      </td>
                      {/* Status / Effect */}
                      <td className="px-2 py-2" style={{ color: "var(--color-purple)" }}>
                        {fact.status || fact.effect || "—"}
                      </td>
                      {/* Raw / upgrade */}
                      <td className="px-2 py-2" style={{ color: "var(--color-dim)", maxWidth: 200 }}>
                        <span
                          className="truncate block"
                          title={fact.upgrade || fact.raw}
                          style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                          {fact.upgrade || fact.raw}
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
