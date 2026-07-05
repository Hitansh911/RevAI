"use client";

import { useEffect } from "react";
import { X, Star, TrendingUp, AlertCircle, Lightbulb } from "lucide-react";
import { WeeklyReport } from "@prisma/client";
import { useCategoryTheme } from "@/context/CategoryContext";

interface ReportSlideOutProps {
  report: WeeklyReport | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportSlideOut({ report, isOpen, onClose }: ReportSlideOutProps) {
  const { theme } = useCategoryTheme();

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const strengths = Array.isArray(report?.strengths) ? report.strengths : [];
  const improvements = Array.isArray(report?.improvements) ? report.improvements : [];
  const recommendations = Array.isArray(report?.recommendations) ? report.recommendations : [];

  const metrics: any = report?.structuredMetrics || {};

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[100] animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Slide-out Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl z-[110] flex flex-col animate-in slide-in-from-right duration-500 ease-out sm:rounded-l-[32px] overflow-hidden border-l border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-white/80 backdrop-blur-xl z-10 sticky top-0">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Report Details</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {report?.weekStart ? new Date(report.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""} - {report?.weekEnd ? new Date(report.weekEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#FAFAFA]">
          
          {/* Executive Summary */}
          {report?.aiSummary && (
            <section className="bg-white rounded-3xl p-6 border border-[#E2E0E8] shadow-[0px_4px_20px_rgba(0,0,0,0.02)]">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">
                <Star className="w-4 h-4 text-[#4a47d2]" /> Executive Summary
              </h3>
              <p className="text-slate-700 leading-relaxed text-sm">
                {report.aiSummary}
              </p>
            </section>
          )}

          {/* Key Strengths */}
          {strengths.length > 0 && (
            <section className="bg-white rounded-3xl p-6 border border-[#E2E0E8] shadow-[0px_4px_20px_rgba(0,0,0,0.02)]">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> Key Strengths
              </h3>
              <ul className="space-y-3">
                {strengths.map((str: any, i: number) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Areas for Improvement */}
          {improvements.length > 0 && (
            <section className="bg-white rounded-3xl p-6 border border-[#E2E0E8] shadow-[0px_4px_20px_rgba(0,0,0,0.02)]">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">
                <AlertCircle className="w-4 h-4 text-orange-500" /> Areas for Improvement
              </h3>
              <ul className="space-y-3">
                {improvements.map((imp: any, i: number) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-2" />
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Strategic Recommendations */}
          {recommendations.length > 0 && (
            <section className="bg-white rounded-3xl p-6 border border-[#E2E0E8] shadow-[0px_4px_20px_rgba(0,0,0,0.02)] border-l-4 border-l-[#4a47d2]">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">
                <Lightbulb className="w-4 h-4 text-[#4a47d2]" /> Actionable Recommendations
              </h3>
              <ul className="space-y-4">
                {recommendations.map((rec: any, i: number) => (
                  <li key={i} className="flex gap-4 p-4 rounded-2xl bg-slate-50">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 font-bold text-xs">
                      {i + 1}
                    </div>
                    <p className="text-sm text-slate-800 leading-relaxed">{rec}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

        </div>
      </div>
    </>
  );
}
