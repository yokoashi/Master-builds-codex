import { useState, useEffect, useCallback } from "react";

export type ThemeId =
  | "ashen"
  | "obsidian"
  | "bloodmoon"
  | "moonstone"
  | "cursedgold"
  | "rot"
  | "frost"
  | "holy"
  // Deep themes
  | "grimoire"
  | "forge"
  | "void"
  | "faebound"
  | "bloodscript";

export interface ThemeDef {
  id: ThemeId;
  label: string;
  /** Small preview swatch colours [bg, card, accent] */
  preview: [string, string, string];
  description: string;
  /** "standard" = color-only swap; "deep" = full UI transformation */
  tier: "standard" | "deep";
}

export const THEMES: ThemeDef[] = [
  // ── Standard themes — color-only swaps ─────────────────────────────────────
  {
    id: "ashen",
    label: "Ashen",
    preview: ["#0d0b08", "#171310", "#d64545"],
    description: "Soot & ember — the default",
    tier: "standard",
  },
  {
    id: "obsidian",
    label: "Obsidian",
    preview: ["#080808", "#111111", "#38b4e8"],
    description: "Pure black with ice-blue chrome",
    tier: "standard",
  },
  {
    id: "bloodmoon",
    label: "Blood Moon",
    preview: ["#0d0505", "#180a0a", "#ff4444"],
    description: "Deep maroon, scarlet accents",
    tier: "standard",
  },
  {
    id: "moonstone",
    label: "Moonstone",
    preview: ["#080c14", "#0e1520", "#38d4c8"],
    description: "Dark navy with teal & silver",
    tier: "standard",
  },
  {
    id: "cursedgold",
    label: "Cursed Gold",
    preview: ["#0c0b04", "#161408", "#d4a820"],
    description: "Corrupted olive & amber",
    tier: "standard",
  },
  {
    id: "rot",
    label: "Scarlet Rot",
    preview: ["#070c05", "#0e1609", "#78d840"],
    description: "Plague green, sickly glow",
    tier: "standard",
  },
  {
    id: "frost",
    label: "Frost",
    preview: ["#060810", "#0e1018", "#60a8f8"],
    description: "Icy grey-blue chrome",
    tier: "standard",
  },
  {
    id: "holy",
    label: "Holy",
    preview: ["#0e0c06", "#181508", "#f0c060"],
    description: "Parchment & divine gold",
    tier: "standard",
  },
  // ── Deep themes — full UI transformation ─────────────────────────────────────
  {
    id: "grimoire",
    label: "Grimoire",
    preview: ["#110e07", "#1c1608", "#9b5de5"],
    description: "Ancient spellbook — blackletter headers, aged serif, arcane ink borders",
    tier: "deep",
  },
  {
    id: "forge",
    label: "Forge",
    preview: ["#0c0a07", "#171410", "#e85a1a"],
    description: "Blacksmith's workshop — condensed industrial type, ember-glow edges",
    tier: "deep",
  },
  {
    id: "void",
    label: "Void",
    preview: ["#03020a", "#080614", "#7858e8"],
    description: "Cosmic horror — geometric mono, scan-line body, glitch focus rings",
    tier: "deep",
  },
  {
    id: "faebound",
    label: "Faebound",
    preview: ["#050d08", "#0a1610", "#38d4b0"],
    description: "Enchanted forest — italic serif headers, bioluminescent card glow",
    tier: "deep",
  },
  {
    id: "bloodscript",
    label: "Bloodscript",
    preview: ["#0a0505", "#140808", "#cc2020"],
    description: "Dark ritual — ornate display, crimson serif body, blood-pulse borders",
    tier: "deep",
  },
];

// ── Module-level singleton so all useTheme() calls stay in sync ──────────────

function readDomTheme(): ThemeId {
  if (typeof document !== "undefined") {
    const attr = document.documentElement.getAttribute("data-theme") as ThemeId | null;
    if (attr && THEMES.some((t) => t.id === attr)) return attr;
  }
  return "ashen";
}

let _current: ThemeId = readDomTheme();
const _listeners = new Set<(t: ThemeId) => void>();

function _setGlobal(id: ThemeId) {
  _current = id;
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", id);
  }
  _listeners.forEach((fn) => fn(id));
}

export function useTheme() {
  const [theme, setLocal] = useState<ThemeId>(() => _current);

  useEffect(() => {
    // Sync in case DOM was set before this component mounted
    if (_current !== theme) setLocal(_current);
    _listeners.add(setLocal);
    return () => { _listeners.delete(setLocal); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = useCallback((id: ThemeId) => { _setGlobal(id); }, []);

  const currentThemeDef = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return { theme, setTheme, currentThemeDef, themes: THEMES };
}
