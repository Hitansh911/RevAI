"use client";

import { useState } from "react";
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";

// ── Copy configuration ────────────────────────────────────────
const INSIGHTS_COPY = {
  title: "AI Operational Insights",
  description:
    "Automated executive summary, operational bottlenecks, and tailored revenue tips extracted directly from your customer feedback logs.",
  buttonText: "Generate AI Report",
};

// ── Types ─────────────────────────────────────────────────────
interface Improvement {
  topic: string;
  issue: string;
  urgency: "high" | "medium";
}

interface InsightsData {
  executive_summary: string;
  things_to_improve: Improvement[];
  revenue_tips: string[];
}

interface AIInsightsPanelProps {
  reviews: any[]; // raw reviews array from getDashboardStats / getReviews
}

// ── Skeleton loader ───────────────────────────────────────────
function InsightsSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      {/* Summary skeleton */}
      <div className="space-y-2.5">
        <div className="h-3 bg-slate-200 rounded-full w-5/6" />
        <div className="h-3 bg-slate-200 rounded-full w-4/6" />
        <div className="h-3 bg-slate-200 rounded-full w-3/6" />
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2"
          >
            <div className="h-3 bg-slate-200 rounded-full w-1/3" />
            <div className="h-3 bg-slate-200 rounded-full w-5/6" />
          </div>
        ))}
      </div>
      {/* Tips skeleton */}
      <div className="space-y-2">
        <div className="h-3 bg-slate-200 rounded-full w-2/3" />
        <div className="h-3 bg-slate-200 rounded-full w-1/2" />
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <FileText className="w-7 h-7 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700 mb-1">
        Not enough data yet
      </p>
      <p className="text-xs text-slate-400 max-w-[260px] leading-relaxed">
        Insights will appear automatically once your first 3 customer reviews
        are collected.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export function AIInsightsPanel({ reviews }: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasEnoughReviews = reviews && reviews.length >= 3;

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate.");
      setInsights(data);
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className="rounded-[24px] border border-neutral-200 bg-white p-6 sm:p-8 transition-all duration-300"
      style={{
        boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-100 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-[11px] font-bold text-violet-600 tracking-wide uppercase">
              AI Automated Analysis
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            {INSIGHTS_COPY.title}
          </h3>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed max-w-lg">
            {INSIGHTS_COPY.description}
          </p>
        </div>

        {hasEnoughReviews && (
          <button
            onClick={generate}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: loading
                ? "#e5e7eb"
                : "linear-gradient(135deg, #4a47d2, #3730a3)",
              color: loading ? "#9ca3af" : "white",
              boxShadow: loading
                ? "none"
                : "0 4px 14px rgba(74,71,210,0.3)",
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analysing…
              </>
            ) : insights ? (
              <>
                <RefreshCw className="w-4 h-4" />
                Refresh Report
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {INSIGHTS_COPY.buttonText}
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Error ──────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 mb-5">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── Skeleton (loading) ─────────────────────────────── */}
      {loading && <InsightsSkeleton />}

      {/* ── Empty state ────────────────────────────────────── */}
      {!loading && !insights && !hasEnoughReviews && <EmptyState />}

      {/* ── Ready-to-generate state ────────────────────────── */}
      {!loading && !insights && hasEnoughReviews && !error && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-14 h-14 rounded-full bg-violet-50 flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6 text-violet-400" />
          </div>
          <p className="text-sm text-slate-500 max-w-[300px] leading-relaxed">
            Click <strong>&quot;{INSIGHTS_COPY.buttonText}&quot;</strong> to analyze{" "}
            <strong>{reviews.length} reviews</strong> and generate your
            executive report.
          </p>
        </div>
      )}

      {/* ── Results ────────────────────────────────────────── */}
      {!loading && insights && (
        <div
          className="space-y-6"
          style={{ animation: "fadeUpIn .45s both" }}
        >
          <style>{`
            @keyframes fadeUpIn {
              from { opacity: 0; transform: translateY(10px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* Executive Summary */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-slate-500" />
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Executive Summary
              </h4>
            </div>
            <p className="text-[15px] text-slate-800 leading-[1.75] font-medium">
              {insights.executive_summary}
            </p>
          </div>

          {/* Things to Improve */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-slate-500" />
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Critical Things to Improve
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {insights.things_to_improve.map((item, i) => (
                <div
                  key={i}
                  className="rounded-2xl border p-4 transition-all duration-200 hover:shadow-sm"
                  style={{
                    borderColor:
                      item.urgency === "high" ? "#fecaca" : "#fde68a",
                    background:
                      item.urgency === "high" ? "#fef2f2" : "#fffbeb",
                    animation: `fadeUpIn .4s ${i * 0.08}s both`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-bold text-slate-900">
                      {item.topic}
                    </span>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        background:
                          item.urgency === "high" ? "#fee2e2" : "#fef3c7",
                        color:
                          item.urgency === "high" ? "#b91c1c" : "#92400e",
                      }}
                    >
                      {item.urgency}
                    </span>
                  </div>
                  <p className="text-[13px] text-slate-600 leading-relaxed">
                    {item.issue}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Optimization Tips */}
          <div
            className="rounded-2xl border border-emerald-200 p-5"
            style={{ background: "linear-gradient(135deg, #ecfdf5, #f0fdf4)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
                Revenue-Optimization Tips
              </h4>
            </div>
            <ul className="space-y-3">
              {insights.revenue_tips.map((tip, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3"
                  style={{ animation: `fadeUpIn .4s ${i * 0.1}s both` }}
                >
                  <span
                    className="mt-0.5 flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0"
                    style={{
                      background: "#d1fae5",
                      color: "#065f46",
                    }}
                  >
                    {i + 1}
                  </span>
                  <p className="text-[13px] text-emerald-900 leading-relaxed font-medium">
                    {tip}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
