"use client";

import type { ReviewMode } from "@/types";

const MODES: { key: ReviewMode; icon: string; label: string; sublabel: string }[] = [
  { key: "standard",     icon: "⭐", label: "Standard",    sublabel: "Rate each category" },
  { key: "express_emoji",icon: "⚡", label: "Express",     sublabel: "Under 20 seconds" },
  { key: "voice",        icon: "🎤", label: "Voice",       sublabel: "Speak your feedback" },
];

interface ModeSelectorProps {
  selected: ReviewMode;
  onSelect: (mode: ReviewMode) => void;
}

export function ModeSelector({ selected, onSelect }: ModeSelectorProps) {
  return (
    <div>
      <p style={{ textAlign: "center", fontSize: ".8rem", color: "#9ca3af", marginBottom: ".85rem", fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase" }}>
        Choose how to leave feedback
      </p>

      <div style={{ display: "flex", gap: ".5rem" }}>
        {MODES.map(({ key, icon, label, sublabel }) => {
          const active = selected === key;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              aria-pressed={active}
              style={{
                flex: 1,
                padding: ".65rem .4rem",
                border: `2px solid ${active ? "#7c3aed" : "#e5e7eb"}`,
                borderRadius: "1rem",
                background: active ? "linear-gradient(135deg, #ede9fe, #f5f3ff)" : "white",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: ".25rem",
                minHeight: 44,
                minWidth: 44,
                transition: "all .18s ease",
                transform: active ? "translateY(-1px)" : "none",
                boxShadow: active ? "0 4px 14px rgba(124,58,237,.2)" : "none",
              }}
            >
              <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{icon}</span>
              <span style={{ fontSize: ".75rem", fontWeight: 700, color: active ? "#6d28d9" : "#374151" }}>
                {label}
              </span>
              <span style={{ fontSize: ".65rem", color: active ? "#7c3aed" : "#9ca3af", fontWeight: 500, textAlign: "center", lineHeight: 1.2 }}>
                {sublabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
