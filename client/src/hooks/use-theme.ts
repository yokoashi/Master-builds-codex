import { useState, useEffect, useCallback } from "react";

export type ThemeId =
  | "ashen"
  | "obsidian"
  | "bloodmoon"
  | "moonstone"
  | "cursedgold"
  | "rot"
  | "frost"
  | "holy";

export interface ThemeDef {
  id: ThemeId;
  label: string;
  /** Small preview swatch colours [bg, card, accent] */
  preview: [string, string, string];
  description: string;
}

export const THEMES: ThemeDef[] = [
  {
    id: "ashen",
    label: "Ashen",
    preview: ["#0d0b08", "#171310", "#d64545"],
    description: "Soot & ember — the default",
  },
  {
    id: "obsidian",
    label: "Obsidian",
    preview: ["#080808", "#111111", "#38b4e8"],
    description: "Pure black with ice-blue chrome",
  },
  {
    id: "bloodmoon",
    label: "Blood Moon",
    preview: ["#0d0505", "#180a0a", "#ff4444"],
    description: "Deep maroon, scarlet accents",
  },
  {
    id: "moonstone",
    label: "Moonstone",
    preview: ["#080c14", "#0e1520", "#38d4c8"],
    description: "Dark navy with teal & silver",
  },
  {
    id: "cursedgold",
    label: "Cursed Gold",
    preview: ["#0c0b04", "#161408", "#d4a820"],
    description: "Corrupted olive & amber",
  },
  {
    id: "rot",
    label: "Scarlet Rot",
    preview: ["#070c05", "#0e1609", "#78d840"],
    description: "Plague green, sickly glow",
  },
  {
    id: "frost",
    label: "Frost",
    preview: ["#060810", "#0e1018", "#60a8f8"],
    description: "Icy grey-blue chrome",
  },
  {
    id: "holy",
    label: "Holy",
    preview: ["#0e0c06", "#181508", "#f0c060"],
    description: "Parchment & divine gold",
  },
];

const STORAGE_KEY = "codex-theme";

function getInitialTheme(): ThemeId {
  // Try to read from a non-restricted source: the html attribute itself
  // (set on previous render) or fall back to ashen
  if (typeof document !== "undefined") {
    const attr = document.documentElement.getAttribute("data-theme") as ThemeId | null;
    if (attr && THEMES.some((t) => t.id === attr)) return attr;
  }
  return "ashen";
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(getInitialTheme);

  // Apply theme to <html data-theme="..."> whenever it changes
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id);
    // Also persist to html attribute so getInitialTheme can read it on re-mount
    document.documentElement.setAttribute("data-theme", id);
  }, []);

  const currentThemeDef = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return { theme, setTheme, currentThemeDef, themes: THEMES };
}
