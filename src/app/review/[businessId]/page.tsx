"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Star, Loader2, ChevronLeft, Sparkles, Send, CheckCircle } from "lucide-react";
import { getBusinessProfile } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useSearchParams } from "next/navigation";
import type { ReviewMode, EmojiChoice, QRTrackingParams } from "@/types";
import { EMOJI_SCORE_MAP } from "@/types";
import confetti from "canvas-confetti";
import { getCategoryTheme } from "@/lib/categoryTheme";

// Sub-components
import { OverallRatingBadge } from "./components/OverallRatingBadge";
import { SuccessModal } from "./components/SuccessModal";
import { VoiceRecorder } from "./components/VoiceRecorder";
import { ExpressEmojiPicker } from "./components/ExpressEmojiPicker";
import { ModeSelector } from "./components/ModeSelector";

const LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent!"];
const STAR_COLORS = ["", "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

// ── Helpers ───────────────────────────────────────────────────

type Step =
  | "loading"
  | "error"
  | "rating"
  | "generating"
  | "review"
  | "express_pick"
  | "express_edit"
  | "voice_record"
  | "voice_processing"
  | "success_modal";

/** Compute overall rating (rounded avg of all rating-type answers) */
function computeOverallRating(
  answers: Record<string, any>,
  questions: any[]
): number {
  const ratingQs = questions.filter((q: any) => q.type === "rating");
  if (ratingQs.length === 0) return 3;
  const sum = ratingQs.reduce(
    (acc: number, q: any) => acc + (Number(answers[q.id]) || 0),
    0
  );
  return Math.min(5, Math.max(1, Math.round(sum / ratingQs.length)));
}

/** Build aggregated review text from structured answers */
function buildTextFromAnswers(
  answers: Record<string, any>,
  questions: any[]
): string {
  const lines: string[] = [];
  questions.forEach((q: any) => {
    const answer = answers[q.id];
    if (q.type === "rating" && answer != null) {
      lines.push(`${q.text}: ${answer}/5 stars`);
    } else if (q.type === "text" && answer) {
      lines.push(answer);
    }
  });
  return lines.join("\n");
}

// ── Toast (inline) ────────────────────────────────────────────
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "1.5rem",
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? "0" : "1.5rem"})`,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease, transform 0.3s ease",
        pointerEvents: "none",
        zIndex: 9999,
        background: "#1e1b4b",
        color: "#fff",
        padding: "0.65rem 1.25rem",
        borderRadius: "999px",
        fontSize: "0.85rem",
        fontWeight: 600,
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        whiteSpace: "nowrap",
      }}
    >
      {message}
    </div>
  );
}



// ── Progress Ring ──────────────────────────────────────────────
function ProgressRing({ current, total }: { current: number; total: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (current / total) * circumference;

  return (
    <div className="flex items-center justify-center mb-6">
      <div className="relative flex items-center justify-center">
        <svg className="transform -rotate-90 w-12 h-12">
          <circle
            cx="24"
            cy="24"
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            className="text-gray-100"
          />
          <circle
            cx="24"
            cy="24"
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-purple-600 transition-all duration-700 ease-in-out"
          />
        </svg>
        <div className="absolute text-[10px] font-bold text-gray-500">
          {current}/{total}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function ReviewPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = React.use(params);
  const searchParams = useSearchParams();

  // ── State ───────────────────────────────────────────────────
  const [business, setBusiness] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [step, setStep] = useState<Step>("loading");
  const [reviewOptions, setReviewOptions] = useState<string[]>([]);
  const [activeOptionIndex, setActiveOptionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [reviewMode, setReviewMode] = useState<ReviewMode>("standard");
  const [emojiChoice, setEmojiChoice] = useState<EmojiChoice | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [overallRating, setOverallRating] = useState(5);

  const [displayedOptions, setDisplayedOptions] = useState<string[]>([]);
  const hasTyped = useRef(false);


  // QR tracking params
  const [trackingParams, setTrackingParams] = useState<QRTrackingParams>({
    source: null,
    table_number: null,
  });

  // Analytics timing
  const sessionStartRef = useRef<number>(Date.now());

  // ── Derived ─────────────────────────────────────────────────
  const hasQuestions =
    business?.questions &&
    Array.isArray(business.questions) &&
    business.questions.length > 0;

  // ── Typing Effect ───────────────────────────────────────────
  useEffect(() => {
    if (step === "review" && reviewOptions.length > 0 && !hasQuestions && !hasTyped.current) {
      hasTyped.current = true;
      let currentLengths = reviewOptions.map(() => 0);
      const targets = reviewOptions.map((opt) => opt.length);

      const interval = setInterval(() => {
        let allDone = true;
        currentLengths = currentLengths.map((len, idx) => {
          if (len < targets[idx]) {
            allDone = false;
            return Math.min(len + 3, targets[idx]);
          }
          return len;
        });

        setDisplayedOptions(
          reviewOptions.map((opt, idx) => opt.slice(0, currentLengths[idx]))
        );

        if (allDone) clearInterval(interval);
      }, 15);
      return () => clearInterval(interval);
    } else if (hasTyped.current || hasQuestions) {
      setDisplayedOptions(reviewOptions);
    }
  }, [step, reviewOptions, hasQuestions]);

  // Re-compute overall rating whenever answers change
  useEffect(() => {
    if (hasQuestions) {
      setOverallRating(computeOverallRating(answers, business.questions));
    } else if (rating > 0) {
      setOverallRating(rating);
    }
  }, [answers, rating, hasQuestions, business]);

  // ── Toast helper ────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  }, []);

  // ── Load business + parse QR params ────────────────────────
  useEffect(() => {
    // Parse QR tracking params
    setTrackingParams({
      source: searchParams.get("source"),
      table_number: searchParams.get("table"),
    });

    async function load() {
      try {
        const dataParam = searchParams.get("data");
        let urlQuestions: any[] | null = null;
        if (dataParam) {
          try {
            urlQuestions = JSON.parse(decodeURIComponent(atob(dataParam)));
          } catch {
            console.warn("Failed to decode questions from URL data param");
          }
        }

        if (!urlQuestions) {
          try {
            const cached = sessionStorage.getItem(`ratify_qs_${businessId}`);
            if (cached) urlQuestions = JSON.parse(cached);
          } catch {}
        }

        const biz = await getBusinessProfile(businessId);
        if (!biz) {
          setStep("error");
          return;
        }

        if (urlQuestions && urlQuestions.length > 0) biz.questions = urlQuestions;

        if (
          biz.questions &&
          Array.isArray(biz.questions) &&
          biz.questions.length > 0
        ) {
          try {
            sessionStorage.setItem(
              `ratify_qs_${businessId}`,
              JSON.stringify(biz.questions)
            );
          } catch {}
        }

        if (
          biz.category === "teaching_session" &&
          (!biz.questions ||
            (Array.isArray(biz.questions) && biz.questions.length === 0))
        ) {
          biz.questions = [
            { id: "q1", text: "How would you rate the clarity of explanations?", type: "rating", default_rating: 4, auto_answer_rationale: "The explanations were clear and well-structured." },
            { id: "q2", text: "Was the pace of the session appropriate?", type: "rating", default_rating: 4, auto_answer_rationale: "The pacing felt comfortable and easy to follow." },
            { id: "q3", text: "What was the most valuable takeaway for you?", type: "text", default_rating: null, auto_answer_rationale: "The practical examples were very helpful." },
            { id: "q4", text: "How could the session be improved?", type: "text", default_rating: null, auto_answer_rationale: "More hands-on exercises would be great." },
          ];
        }

        // Pre-populate defaults
        if (
          biz.questions &&
          Array.isArray(biz.questions) &&
          biz.questions.length > 0
        ) {
          const defaultAnswers: Record<string, any> = {};
          biz.questions.forEach((q: any) => {
            if (q.type === "rating" && q.default_rating != null)
              defaultAnswers[q.id] = q.default_rating;
            else if (q.type === "text" && q.auto_answer_rationale)
              defaultAnswers[q.id] = q.auto_answer_rationale;
          });
          setAnswers(defaultAnswers);
        }

        setBusiness(biz);
        sessionStartRef.current = Date.now();
        setStep("rating");
      } catch {
        setStep("error");
      }
    }
    load();
  }, [businessId, searchParams]);

  // ── Standard rating handler ─────────────────────────────────
  const handleRating = async (stars: number) => {
    setRating(stars);
    setStep("generating");
    try {
      if (hasQuestions) {
        const res = await fetch("/api/generate-answers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rating: stars,
            questions: business.questions,
            sessionTopic: business.name,
            category: business.category,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setAnswers(data.answers || {});
      } else {
        const res = await fetch("/api/generate-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rating: stars,
            businessId: business.id,
            businessName: business.name,
            category: business.category,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (data.reviewOptions && data.reviewOptions.length > 0) {
          setReviewOptions(data.reviewOptions);
          setActiveOptionIndex(0);
        } else {
          setReviewOptions([data.reviewText || ""]);
          setActiveOptionIndex(0);
        }
      }
      setStep("review");
    } catch (e: any) {
      setStep("rating");
      alert(e.message || "Something went wrong.");
    }
  };

  // ── Express emoji handler ───────────────────────────────────
  const handleEmojiSelect = async (choice: EmojiChoice, stars: number) => {
    setEmojiChoice(choice);
    setRating(stars);
    setStep("generating");

    try {
      if (hasQuestions) {
        const res = await fetch("/api/generate-answers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rating: stars,
            questions: business.questions,
            sessionTopic: business.name,
            category: business.category,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setAnswers(data.answers || {});
      } else {
        const res = await fetch("/api/generate-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rating: stars,
            businessId: business.id,
            businessName: business.name,
            category: business.category,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (data.reviewOptions && data.reviewOptions.length > 0) {
          setReviewOptions(data.reviewOptions);
          setActiveOptionIndex(0);
        } else {
          setReviewOptions([data.reviewText || ""]);
          setActiveOptionIndex(0);
        }
      }
      setStep("express_edit");
    } catch (e: any) {
      setStep("express_pick");
      alert(e.message || "Something went wrong.");
    }
  };

  // ── Voice transcript handler ────────────────────────────────
  const handleVoiceTranscript = async (transcript: string) => {
    setVoiceTranscript(transcript);
    setStep("voice_processing");

    try {
      const res = await fetch("/api/process-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          category: business?.category || "restaurant",
          questions: business?.questions || [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.reviewOptions && data.reviewOptions.length > 0) {
        setReviewOptions(data.reviewOptions);
        setActiveOptionIndex(0);
      } else {
        setReviewOptions([data.review_text || transcript]);
        setActiveOptionIndex(0);
      }
      if (data.answers && hasQuestions) {
        setAnswers((prev) => ({ ...prev, ...data.answers }));
      }
      const inferredRating = data.generated_rating || 4;
      setRating(inferredRating);
      setOverallRating(inferredRating);
      setStep("review");
    } catch (e: any) {
      // Fallback: use raw transcript as review text
      setReviewOptions([transcript]);
      setActiveOptionIndex(0);
      setStep("review");
    }
  };

  // ── Build final review text ─────────────────────────────────
  const buildReviewText = useCallback(() => {
    if (reviewOptions && reviewOptions.length > 0) return reviewOptions[activeOptionIndex] || "";
    if (hasQuestions) return buildTextFromAnswers(answers, business.questions);
    return "";
  }, [reviewOptions, activeOptionIndex, hasQuestions, business, answers]);

  // ── Unified submit orchestrator ─────────────────────────────
  const handleSubmit = async () => {
    setStep("generating");
    try {
      const finalText = buildReviewText();
      const computedOverall =
        hasQuestions
          ? computeOverallRating(answers, business.questions)
          : Math.max(1, Math.min(5, rating || overallRating));

      const ratingQuestions = hasQuestions
        ? business.questions.filter((q: any) => q.type === "rating")
        : [];
      const totalScore =
        ratingQuestions.length > 0
          ? ratingQuestions.reduce(
              (sum: number, q: any) => sum + (Number(answers[q.id]) || 0),
              0
            ) / ratingQuestions.length
          : computedOverall;

      const reviewsPayload = hasQuestions
        ? business.questions.map((q: any) => ({
            question_id: q.id,
            question: q.text,
            rating: q.type === "rating" ? answers[q.id] ?? null : null,
            text: q.type === "text" ? answers[q.id] ?? null : null,
          }))
        : [
            {
              question_id: "freeform",
              question: "Overall Review",
              rating: computedOverall,
              text: finalText,
            },
          ];

      const analytics = {
        review_mode: reviewMode,
        time_to_completion_ms: Date.now() - sessionStartRef.current,
        recommended_rating: computedOverall,
        final_submitted_rating: computedOverall,
        qr_source: trackingParams.source,
        completion_rate: 1 as const,
        tracking: trackingParams,
        ...(voiceTranscript ? { raw_transcript: voiceTranscript } : {}),
      };

      // 1. DB write (fire-and-forget)
      fetch("/api/reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: business.id,
          category: business.category,
          total_score: Math.round(totalScore * 10) / 10,
          overall_rating: computedOverall,
          reviews: reviewsPayload,
          metadata: analytics,
        }),
      }).catch((err) => console.error("Failed to submit review:", err));

      // 2. Clipboard
      await navigator.clipboard.writeText(finalText).catch(() => {});

      // 3. Google deep link
      if (business.googleReviewUrl) {
        window.open(business.googleReviewUrl, "_blank");
      }

      // 4. Success modal
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#a855f7", "#3b82f6", "#10b981", "#f59e0b"],
      });
      setOverallRating(computedOverall);
      setStep("success_modal");
    } catch {
      setStep("review");
      alert("Failed to submit. Please try again.");
    }
  };

  const active = hovered || rating;

  // ── Render ──────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes confettiExplode {
          0%   { transform:translate(0,0) scale(1) rotate(0deg); opacity:1; }
          100% { transform:translate(var(--tx),var(--ty)) scale(0) rotate(360deg); opacity:0; }
        }
        @keyframes badgeDrop {
          0%   { transform:translateY(-40px) scale(.7) rotate(-8deg); opacity:0; }
          60%  { transform:translateY(6px) scale(1.06) rotate(2deg); opacity:1; }
          80%  { transform:translateY(-3px) scale(.98) rotate(-1deg); }
          100% { transform:translateY(0) scale(1) rotate(0); opacity:1; }
        }
        @keyframes ringPulse {
          0%   { transform:scale(1); opacity:.55; }
          100% { transform:scale(2.1); opacity:0; }
        }
        @keyframes starPop {
          0%   { transform:scale(0) rotate(-30deg); opacity:0; }
          60%  { transform:scale(1.2) rotate(5deg); opacity:1; }
          100% { transform:scale(1) rotate(0); opacity:1; }
        }
        @keyframes fadeUpIn {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes emojiFloat {
          0%,100% { transform:translateY(0); }
          50%     { transform:translateY(-5px); }
        }
        @keyframes sparkleEntry {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes modalEntry {
          from { opacity:0; transform:scale(.92) translateY(12px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
      `}</style>

      {/* Toast */}
      <Toast message={toastMsg} visible={toastVisible} />

      {/* Success modal overlay */}
      <SuccessModal
        visible={step === "success_modal"}
        overallRating={overallRating}
        businessName={business?.name || "this business"}
        googleReviewUrl={business?.googleReviewUrl}
      />

      {/* Background with floating mesh */}
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-purple-50/50 to-blue-50 flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
        <div className="mesh-bg" />
        <Card
          className={`glass-card w-full ${
            step === "review" || step === "express_edit" ? "max-w-2xl" : "max-w-md"
          } rounded-[2rem] shadow-2xl shadow-purple-500/10 p-8 sm:p-10 relative transition-all duration-300 z-10`}
        >
          {/* ── Progress Ring ── */}
          {(step === "rating" || step === "generating" || step === "review" || step === "express_pick" || step === "voice_record" || step === "express_edit" || step === "voice_processing") && (
            <ProgressRing
              current={
                step === "rating" || step === "express_pick" || step === "voice_record"
                  ? 1
                  : step === "generating" || step === "voice_processing"
                  ? 2
                  : 3
              }
              total={3}
            />
          )}

          {/* ── LOADING ── */}
          {step === "loading" && (
            <div className="flex flex-col items-center gap-4 py-12 fade-and-slide">
              <div className="w-11 h-11 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin" />
              <p className="text-gray-400 text-sm font-medium">Loading…</p>
            </div>
          )}

          {/* ── ERROR ── */}
          {step === "error" && (
            <div className="text-center py-12 fade-and-slide">
              <div className="text-5xl mb-3">😕</div>
              <p className="font-bold text-red-500 text-lg mb-1.5">Business not found</p>
              <p className="text-gray-400 text-sm">This review link may be invalid.</p>
            </div>
          )}

          {/* ── RATING (standard) ── */}
          {step === "rating" && (
            <div className="fade-and-slide">
              {/* QR source badge */}
              {trackingParams.source && (
                <div className="flex justify-center mb-3">
                  <span className="text-[11px] font-semibold bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                    📍 {trackingParams.source.replace(/_/g, " ")}
                    {trackingParams.table_number ? ` · Table ${trackingParams.table_number}` : ""}
                  </span>
                </div>
              )}

              <div className="text-center">
                <div className="text-5xl mb-3">
                  {getCategoryTheme(business?.category).emoji}
                </div>
                <h1 className="text-2xl font-black text-gray-900 mb-1.5 tracking-tight">
                  {getCategoryTheme(business?.category).reviewHeading}
                </h1>
                <p className="text-gray-400 text-sm mb-5">
                  {getCategoryTheme(business?.category).reviewSubtext}{" "}
                  <strong className="text-purple-800">{business?.name}</strong>
                </p>

                {/* Mode selector */}
                <div className="mb-6">
                  <ModeSelector
                    selected={reviewMode}
                    onSelect={(m) => {
                      setReviewMode(m);
                      if (m === "express_emoji") setStep("express_pick");
                      else if (m === "voice") setStep("voice_record");
                    }}
                  />
                </div>

                {/* Star rating — only shown in standard mode */}
                {reviewMode === "standard" && (
                  <>
                    <div className="flex justify-center gap-2 mb-4">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          className="bg-transparent border-none cursor-pointer p-1 transition-transform duration-150 hover:scale-125 hover:rotate-6 active:scale-95"
                          onMouseEnter={() => setHovered(s)}
                          onMouseLeave={() => setHovered(0)}
                          onClick={() => handleRating(s)}
                        >
                          <Star
                            size={48}
                            style={{
                              color: s <= active ? STAR_COLORS[active] : "#e5e7eb",
                              fill: s <= active ? STAR_COLORS[active] : "none",
                              filter:
                                s <= active
                                  ? `drop-shadow(0 2px 8px ${STAR_COLORS[active]}60)`
                                  : "none",
                              transition: "all .15s",
                            }}
                          />
                        </button>
                      ))}
                    </div>
                    {active > 0 && (
                      <span
                        className="text-[15px] font-bold px-5 py-1.5 rounded-full inline-block animate-[starPop_.25s_both]"
                        style={{
                          color: STAR_COLORS[active],
                          background: `${STAR_COLORS[active]}18`,
                        }}
                      >
                        {LABELS[active]}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── EXPRESS EMOJI PICK ── */}
          {step === "express_pick" && (
            <div className="animate-[sparkleEntry_.5s_both]">
              <button
                onClick={() => { setStep("rating"); setReviewMode("standard"); }}
                className="block mb-4 bg-transparent border-none cursor-pointer text-[13px] text-gray-400 font-medium hover:text-gray-600 transition-colors"
              >
                <ChevronLeft className="inline-block w-3.5 h-3.5 mr-1 align-text-bottom" />
                Back
              </button>
              <ExpressEmojiPicker
                onSelect={handleEmojiSelect}
                selected={emojiChoice}
              />
            </div>
          )}

          {/* ── VOICE RECORD ── */}
          {step === "voice_record" && (
            <div className="animate-[sparkleEntry_.5s_both]">
              <button
                onClick={() => { setStep("rating"); setReviewMode("standard"); }}
                className="block mb-4 bg-transparent border-none cursor-pointer text-[13px] text-gray-400 font-medium hover:text-gray-600 transition-colors"
              >
                <ChevronLeft className="inline-block w-3.5 h-3.5 mr-1 align-text-bottom" />
                Back
              </button>
              <div className="text-center mb-6">
                <div className="text-5xl mb-2">🎤</div>
                <h2 className="text-xl font-extrabold text-gray-900 mb-1">
                  Share Your Feedback
                </h2>
                <p className="text-gray-400 text-sm">
                  Speak naturally — AI will polish it for you
                </p>
              </div>
              <VoiceRecorder onTranscriptReady={handleVoiceTranscript} />
            </div>
          )}

          {/* ── GENERATING / VOICE PROCESSING ── */}
          {(step === "generating" || step === "voice_processing") && (
            <div className="text-center py-10 fade-and-slide">
              <div className="relative w-full max-w-sm mx-auto mb-6">
                <div className="h-24 skeleton-shimmer rounded-2xl mb-4 opacity-50" />
                <div className="h-16 skeleton-shimmer rounded-2xl mb-4 opacity-30" />
                <div className="h-16 skeleton-shimmer rounded-2xl opacity-10" />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-600 w-10 h-10 z-10 animate-pulse" />
              </div>
              <p className="text-base font-bold text-gray-900 mb-1">
                {step === "voice_processing"
                  ? "Analysing your voice feedback…"
                  : reviewMode === "express_emoji"
                  ? "Building your express review…"
                  : hasQuestions
                  ? "Auto-filling your feedback…"
                  : "Writing your review…"}
              </p>
              <p className="text-[13px] text-gray-400">AI is crafting the perfect response</p>
            </div>
          )}

          {/* ── EXPRESS EDIT INTERSTITIAL ── */}
          {step === "express_edit" && (
            <div className="fade-and-slide">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">
                  {emojiChoice === "amazing" ? "🤩" : emojiChoice === "great" ? "😊" : emojiChoice === "okay" ? "😐" : "😞"}
                </div>
                <h2 className="text-lg font-extrabold text-gray-900 mb-1">
                  Express Review Ready!
                </h2>
                <p className="text-gray-400 text-[13px]">Review and edit before submitting.</p>
              </div>

              {/* Overall rating badge */}
              <div className="flex justify-center mb-5">
                <OverallRatingBadge rating={overallRating} showGoogleNote={false} />
              </div>

              {hasQuestions ? (
                <div className="flex flex-col gap-3 mb-5">
                  {business.questions.map((q: any, i: number) => (
                    <div
                      key={q.id}
                      className="bg-gray-50 border border-gray-100 rounded-2xl p-4"
                      style={{ animation: `sparkleEntry .4s ${i * 0.07}s both` }}
                    >
                      <p className="text-[13px] font-semibold text-gray-700 mb-2.5">
                        <span className="text-purple-600 mr-1">{i + 1}.</span> {q.text}
                      </p>
                      {q.type === "rating" ? (
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              className="bg-transparent border-none cursor-pointer p-0.5 hover:scale-110 transition-transform"
                              onClick={() => setAnswers({ ...answers, [q.id]: s })}
                            >
                              <Star
                                size={22}
                                style={{
                                  color: s <= (answers[q.id] || 0) ? "#f59e0b" : "#e5e7eb",
                                  fill: s <= (answers[q.id] || 0) ? "#f59e0b" : "none",
                                  transition: "all .12s",
                                }}
                              />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <Textarea
                          rows={2}
                          value={answers[q.id] || ""}
                          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                          placeholder="Type your answer…"
                          className="bg-white border-gray-200 focus-visible:ring-purple-500 resize-none text-[13px]"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  {reviewOptions.map((opt, idx) => {
                    const isActive = activeOptionIndex === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => setActiveOptionIndex(idx)}
                        className={`relative rounded-2xl p-4 transition-all duration-200 border cursor-text ${
                          isActive
                            ? "bg-white border-purple-600 shadow-[0_0_0_1px_rgba(147,51,234,1)] ring-purple-600"
                            : "bg-gray-50 border-gray-200 hover:bg-white hover:border-gray-300"
                        }`}
                      >
                        {isActive && (
                          <div className="absolute top-3 right-3 text-purple-600">
                            <CheckCircle size={16} className="fill-purple-100" />
                          </div>
                        )}
                        <textarea
                          ref={(el) => {
                            if (el) {
                              el.style.height = "auto";
                              el.style.height = el.scrollHeight + "px";
                            }
                          }}
                          value={displayedOptions[idx] ?? opt}
                          onChange={(e) => {
                            if (e.target) {
                              e.target.style.height = "auto";
                              e.target.style.height = e.target.scrollHeight + "px";
                            }
                            const newOpts = [...reviewOptions];
                            newOpts[idx] = e.target.value;
                            setReviewOptions(newOpts);
                            setDisplayedOptions(newOpts);
                          }}
                          className={`w-full overflow-hidden resize-none bg-transparent p-0 text-[14px] leading-relaxed focus-visible:ring-0 focus-visible:outline-none border-none shadow-none ${
                            isActive ? "text-gray-900 pr-6" : "text-gray-500"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2">
                <Button
                  onClick={handleSubmit}
                  size="lg"
                  className="w-full bg-gradient-to-r from-purple-800 to-purple-600 hover:from-purple-900 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg shadow-purple-600/20 transition-all hover:-translate-y-0.5 py-3.5"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit &amp; Post Review
                </Button>
              </div>
              <button
                onClick={() => setStep("express_pick")}
                className="block mx-auto mt-3 bg-transparent border-none cursor-pointer text-[13px] text-gray-400 font-medium hover:text-gray-600 transition-colors"
              >
                <ChevronLeft className="inline-block w-3.5 h-3.5 mr-1 align-text-bottom" />
                Change emoji
              </button>
            </div>
          )}

          {/* ── STANDARD REVIEW ── */}
          {step === "review" && (
            <div className="fade-and-slide">
              <div className="flex justify-center gap-1 mb-3.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={20}
                    style={{
                      color: s <= rating ? STAR_COLORS[rating] : "#e5e7eb",
                      fill: s <= rating ? STAR_COLORS[rating] : "none",
                    }}
                  />
                ))}
              </div>

              <div className="text-center mb-5">
                <h2 className="text-lg font-extrabold text-gray-900 mb-1">
                  {reviewMode === "voice"
                    ? "Your Voice Review is Ready!"
                    : hasQuestions
                    ? "Your feedback is ready!"
                    : "Your review is ready!"}
                </h2>
                <p className="text-gray-400 text-[13px]">Feel free to edit before submitting.</p>
              </div>

              {/* Overall rating badge */}
              <div className="flex justify-center mb-5">
                <OverallRatingBadge rating={overallRating} />
              </div>

              {hasQuestions ? (
                <div className="flex flex-col gap-3 mb-5">
                  {business.questions.map((q: any, i: number) => (
                    <div
                      key={q.id}
                      className="bg-gray-50 border border-gray-100 rounded-2xl p-4"
                      style={{ animation: `sparkleEntry .4s ${i * 0.07}s both` }}
                    >
                      <p className="text-[13px] font-semibold text-gray-700 mb-2.5">
                        <span className="text-purple-600 mr-1">{i + 1}.</span> {q.text}
                      </p>
                      {q.type === "rating" ? (
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              className="bg-transparent border-none cursor-pointer p-0.5 hover:scale-110 transition-transform"
                              onClick={() => setAnswers({ ...answers, [q.id]: s })}
                            >
                              <Star
                                size={22}
                                style={{
                                  color: s <= (answers[q.id] || 0) ? "#f59e0b" : "#e5e7eb",
                                  fill: s <= (answers[q.id] || 0) ? "#f59e0b" : "none",
                                  transition: "all .12s",
                                }}
                              />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <Textarea
                          rows={2}
                          value={answers[q.id] || ""}
                          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                          placeholder="Type your answer…"
                          className="bg-white border-gray-200 focus-visible:ring-purple-500 resize-none text-[13px]"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  {reviewOptions.map((opt, idx) => {
                    const isActive = activeOptionIndex === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => setActiveOptionIndex(idx)}
                        className={`relative rounded-2xl p-4 transition-all duration-200 border cursor-text ${
                          isActive
                            ? "bg-white border-purple-600 shadow-[0_0_0_1px_rgba(147,51,234,1)] ring-purple-600"
                            : "bg-gray-50 border-gray-200 hover:bg-white hover:border-gray-300"
                        }`}
                      >
                        {isActive && (
                          <div className="absolute top-3 right-3 text-purple-600">
                            <CheckCircle size={16} className="fill-purple-100" />
                          </div>
                        )}
                        <textarea
                          ref={(el) => {
                            if (el) {
                              el.style.height = "auto";
                              el.style.height = el.scrollHeight + "px";
                            }
                          }}
                          value={displayedOptions[idx] ?? opt}
                          onChange={(e) => {
                            if (e.target) {
                              e.target.style.height = "auto";
                              e.target.style.height = e.target.scrollHeight + "px";
                            }
                            const newOpts = [...reviewOptions];
                            newOpts[idx] = e.target.value;
                            setReviewOptions(newOpts);
                            setDisplayedOptions(newOpts);
                          }}
                          className={`w-full overflow-hidden resize-none bg-transparent p-0 text-[14px] leading-relaxed focus-visible:ring-0 focus-visible:outline-none border-none shadow-none ${
                            isActive ? "text-gray-900 pr-6" : "text-gray-500"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2">
                <Button
                  onClick={handleSubmit}
                  size="lg"
                  className="w-full bg-gradient-to-r from-purple-800 to-purple-600 hover:from-purple-900 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg shadow-purple-600/20 transition-all hover:-translate-y-0.5 py-3.5"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit &amp; Post Review
                </Button>
                <p className="text-center text-[11px] text-gray-400 font-medium">
                  Submits privately to management and opens Google Maps instantly.
                </p>
              </div>
              <button
                onClick={() => setStep("rating")}
                className="block mx-auto mt-3 bg-transparent border-none cursor-pointer text-[13px] text-gray-400 font-medium hover:text-gray-600 transition-colors"
              >
                <ChevronLeft className="inline-block w-3.5 h-3.5 mr-1 align-text-bottom" />
                Change rating
              </button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
