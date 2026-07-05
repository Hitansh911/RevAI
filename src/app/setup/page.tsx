"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Loader2,
  ArrowRight,
  UtensilsCrossed,
  GraduationCap,
  MapPin,
  Star,
  ChevronRight,
  Check,
  Search,
  MessageSquare,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { getBusinessProfile, saveBusinessProfile } from "@/app/actions";
import { useRouter } from "next/navigation";
import { getCategoryTheme } from "@/lib/categoryTheme";

// ── Live Preview Phone Mockup ──────────────────────────────────
function PhoneMockup({
  businessName,
  category,
  city,
}: {
  businessName: string;
  category: string | null;
  city: string;
}) {
  const displayName = businessName || "Your Business";
  const isTeaching = category === "teaching_session";

  const sampleQuestions = isTeaching
    ? ["Clarity of explanations", "Pace of the session", "Overall learning value"]
    : ["Quality & taste of food", "Staff service quality", "Ambience & experience"];

  return (
    <div
      className="relative mx-auto select-none"
      style={{ width: 240, filter: "drop-shadow(0 32px 64px rgba(0,0,0,0.18))" }}
    >
      {/* Phone shell */}
      <div
        className="relative rounded-[36px] overflow-hidden"
        style={{
          background: "#0f0f10",
          padding: "12px",
          boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.1)",
        }}
      >
        {/* Notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-black rounded-full z-20" />

        {/* Screen */}
        <div
          className="rounded-[28px] overflow-hidden bg-gradient-to-br from-purple-50 via-white to-blue-50"
          style={{ minHeight: 480 }}
        >
          {/* Status bar */}
          <div className="flex justify-between items-center px-4 pt-6 pb-2">
            <span className="text-[8px] font-bold text-gray-500">9:41</span>
            <div className="flex gap-1">
              <div className="w-3 h-1.5 rounded-sm bg-gray-400" />
              <div className="w-1 h-1.5 rounded-sm bg-gray-300" />
            </div>
          </div>

          {/* Content */}
          <div className="px-4 pb-4">
            {/* Business name */}
            <div className="text-center mt-3 mb-4">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-sm"
                style={{
                  background: isTeaching
                    ? "linear-gradient(135deg,#3b82f6,#1d4ed8)"
                    : "linear-gradient(135deg,#7c3aed,#6d28d9)",
                }}
              >
                {isTeaching ? (
                  <GraduationCap size={18} color="white" />
                ) : (
                  <UtensilsCrossed size={18} color="white" />
                )}
              </div>
              <p
                className="font-black text-[13px] text-gray-900 truncate"
                style={{ letterSpacing: "-0.3px" }}
              >
                {displayName}
              </p>
              {city && (
                <p className="text-[9px] text-gray-400 flex items-center justify-center gap-0.5 mt-0.5">
                  <MapPin size={7} /> {city}
                </p>
              )}
            </div>

            {/* Prompt */}
            <p className="text-[9px] font-semibold text-gray-500 text-center mb-3">
              How was your experience?
            </p>

            {/* Stars */}
            <div className="flex justify-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={16}
                  style={{ color: "#f59e0b", fill: "#f59e0b" }}
                />
              ))}
            </div>

            {/* Sample questions */}
            <div className="space-y-1.5">
              {sampleQuestions.map((q, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-white/80 rounded-xl px-2.5 py-2 border border-gray-100"
                  style={{ animation: `fadeUpIn .4s ${i * 0.1}s both` }}
                >
                  <p className="text-[8px] text-gray-600 font-medium truncate flex-1 mr-1">
                    {q}
                  </p>
                  <div className="flex gap-0.5 shrink-0">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={7}
                        style={{
                          color: s <= 5 - i ? "#f59e0b" : "#e5e7eb",
                          fill: s <= 5 - i ? "#f59e0b" : "none",
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA button */}
            <div
              className="mt-4 text-center py-2.5 rounded-2xl text-white text-[9px] font-bold"
              style={{
                background: isTeaching
                  ? "linear-gradient(135deg,#3b82f6,#1d4ed8)"
                  : "linear-gradient(135deg,#7c3aed,#6d28d9)",
              }}
            >
              Submit & Post Review →
            </div>
          </div>
        </div>
      </div>

      {/* Side button details */}
      <div className="absolute right-0 top-20 w-0.5 h-12 bg-gray-700 rounded-l-sm" />
      <div className="absolute left-0 top-16 w-0.5 h-8 bg-gray-700 rounded-r-sm" />
      <div className="absolute left-0 top-28 w-0.5 h-8 bg-gray-700 rounded-r-sm" />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function SetupPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

  // Food fields
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");

  // Teaching fields
  const [sessionTopic, setSessionTopic] = useState("");

  // ── Redirect if already set up ──────────────────────────────
  useEffect(() => {
    async function check() {
      if (!isLoaded || !user) return;
      try {
        const biz = await getBusinessProfile(user.id);
        if (biz) router.push("/dashboard");
        else setLoading(false);
      } catch {
        setLoading(false);
      }
    }
    check();
  }, [user, isLoaded, router]);

  // ── Save handler ────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !category) return;

    if (category === "teaching_session") {
      if (!sessionTopic.trim()) return alert("Session topic is required.");
    } else {
      if (!businessName.trim()) return alert("Business Name is required.");
      if (!city.trim()) return alert("City is required.");
      if (!subCategory.trim()) return alert("Business type is required.");
      if (!googleReviewUrl.trim()) return alert("Google Review URL is required.");
    }

    setSaving(true);
    try {
      // Questions are generated implicitly on first review scan (backend).
      // Pass empty array — generate-questions API handles them dynamically.
      await saveBusinessProfile(
        user.id,
        category === "teaching_session" ? sessionTopic : businessName,
        category,
        [], // questions generated implicitly by backend
        city,
        subCategory,
        googleReviewUrl
      );
      router.push(category === "teaching_session" ? "/dashboard/qr-generator" : "/dashboard");
    } catch {
      alert("Failed to save settings. Please try again.");
      setSaving(false);
    }
  };

  // ── Derived ─────────────────────────────────────────────────
  const isTeaching = category === "teaching_session";
  const previewName = isTeaching ? sessionTopic : businessName;
  const previewCity = isTeaching ? "" : city;
  const setupTheme = getCategoryTheme(category);

  // ── Loading state ───────────────────────────────────────────
  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-neutral-200 border-t-violet-600 rounded-full animate-spin" />
          <p className="text-sm text-neutral-400 font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes fadeUpIn {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity:0; transform:translateX(-16px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity:0; transform:translateX(16px); }
          to   { opacity:1; transform:translateX(0); }
        }
        .card-category {
          transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
        }
        .card-category:hover {
          transform: translateY(-1px);
        }
        .field-input {
          width: 100%;
          padding: .75rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 1rem;
          font-size: .875rem;
          outline: none;
          background: white;
          color: #111827;
          transition: border-color .15s, box-shadow .15s;
          font-family: inherit;
        }
        .field-input:focus {
          border-color: #a78bfa;
          box-shadow: 0 0 0 3px rgba(139,92,246,.08);
        }
        .field-input::placeholder { color: #9ca3af; }
        .field-label {
          display: block;
          font-size: .75rem;
          font-weight: 700;
          letter-spacing: .04em;
          text-transform: uppercase;
          color: #6b7280;
          margin-bottom: .5rem;
        }
      `}</style>

      <div
        className="min-h-screen bg-neutral-50"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        {/* Top bar */}
        <div className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
                <Star size={14} color="white" fill="white" />
              </div>
              <span className="font-bold text-gray-900 text-sm tracking-tight">ReviewAI</span>
            </div>
            <span className="text-xs text-gray-400 font-medium">Business Setup</span>
          </div>
        </div>

        {/* Split layout */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-10 lg:gap-16 items-start">

            {/* ── LEFT: Form ──────────────────────────────── */}
            <div style={{ animation: "slideInLeft .5s both" }}>

              {/* Header */}
              <div className="mb-10">
                <h1
                  className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-3"
                  style={{ letterSpacing: "-0.5px" }}
                >
                  Set up your workspace
                </h1>
                <p className="text-base text-gray-500 leading-relaxed">
                  {category
                    ? setupTheme.setupSubtext
                    : "Choose your business type. AI-powered feedback questions are generated automatically when your first review comes in."}
                </p>
              </div>

              {/* Step 1 — Category */}
              <div className="mb-8">
                <label className="field-label">Step 1 — Business Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Card A */}
                  <button
                    type="button"
                    onClick={() => setCategory("restaurant")}
                    className="card-category text-left p-5 rounded-2xl border-2 bg-white"
                    style={{
                      borderColor: category === "restaurant" ? "#7c3aed" : "#e5e7eb",
                      background:
                        category === "restaurant"
                          ? "linear-gradient(135deg, #faf5ff, #ede9fe)"
                          : "white",
                      boxShadow:
                        category === "restaurant"
                          ? "0 4px 20px rgba(124,58,237,.15)"
                          : "0 1px 4px rgba(0,0,0,.04)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{
                        background:
                          category === "restaurant" ? "#7c3aed" : "#f3f4f6",
                      }}
                    >
                      <UtensilsCrossed
                        size={18}
                        color={category === "restaurant" ? "white" : "#6b7280"}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">
                          Food &amp; Hospitality
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                          Restaurants, cafes, kitchens, food trucks
                        </p>
                      </div>
                      {category === "restaurant" && (
                        <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center shrink-0 ml-2">
                          <Check size={11} color="white" />
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Card B */}
                  <button
                    type="button"
                    onClick={() => setCategory("teaching_session")}
                    className="card-category text-left p-5 rounded-2xl border-2 bg-white"
                    style={{
                      borderColor:
                        category === "teaching_session" ? "#2563eb" : "#e5e7eb",
                      background:
                        category === "teaching_session"
                          ? "linear-gradient(135deg, #eff6ff, #dbeafe)"
                          : "white",
                      boxShadow:
                        category === "teaching_session"
                          ? "0 4px 20px rgba(37,99,235,.15)"
                          : "0 1px 4px rgba(0,0,0,.04)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{
                        background:
                          category === "teaching_session" ? "#2563eb" : "#f3f4f6",
                      }}
                    >
                      <GraduationCap
                        size={18}
                        color={category === "teaching_session" ? "white" : "#6b7280"}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">
                          Education &amp; Training
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                          Teaching sessions, workshops, corporate bootcamps
                        </p>
                      </div>
                      {category === "teaching_session" && (
                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0 ml-2">
                          <Check size={11} color="white" />
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Step 2 — Details form */}
              {category && (
                <form
                  onSubmit={handleSave}
                  style={{ animation: "fadeUpIn .4s both" }}
                >
                  <label className="field-label mb-4 block">
                    Step 2 —{" "}
                    {isTeaching ? "Session Details" : "Business Details"}
                  </label>

                  <div className="space-y-5">
                    {isTeaching ? (
                      /* ── Teaching ─────────────────────────── */
                      <div>
                        <label className="field-label">
                          Session Topic <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={sessionTopic}
                          onChange={(e) => setSessionTopic(e.target.value)}
                          placeholder="e.g., Advanced React Boot Camp, Physics 101"
                          className="field-input"
                        />
                        <p className="text-xs text-gray-400 mt-1.5">
                          Used to personalise AI-generated feedback questions for your attendees.
                        </p>
                      </div>
                    ) : (
                      /* ── Food & Hospitality ────────────────── */
                      <>
                        {/* Business Name */}
                        <div>
                          <label className="field-label">
                            Business Name <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            placeholder="e.g., Cafe Bruno"
                            className="field-input"
                          />
                        </div>

                        {/* No Autocomplete Component Here Anymore */}

                        {/* City + Type grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="field-label">
                              City <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              placeholder="e.g., Mumbai"
                              className="field-input"
                            />
                          </div>
                          <div>
                            <label className="field-label">
                              Type <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={subCategory}
                              onChange={(e) => setSubCategory(e.target.value)}
                              placeholder="e.g., Cafe, Fine Dining"
                              className="field-input"
                            />
                          </div>
                        </div>

                        {/* Google Review URL */}
                        <div>
                          <label className="field-label flex items-center justify-between">
                            <span>Google Review URL <span className="text-red-400">*</span></span>
                            <a 
                              href="https://support.google.com/business/answer/7030628" 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-violet-600 hover:text-violet-700 normal-case tracking-normal font-medium flex items-center gap-1"
                            >
                              How to find this <ChevronRight size={12} />
                            </a>
                          </label>
                          <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl border border-neutral-200 bg-white focus-within:border-violet-400 focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.08)] transition-all">
                            <MapPin size={15} className="text-gray-400 shrink-0" />
                            <input
                              type="url"
                              required
                              value={googleReviewUrl}
                              onChange={(e) => setGoogleReviewUrl(e.target.value)}
                              placeholder="https://g.page/r/…  or search.google.com/…"
                              className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400"
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-1.5">
                            Customers are redirected here to post their 5-star review publicly.
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* AI note */}
                  <div className="mt-6 flex items-start gap-3 p-4 rounded-2xl bg-violet-50 border border-violet-100">
                    <MessageSquare size={15} className="text-violet-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-violet-700 leading-relaxed">
                      <strong>AI Questions are generated automatically.</strong>{" "}
                      When your first customer opens the review link, our AI
                      analyses your business type and crafts personalised
                      feedback questions — no manual setup needed.
                    </p>
                  </div>

                  {/* Submit */}
                  <div className="mt-8">
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full flex items-center justify-center gap-3 py-4 px-8 rounded-2xl font-bold text-white text-base transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{
                        background: saving
                          ? "#9ca3af"
                          : isTeaching
                          ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                          : "linear-gradient(135deg, #7c3aed, #6d28d9)",
                        boxShadow: saving
                          ? "none"
                          : isTeaching
                          ? "0 8px 24px rgba(37,99,235,.3)"
                          : "0 8px 24px rgba(109,40,217,.3)",
                      }}
                      onMouseEnter={(e) => {
                        if (!saving)
                          (e.currentTarget as HTMLElement).style.transform =
                            "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.transform =
                          "translateY(0)";
                      }}
                    >
                      {saving ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          Complete Setup &amp; Launch Dashboard
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>

                    <p className="text-center text-xs text-gray-400 mt-3">
                      You can update these details anytime from Settings.
                    </p>
                  </div>
                </form>
              )}
            </div>

            {/* ── RIGHT: Sticky Phone Preview ─────────────── */}
            <div
              className="hidden lg:flex flex-col items-center gap-6 sticky top-24"
              style={{ animation: "slideInRight .5s .1s both", opacity: 0 }}
            >
              <div className="text-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Live Preview
                </p>
                <p className="text-xs text-gray-400">
                  Your customer's review screen
                </p>
              </div>

              <PhoneMockup
                businessName={previewName}
                category={category}
                city={previewCity}
              />

              {/* Feature callouts below phone */}
              <div className="w-full space-y-2 mt-2">
                {[
                  "AI questions generated on first visit",
                  "One-tap copy to Google Maps",
                  "Works on any mobile device",
                ].map((feat, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white border border-neutral-100"
                    style={{ animation: `fadeUpIn .4s ${.3 + i * .1}s both`, opacity: 0 }}
                  >
                    <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <Check size={9} className="text-emerald-600" />
                    </div>
                    <p className="text-xs text-gray-600 font-medium">{feat}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
