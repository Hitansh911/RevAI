"use client";

import type { EmojiChoice } from "@/types";

const EMOJIS: { key: EmojiChoice; emoji: string; label: string; color: string; bg: string; stars: number }[] = [
  { key: "poor",    emoji: "😞", label: "Poor",    color: "#ef4444", bg: "#fef2f2", stars: 2 },
  { key: "okay",    emoji: "😐", label: "Okay",    color: "#f59e0b", bg: "#fffbeb", stars: 3 },
  { key: "great",   emoji: "😊", label: "Great",   color: "#22c55e", bg: "#f0fdf4", stars: 4 },
  { key: "amazing", emoji: "🤩", label: "Amazing", color: "#8b5cf6", bg: "#faf5ff", stars: 5 },
];

interface ExpressEmojiPickerProps {
  onSelect: (choice: EmojiChoice, stars: number) => void;
  selected?: EmojiChoice | null;
  disabled?: boolean;
}

export function ExpressEmojiPicker({ onSelect, selected, disabled }: ExpressEmojiPickerProps) {
  return (
    <div>
      <style>{`
        @keyframes emojiBounce {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.22) rotate(-4deg); }
          70%  { transform: scale(.95) rotate(2deg); }
          100% { transform: scale(1) rotate(0); }
        }
        .emoji-btn:hover .emoji-inner { animation: emojiBounce .35s both; }
        .emoji-btn:active .emoji-inner { transform: scale(.9); }
      `}</style>

      <p style={{ textAlign: "center", fontSize: ".85rem", color: "#9ca3af", marginBottom: "1.25rem", fontWeight: 500 }}>
        ⚡ Rate your experience in under 20 seconds
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
        {EMOJIS.map(({ key, emoji, label, color, bg, stars }) => {
          const isSelected = selected === key;
          return (
            <button
              key={key}
              className="emoji-btn"
              onClick={() => !disabled && onSelect(key, stars)}
              disabled={disabled}
              aria-label={`${label} — ${stars} stars`}
              style={{
                background: isSelected ? bg : "white",
                border: `2px solid ${isSelected ? color : "#e5e7eb"}`,
                borderRadius: "1.25rem",
                padding: "1.25rem .75rem",
                cursor: disabled ? "not-allowed" : "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: ".5rem",
                minHeight: 100,
                minWidth: 44,
                transform: isSelected ? "scale(1.04)" : "scale(1)",
                boxShadow: isSelected ? `0 6px 20px ${color}30` : "0 1px 4px rgba(0,0,0,.06)",
                transition: "all .2s ease",
                outline: isSelected ? `3px solid ${color}40` : "none",
                outlineOffset: 2,
              }}
            >
              <span className="emoji-inner" style={{ fontSize: "2.5rem", lineHeight: 1, display: "block" }}>
                {emoji}
              </span>
              <span style={{ fontSize: ".82rem", fontWeight: 700, color: isSelected ? color : "#374151" }}>
                {label}
              </span>
              <span style={{ fontSize: ".72rem", color: isSelected ? color : "#9ca3af", fontWeight: 500 }}>
                {"★".repeat(stars)}{"☆".repeat(5 - stars)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
