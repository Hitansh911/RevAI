"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { getBusinessProfile, syncUserToDatabase } from "@/app/actions";
import { CategoryProvider, useCategoryTheme } from "@/context/CategoryContext";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/reports", label: "Reports" },
  { href: "/dashboard/reviews", label: "Reviews" },
  { href: "/dashboard/qr-generator", label: "Cards" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <CategoryProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </CategoryProvider>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [checkingBiz, setCheckingBiz] = useState(true);
  const { setCategory } = useCategoryTheme();

  useEffect(() => {
    async function verifyAccess() {
      if (!isLoaded) return;
      if (!user) { router.push("/"); return; }
      try {
        await syncUserToDatabase(user.id, user.primaryEmailAddress?.emailAddress || "", user.fullName);
        const biz = await getBusinessProfile(user.id);
        if (!biz) router.push("/setup");
        else {
          setCategory(biz.category);
          setCheckingBiz(false);
        }
      } catch { setCheckingBiz(false); }
    }
    verifyAccess();
  }, [user, isLoaded, router, setCategory]);

  if (!isLoaded || checkingBiz) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0EDF5]">
        <div className="text-center">
          <div className="w-9 h-9 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0EDF5] font-sans antialiased text-slate-900 pb-24 overflow-x-hidden">

      {/* ── Global scrollbar-hide utility ── */}
      <style>{`
        .nav-scroll-container::-webkit-scrollbar { display: none; }
        .nav-scroll-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
      `}</style>

      {/* ── Top bar: Logo + Avatar ── */}
      <header className="fixed top-0 w-full z-40 bg-white/60 backdrop-blur-xl border-b border-gray-200/50 shadow-sm h-16">
        <div className="flex items-center justify-between w-full h-full max-w-7xl mx-auto px-4 md:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
              <Star className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">RatiFy</span>
          </Link>
          <UserButton />
        </div>
      </header>

      {/* ── Sub-Nav Pill (sticky below top bar) ── */}
      <div className="fixed top-16 left-0 w-full z-30 bg-transparent pt-3 pb-2 px-4 md:px-6">
        {/*
          Outer pill boundary — full width on mobile with 0 horizontal margin
          (px-4 on the parent div provides the edge gap).
          On desktop, shrinks to fit content and centers via mx-auto.
        */}
        <div
          className="nav-scroll-container
            bg-white/80 backdrop-blur-lg border border-gray-200/50 shadow-sm
            rounded-full p-1.5
            flex flex-row flex-nowrap items-center gap-1
            overflow-x-auto
            w-full md:w-max md:mx-auto
          "
          style={{ scrollSnapType: "x mandatory" }}
        >
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{ scrollSnapAlign: "start", flexShrink: 0 }}
                className={`
                  px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap
                  transition-colors duration-150 flex items-center justify-center
                  ${isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:text-slate-900"}
                `}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="pt-36 md:pt-36 px-4 md:px-6 space-y-5 max-w-7xl mx-auto w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}