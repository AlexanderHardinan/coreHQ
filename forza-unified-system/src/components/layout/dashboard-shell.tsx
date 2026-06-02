"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Building2,
  ChefHat,
  ChevronDown,
  ClipboardList,
  GlassWater,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import type { AppModule, UserRole } from "@/lib/auth/permissions";
import { roleLabels } from "@/lib/auth/permissions";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const iconMap = {
  LayoutDashboard,
  ChefHat,
  GlassWater,
  Boxes,
  ClipboardList,
  Users,
  WalletCards,
  TrendingUp,
  BarChart3,
  Settings,
  ShieldCheck,
  Building2,
};

export type DashboardBrand = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  icon: string | null;
};

type DashboardShellProps = {
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  modules: AppModule[];
  brands?: DashboardBrand[];
  selectedBrand?: DashboardBrand | null;
  children: React.ReactNode;
};

export function DashboardShell({
  fullName,
  avatarUrl,
  role,
  modules,
  brands = [],
  selectedBrand = null,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedBrandCode = selectedBrand?.code || "FORZA";
  const [optimisticBrandCode, setOptimisticBrandCode] =
    useState(selectedBrandCode);

  const [isBrandSwitching, setIsBrandSwitching] = useState(false);
  const [isRouteSwitching, setIsRouteSwitching] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [optimisticPathname, setOptimisticPathname] = useState(pathname);

  const currentBrandCode = optimisticBrandCode || selectedBrandCode;
  const activePathname = optimisticPathname || pathname;

  const brandOptions = useMemo(() => {
    if (brands.length > 0) {
      return brands;
    }

    return [
      {
        id: "forza-fallback",
        name: "Forza",
        code: "FORZA",
        description: "Primary brand workspace.",
        icon: "Building2",
      },
      {
        id: "fusion-fallback",
        name: "Fusion",
        code: "FUSION",
        description: "Secondary brand workspace.",
        icon: "Sparkles",
      },
    ];
  }, [brands]);

  const activeBrandName =
    brandOptions.find((brand) => brand.code === currentBrandCode)?.name ||
    currentBrandCode;

  const showGlobalLoader =
    isPending || isBrandSwitching || isRouteSwitching || isSigningOut;

  useEffect(() => {
    setOptimisticBrandCode(selectedBrandCode);
    setIsBrandSwitching(false);
  }, [selectedBrandCode]);

  useEffect(() => {
    setOptimisticPathname(pathname);
    setIsRouteSwitching(false);
  }, [pathname]);

  function buildBrandUrl(href: string, brandCode: string) {
    return `${href}?brand=${brandCode}`;
  }

  function handleBrandChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextBrand = event.target.value;

    if (nextBrand === currentBrandCode) {
      return;
    }

    setOptimisticBrandCode(nextBrand);
    setIsBrandSwitching(true);

    const params = new URLSearchParams(searchParams.toString());
    params.set("brand", nextBrand);

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, {
        scroll: false,
      });
    });
  }

  function handleNavigate(nextPath: string) {
    if (nextPath === pathname) {
      setIsOpen(false);
      return;
    }

    setOptimisticPathname(nextPath);
    setIsRouteSwitching(true);
    setIsOpen(false);
  }

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();

    toast.success("Signed out successfully.");
    window.location.href = "/sign-in";
  }

  return (
    <main className="relative min-h-screen p-4 md:p-6">
      {showGlobalLoader ? (
        <div className="fixed left-0 top-0 z-[9999] w-full">
          <div className="h-1 overflow-hidden bg-slate-200">
            <div className="h-full w-1/2 animate-[globalLoading_0.7s_ease-in-out_infinite] rounded-r-full bg-slate-950" />
          </div>

          <div className="pointer-events-none mx-auto mt-4 flex w-fit items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm font-black text-slate-950 shadow-2xl backdrop-blur-xl">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
              <LoaderCircle className="animate-spin" size={18} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Thunder Response
              </p>
              <p>
                {isSigningOut
                  ? "Signing out..."
                  : isBrandSwitching
                    ? `Loading ${activeBrandName}`
                    : "Opening module..."}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="forza-button-hover fixed left-4 top-4 z-40 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl transition active:scale-95 lg:hidden"
      >
        <Menu size={22} />
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm lg:hidden">
          <aside className="liquid-sidebar h-full w-[300px] overflow-y-auto p-5">
            <SidebarContent
              pathname={activePathname}
              modules={modules}
              currentBrandCode={currentBrandCode}
              onClose={() => setIsOpen(false)}
              onSignOut={handleSignOut}
              onNavigate={handleNavigate}
              buildBrandUrl={buildBrandUrl}
              isSigningOut={isSigningOut}
              isMobile
            />
          </aside>
        </div>
      ) : null}

      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[290px_1fr]">
        <aside className="liquid-sidebar glass-panel hidden rounded-[2rem] p-5 lg:sticky lg:top-6 lg:block lg:h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <SidebarContent
            pathname={activePathname}
            modules={modules}
            currentBrandCode={currentBrandCode}
            onClose={() => setIsOpen(false)}
            onSignOut={handleSignOut}
            onNavigate={handleNavigate}
            buildBrandUrl={buildBrandUrl}
            isSigningOut={isSigningOut}
          />
        </aside>

        <section className="space-y-6 pt-14 lg:pt-0">
          <header className="glass-panel rounded-[2rem] p-5 md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-slate-400">
                  Forza Unified System
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                  Brand Command Center
                </h1>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative">
                  <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                    Active Brand
                  </label>
                  <div className="relative">
                    <select
                      value={currentBrandCode}
                      onChange={handleBrandChange}
                      className="w-full appearance-none rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 pr-10 text-sm font-black text-slate-950 shadow-sm outline-none transition duration-150 active:scale-[0.99] focus:border-slate-950 sm:min-w-[190px]"
                    >
                      {brandOptions.map((brand) => (
                        <option key={brand.id} value={brand.code}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={18}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>

                  {isBrandSwitching ? (
                    <div className="mt-2 flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white shadow-sm">
                      <Zap size={13} />
                      Switching instantly
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white/80 p-3 shadow-sm">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt={fullName}
                      className="h-12 w-12 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                      {fullName.slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-black text-slate-950">
                      {fullName}
                    </p>
                    <p className="text-xs font-bold text-slate-400">
                      {roleLabels[role]}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {children}
        </section>
      </div>

      <style jsx>{`
        @keyframes globalLoading {
          0% {
            transform: translateX(-120%);
          }
          50% {
            transform: translateX(80%);
          }
          100% {
            transform: translateX(220%);
          }
        }
      `}</style>
    </main>
  );
}

type SidebarContentProps = {
  pathname: string;
  modules: AppModule[];
  currentBrandCode: string;
  onClose: () => void;
  onSignOut: () => void;
  onNavigate: (nextPath: string) => void;
  buildBrandUrl: (href: string, brandCode: string) => string;
  isSigningOut: boolean;
  isMobile?: boolean;
};

function SidebarContent({
  pathname,
  modules,
  currentBrandCode,
  onClose,
  onSignOut,
  onNavigate,
  buildBrandUrl,
  isSigningOut,
  isMobile = false,
}: SidebarContentProps) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="mb-8 flex items-center justify-between gap-3">
        <Link
          href={buildBrandUrl("/dashboard", currentBrandCode)}
          prefetch
          onClick={() => onNavigate("/dashboard")}
          className="forza-button-hover flex items-center gap-3 rounded-2xl p-2 transition active:scale-95"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <LayoutDashboard size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-950">Forza</h2>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Unified System
            </p>
          </div>
        </Link>

        {isMobile ? (
          <button
            type="button"
            onClick={onClose}
            className="forza-button-hover flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-sm transition active:scale-95"
          >
            <X size={20} />
          </button>
        ) : null}
      </div>

      <div className="mb-4 rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
          Current Brand
        </p>
        <p className="mt-1 text-lg font-black text-slate-950">
          {currentBrandCode}
        </p>
      </div>

      <nav className="flex-1 space-y-2">
        {modules.map((module) => {
          const Icon = iconMap[module.icon as keyof typeof iconMap];
          const isActive =
            pathname === module.href || pathname.startsWith(`${module.href}/`);

          return (
            <Link
              key={`${module.href}-${module.title}`}
              href={buildBrandUrl(module.href, currentBrandCode)}
              prefetch
              onClick={() => onNavigate(module.href)}
              className={`forza-transition forza-sidebar-item group relative flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3 text-sm font-bold transition active:scale-[0.98] ${
                isActive ? "forza-sidebar-item-active" : ""
              }`}
            >
              <span className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/25 to-transparent transition duration-700 group-hover:translate-x-[120%]" />
              <Icon className="relative z-10" size={18} />
              <span className="relative z-10">{module.title}</span>
              {isActive ? (
                <span className="relative z-10 ml-auto h-2 w-2 rounded-full bg-slate-950">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-950 opacity-40" />
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onSignOut}
        disabled={isSigningOut}
        className="forza-button-hover mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-black text-slate-700 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSigningOut ? (
          <LoaderCircle className="animate-spin" size={18} />
        ) : (
          <LogOut size={18} />
        )}
        {isSigningOut ? "Signing Out..." : "Sign Out"}
      </button>
    </div>
  );
}