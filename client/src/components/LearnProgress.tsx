import { useState, useEffect, useRef } from "react";
import { hexToRgba } from "@/lib/utils";

interface ProgressEvent {
  gameKey: string;
  stage: string;
  detail?: string;
  done?: boolean;
  error?: string;
}

interface LogEntry {
  stage: string;
  detail?: string;
  ts: number;
  isError?: boolean;
  isDone?: boolean;
}

// The 5 broad phases in order — used to calculate % progress
const PHASE_ORDER = [
  "Wiki pre-pass",
  "Wiki pre-pass done",
  "Wiki pre-pass skipped",
  "Batch 1",
  "Batch 1/5 done",
  "Batch 2",
  "Batch 2/5 done",
  "Batch 3",
  "Batch 3/5 done",
  "Batch 4",
  "Batch 4/5 done",
  "Batch 5",
  "Batch 5/5 done",
  "Synthesis pass",
  "Complete",
];

function stageToPercent(stage: string): number {
  if (stage.startsWith("Wiki pre-pass")) return 5;
  if (stage.startsWith("Batch 1") && !stage.includes("done")) return 12;
  if (stage === "Batch 1/5 done") return 25;
  if (stage.startsWith("Batch 2") && !stage.includes("done")) return 30;
  if (stage === "Batch 2/5 done") return 43;
  if (stage.startsWith("Batch 3") && !stage.includes("done")) return 48;
  if (stage === "Batch 3/5 done") return 60;
  if (stage.startsWith("Batch 4") && !stage.includes("done")) return 65;
  if (stage === "Batch 4/5 done") return 77;
  if (stage.startsWith("Batch 5") && !stage.includes("done")) return 82;
  if (stage === "Batch 5/5 done") return 88;
  if (stage === "Synthesis pass") return 92;
  if (stage === "Complete") return 100;
  if (stage === "Error") return 100;
  return 5;
}

interface Props {
  gameKey: string;
  gameName: string;
  accent: string;
  onDone?: () => void;
}

export default function LearnProgress({ gameKey, gameName, accent, onDone }: Props) {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [pct, setPct] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [isError, setIsError] = useState(false);
  const [connected, setConnected] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/learn/progress?gameKey=${encodeURIComponent(gameKey)}`);
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as ProgressEvent;
        if (ev.gameKey !== gameKey) return;

        setLog((prev) => [
          ...prev,
          {
            stage: ev.stage,
            detail: ev.detail,
            ts: Date.now(),
            isError: !!ev.error,
            isDone: !!ev.done,
          },
        ]);
        setPct(stageToPercent(ev.stage));

        if (ev.done) {
          setIsDone(true);
          setIsError(!!ev.error);
          es.close();
          if (!ev.error) setTimeout(() => onDone?.(), 2000);
        }
      } catch {
        // ignore parse errors (heartbeat comments pass through as empty data)
      }
    };

    es.onerror = () => {
      setConnected(false);
      // Don't close — EventSource auto-reconnects on transient errors
    };

    return () => {
      es.close();
    };
  }, [gameKey]);

  // Auto-scroll log to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  const latestEntry = log[log.length - 1];
  const barColor = isError ? "#d64545" : isDone ? "#6daa45" : accent;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: "var(--color-card)", border: `1px solid ${hexToRgba(barColor, 0.35)}` }}
    >
      {/* Header */}
      <div
        className="px-4 py-2.5 flex items-center justify-between"
        style={{ borderBottom: `1px solid #2a2318` }}
      >
        <div className="flex items-center gap-2">
          {/* Pulsing dot while running */}
          {!isDone && (
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: barColor,
                boxShadow: `0 0 6px ${hexToRgba(barColor, 0.7)}`,
                animation: "pulse 1.2s ease-in-out infinite",
              }}
            />
          )}
          {isDone && !isError && (
            <span className="text-sm" style={{ color: "#6daa45" }}>✓</span>
          )}
          {isError && (
            <span className="text-sm" style={{ color: "#d64545" }}>✗</span>
          )}
          <span className="text-xs font-semibold" style={{ color: "var(--color-bright)", fontFamily: "var(--font-display)" }}>
            {isDone && !isError
              ? `Learn complete — ${gameName}`
              : isError
              ? `Learn failed — ${gameName}`
              : `Learning ${gameName}...`}
          </span>
        </div>
        <span className="text-xs font-medium" style={{ color: barColor }}>
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full" style={{ background: "#2a2318" }}>
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${hexToRgba(barColor, 0.7)}, ${barColor})`,
            transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>

      {/* Current stage */}
      {latestEntry && (
        <div className="px-4 py-2 flex items-start gap-2" style={{ borderBottom: "1px solid #1e1a14" }}>
          <span className="text-xs font-medium flex-shrink-0" style={{ color: barColor }}>
            {latestEntry.stage}
          </span>
          {latestEntry.detail && (
            <span className="text-xs truncate" style={{ color: "var(--color-dim)" }}>
              — {latestEntry.detail}
            </span>
          )}
        </div>
      )}

      {/* Stage log (scrollable, max 160px) */}
      <div
        className="overflow-y-auto px-4 py-2 space-y-0.5"
        style={{ maxHeight: 160 }}
      >
        {log.length === 0 && !connected && (
          <p className="text-xs" style={{ color: "var(--color-dim)" }}>
            Connecting to server...
          </p>
        )}
        {log.map((entry, i) => (
          <div key={i} className="flex items-baseline gap-2 text-xs">
            <span
              className="flex-shrink-0 font-medium"
              style={{
                color: entry.isError
                  ? "#d64545"
                  : entry.isDone
                  ? "#6daa45"
                  : entry.stage.includes("done") || entry.stage.includes("skipped")
                  ? "var(--color-dim)"
                  : barColor,
              }}
            >
              {entry.isError ? "✗" : entry.isDone ? "✓" : entry.stage.includes("done") ? "✓" : "·"}
            </span>
            <span style={{ color: "var(--color-dim)" }}>
              <span style={{ color: "var(--color-text)" }}>{entry.stage}</span>
              {entry.detail && <span> — {entry.detail}</span>}
            </span>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      {/* Pulse keyframe */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
