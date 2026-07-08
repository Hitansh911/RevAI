"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Star, ChevronDown } from "lucide-react";
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
  
  // Mobile Capsule State
  const [isNavExpanded, setIsNavExpanded] = useState(false);

  // Auto-collapse on clicking outside the capsule
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#mobile-nav-capsule')) {
        setIsNavExpanded(false);
      }
    };
    if (isNavExpanded) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isNavExpanded]);

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
      {/* Top Navigation Shell */}
      <header className="fixed top-0 w-full z-40 bg-white/60 backdrop-blur-xl border-b border-gray-200/50 shadow-sm h-20">
        <div className="flex items-center justify-between w-full h-full max-w-7xl mx-auto px-4 md:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
              <Star className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">RatiFy</span>
          </Link>
          <div className="flex items-center gap-3">
            {/* Sub-Nav Pill */}
            <nav 
              id="mobile-nav-capsule"
              className={`md:fixed md:z-40 md:top-24 md:left-0 md:w-full md:px-6 md:-translate-x-0 md:bg-transparent md:backdrop-blur-none md:border-none md:shadow-none
                overflow-hidden cursor-pointer md:cursor-auto
                ${isNavExpanded 
                  ? 'fixed top-[12px] left-[16px] right-[16px] w-[calc(100%-32px)] z-50 bg-white/85 rounded-[24px] shadow-lg border border-gray-200/50 backdrop-blur-xl' 
                  : 'relative w-max bg-white/80 rounded-full shadow-sm border border-gray-200/50 backdrop-blur-md'}
              `}
              style={{
                transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease, border-radius 0.3s ease',
              }}
              onClick={() => {
                if (window.innerWidth < 768 && !isNavExpanded) {
                  setIsNavExpanded(true);
                }
              }}
            >
              <div className={`flex md:bg-white/80 md:backdrop-blur-lg md:border md:border-gray-200/50 md:p-1.5 md:rounded-full md:shadow-sm md:w-max md:mx-auto md:items-center md:gap-2
                ${isNavExpanded ? 'flex-row flex-wrap p-4 gap-2 justify-center' : 'p-1.5'}
              `}>
                {navItems.map((item) => {
                  const isActive = item.href === '/dashboard' 
                    ? pathname === '/dashboard' 
                    : pathname === item.href || pathname.startsWith(item.href + '/');

                  // On mobile, hide inactive items when collapsed
                  const isHiddenMobile = !isNavExpanded && !isActive;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={(e) => {
                        if (window.innerWidth < 768) {
                          if (!isNavExpanded) {
                            e.preventDefault();
                            setIsNavExpanded(true);
                          } else {
                            setIsNavExpanded(false);
                          }
                        }
                      }}
                      className={`px-6 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-colors flex items-center justify-center
                        ${isActive ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}
                        ${isHiddenMobile ? "hidden md:flex" : "flex"}
                      `}
                    >
                      {item.label}
                      {!isNavExpanded && isActive && (
                        <ChevronDown className="w-4 h-4 ml-2 md:hidden opacity-70" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>
            <UserButton />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-28 md:pt-48 px-4 md:px-6 space-y-5 max-w-7xl mx-auto w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}