import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Props {
  /** Called after keys are saved successfully */
  onComplete: () => void;
  /** If true, shows as a settings modal overlay instead of full-screen */
  asModal?: boolean;
  onClose?: () => void;
}

export default function SetupScreen({ onComplete, asModal, onClose }: Props) {
  const [perplexityKey, setPerplexityKey] = useState("");
  const [claudeKey, setClaudeKey] = useState("");
  const [showPplx, setShowPplx] = useState(false);
  const [showClaude, setShowClaude] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/config", {
        perplexityKey: perplexityKey.trim() || undefined,
        claudeKey: claudeKey.trim() || undefined,
      }),
    onSuccess: () => {
      setError(null);
      onComplete();
    },
    onError: (e: Error) => setError(e.message),
  });

  function handleSave() {
    if (!perplexityKey.trim() && !claudeKey.trim()) {
      setError("Enter at least one API key.");
      return;
    }
    saveMutation.mutate();
  }

  const content = (
    <div
      style={{
        width: "100%",
        maxWidth: 480,
        background: "var(--color-card)",
        border: "1px solid #2a2318",
        borderRadius: asModal ? 8 : 0,
        padding: "36px 40px",
        boxShadow: asModal ? "0 16px 64px rgba(0,0,0,0.7)" : "none",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.05rem",
              color: "var(--color-gold)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            ✦ Master Build Codex
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--color-dim)" }}>
            {asModal ? "API Key Settings" : "First-time setup — paste your API keys to get started"}
          </p>
        </div>
        {asModal && onClose && (
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #3a3028",
              borderRadius: 4,
              color: "var(--color-dim)",
              padding: "2px 8px",
              fontSize: "0.75rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Perplexity key */}
      <KeyField
        label="Perplexity API Key"
        hint="Used for all web research and AI generation"
        linkText="Get one at perplexity.ai/settings/api"
        linkHref="https://www.perplexity.ai/settings/api"
        prefix="pplx-"
        value={perplexityKey}
        onChange={setPerplexityKey}
        show={showPplx}
        onToggleShow={() => setShowPplx((v) => !v)}
      />

      <div style={{ marginTop: 20 }} />

      {/* Claude key */}
      <KeyField
        label="Claude API Key"
        hint="Used for JSON structuring and synthesis (optional — app works Perplexity-only without it)"
        linkText="Get one at console.anthropic.com"
        linkHref="https://console.anthropic.com/settings/keys"
        prefix="sk-ant-"
        value={claudeKey}
        onChange={setClaudeKey}
        show={showClaude}
        onToggleShow={() => setShowClaude((v) => !v)}
      />

      {error && (
        <p className="mt-4 text-xs" style={{ color: "#d64545" }}>
          {error}
        </p>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saveMutation.isPending}
        style={{
          marginTop: 28,
          width: "100%",
          padding: "10px",
          borderRadius: 6,
          background: saveMutation.isPending
            ? "rgba(232,192,90,0.15)"
            : "rgba(232,192,90,0.18)",
          border: "1px solid rgba(232,192,90,0.5)",
          color: "var(--color-gold)",
          fontFamily: "var(--font-display)",
          fontSize: "0.8rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          cursor: saveMutation.isPending ? "not-allowed" : "pointer",
          opacity: saveMutation.isPending ? 0.6 : 1,
          transition: "opacity 0.15s",
        }}
      >
        {saveMutation.isPending ? "Saving…" : asModal ? "Save Keys" : "Save & Launch Codex"}
      </button>

      {!asModal && (
        <p className="mt-3 text-xs text-center" style={{ color: "var(--color-dim)" }}>
          Keys are saved locally next to the app — never sent anywhere except the respective APIs.
        </p>
      )}
    </div>
  );

  if (asModal) {
    return (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.65)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      >
        {content}
      </div>
    );
  }

  // Full-screen first-launch layout
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 40%, rgba(232,192,90,0.04) 0%, transparent 60%), radial-gradient(circle at 70% 70%, rgba(214,69,69,0.03) 0%, transparent 60%)",
        }}
      />
      {content}
    </div>
  );
}

// ── Reusable key input field ────────────────────────────────────────────────
interface KeyFieldProps {
  label: string;
  hint: string;
  linkText: string;
  linkHref: string;
  prefix: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
}

function KeyField({ label, hint, linkText, linkHref, prefix, value, onChange, show, onToggleShow }: KeyFieldProps) {
  const hasValue = value.trim().length > 0;
  const looksValid = value.trim().startsWith(prefix) && value.trim().length > 20;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.7rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: hasValue ? (looksValid ? "var(--color-gold)" : "#d64545") : "var(--color-dim)",
          }}
        >
          {label}
          {hasValue && (
            <span style={{ marginLeft: 6, fontSize: "0.6rem", opacity: 0.7 }}>
              {looksValid ? "✓" : "⚠ unexpected format"}
            </span>
          )}
        </label>
        <a
          href={linkHref}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: "0.65rem", color: "var(--color-dim)", textDecoration: "underline" }}
        >
          {linkText}
        </a>
      </div>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${prefix}…`}
          autoComplete="off"
          spellCheck={false}
          style={{
            width: "100%",
            padding: "9px 40px 9px 12px",
            background: "var(--color-bg)",
            border: `1px solid ${hasValue && !looksValid ? "#d64545" : "#3a3028"}`,
            borderRadius: 5,
            color: "var(--color-text)",
            fontSize: "0.8rem",
            fontFamily: "monospace",
            outline: "none",
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-gold)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = hasValue && !looksValid ? "#d64545" : "#3a3028"; }}
        />
        <button
          type="button"
          onClick={onToggleShow}
          tabIndex={-1}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            color: "var(--color-dim)",
            cursor: "pointer",
            fontSize: "0.75rem",
            padding: 2,
          }}
        >
          {show ? "🙈" : "👁"}
        </button>
      </div>
      <p style={{ marginTop: 5, fontSize: "0.65rem", color: "var(--color-dim)" }}>{hint}</p>
    </div>
  );
}
