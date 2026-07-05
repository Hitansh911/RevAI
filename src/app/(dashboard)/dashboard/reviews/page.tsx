"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { getReviews, getBusinessProfile, deleteReview } from "@/app/actions";
import { Star, Download, Search, FileText, CheckCircle2, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function ReviewsPage() {
  const { user, isLoaded } = useUser();
  const [reviews, setReviews] = useState<any[]>([]);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const biz = await getBusinessProfile(user.id);
        if (!biz) return;
        const data = await getReviews(biz.id);
        
        setBusiness(biz);
        setReviews(data.map(d => ({
          ...d,
          createdAt: d.createdAt?.toISOString?.()?.split('T')?.[0] || d.createdAt,
        })));
      } catch (e) {
        console.error("Failed to load reviews", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    setDeletingId(reviewId);
    try {
      await deleteReview(reviewId, user!.id);
      setReviews(reviews.filter(r => r.id !== reviewId));
    } catch (e) {
      alert("Failed to delete review.");
    } finally {
      setDeletingId(null);
    }
  };

  const isTeaching = business?.category === "teaching_session";

  const handleExport = () => {
    if (!reviews.length) return;
    
    let csv = "";
    
    if (isTeaching) {
      const qHeaders = business?.questions?.map((q: any) => `"${q.text.replace(/"/g, '""')}"`).join(",") || "";
      csv += `Date,Overall Rating,${qHeaders}\n`;
      
      reviews.forEach(r => {
        const row = [
          r.createdAt,
          r.rating,
          ...(business?.questions || []).map((q: any) => {
            const answer = r.answers?.[q.id] || "";
            return `"${String(answer).replace(/"/g, '""')}"`;
          })
        ];
        csv += row.join(",") + "\n";
      });
    } else {
      csv = "Date,Rating,Review Text,Posted To Google\n";
      reviews.forEach(r => {
        csv += `${r.createdAt},${r.rating},"${(r.editedText || r.generatedText || r.feedback || "").replace(/"/g, '""')}",${r.postedToGoogle ? "Yes" : "No"}\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = isTeaching ? "survey_responses.csv" : "reviews.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filtered = reviews.filter(r => 
    r.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (r.editedText || r.generatedText || r.feedback || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || !isLoaded) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">
            {isTeaching ? "Survey Responses" : "Reviews"}
          </h1>
          <p className="text-slate-500 text-sm">
            {isTeaching ? "Monitor and manage student responses." : "Monitor and manage all customer feedback."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search feedback..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 w-[220px] bg-white border-gray-200 focus-visible:ring-purple-500"
            />
          </div>
          <Button variant="outline" onClick={handleExport} disabled={reviews.length === 0} className="bg-white hover:bg-gray-50">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <section className="bg-white border border-[#E2E0E8] shadow-[0px_10px_30px_rgba(0,0,0,0.04)] rounded-[24px] flex flex-col items-center justify-center p-12 text-center border-dashed">
          <div className="w-12 h-12 bg-[#e2dfff] rounded-xl flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-[#4a47d2]" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No responses found</h3>
          <p className="text-slate-500 text-sm max-w-[250px]">
            {searchTerm ? "Try adjusting your search terms." : "You haven't received any feedback yet."}
          </p>
        </section>
      ) : (
        <div className="grid gap-4">
          {filtered.map((r, i) => {
            const stars = typeof r.rating === "number" ? r.rating : 0;
            const reviewText = r.editedText || r.generatedText || r.feedback;

            return (
              <section key={r.id || i} className="bg-white border border-[#E2E0E8] shadow-[0px_10px_30px_rgba(0,0,0,0.04)] rounded-[24px] overflow-hidden hover:shadow-[0px_20px_40px_rgba(0,0,0,0.08)] transition-all duration-300">
                <div className="p-0">
                  <div className="flex flex-col md:flex-row md:items-start gap-4 p-5 md:p-6">
                    {/* Customer Info & Date */}
                    <div className="md:w-1/4">
                      <p className="font-semibold text-slate-900 text-base mb-1">{r.customerName || "Anonymous"}</p>
                      <p className="text-xs font-medium text-slate-500">{r.createdAt}</p>
                      {r.customerEmail && <p className="text-xs text-slate-400 truncate mt-1">{r.customerEmail}</p>}
                    </div>

                    {/* Rating & Status & Feedback */}
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`w-4 h-4 ${s <= stars ? "fill-[#4a47d2] text-[#4a47d2]" : "fill-slate-100 text-slate-100"}`} />
                          ))}
                        </div>
                        {!isTeaching && (
                          <span className={cn("w-max px-3 py-1 rounded-full text-[11px] font-bold flex items-center", r.postedToGoogle ? "bg-[#e2dfff] text-[#0c006b]" : "bg-slate-100 text-slate-500")}>
                            {r.postedToGoogle ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Posted to Google</> : "Not posted"}
                          </span>
                        )}
                      </div>

                      {isTeaching && r.answers && business?.questions ? (
                        <div className="space-y-3 border-t border-slate-100 pt-4">
                          {business.questions.map((q: any) => (
                            <div key={q.id}>
                              <p className="text-sm font-medium text-slate-700">{q.text}</p>
                              <div className="text-sm text-slate-600 mt-1">
                                {q.type === "rating" ? (
                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map(s => (
                                      <Star key={s} className={`w-3.5 h-3.5 ${s <= (r.answers?.[q.id] || 0) ? "fill-[#4a47d2] text-[#4a47d2]" : "fill-slate-100 text-slate-100"}`} />
                                    ))}
                                  </div>
                                ) : (
                                  <span className="italic">{r.answers?.[q.id] || "No answer"}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-700 leading-relaxed italic border-l-2 border-[#c2c1ff] pl-3">
                          {reviewText ? `"${reviewText}"` : <span className="text-slate-400 not-italic">No written feedback provided.</span>}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-center justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        disabled={deletingId === r.id}
                        onClick={() => handleDelete(r.id)}
                      >
                        {deletingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
