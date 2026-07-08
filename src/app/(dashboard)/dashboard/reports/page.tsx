"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { getBusinessProfile, getWeeklyReports, deleteWeeklyReport } from "@/app/actions";
import { WeeklyReport } from "@prisma/client";
import { Download, Eye, Send, FileText, Star, Mail, Trash2 } from "lucide-react";
import { ReportSlideOut } from "@/components/dashboard/ReportSlideOut";
import { useCategoryTheme } from "@/context/CategoryContext";
import Image from "next/image";

// ── Components ──────────────────────────────────────────────────

function ReportsSkeleton() {
  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-8">
        <div className="h-8 w-64 skeleton-shimmer rounded-xl mb-2" />
        <div className="h-4 w-48 skeleton-shimmer rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-white border border-[#E2E0E8] rounded-[24px] p-6 h-64 flex flex-col justify-between">
            <div>
              <div className="h-4 w-32 skeleton-shimmer rounded-lg mb-4" />
              <div className="h-8 w-48 skeleton-shimmer rounded-xl mb-6" />
            </div>
            <div className="flex gap-3">
              <div className="h-11 flex-1 skeleton-shimmer rounded-xl" />
              <div className="h-11 w-11 skeleton-shimmer rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 bg-white border border-[#E2E0E8] shadow-[0px_10px_30px_rgba(0,0,0,0.04)] rounded-[32px] text-center">
      <div className="w-24 h-24 mb-6 rounded-full bg-slate-50 flex items-center justify-center shadow-inner">
        <FileText className="w-10 h-10 text-slate-300" />
      </div>
      <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-3">No reports generated yet</h2>
      <p className="text-slate-500 max-w-md leading-relaxed">
        Your first automated weekly performance report will compile and display here next Monday morning!
      </p>
    </div>
  );
}

export default function ReportsPage() {
  const { user, isLoaded } = useUser();
  const { theme } = useCategoryTheme();
  
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessData, setBusinessData] = useState<any>(null);
  
  // UI State
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [isSlideOutOpen, setIsSlideOutOpen] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const biz = await getBusinessProfile(user.id);
        if (biz) {
          setBusinessData(biz);
          const history = await getWeeklyReports(biz.id);
          setReports(history);
        }
      } catch (error) {
        console.error("Failed to load reports:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const handleSendAgain = async (reportId: string) => {
    if (sendingId) return;
    setSendingId(reportId);
    try {
      const res = await fetch("/api/reports/send-again", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert("Report has been successfully re-sent to your inbox!");
    } catch (error: any) {
      alert(`Failed to send report: ${error.message}`);
    } finally {
      setSendingId(null);
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!businessData) return;
    if (!confirm("Are you sure you want to delete this report? This action cannot be undone.")) return;
    
    setDeletingId(reportId);
    try {
      await deleteWeeklyReport(reportId, businessData.id);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (error: any) {
      alert(`Failed to delete report: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const openSlideOut = (report: WeeklyReport) => {
    setSelectedReport(report);
    setIsSlideOutOpen(true);
  };

  if (!isLoaded || loading) return <ReportsSkeleton />;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">{theme.reports.title}</h1>
        <p className="text-slate-500 text-sm">Review your historical performance and AI-generated insights.</p>
      </div>

      {reports.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report, index) => {
            const start = new Date(report.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const end = new Date(report.weekEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            
            return (
              <div 
                key={report.id} 
                className="group relative bg-white border border-[#E2E0E8] shadow-[0px_10px_30px_rgba(0,0,0,0.04)] rounded-[28px] p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-[0px_20px_40px_rgba(0,0,0,0.08)] hover:-translate-y-1"
                style={{ animation: `fadeAndSlide 300ms ${index * 50}ms both` }}
              >
                {/* Card Header & Metrics */}
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      <FileText className="w-3 h-3" />
                      Weekly Report
                    </span>
                    <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-100/50">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span className="font-bold text-xs">{report.averageRating.toFixed(1)}</span>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight mb-2">
                    Week of {start} <br/> <span className="text-slate-500 font-medium text-base">- {end}</span>
                  </h3>
                  
                  <p className="text-sm font-medium text-slate-500 mb-6">
                    <span className="text-slate-900 font-bold">{report.totalReviews}</span> {theme.reports.totalLabel.toLowerCase()}
                  </p>
                </div>

                {/* Actions Row */}
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => openSlideOut(report)}
                    className="flex-1 min-h-[44px] bg-slate-900 text-white rounded-[14px] flex items-center justify-center gap-2 text-sm font-bold hover:bg-slate-800 transition-colors active:scale-95"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  
                  {report.pdfUrl ? (
                    <>
                      <a 
                        href={report.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-[44px] h-[44px] bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-[14px] flex items-center justify-center transition-colors active:scale-95 shrink-0"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      
                      <button 
                        onClick={() => handleSendAgain(report.id)}
                        disabled={sendingId === report.id}
                        className="w-[44px] h-[44px] bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-[14px] flex items-center justify-center transition-colors active:scale-95 shrink-0 disabled:opacity-50 disabled:active:scale-100"
                        title="Send Again via Email"
                      >
                        {sendingId === report.id ? (
                          <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                      </button>
                    </>
                  ) : (
                    <div className="h-[44px] px-4 bg-slate-50 border border-slate-100 text-slate-400 text-[10px] font-bold rounded-[14px] flex items-center justify-center uppercase tracking-wider">
                      Free Plan
                    </div>
                  )}
                  
                  <button 
                    onClick={() => handleDelete(report.id)}
                    disabled={deletingId === report.id}
                    className="w-[44px] h-[44px] bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-[14px] flex items-center justify-center transition-colors active:scale-95 shrink-0 disabled:opacity-50 disabled:active:scale-100"
                    title="Delete Report"
                  >
                    {deletingId === report.id ? (
                      <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-out Panel Overlay */}
      <ReportSlideOut 
        report={selectedReport} 
        isOpen={isSlideOutOpen} 
        onClose={() => setIsSlideOutOpen(false)} 
      />
    </div>
  );
}
