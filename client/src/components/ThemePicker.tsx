import { useState, useRef, useEffect } from "react";
import { useTheme, THEMES, type ThemeId } from "@/hooks/use-theme";

export default function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleToggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 6,
        left: rect.left,
      });
    }
    setOpen((v) => !v);
  }

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];
  const standardThemes = THEMES.filter((t) => t.tier === "standard");
  const deepThemes = THEMES.filter((t) => t.tier === "deep");

  function ThemeButton({ t }: { t: typeof THEMES[0] }) {
    const isActive = t.id === theme;
    const isDeep = t.tier === "deep";
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
            : isDeep
            ? "1px solid rgba(255,255,255,0.06)"
            : "1px solid transparent",
          background: isActive
            ? `${t.preview[2]}18`
            : isDeep
            ? "rgba(255,255,255,0.02)"
            : "transparent",
          cursor: "pointer",
          transition: "background 0.15s, border-color 0.15s",
          textAlign: "left",
          width: "100%",
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            (e.currentTarget as HTMLButtonElement).style.background =
              isDeep ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.04)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            (e.currentTarget as HTMLButtonElement).style.background =
              isDeep ? "rgba(255,255,255,0.02)" : "transparent";
          }
        }}
      >
        {/* Swatch row + active check + deep badge */}
        <span style={{ display: "flex", gap: "3px", alignItems: "center", width: "100%" }}>
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
            <span style={{ marginLeft: "4px", fontSize: "0.55rem", color: t.preview[2] }}>
              ✓
            </span>
          )}
          {isDeep && (
            <span
              style={{
                marginLeft: "auto",
                fontSize: "0.5rem",
                fontFamily: "var(--font-display)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: t.preview[2],
                opacity: 0.8,
                border: `1px solid ${t.preview[2]}55`,
                borderRadius: "3px",
                padding: "1px 4px",
                lineHeight: 1,
              }}
            >
              Deep
            </span>
          )}
        </span>
        {/* Label */}
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
        {/* Description */}
        <span
          style={{
            fontSize: "0.58rem",
            color: "var(--color-dim)",
            lineHeight: 1.3,
          }}
        >
          {t.description}
        </span>
      </button>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        ref={btnRef}
        onClick={handleToggle}
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
        {current.tier === "deep" && (
          <span
            style={{
              fontSize: "0.5rem",
              fontFamily: "var(--font-display)",
              letterSpacing: "0.05em",
              color: current.preview[2],
              opacity: 0.9,
              border: `1px solid ${current.preview[2]}55`,
              borderRadius: "3px",
              padding: "0px 3px",
              lineHeight: "1.6",
            }}
          >
            Deep
          </span>
        )}
        <span style={{ opacity: 0.5, fontSize: "0.6rem" }}>{open ? "▲" : "▼"}</span>
      </button>

      {/* Dropdown panel — fixed so it escapes overflow:hidden ancestors */}
      {open && dropdownPos && (
        <div
          ref={dropRef}
          style={{
            position: "fixed",
            top: dropdownPos.top,
            left: dropdownPos.left,
            zIndex: 9999,
            width: "300px",
            background: "var(--color-card)",
            border: "1px solid #2a2318",
            borderRadius: "6px",
            padding: "8px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
            maxHeight: "80vh",
            overflowY: "auto",
          }}
        >
          {/* ── Standard themes ── */}
          <p
            style={{
              fontSize: "0.58rem",
              fontFamily: "var(--font-display)",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--color-dim2)",
              padding: "2px 6px 6px",
            }}
          >
            Standard
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4px",
              marginBottom: "10px",
            }}
          >
            {standardThemes.map((t) => (
              <ThemeButton key={t.id} t={t} />
            ))}
          </div>

          {/* Divider */}
          <div
            style={{
              height: "1px",
              background: "rgba(255,255,255,0.06)",
              margin: "0 4px 10px",
            }}
          />

          {/* ── Deep themes ── */}
          <p
            style={{
              fontSize: "0.58rem",
              fontFamily: "var(--font-display)",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--color-dim2)",
              padding: "2px 6px 6px",
            }}
          >
            Deep — Full Transformation
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {deepThemes.map((t) => (
              <ThemeButton key={t.id} t={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
