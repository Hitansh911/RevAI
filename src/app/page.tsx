import Link from "next/link";
import { Star, Zap, CheckCircle, BarChart2, ArrowRight, Quote } from "lucide-react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { CountUp } from "@/components/CountUp";

const FLOATING_REVIEWS = [
  { stars: 5, text: "Absolutely loved it!", delay: "0s", x: "6%", y: "25%" },
  { stars: 5, text: "Will come back again!", delay: "1.4s", x: "74%", y: "18%" },
  { stars: 4, text: "Great experience overall", delay: "2.2s", x: "78%", y: "62%" },
  { stars: 5, text: "Highly recommend!", delay: "0.8s", x: "3%", y: "68%" },
];

function FloatingCard({ stars, text, delay, x, y, className }: any) {
  return (
    <div className={className} style={{
      position: "absolute", left: x, top: y,
      background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)",
      border: "1px solid rgba(139,92,246,0.12)", borderRadius: 12,
      padding: "10px 14px", boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
      animation: `floatCard 5s ease-in-out infinite`,
      animationDelay: delay, zIndex: 1,
    }}>
      <div style={{ display: "flex", gap: 2, marginBottom: 4 }}>
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} size={10} style={{ color: s <= stars ? "#f59e0b" : "#e5e7eb", fill: s <= stars ? "#f59e0b" : "none" }} />
        ))}
      </div>
      <p style={{ fontSize: 11, color: "#6b7280", margin: 0, whiteSpace: "nowrap" }}>{text}</p>
    </div>
  );
}



function QrCodeIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3" />
    </svg>
  );
}

export default async function HomePage() {
  const { userId } = await auth();
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        @keyframes floatCard {
          0%,100% { transform: translateY(0) rotate(-0.5deg); opacity:.88; }
          50% { transform: translateY(-10px) rotate(0.5deg); opacity:1; }
        }
        @keyframes heroBadge {
          0% { opacity:0; transform: scale(.85); }
          60% { transform: scale(1.04); }
          100% { opacity:1; transform: scale(1); }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(22px); }
          to { opacity:1; transform:translateY(0); }
        }
        @keyframes gradientShift {
          0%,100% { background-position:0% 50%; }
          50% { background-position:100% 50%; }
        }
        @keyframes pulseRing {
          to { transform:scale(1.7); opacity:0; }
        }
        @keyframes shimmer {
          0% { background-position:-200% center; }
          100% { background-position:200% center; }
        }
        @keyframes slideUp {
          from { opacity:0; transform:translateY(28px); }
          to { opacity:1; transform:translateY(0); }
        }

        .r-badge { animation: heroBadge .5s both; }
        .r-h1 { animation: fadeUp .65s .15s both; }
        .r-p { animation: fadeUp .65s .28s both; }
        .r-cta { animation: fadeUp .65s .42s both; }
        .r-stats { animation: fadeUp .65s .55s both; }

        .gradient-word {
          background: linear-gradient(135deg,#7c3aed,#a855f7,#6366f1);
          background-size:200%;
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
          background-clip:text;
          animation: gradientShift 4s ease infinite;
        }

        .btn-primary {
          background: linear-gradient(135deg,#5b21b6,#7c3aed,#8b5cf6);
          background-size:200%;
          animation: gradientShift 3s ease infinite;
          color:#fff; font-weight:700; font-size:15px;
          padding:13px 26px; border-radius:12px;
          text-decoration:none; display:inline-flex; align-items:center; gap:8px;
          border:none; cursor:pointer; position:relative; overflow:hidden;
          transition: transform .2s, box-shadow .2s;
        }
        .btn-primary:hover { transform:translateY(-2px); box-shadow:0 12px 32px rgba(124,58,237,.4); }
        .btn-primary::after {
          content:''; position:absolute; inset:0;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);
          background-size:200%;
          animation: shimmer 2.5s infinite;
        }

        .btn-ghost {
          color:#374151; font-weight:600; font-size:15px; padding:13px 26px;
          border-radius:12px; text-decoration:none; border:1.5px solid #e5e7eb;
          background:#fff; transition: border-color .2s, background .2s;
          display:inline-flex; align-items:center; gap:8px;
        }
        .btn-ghost:hover { border-color:#c4b5fd; background:#faf5ff; }

        .card {
          background:#fff; border:1.5px solid #f0f0f0; border-radius:20px;
          transition: transform .25s, box-shadow .25s, border-color .25s;
        }
        .card:hover { transform:translateY(-4px); box-shadow:0 16px 40px rgba(124,58,237,.09); border-color:#ddd6fe; }

        .step-card { animation: slideUp .6s both; }

        .nav-link { color:#6b7280; font-size:14px; font-weight:500; text-decoration:none; padding:8px 14px; border-radius:8px; transition:color .15s; }
        .nav-link:hover { color:#7c3aed; }

        @media (max-width: 768px) {
          .floating-badge { display: none !important; }

          .hero-h1 {
            font-size: calc(1.8rem + 2vw) !important;
            line-height: 1.25 !important;
            letter-spacing: -0.02em !important;
          }

          .r-stats-row {
            flex-direction: column !important;
            align-items: center !important;
            gap: 24px !important;
            width: 100% !important;
          }

          .hero-section {
            padding: 48px 20px 64px !important;
          }

          .section-pad {
            padding-left: 20px !important;
            padding-right: 20px !important;
          }

          .nav-pad {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }

          .hero-p {
            font-size: 16px !important;
            padding: 0 4px !important;
          }

          .bottom-cta-h2 {
            font-size: 28px !important;
            letter-spacing: -1px !important;
          }

          .footer-pad {
            padding-left: 20px !important;
            padding-right: 20px !important;
          }
        }
      `}</style>

      <main style={{ fontFamily: "'Inter',sans-serif", background: "#fafafa", color: "#111", overflowX: "hidden", width: "100%", maxWidth: "100vw" }}>

        {/* ── NAV ── */}
        <nav style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 40px", maxWidth: 1100, margin: "0 auto",
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(250,250,250,0.9)", backdropFilter: "blur(14px)",
        }} className="nav-pad">
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 18, color: "#5b21b6" }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#5b21b6,#7c3aed)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Star size={15} style={{ color: "#fff", fill: "#fff" }} />
            </div>
            RatiFy
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {userId ? (
              <Link href="/dashboard" className="btn-primary" style={{ fontSize: 13, padding: "8px 18px" }}>
                Dashboard <ArrowRight size={13} />
              </Link>
            ) : (
              <>
                <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                  <button className="nav-link" style={{ background: "none", border: "none", cursor: "pointer" }}>Login</button>
                </SignInButton>
                <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                  <button className="btn-primary" style={{ fontSize: 13, padding: "8px 18px" }}>
                    Get Started <ArrowRight size={13} />
                  </button>
                </SignUpButton>
              </>
            )}
          </div>
        </nav>

        {/* ── HERO ── */}
        <section style={{ position: "relative", maxWidth: 1100, margin: "0 auto", padding: "72px 40px 96px", textAlign: "center", overflow: "hidden" }} className="hero-section">
          {FLOATING_REVIEWS.map((r, i) => <FloatingCard key={i} {...r} className="floating-badge" />)}
          <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.1) 0%,transparent 70%)", top: "5%", left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }} />

          <div className="r-badge" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(139,92,246,.07)", border: "1px solid rgba(139,92,246,.15)", borderRadius: 100, padding: "7px 16px", marginBottom: 24 }}>
            <span style={{ position: "relative", display: "inline-block" }}>
              <span style={{ width: 8, height: 8, background: "#22c55e", borderRadius: "50%", display: "block" }} />
              <span style={{ position: "absolute", inset: -2, borderRadius: "50%", border: "1.5px solid #22c55e", animation: "pulseRing 1.5s ease-out infinite", display: "block" }} />
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#7c3aed" }}>500+ businesses active right now</span>
          </div>

          <h1 className="r-h1 hero-h1" style={{ fontSize: "clamp(36px,6.5vw,72px)", fontWeight: 900, lineHeight: 1.06, marginBottom: 18, letterSpacing: "-2.5px" }}>
            Reviews that write<br /><span className="gradient-word">themselves.</span>
          </h1>

          <p className="r-p hero-p" style={{ fontSize: 18, color: "#6b7280", maxWidth: 500, margin: "0 auto 36px", lineHeight: 1.7, fontWeight: 400 }}>
            Scan QR → tap stars → AI writes the review → posts to Google. Done in 30 seconds. No typing.
          </p>

          <div className="r-cta" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {userId ? (
              <Link href="/dashboard" className="btn-primary">
                Go to Dashboard <ArrowRight size={15} />
              </Link>
            ) : (
              <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                <button className="btn-primary">
                  Start Free — No card needed <ArrowRight size={15} />
                </button>
              </SignUpButton>
            )}
            <Link href="#how-it-works" className="btn-ghost">
              See how it works
            </Link>
          </div>

          <div className="r-stats r-stats-row" style={{ display: "flex", gap: 48, justifyContent: "center", marginTop: 60, flexWrap: "wrap" }}>
            {[
              { val: 500, suf: "+", label: "Businesses" },
              { val: 12000, suf: "+", label: "Reviews generated" },
              { val: 30, suf: "s", label: "Avg. time to post" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <p style={{ fontSize: 34, fontWeight: 900, color: "#111", letterSpacing: "-1.5px", margin: 0 }}>
                  <CountUp target={s.val} />{s.suf}
                </p>
                <p style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500, marginTop: 3 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" style={{ background: "#fff", padding: "80px 40px" }} className="section-pad">
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#7c3aed", textTransform: "uppercase", marginBottom: 10 }}>Process</p>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: "#111", letterSpacing: "-1px", margin: 0 }}>Three steps. Thirty seconds.</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18 }}>
              {[
                { n: "01", icon: <QrCodeIcon />, title: "Scan the QR", desc: "Place the QR code at your counter. Customers scan it from any phone — no app download, no friction." },
                { n: "02", icon: <Star size={20} />, title: "Tap a star rating", desc: "One tap is all it takes. The customer picks 1–5 stars. Nothing else required from their side." },
                { n: "03", icon: <Zap size={20} />, title: "AI writes & posts it", desc: "Our AI generates a real, natural-sounding review and pushes it live to Google in seconds." },
              ].map((step, i) => (
                <div key={step.n} className="card step-card" style={{ padding: 28, animationDelay: `${i * 0.12}s`, background: "#fafafa" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div style={{ width: 44, height: 44, background: "linear-gradient(135deg,#ede9fe,#ddd6fe)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: "#7c3aed" }}>
                      {step.icon}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#ede9fe", letterSpacing: 1 }}>{step.n}</span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>{step.title}</h3>
                  <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section style={{ padding: "80px 40px", background: "#fafafa" }} className="section-pad">
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#7c3aed", textTransform: "uppercase", marginBottom: 10 }}>Features</p>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: "#111", letterSpacing: "-1px", margin: 0 }}>Everything you need</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
              {[
                { icon: <Zap size={19} />, c: "#f59e0b", bg: "#fffbeb", title: "Instant generation", desc: "Reviews appear in under 2 seconds, matched perfectly to the star rating chosen." },
                { icon: <CheckCircle size={19} />, c: "#10b981", bg: "#ecfdf5", title: "Google auto-post", desc: "One more tap and the review is live on your Google Business listing. No copy-paste." },
                { icon: <BarChart2 size={19} />, c: "#3b82f6", bg: "#eff6ff", title: "Analytics & trends", desc: "Track rating trends, review volume, and customer sentiment over time." },
                { icon: <Star size={19} />, c: "#8b5cf6", bg: "#f5f3ff", title: "Teaching sessions", desc: "Survey mode for teachers and coaches — AI auto-fills answers from star ratings." },
              ].map(f => (
                <div key={f.title} className="card" style={{ padding: 22, background: "#fff" }}>
                  <div style={{ width: 40, height: 40, background: f.bg, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: f.c, marginBottom: 14 }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 6 }}>{f.title}</h3>
                  <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section style={{ padding: "80px 40px", background: "#fff" }} className="section-pad">
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: "#111", letterSpacing: "-1px", margin: 0 }}>What people are saying</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 18 }}>
              {[
                { q: "We went from 12 to 80 Google reviews in a single month. Unreal results.", name: "Priya S.", role: "Café owner, Pune" },
                { q: "My students actually fill out feedback now. The AI answers are surprisingly accurate.", name: "Rahul M.", role: "Workshop instructor, Bangalore" },
                { q: "Setup took 5 minutes. QR on the table and done. Couldn't be simpler.", name: "Ankit D.", role: "Salon owner, Mumbai" },
              ].map(t => (
                <div key={t.name} className="card" style={{ padding: 26, background: "#fafafa", textAlign: "left" }}>
                  <Quote size={16} style={{ color: "#ddd6fe", marginBottom: 12 }} />
                  <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, marginBottom: 16, fontStyle: "italic" }}>&ldquo;{t.q}&rdquo;</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#111", margin: 0 }}>{t.name}</p>
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>{t.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BOTTOM CTA ── */}
        <section style={{ padding: "80px 40px", background: "linear-gradient(135deg,#3b0764,#5b21b6,#6d28d9)", textAlign: "center" }} className="section-pad">
          <h2 className="bottom-cta-h2" style={{ fontSize: 42, fontWeight: 900, color: "#fff", marginBottom: 14, letterSpacing: "-2px" }}>Ready to grow your reviews?</h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,.65)", marginBottom: 32, lineHeight: 1.6, maxWidth: 440, margin: "0 auto 32px" }}>
            Free plan — 20 reviews/month. No credit card required to start.
          </p>
          {userId ? (
            <Link href="/dashboard" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#fff", color: "#5b21b6", fontWeight: 700, fontSize: 15,
              padding: "14px 32px", border: "none", borderRadius: 12, cursor: "pointer",
              boxShadow: "0 8px 28px rgba(0,0,0,.2)", transition: "transform .2s", textDecoration: "none"
            }}>
              Go to Dashboard <ArrowRight size={16} />
            </Link>
          ) : (
            <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
              <button style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "#fff", color: "#5b21b6", fontWeight: 700, fontSize: 15,
                padding: "14px 32px", border: "none", borderRadius: 12, cursor: "pointer",
                boxShadow: "0 8px 28px rgba(0,0,0,.2)", transition: "transform .2s"
              }}>
                Get started free <ArrowRight size={16} />
              </button>
            </SignUpButton>
          )}
        </section>

        <footer style={{ background: "#0a0514", padding: "22px 40px", textAlign: "center" }} className="footer-pad">
          <p style={{ color: "rgba(255,255,255,.25)", fontSize: 12, margin: 0 }}>© 2025 RatiFy · Built for businesses that care about reputation</p>
        </footer>
      </main>
    </>
  );
}
