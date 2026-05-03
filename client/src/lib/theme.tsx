import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Theme = "ashen" | "myst";

export const THEMES: { key: Theme; label: string; accent: string }[] = [
  { key: "ashen", label: "Ashen", accent: "#d64545" },
  { key: "myst",  label: "Myst",  accent: "#8a6c24" },
];

interface ThemeCtx { theme: Theme; setTheme: (t: Theme) => void; }
const ThemeContext = createContext<ThemeCtx>({ theme: "ashen", setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("ashen");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
