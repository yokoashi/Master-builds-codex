import { type ReactNode } from "react";
import { useTheme } from "@/lib/theme";

export default function MystScene({ children }: { children: ReactNode }) {
  const { theme } = useTheme();

  if (theme !== 'myst') return <>{children}</>;

  return (
    <div className="myst-wrap">
      {/* 3D stone room — behind the UI */}
      <div className="myst-s3d">
        <div className="myst-bwall" />
        <div className="myst-win" />
        <div className="myst-wll" />
        <div className="myst-wlr" />
        <div className="myst-flr" />
        <div className="myst-ped">
          <div className="myst-pt" />
          <div className="myst-pf" />
        </div>
      </div>

      {/* Flat UI layer on top of the 3D scene */}
      <div className="myst-content">
        {children}
      </div>
    </div>
  );
}
