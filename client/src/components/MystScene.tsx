export default function MystScene() {
  return (
    <div
      className="fixed inset-0 pointer-events-none select-none"
      style={{ zIndex: -1, overflow: "hidden" }}
      aria-hidden
    >
      {/* Back wall: dark blue-grey stone */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #0b1420 0%, #0d1826 40%, #0e1c2c 65%, #07090e 100%)",
        }}
      >
        {/* Stone crosshatch texture */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 109px, rgba(255,255,255,0.007) 109px, rgba(255,255,255,0.007) 110px), repeating-linear-gradient(90deg, transparent, transparent 109px, rgba(255,255,255,0.007) 109px, rgba(255,255,255,0.007) 110px)",
          }}
        />
      </div>

      {/* Window — top center */}
      <div
        className="absolute"
        style={{
          top: "6%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 72,
          height: 105,
          background: "rgba(38,76,130,0.22)",
          border: "1px solid rgba(80,130,200,0.20)",
          boxShadow:
            "0 0 50px rgba(38,76,130,0.25), inset 0 0 18px rgba(100,160,220,0.12)",
        }}
      >
        {/* Cross divider */}
        <div
          className="absolute"
          style={{
            top: "48%",
            left: 0,
            right: 0,
            height: 1,
            background: "rgba(80,130,200,0.28)",
          }}
        />
        <div
          className="absolute"
          style={{
            left: "48%",
            top: 0,
            bottom: 0,
            width: 1,
            background: "rgba(80,130,200,0.28)",
          }}
        />
      </div>

      {/* Light bloom below window */}
      <div
        className="absolute"
        style={{
          top: "6%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 400,
          height: 280,
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(38,76,130,0.10) 0%, transparent 65%)",
        }}
      />

      {/* Floor fade */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "32%",
          background:
            "linear-gradient(180deg, transparent 0%, rgba(4,6,10,0.70) 70%, #030507 100%)",
        }}
      />

      {/* Pedestal shadow */}
      <div
        className="absolute"
        style={{
          bottom: "9%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 140,
          height: 18,
          background:
            "radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.70) 0%, transparent 75%)",
        }}
      />

      {/* Pedestal front face */}
      <div
        className="absolute"
        style={{
          bottom: "9%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 115,
          height: 56,
          background: "linear-gradient(180deg, #1a2634 0%, #0f1a26 100%)",
          boxShadow: "inset 0 0 12px rgba(0,0,0,0.50)",
        }}
      >
        {/* Stone crosshatch on pedestal */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 13px, rgba(255,255,255,0.025) 13px, rgba(255,255,255,0.025) 14px)",
          }}
        />
      </div>

      {/* Pedestal top surface */}
      <div
        className="absolute"
        style={{
          bottom: "calc(9% + 56px)",
          left: "50%",
          transform: "translateX(-50%)",
          width: 126,
          height: 14,
          background: "linear-gradient(180deg, #253545 0%, #1a2634 100%)",
          border: "1px solid #2e4055",
        }}
      />

      {/* Book spine */}
      <div
        className="absolute"
        style={{
          bottom: "calc(9% + 70px)",
          left: "50%",
          transform: "translateX(-50%)",
          width: 20,
          height: 28,
          background: "linear-gradient(90deg, #0d0a05, #1c1208, #0d0a05)",
          zIndex: 2,
        }}
      />

      {/* Left page */}
      <div
        className="absolute"
        style={{
          bottom: "calc(9% + 62px)",
          left: "50%",
          transform: "translateX(-50%) translateX(-85px) rotateY(14deg)",
          transformOrigin: "right center",
          width: 92,
          height: 30,
          background: "#cdc1a0",
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 6px, rgba(85,65,28,0.08) 6px, rgba(85,65,28,0.08) 7px)",
          zIndex: 1,
        }}
      />

      {/* Right page */}
      <div
        className="absolute"
        style={{
          bottom: "calc(9% + 62px)",
          left: "50%",
          transform: "translateX(-50%) translateX(85px) rotateY(-14deg)",
          transformOrigin: "left center",
          width: 92,
          height: 30,
          background: "#c5b998",
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 6px, rgba(85,65,28,0.08) 6px, rgba(85,65,28,0.08) 7px)",
          zIndex: 1,
        }}
      />

      {/* Linking panel on left page */}
      <div
        className="absolute"
        style={{
          bottom: "calc(9% + 69px)",
          left: "calc(50% - 130px)",
          width: 44,
          height: 34,
          border: "1.5px solid #8a6c24",
          background: "#030e0a",
          overflow: "hidden",
          zIndex: 3,
        }}
      >
        {/* Sky */}
        <div
          style={{
            height: "55%",
            background: "linear-gradient(180deg, #081e2c 0%, #0a2c22 100%)",
          }}
        />
        {/* Water */}
        <div style={{ height: "45%", background: "#051510" }} />
        {/* Tree silhouettes */}
        {[18, 26, 32, 38].map((left) => (
          <div
            key={left}
            className="absolute"
            style={{
              bottom: "25%",
              left,
              width: 3,
              height: 14,
              background: "#071608",
            }}
          />
        ))}
      </div>
    </div>
  );
}
