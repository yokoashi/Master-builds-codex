import type { Build } from "@shared/types";
import { hexToRgba } from "@/lib/utils";

interface Props {
  build: Build;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export default function DeleteModal({ build, onConfirm, onCancel, isLoading }: Props) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Delete build confirmation"
    >
      <div
        className="rounded-lg p-6 max-w-sm w-full"
        style={{ background: "var(--color-card)", border: "1px solid #3a3028" }}
        data-testid="delete-modal"
      >
        <h2
          className="text-lg font-bold mb-2"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-bright)" }}
        >
          Delete Build
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--color-dim)" }}>
          Are you sure you want to delete{" "}
          <strong style={{ color: build.accent }}>{build.label}</strong>? This
          cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            data-testid="btn-delete-cancel"
            className="px-4 py-2 rounded text-sm font-medium transition-all hover:bg-white/5"
            style={{ border: "1px solid #3a3028", color: "var(--color-dim)" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            data-testid="btn-delete-confirm"
            className="px-4 py-2 rounded text-sm font-medium transition-all disabled:opacity-50"
            style={{
              background: hexToRgba("#d64545", 0.15),
              border: "1px solid #d64545",
              color: "#d64545",
            }}
          >
            {isLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
