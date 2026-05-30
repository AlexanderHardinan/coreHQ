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
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
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

  const currentBrandCode = selectedBrand?.code || "FORZA";

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

  function handleBrandChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextBrand = event.target.value;
    const params = new URLSearchParams(searchParams.toString());

    params.set("brand", nextBrand);

    router.push(`${pathname}?${params.toString()}`);
  }

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    toast.success("Signed out successfully.");
    window.location.href = "/sign-in";
  }

  return (
    <main className="min-h-screen p-4 md:p-6">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="forza-button-hover fixed left-4 top-4 z-40 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl lg:hidden"
      >
        <Menu size={22} />
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm lg:hidden">
          <aside className="liquid-sidebar h-full w-[300px] overflow-y-auto p-5">
            <SidebarContent
              pathname={pathname}
              modules={modules}
              currentBrandCode={currentBrandCode}
              onClose={() => setIsOpen(false)}
              onSignOut={handleSignOut}
              isMobile
            />
          </aside>
        </div>
      ) : null}

      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[290px_1fr]">
        <aside className="liquid-sidebar glass-panel hidden rounded-[2rem] p-5 lg:sticky lg:top-6 lg:block lg:h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <SidebarContent
            pathname={pathname}
            modules={modules}
            currentBrandCode={currentBrandCode}
            onClose={() => setIsOpen(false)}
            onSignOut={handleSignOut}
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
                      className="w-full appearance-none rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 pr-10 text-sm font-black text-slate-950 shadow-sm outline-none transition focus:border-slate-950 sm:min-w-[190px]"
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
    </main>
  );
}

type SidebarContentProps = {
  pathname: string;
  modules: AppModule[];
  currentBrandCode: string;
  onClose: () => void;
  onSignOut: () => void;
  isMobile?: boolean;
};

function SidebarContent({
  pathname,
  modules,
  currentBrandCode,
  onClose,
  onSignOut,
  isMobile = false,
}: SidebarContentProps) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="mb-8 flex items-center justify-between gap-3">
        <Link
          href={`/dashboard?brand=${currentBrandCode}`}
          className="forza-button-hover flex items-center gap-3 rounded-2xl p-2"
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
            className="forza-button-hover flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-sm"
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
              href={`${module.href}?brand=${currentBrandCode}`}
              onClick={onClose}
              className={`forza-transition forza-sidebar-item flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold ${
                isActive ? "forza-sidebar-item-active" : ""
              }`}
            >
              <Icon size={18} />
              <span>{module.title}</span>
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onSignOut}
        className="forza-button-hover mt-6 flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-black text-slate-700"
      >
        <LogOut size={18} />
        Sign Out
      </button>
    </div>
  );
}