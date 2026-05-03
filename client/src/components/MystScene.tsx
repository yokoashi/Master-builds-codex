import { useTheme } from "@/lib/theme";

/**
 * MystScene
 * Full-viewport 3D stone room rendered with CSS perspective.
 * Wraps the router in App.tsx — children render in a flat layer (z-index 10)
 * on top of the 3D scene. Only renders the room in Myst theme.
 */
export default function MystScene({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  if (theme !== "myst") return <>{children}</>;

  return (
    <div className="myst-wrap">
      {/* ── 3D SCENE ── rendered behind everything */}
      <div className="myst-s3d">
        {/* Back wall */}
        <div className="myst-bwall">
          <div className="myst-win" />
          <div className="myst-wlight" />
        </div>

        {/* Side walls */}
        <div className="myst-wll" />
        <div className="myst-wlr" />

        {/* Floor */}
        <div className="myst-flr" />

        {/* Stone pedestal */}
        <div className="myst-ped">
          <div className="myst-ped-top" />
          <div className="myst-ped-front" />
        </div>
        <div className="myst-ped-shadow" />

        {/* Open linking book on the pedestal */}
        <div className="myst-book">
          {/* Folded-back cover with linking panel */}
          <div className="myst-cover">
            <div className="myst-bc myst-bc-tl" />
            <div className="myst-bc myst-bc-tr" />
            <div className="myst-bc myst-bc-bl" />
            <div className="myst-bc myst-bc-br" />
            <div className="myst-linking-panel">
              <div className="myst-lp-sky" />
              <div className="myst-lp-water" />
              <div className="myst-lp-tree" style={{ left: 7, width: 7, height: "36%" }} />
              <div className="myst-lp-tree" style={{ left: 16, width: 8, height: "50%" }} />
              <div className="myst-lp-tree" style={{ right: 9, width: 7, height: "34%" }} />
              <div className="myst-lp-tree" style={{ right: 17, width: 8, height: "45%" }} />
              <div className="myst-lp-mist" />
            </div>
            <span className="myst-cover-title">Master Codex</span>
          </div>

          {/* Spine */}
          <div className="myst-spine" />

          {/* Left page */}
          <div className="myst-page-left" />

          {/* Right page */}
          <div className="myst-page-right" />

          {/* Book bottom thickness */}
          <div className="myst-book-bottom" />
        </div>
      </div>

      {/* ── FLAT UI LAYER ── actual app on top */}
      <div className="myst-content">
        {children}
      </div>

      {/* Scanlines overlay */}
      <div className="myst-scanlines" />
    </div>
  );
}
