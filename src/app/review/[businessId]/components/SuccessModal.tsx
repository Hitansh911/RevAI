"use client";

import { CheckCircle, X, Clipboard, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { OverallRatingBadge } from "./OverallRatingBadge";

interface SuccessModalProps {
  visible: boolean;
  overallRating: number;
  businessName: string;
  googleReviewUrl?: string;
  onClose?: () => void;
}

export function SuccessModal({
  visible,
  overallRating,
  businessName,
  googleReviewUrl,
  onClose,
}: SuccessModalProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!visible) return null;

  return (
    // Backdrop
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        background: "rgba(88, 28, 135, 0.18)",
        animation: "fadeIn .25s both",
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalPop {
          0%   { opacity: 0; transform: scale(.88) translateY(20px); }
          70%  { transform: scale(1.02) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes ringOut {
          0%   { transform: scale(1); opacity: .5; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes checkDrop {
          0%   { opacity: 0; transform: translateY(-20px) scale(.7); }
          60%  { transform: translateY(4px) scale(1.05); opacity: 1; }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Modal card */}
      <div
        style={{
          background: "white",
          borderRadius: "2rem",
          padding: "2rem 1.75rem",
          maxWidth: "420px",
          width: "100%",
          boxShadow: "0 24px 80px rgba(88,28,135,0.25)",
          animation: "modalPop .5s both",
          position: "relative",
        }}
      >
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute",
              top: "1.1rem",
              right: "1.1rem",
              background: "#f3f4f6",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#6b7280",
            }}
          >
            <X size={16} />
          </button>
        )}

        {/* Success icon with pulse rings */}
        <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 1.25rem" }}>
          <div
            style={{
              position: "absolute",
              inset: -8,
              borderRadius: "50%",
              border: "2px solid #10b981",
              animation: "ringOut 1.4s .1s ease-out forwards",
              opacity: 0,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: -16,
              borderRadius: "50%",
              border: "2px solid #6ee7b7",
              animation: "ringOut 1.4s .35s ease-out forwards",
              opacity: 0,
            }}
          />
          <div
            style={{
              width: 80,
              height: 80,
              background: "linear-gradient(135deg, #10b981, #059669)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 32px rgba(16,185,129,.35)",
              animation: "checkDrop .6s .15s both",
              opacity: 0,
            }}
          >
            <CheckCircle size={36} color="white" />
          </div>
        </div>

        {/* Header */}
        <div style={{ textAlign: "center", animation: "slideUp .5s .4s both", opacity: 0 }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111827", margin: "0 0 .35rem" }}>
            Review Ready! 🎉
          </h2>
          <p style={{ fontSize: ".85rem", color: "#6b7280", margin: "0 0 1rem", lineHeight: 1.5 }}>
            Your review for <strong style={{ color: "#1e1b4b" }}>{businessName}</strong> has been copied to your clipboard.
          </p>
        </div>

        {/* Overall rating badge */}
        <div style={{ display: "flex", justifyContent: "center", margin: "0 0 1.25rem", animation: "slideUp .5s .55s both", opacity: 0 }}>
          <OverallRatingBadge rating={overallRating} size="lg" showGoogleNote />
        </div>

        {/* Device-aware paste instructions */}
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "1rem",
            padding: "1rem",
            animation: "slideUp .5s .7s both",
            opacity: 0,
          }}
        >
          <p style={{ fontSize: ".78rem", fontWeight: 700, color: "#166534", marginBottom: ".5rem", display: "flex", alignItems: "center", gap: ".4rem" }}>
            <Clipboard size={13} />
            {isMobile ? "How to post on your phone:" : "How to post on your computer:"}
          </p>
          {isMobile ? (
            <ol style={{ margin: 0, paddingLeft: "1.1rem", fontSize: ".78rem", color: "#15803d", lineHeight: 1.7 }}>
              <li>Tap inside Google's review box</li>
              <li>Long press & tap <strong>'Paste'</strong></li>
              <li>Tap <strong>'Post'</strong> to share publicly!</li>
            </ol>
          ) : (
            <ol style={{ margin: 0, paddingLeft: "1.1rem", fontSize: ".78rem", color: "#15803d", lineHeight: 1.7 }}>
              <li>Click inside Google's review box</li>
              <li>Press <strong>Ctrl+V</strong> (or <strong>Cmd+V</strong> on Mac) to paste</li>
              <li>Click <strong>'Post'</strong> to share publicly!</li>
            </ol>
          )}
        </div>

        {/* Re-open Google link */}
        {googleReviewUrl && (
          <a
            href={googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: ".4rem",
              marginTop: "1rem",
              padding: ".75rem",
              background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
              color: "white",
              borderRadius: "999px",
              fontSize: ".85rem",
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 4px 16px rgba(109,40,217,.3)",
              animation: "slideUp .5s .85s both",
              opacity: 0,
            }}
          >
            <ExternalLink size={14} />
            Open Google Maps
          </a>
        )}
      </div>
    </div>
  );
}
