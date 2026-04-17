import { useState, useRef, useEffect } from "react";
import { useTheme, THEMES, type ThemeId } from "@/hooks/use-theme";

export default function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Change theme"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "2px 8px",
          height: "24px",
          borderRadius: "4px",
          border: "1px solid #2a2318",
          background: open ? "rgba(255,255,255,0.06)" : "transparent",
          color: "var(--color-dim)",
          fontSize: "0.7rem",
          fontFamily: "var(--font-display)",
          letterSpacing: "0.04em",
          cursor: "pointer",
          transition: "background 0.15s, color 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--color-bright)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--color-dim)";
        }}
      >
        {/* Swatch preview */}
        <span style={{ display: "flex", gap: "2px", alignItems: "center" }}>
          {current.preview.map((c, i) => (
            <span
              key={i}
              style={{
                width: i === 2 ? 6 : 5,
                height: i === 2 ? 6 : 5,
                borderRadius: "50%",
                background: c,
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
          ))}
        </span>
        <span>{current.label}</span>
        <span style={{ opacity: 0.5, fontSize: "0.6rem" }}>{open ? "▲" : "▼"}</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: 0,
            zIndex: 200,
            width: "260px",
            background: "var(--color-card)",
            border: "1px solid #2a2318",
            borderRadius: "6px",
            padding: "6px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}
        >
          <p
            style={{
              fontSize: "0.6rem",
              fontFamily: "var(--font-display)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-dim)",
              padding: "4px 6px 6px",
            }}
          >
            Theme
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4px",
            }}
          >
            {THEMES.map((t) => {
              const isActive = t.id === theme;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id as ThemeId);
                    setOpen(false);
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "4px",
                    padding: "8px 10px",
                    borderRadius: "4px",
                    border: isActive
                      ? `1px solid ${t.preview[2]}`
                      : "1px solid transparent",
                    background: isActive
                      ? `${t.preview[2]}18`
                      : "transparent",
                    cursor: "pointer",
                    transition: "background 0.15s, border-color 0.15s",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255,255,255,0.04)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "transparent";
                    }
                  }}
                >
                  {/* Swatch row */}
                  <span style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                    {t.preview.map((c, i) => (
                      <span
                        key={i}
                        style={{
                          width: i === 2 ? 14 : 10,
                          height: i === 2 ? 14 : 10,
                          borderRadius: "50%",
                          background: c,
                          border: "1px solid rgba(255,255,255,0.12)",
                          flexShrink: 0,
                        }}
                      />
                    ))}
                    {isActive && (
                      <span
                        style={{
                          marginLeft: "4px",
                          fontSize: "0.55rem",
                          color: t.preview[2],
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </span>
                  {/* Label + description */}
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontFamily: "var(--font-display)",
                      color: isActive ? t.preview[2] : "var(--color-bright)",
                      lineHeight: 1,
                    }}
                  >
                    {t.label}
                  </span>
                  <span
                    style={{
                      fontSize: "0.6rem",
                      color: "var(--color-dim)",
                      lineHeight: 1.2,
                    }}
                  >
                    {t.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
