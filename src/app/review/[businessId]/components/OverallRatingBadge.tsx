"use client";

import { Star } from "lucide-react";

interface OverallRatingBadgeProps {
  rating: number; // 1-5
  size?: "sm" | "md" | "lg";
  showGoogleNote?: boolean;
}

export function OverallRatingBadge({
  rating,
  size = "md",
  showGoogleNote = true,
}: OverallRatingBadgeProps) {
  const clamped = Math.min(5, Math.max(1, Math.round(rating)));

  const starSize = size === "sm" ? 16 : size === "lg" ? 28 : 20;
  const textSize =
    size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm";
  const padding = size === "sm" ? "px-3 py-1.5" : size === "lg" ? "px-5 py-3" : "px-4 py-2";

  return (
    <div
      className={`inline-flex flex-col items-center gap-1 rounded-2xl ${padding} border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm`}
      style={{ animation: "fadeUpIn .4s both" }}
    >
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            size={starSize}
            style={{
              color: s <= clamped ? "#f59e0b" : "#d1d5db",
              fill: s <= clamped ? "#f59e0b" : "none",
            }}
          />
        ))}
        <span
          className={`ml-1.5 font-bold text-amber-800 ${textSize}`}
        >
          {clamped}/5
        </span>
      </div>
      <p className={`font-semibold text-amber-900 ${size === "sm" ? "text-[11px]" : "text-[12px]"} tracking-wide uppercase`}>
        Recommended Google Rating
      </p>
      {showGoogleNote && (
        <p className="text-[11px] text-amber-700 text-center max-w-[200px] leading-tight">
          Tap the matching star count once on Google Maps
        </p>
      )}
    </div>
  );
}
