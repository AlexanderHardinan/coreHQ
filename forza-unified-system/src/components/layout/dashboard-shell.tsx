"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ChefHat,
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
import { useState } from "react";
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
};

type DashboardShellProps = {
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  modules: AppModule[];
  children: React.ReactNode;
};

export function DashboardShell({
  fullName,
  avatarUrl,
  role,
  modules,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

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
            onClose={() => setIsOpen(false)}
            onSignOut={handleSignOut}
          />
        </aside>

        <section className="space-y-6 pt-14 lg:pt-0">
          <header className="glass-panel rounded-[2rem] p-5 md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-slate-400">
                  Forza Unified System
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                  Brand Command Center
                </h1>
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
  onClose: () => void;
  onSignOut: () => void;
  isMobile?: boolean;
};

function SidebarContent({
  pathname,
  modules,
  onClose,
  onSignOut,
  isMobile = false,
}: SidebarContentProps) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="mb-8 flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
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

      <nav className="flex-1 space-y-2">
        {modules.map((module) => {
          const Icon = iconMap[module.icon as keyof typeof iconMap];
          const isActive =
            pathname === module.href || pathname.startsWith(`${module.href}/`);

          return (
            <Link
              key={module.href}
              href={module.href}
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