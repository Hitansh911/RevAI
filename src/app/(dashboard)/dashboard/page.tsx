"use client";

import { useUser } from "@clerk/nextjs";
import {
  Star, QrCode, Mic, Smile, ClipboardList,
  Globe, BarChart3, Link2, ShieldCheck, User, MessageCircle,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import { getReviews, getBusinessProfile } from "@/app/actions";
import { AIInsightsPanel } from "./components/AIInsightsPanel";
import { useCategoryTheme } from "@/context/CategoryContext";

// ── Helpers ───────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getModeBadge(metadata: any): { label: string; icon: React.ReactNode; color: string } {
  const mode = metadata?.review_mode;
  if (mode === "voice") return { label: "Voice", icon: <Mic className="w-3 h-3" />, color: "bg-blue-100 text-blue-700" };
  if (mode === "express_emoji") return { label: "Express", icon: <Smile className="w-3 h-3" />, color: "bg-amber-100 text-amber-700" };
  return { label: "Standard", icon: <ClipboardList className="w-3 h-3" />, color: "bg-purple-100 text-purple-700" };
}

const RATING_COLORS: Record<number, string> = {
  1: "bg-red-100 text-red-600",
  2: "bg-orange-100 text-orange-600",
  3: "bg-yellow-100 text-yellow-600",
  4: "bg-lime-100 text-lime-700",
  5: "bg-emerald-100 text-emerald-700",
};

// ── Skeleton Loader ───────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-8">
        <div className="h-8 w-64 skeleton-shimmer rounded-xl mb-2" />
        <div className="h-4 w-48 skeleton-shimmer rounded-lg" />
      </div>
      <div className="h-11 w-72 skeleton-shimmer rounded-full mb-6" />
      <div className="bg-white border border-[#E2E0E8] rounded-[24px] p-6 mb-5">
        <div className="h-4 w-32 skeleton-shimmer rounded-lg mb-3" />
        <div className="h-12 w-24 skeleton-shimmer rounded-xl mb-4" />
        <div className="h-24 w-full skeleton-shimmer rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {[0, 1].map(i => (
          <div key={i} className="bg-white border border-[#E2E0E8] rounded-[24px] p-6">
            <div className="h-4 w-28 skeleton-shimmer rounded-lg mb-3" />
            <div className="h-10 w-20 skeleton-shimmer rounded-xl mb-4" />
            <div className="h-12 w-full skeleton-shimmer rounded-xl" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-[#E2E0E8] rounded-[24px] p-6">
        <div className="h-5 w-36 skeleton-shimmer rounded-lg mb-6" />
        {[0, 1, 2].map(i => (
          <div key={i} className="flex gap-4 mb-4">
            <div className="w-12 h-12 skeleton-shimmer rounded-xl shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-full skeleton-shimmer rounded-lg mb-2" />
              <div className="h-3 w-2/3 skeleton-shimmer rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GoogleTabSkeleton() {
  return (
    <div className="animate-in fade-in duration-300 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[0, 1].map(i => (
          <div key={i} className="bg-white border border-[#E2E0E8] rounded-[24px] p-6">
            <div className="h-4 w-36 skeleton-shimmer rounded-lg mb-3" />
            <div className="h-10 w-24 skeleton-shimmer rounded-xl" />
          </div>
        ))}
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} className="bg-white border border-[#E2E0E8] rounded-[24px] p-6">
          <div className="flex gap-4">
            <div className="w-11 h-11 skeleton-shimmer rounded-full shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-40 skeleton-shimmer rounded-lg mb-2" />
              <div className="h-3 w-full skeleton-shimmer rounded-lg mb-2" />
              <div className="h-3 w-2/3 skeleton-shimmer rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="text-center py-16 px-6">
      <div className="text-5xl mb-4">📊</div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">No feedback data available yet</h3>
      <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
        Share your public link or QR code with customers to see your live analytics update here!
      </p>
      <Link
        href="/dashboard/qr-generator"
        className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-colors"
      >
        <QrCode className="w-4 h-4" />
        Generate QR Code
      </Link>
    </div>
  );
}

// ── Google Not Connected Fallback ─────────────────────────────

function GoogleNotConnected() {
  return (
    <div className="relative rounded-[24px] overflow-hidden">
      {/* Glassmorphic background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-white/60 to-indigo-50/80 backdrop-blur-sm" />
      <div className="relative z-10 flex flex-col items-center text-center py-20 px-8">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6 shadow-[0_12px_40px_rgba(59,130,246,0.3)]">
          <Globe className="w-9 h-9 text-white" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
          Sync Your Live Google Maps Profile
        </h2>
        <p className="text-sm text-slate-500 max-w-lg leading-relaxed mb-8">
          Connect your official Google Business account via OAuth to pull in real-time
          customer reviews, track public star ratings, and reply directly from this workspace.
        </p>
        <button
          className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-bold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #4285F4, #1a73e8)",
            boxShadow: "0 8px 30px rgba(66,133,244,0.35)",
          }}
          onClick={() => {
            // Placeholder: will trigger Google OAuth flow when implemented
            alert("Google Business OAuth integration coming soon! You'll be redirected to authorize your Google account.");
          }}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#fff"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" opacity="0.8"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#fff" opacity="0.6"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" opacity="0.9"/>
          </svg>
          Link Google Profile
        </button>
        <div className="flex items-center gap-2 mt-4 text-xs text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>OAuth 2.0 secured · Read-only access · Revoke anytime</span>
        </div>
      </div>
    </div>
  );
}

// ── Google Reviews Feed (when connected) ──────────────────────

function GoogleReviewsFeed({ reviews, totalCount, avgRating }: {
  reviews: any[];
  totalCount: number;
  avgRating: number;
}) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-16 px-6">
        <div className="text-5xl mb-4">🌐</div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">No Google reviews yet</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          Your Google Business listing is connected but has no reviews. As customers leave reviews on Google Maps, they'll appear here in real-time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <section className="bg-white border border-[#E2E0E8] shadow-[0px_10px_30px_rgba(0,0,0,0.04)] rounded-[24px] p-6 transition-all duration-300 hover:shadow-[0px_20px_40px_rgba(0,0,0,0.08)]">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Google Reviews</h3>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-4xl font-bold text-slate-900">{totalCount}</p>
            <Globe className="w-5 h-5 text-blue-500" />
          </div>
        </section>
        <section className="bg-white border border-[#E2E0E8] shadow-[0px_10px_30px_rgba(0,0,0,0.04)] rounded-[24px] p-6 transition-all duration-300 hover:shadow-[0px_20px_40px_rgba(0,0,0,0.08)]">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Google Rating Score</h3>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-4xl font-bold text-slate-900">{avgRating.toFixed(1)}</p>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(s => (
                <Star
                  key={s}
                  className="w-4 h-4"
                  fill={s <= Math.round(avgRating) ? "#f59e0b" : "none"}
                  color={s <= Math.round(avgRating) ? "#f59e0b" : "#d1d5db"}
                />
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Review timeline */}
      <section className="bg-white border border-[#E2E0E8] shadow-[0px_10px_30px_rgba(0,0,0,0.04)] rounded-[24px] p-6 transition-all duration-300 hover:shadow-[0px_20px_40px_rgba(0,0,0,0.08)]">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Google Review Timeline</h3>
        <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1">
          {reviews.map((review: any, i: number) => (
            <div
              key={review.reviewId || i}
              className="border border-slate-100 rounded-2xl p-5 hover:border-slate-200 transition-all"
              style={{ animation: `fadeAndSlide 300ms ${i * 40}ms both` }}
            >
              <div className="flex gap-3.5 items-start">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
                  {review.reviewer?.profilePhotoUrl ? (
                    <Image
                      src={review.reviewer.profilePhotoUrl}
                      alt={review.reviewer.displayName || "Reviewer"}
                      width={44}
                      height={44}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <User className="w-5 h-5 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-slate-900 truncate">
                      {review.reviewer?.displayName || "Google User"}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 shrink-0">
                      {review.createTime ? timeAgo(new Date(review.createTime)) : ""}
                    </span>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-0.5 mt-1 mb-2">
                    {[1, 2, 3, 4, 5].map(s => {
                      const ratingMap: Record<string, number> = {
                        ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
                      };
                      const numRating = typeof review.starRating === "number"
                        ? review.starRating
                        : (ratingMap[review.starRating] || 0);
                      return (
                        <Star
                          key={s}
                          className="w-3.5 h-3.5"
                          fill={s <= numRating ? "#f59e0b" : "none"}
                          color={s <= numRating ? "#f59e0b" : "#e5e7eb"}
                        />
                      );
                    })}
                  </div>

                  {/* Review text */}
                  {review.comment && (
                    <p className="text-sm text-slate-600 leading-relaxed">{review.comment}</p>
                  )}

                  {/* Owner reply */}
                  {review.reviewReply && (
                    <div className="mt-3 ml-3 pl-4 border-l-2 border-blue-200 bg-blue-50/50 rounded-r-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <MessageCircle className="w-3 h-3 text-blue-600" />
                        <span className="text-[11px] font-bold text-blue-700">Owner Reply</span>
                        {review.reviewReply.updateTime && (
                          <span className="text-[10px] text-blue-400 ml-auto">
                            {timeAgo(new Date(review.reviewReply.updateTime))}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-blue-800 leading-relaxed">{review.reviewReply.comment}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Tab Navigation Bar ────────────────────────────────────────

type TabKey = "app" | "google";

function TabBar({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "app", label: "App Insights", icon: <BarChart3 className="w-4 h-4" /> },
    { key: "google", label: "Google Maps Reviews", icon: <Globe className="w-4 h-4" /> },
  ];

  return (
    <div className="flex items-center bg-white/80 backdrop-blur-lg border border-gray-200/50 p-1 rounded-full shadow-sm w-max mb-6">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
            active === tab.key
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [reviewsData, setReviewsData] = useState<any[]>([]);
  const [businessData, setBusinessData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("app");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReviews, setGoogleReviews] = useState<any[]>([]);
  const [googleStats, setGoogleStats] = useState<{ total: number; avg: number } | null>(null);
  const { theme } = useCategoryTheme();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const biz = await getBusinessProfile(user.id);
        if (biz) {
          setBusinessData(biz);
          const revs = await getReviews(biz.id);
          setReviewsData(revs);
        }
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, [user]);

  // Check if Google is connected (has OAuth tokens — not just a review URL)
  const isGoogleConnected = false; // No OAuth yet — always show fallback

  // Fetch Google reviews when tab switches (placeholder for real API)
  useEffect(() => {
    if (activeTab !== "google" || !isGoogleConnected || !businessData) return;
    async function fetchGoogleReviews() {
      setGoogleLoading(true);
      try {
        // When Google OAuth is implemented, this will call:
        // const res = await fetch(`/api/google/reviews?businessId=${businessData.id}`);
        // const data = await res.json();
        // setGoogleReviews(data.reviews || []);
        // setGoogleStats({ total: data.totalReviews, avg: data.averageRating });
        setGoogleReviews([]);
        setGoogleStats({ total: 0, avg: 0 });
      } catch {}
      finally { setGoogleLoading(false); }
    }
    fetchGoogleReviews();
  }, [activeTab, isGoogleConnected, businessData]);

  // ── Computed metrics (App tab) ──────────────────────────────
  const stats = useMemo(() => {
    const total = reviewsData.length;
    if (total === 0) return { total: 0, avg: "—", csat: 0, thisMonth: 0, monthGrowth: 0 };

    const avg = (reviewsData.reduce((s, r) => s + r.rating, 0) / total).toFixed(1);
    const satisfied = reviewsData.filter(r => r.rating >= 4).length;
    const csat = Math.round((satisfied / total) * 100);

    const now = new Date();
    const thisMonth = reviewsData.filter(r => {
      const d = new Date(r.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = reviewsData.filter(r => {
      const d = new Date(r.createdAt);
      return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
    }).length;
    const monthGrowth = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : (thisMonth > 0 ? 100 : 0);

    return { total, avg, csat, thisMonth, monthGrowth };
  }, [reviewsData]);

  // ── Trend data (group by day, last 7 days) ──────────────────
  const trendPoints = useMemo(() => {
    if (reviewsData.length === 0) return [];
    const now = new Date();
    const days: { label: string; avg: number; count: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString("en-US", { weekday: "short" });
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86400000);

      const dayReviews = reviewsData.filter(r => {
        const rd = new Date(r.createdAt);
        return rd >= dayStart && rd < dayEnd;
      });

      const avg = dayReviews.length > 0
        ? dayReviews.reduce((s, r) => s + r.rating, 0) / dayReviews.length
        : 0;
      days.push({ label: dayStr, avg, count: dayReviews.length });
    }
    return days;
  }, [reviewsData]);

  const trendPath = useMemo(() => {
    if (trendPoints.length === 0) return "";
    const maxVal = 5;
    const w = 400, h = 100, pad = 10;
    const stepX = (w - pad * 2) / (trendPoints.length - 1);

    const points = trendPoints.map((p, i) => {
      const x = pad + i * stepX;
      const y = h - pad - ((p.avg / maxVal) * (h - pad * 2));
      return `${x},${y}`;
    });

    const linePath = `M${points.join(" L")}`;
    const areaPath = `${linePath} L${pad + (trendPoints.length - 1) * stepX},${h} L${pad},${h} Z`;
    return { linePath, areaPath };
  }, [trendPoints]);

  const ratingBars = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    reviewsData.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++;
    });
    const max = Math.max(...dist, 1);
    return dist.map((count, i) => ({
      stars: i + 1,
      count,
      pct: Math.round((count / max) * 100),
    }));
  }, [reviewsData]);

  if (loading || !isLoaded) return <DashboardSkeleton />;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h1 className="w-full whitespace-normal break-words [word-break:break-word] text-3xl font-bold tracking-tight text-slate-900 mb-1">
          {greeting}{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""} <span className="inline-block animate-[wave_2.2s_ease-in-out_infinite] origin-[70%_70%]">👋</span>
        </h1>
        <p className="text-slate-500 text-sm">{theme.dashboardTitle}</p>
      </div>

      {/* Tab Navigation */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* ═══ TAB 1: App Insights ═══ */}
      {activeTab === "app" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {reviewsData.length === 0 ? (
            <section className="bg-white border border-[#E2E0E8] shadow-[0px_10px_30px_rgba(0,0,0,0.04)] rounded-[24px] mb-5">
              <EmptyState />
            </section>
          ) : (
            <>
              {/* Card 1: Total Reviews with live trend */}
              <section className="bg-white border border-[#E2E0E8] shadow-[0px_10px_30px_rgba(0,0,0,0.04)] rounded-[24px] p-6 relative overflow-hidden mb-5 group cursor-default transition-all duration-300 hover:shadow-[0px_20px_40px_rgba(0,0,0,0.08)]">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{theme.metrics.primary}</h3>
                    <p className="text-5xl font-bold text-slate-900 mt-1">{stats.total}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${stats.monthGrowth >= 0 ? "bg-[#e2dfff] text-[#0c006b]" : "bg-red-100 text-red-700"}`}>
                    {stats.monthGrowth >= 0 ? "+" : ""}{stats.monthGrowth}%
                  </span>
                </div>
                <div className="h-24 w-full mt-4 relative">
                  {trendPath && typeof trendPath === "object" ? (
                    <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="trendGrad" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#4a47d2" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#4a47d2" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d={trendPath.areaPath} fill="url(#trendGrad)" />
                      <path d={trendPath.linePath} fill="none" stroke="#4a47d2" strokeLinecap="round" strokeWidth="3" />
                    </svg>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-slate-400">No trend data yet</div>
                  )}
                </div>
                {trendPoints.length > 0 && (
                  <div className="flex justify-between mt-1 px-2 text-[10px] font-mono text-slate-400">
                    {trendPoints.map((p, i) => <span key={i}>{p.label}</span>)}
                  </div>
                )}
              </section>

              {/* Two Column Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <section className="bg-white border border-[#E2E0E8] shadow-[0px_10px_30px_rgba(0,0,0,0.04)] rounded-[24px] p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-[0px_20px_40px_rgba(0,0,0,0.08)]">
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{theme.metrics.secondary}</h3>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-3xl font-bold text-slate-900">{stats.avg}</p>
                      <span className="text-sm text-slate-400 font-medium">/ 5.0</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-1.5 h-14 mt-4">
                    {ratingBars.map(bar => (
                      <div key={bar.stars} className="flex flex-col items-center w-full gap-0.5">
                        <div
                          className="w-full bg-[#4a47d2] rounded-t-sm transition-all duration-500"
                          style={{ height: `${Math.max(bar.pct, 4)}%` }}
                        />
                        <span className="text-[8px] font-bold text-slate-400">{bar.stars}★</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-white border border-[#E2E0E8] shadow-[0px_10px_30px_rgba(0,0,0,0.04)] rounded-[24px] p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-[0px_20px_40px_rgba(0,0,0,0.08)]">
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{theme.metrics.tertiary}</h3>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-3xl font-bold text-slate-900">{stats.csat}%</p>
                      <span className="text-sm text-slate-400 font-medium">CSAT</span>
                    </div>
                  </div>
                  <div className="w-full mt-4">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-bold">
                      <span>4★ & 5★ REVIEWS</span>
                      <span>{reviewsData.filter(r => r.rating >= 4).length} / {stats.total}</span>
                    </div>
                    <div className="h-3 w-full bg-[#ebe7e7] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#4a47d2] to-slate-900 rounded-full shadow-[0_0_8px_rgba(74,71,210,0.5)] transition-all duration-700"
                        style={{ width: `${stats.csat}%` }}
                      />
                    </div>
                  </div>
                </section>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div className="col-span-1 md:col-span-2">
                  <AIInsightsPanel reviews={reviewsData} />
                </div>

                <Link href="/dashboard/qr-generator">
                  <section className="bg-slate-900 text-white rounded-[24px] p-8 relative overflow-hidden shadow-[0px_15px_40px_rgba(0,0,0,0.15)] group cursor-pointer transition-all hover:scale-[1.01] h-full">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#4a47d2]/30 rounded-full -ml-24 -mb-24 blur-3xl" />
                    <div className="flex justify-between items-start relative z-10">
                      <div className="flex flex-col gap-1">
                        <QrCode className="text-white/50 w-6 h-6" />
                        <h3 className="text-xl font-bold tracking-tight mt-4">Review Kiosk</h3>
                        <p className="font-mono text-xs text-white/60 tracking-widest mt-1">{stats.total} reviews collected</p>
                      </div>
                      <div className="w-14 h-14 bg-white p-2 rounded-lg shadow-inner shrink-0">
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center rounded-sm">
                          <QrCode className="text-white w-6 h-6" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-10 flex justify-between items-end relative z-10">
                      <p className="text-xs font-bold text-white/40">ACTIVE</p>
                      <button className="bg-white/10 group-hover:bg-white/20 backdrop-blur-md border border-white/20 px-4 py-2 rounded-lg text-xs font-bold transition-all">
                        Manage QR
                      </button>
                    </div>
                  </section>
                </Link>

                <section className="bg-white border border-[#E2E0E8] shadow-[0px_10px_30px_rgba(0,0,0,0.04)] rounded-[24px] p-6 transition-all duration-300 hover:shadow-[0px_20px_40px_rgba(0,0,0,0.08)]">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-900">Rating Breakdown</h3>
                    <span className="text-xs font-bold text-slate-400">{stats.total} total</span>
                  </div>
                  <div className="space-y-3">
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = ratingBars[star - 1].count;
                      const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <div className="flex items-center gap-1 w-12 shrink-0">
                            <Star className="w-3 h-3 text-amber-400" fill="currentColor" />
                            <span className="text-xs font-bold text-slate-700">{star}</span>
                          </div>
                          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#4a47d2] rounded-full transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-slate-500 w-10 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              {/* Recent Reviews Feed */}
              <section className="bg-white border border-[#E2E0E8] shadow-[0px_10px_30px_rgba(0,0,0,0.04)] rounded-[24px] p-6 mb-10 transition-all duration-300 hover:shadow-[0px_20px_40px_rgba(0,0,0,0.08)]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-slate-900">Recent Reviews</h3>
                  <Link
                    href="/dashboard/reviews"
                    className="text-xs font-bold text-[#4a47d2] hover:text-[#332dbc] transition-colors"
                  >
                    View All →
                  </Link>
                </div>
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {reviewsData.slice(0, 15).map((review, i) => {
                    const badge = getModeBadge(review.metadata);
                    const ratingColor = RATING_COLORS[review.rating] || RATING_COLORS[3];
                    return (
                      <div
                        key={review.id || i}
                        className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50/80 transition-all cursor-default border border-transparent hover:border-slate-100"
                        style={{ animation: `fadeAndSlide 300ms ${i * 50}ms both` }}
                      >
                        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${ratingColor}`}>
                          <Star className="w-4 h-4" fill="currentColor" />
                          <span className="text-[10px] font-black mt-0.5">{review.rating}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.color}`}>
                              {badge.icon}
                              {badge.label}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 shrink-0">
                              {timeAgo(new Date(review.createdAt))}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed line-clamp-2">
                            {review.generatedText || "No text provided"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {/* ═══ TAB 2: Google Maps Reviews ═══ */}
      {activeTab === "google" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {!isGoogleConnected ? (
            <GoogleNotConnected />
          ) : googleLoading ? (
            <GoogleTabSkeleton />
          ) : (
            <GoogleReviewsFeed
              reviews={googleReviews}
              totalCount={googleStats?.total ?? 0}
              avgRating={googleStats?.avg ?? 0}
            />
          )}
        </div>
      )}
    </div>
  );
}