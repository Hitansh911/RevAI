"use client";

import { CheckCircle, X, Clipboard, ExternalLink, Star } from "lucide-react";
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

  const starColors = ["", "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];
  const starColor = starColors[Math.min(5, Math.max(1, overallRating))] ?? "#22c55e";

  return (
    <>
      <style>{`
        @keyframes sm-backdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes sm-scaleIn {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.72) translateY(32px); }
          62%  { transform: translate(-50%, -50%) scale(1.03) translateY(-5px); }
          82%  { transform: translate(-50%, -50%) scale(0.98) translateY(2px); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1) translateY(0); }
        }
        @keyframes sm-glowPulse {
          0%, 100% { opacity: 0.45; transform: translate(-50%, -55%) scale(1); }
          50%       { opacity: 0.72; transform: translate(-50%, -55%) scale(1.14); }
        }
        @keyframes sm-ringExpand {
          0%   { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes sm-checkBounce {
          0%   { opacity: 0; transform: scale(0.38) rotate(-18deg); }
          55%  { transform: scale(1.17) rotate(6deg); opacity: 1; }
          78%  { transform: scale(0.95) rotate(-2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes sm-slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sm-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        .sm-backdrop  { animation: sm-backdropIn 0.3s cubic-bezier(0.16,1,0.3,1) both; }
        .sm-card      { animation: sm-scaleIn 0.58s cubic-bezier(0.34,1.56,0.64,1) both; }
        .sm-glow      { animation: sm-glowPulse 3.2s ease-in-out infinite; }
        .sm-ring1     { animation: sm-ringExpand 1.6s 0.18s ease-out forwards; opacity: 0; }
        .sm-ring2     { animation: sm-ringExpand 1.6s 0.42s ease-out forwards; opacity: 0; }
        .sm-check     { animation: sm-checkBounce 0.62s 0.2s cubic-bezier(0.34,1.56,0.64,1) both; opacity: 0; }
        .sm-c1        { animation: sm-slideUp 0.42s 0.5s cubic-bezier(0.16,1,0.3,1) both; opacity: 0; }
        .sm-c2        { animation: sm-slideUp 0.42s 0.63s cubic-bezier(0.16,1,0.3,1) both; opacity: 0; }
        .sm-c3        { animation: sm-slideUp 0.42s 0.76s cubic-bezier(0.16,1,0.3,1) both; opacity: 0; }
        .sm-c4        { animation: sm-slideUp 0.42s 0.89s cubic-bezier(0.16,1,0.3,1) both; opacity: 0; }

        .sm-cta-btn {
          background: linear-gradient(135deg, #5b21b6, #7c3aed, #8b5cf6);
          background-size: 200%;
          animation: sm-shimmer 3s linear infinite, sm-slideUp 0.42s 0.89s cubic-bezier(0.16,1,0.3,1) both;
          opacity: 0;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .sm-cta-btn:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 16px 40px rgba(124,58,237,0.48) !important;
        }
        .sm-close-btn { transition: background 0.18s, transform 0.18s; }
        .sm-close-btn:hover { background: rgba(0,0,0,0.1) !important; transform: scale(1.12); }
      `}</style>

      {/* ── Backdrop ── */}
      <div
        className="sm-backdrop"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          background:
            "radial-gradient(ellipse at 50% 38%, rgba(109,40,217,0.32) 0%, rgba(3,7,18,0.52) 100%)",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      >
        {/* Ambient glow */}
        <div
          className="sm-glow"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 480,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(139,92,246,0.38) 0%, transparent 68%)",
            filter: "blur(50px)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* ── Modal card (fixed, centered absolutely) ── */}
      <div
        className="sm-card"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1001,
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: "2rem",
          padding: isMobile ? "1.75rem 1.4rem 1.5rem" : "2.25rem 2rem 2rem",
          width: "calc(100vw - 2rem)",
          maxWidth: 440,
          boxShadow:
            "0 0 0 1px rgba(139,92,246,0.18), 0 8px 0 rgba(124,58,237,0.06), 0 36px 96px rgba(88,28,135,0.32)",
          overflow: "hidden",
        }}
      >
        {/* Top shimmer stripe */}
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            height: 4,
            background: "linear-gradient(90deg,#5b21b6,#7c3aed,#a855f7,#7c3aed,#5b21b6)",
            backgroundSize: "200%",
            animation: "sm-shimmer 3s linear infinite",
          }}
        />

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="sm-close-btn"
            style={{
              position: "absolute",
              top: "1.1rem",
              right: "1.1rem",
              background: "rgba(0,0,0,0.06)",
              border: "none",
              borderRadius: "50%",
              width: 34,
              height: 34,
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

        {/* ── Success icon ── */}
        <div style={{ position: "relative", width: 88, height: 88, margin: "0.5rem auto 1.35rem" }}>
          <div
            className="sm-ring1"
            style={{ position: "absolute", inset: -10, borderRadius: "50%", border: `2px solid ${starColor}` }}
          />
          <div
            className="sm-ring2"
            style={{ position: "absolute", inset: -20, borderRadius: "50%", border: `1.5px solid ${starColor}88` }}
          />
          <div
            className="sm-check"
            style={{
              width: 88, height: 88,
              background: "linear-gradient(135deg, #10b981, #059669)",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 12px 40px rgba(16,185,129,0.42)",
            }}
          >
            <CheckCircle size={40} color="white" strokeWidth={2.5} />
          </div>
        </div>

        {/* ── Headline ── */}
        <div className="sm-c1" style={{ textAlign: "center", marginBottom: "0.85rem" }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 900, color: "#111827", margin: "0 0 0.38rem", letterSpacing: "-0.03em" }}>
            Review Ready! 🎉
          </h2>
          <p style={{ fontSize: "0.83rem", color: "#6b7280", margin: 0, lineHeight: 1.55 }}>
            Your review for <strong style={{ color: "#5b21b6" }}>{businessName}</strong> has been copied to your clipboard.
          </p>
        </div>

        {/* ── Stars row ── */}
        <div className="sm-c2" style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: "0.75rem" }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={22}
              style={{
                color: s <= overallRating ? starColor : "#e5e7eb",
                fill:  s <= overallRating ? starColor : "none",
                filter: s <= overallRating ? `drop-shadow(0 2px 6px ${starColor}60)` : "none",
                transition: "all 0.15s",
              }}
            />
          ))}
        </div>

        {/* ── Rating badge ── */}
        <div className="sm-c2" style={{ display: "flex", justifyContent: "center", marginBottom: "1.1rem" }}>
          <OverallRatingBadge rating={overallRating} size="lg" showGoogleNote />
        </div>

        {/* ── Paste instructions ── */}
        <div
          className="sm-c3"
          style={{
            background: "linear-gradient(135deg, #f0fdf4, #ecfdf5)",
            border: "1px solid #a7f3d0",
            borderRadius: "1.1rem",
            padding: "1rem 1.1rem",
            marginBottom: googleReviewUrl ? "1rem" : 0,
          }}
        >
          <p style={{ fontSize: ".78rem", fontWeight: 700, color: "#065f46", marginBottom: ".45rem", display: "flex", alignItems: "center", gap: ".4rem" }}>
            <Clipboard size={13} />
            {isMobile ? "How to post on your phone:" : "How to post on your computer:"}
          </p>
          {isMobile ? (
            <ol style={{ margin: 0, paddingLeft: "1.1rem", fontSize: ".78rem", color: "#047857", lineHeight: 1.7 }}>
              <li>Tap inside Google's review box</li>
              <li>Long press &amp; tap <strong>'Paste'</strong></li>
              <li>Tap <strong>'Post'</strong> to share publicly!</li>
            </ol>
          ) : (
            <ol style={{ margin: 0, paddingLeft: "1.1rem", fontSize: ".78rem", color: "#047857", lineHeight: 1.7 }}>
              <li>Click inside Google's review box</li>
              <li>Press <strong>Ctrl+V</strong> (or <strong>Cmd+V</strong> on Mac) to paste</li>
              <li>Click <strong>'Post'</strong> to share publicly!</li>
            </ol>
          )}
        </div>

        {/* ── Google Maps CTA ── */}
        {googleReviewUrl && (
          <a
            href={googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="sm-cta-btn sm-c4"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.45rem",
              padding: "0.85rem 1rem",
              borderRadius: "999px",
              fontSize: "0.875rem",
              fontWeight: 700,
              color: "white",
              textDecoration: "none",
              letterSpacing: "-0.01em",
            }}
          >
            <ExternalLink size={15} />
            Open Google Maps to Post
          </a>
        )}
      </div>
    </>
  );
}
