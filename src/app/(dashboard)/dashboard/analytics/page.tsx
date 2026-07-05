"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { getDashboardStats } from "@/app/actions";
import type { DashboardStats } from "@/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export default function AnalyticsPage() {
  const { user, isLoaded } = useUser();
  const [statsData, setStatsData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!user) return;
      try {
        const data = await getDashboardStats(user.id);
        setStatsData(data as any);
      } catch (e) {
        console.error("Failed to load analytics", e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [user]);

  if (loading || !isLoaded) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">Analytics</h1>
        <p className="text-slate-500 text-sm">Visualize your feedback trends and ratings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <section className="bg-white border border-[#E2E0E8] shadow-[0px_10px_30px_rgba(0,0,0,0.04)] rounded-[24px] p-6 transition-all duration-300 hover:shadow-[0px_20px_40px_rgba(0,0,0,0.08)]">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Rating Distribution</h3>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsData?.ratingDistribution || []}>
                <XAxis dataKey="stars" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b", fontWeight: 600 }} />
                <YAxis hide />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: '1px solid #E2E0E8', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }} />
                <Bar dataKey="count" fill="#4a47d2" radius={[6,6,0,0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white border border-[#E2E0E8] shadow-[0px_10px_30px_rgba(0,0,0,0.04)] rounded-[24px] p-6 transition-all duration-300 hover:shadow-[0px_20px_40px_rgba(0,0,0,0.08)]">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Avg. Rating Trend</h3>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={statsData?.ratingTrends || []}>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b", fontWeight: 600 }} />
                <YAxis domain={[1,5]} hide />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E0E8', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }} />
                <Line type="monotone" dataKey="avg" stroke="#4a47d2" strokeWidth={4} dot={{ fill: "#4a47d2", strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: "#fff", stroke: "#4a47d2" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
