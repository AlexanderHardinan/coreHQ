import { redirect } from "next/navigation";
import {
  Bell,
  Building2,
  LockKeyhole,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import {
  DashboardShell,
  type DashboardBrand,
} from "@/components/layout/dashboard-shell";
import { getAllowedModules, type UserRole } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type SettingsPageProps = {
  searchParams?: Promise<{
    brand?: string;
  }>;
};

function normalizeBrandCode(value: string | undefined) {
  const brand = String(value || "FORZA").trim().toUpperCase();

  if (brand === "FUSION") {
    return "FUSION";
  }

  return "FORZA";
}

const settingCards = [
  {
    title: "System Preferences",
    description:
      "Private configuration area for platform behavior, display preferences, and workspace standards.",
    icon: Settings,
  },
  {
    title: "Alert Thresholds",
    description:
      "Configure protected alert standards for stock, expiry, budgets, and operational monitoring.",
    icon: Bell,
  },
  {
    title: "Security Rules",
    description:
      "Review access behavior and protected system boundaries for authorized users.",
    icon: ShieldCheck,
  },
  {
    title: "Brand Context",
    description:
      "Settings follow the selected brand context while brand CRUD stays in Brand Management.",
    icon: Building2,
  },
];

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const resolvedSearchParams = await searchParams;
  const requestedBrandCode = normalizeBrandCode(resolvedSearchParams?.brand);

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.is_active === false) {
    redirect("/sign-in");
  }

  const role = profile.role as UserRole;
  const modules = getAllowedModules(role);

  const { data: brandsData } = await supabase
    .from("brands")
    .select("id, name, code, description, icon")
    .in("code", ["FORZA", "FUSION"])
    .eq("is_active", true)
    .order("name", { ascending: true });

  const brands = ((brandsData || []) as DashboardBrand[]).sort((a, b) => {
    const order = ["FORZA", "FUSION"];
    return order.indexOf(a.code) - order.indexOf(b.code);
  });

  const selectedBrand =
    brands.find((brand) => brand.code === requestedBrandCode) ||
    brands.find((brand) => brand.code === "FORZA") ||
    null;

  const selectedBrandName =
    selectedBrand?.name || (requestedBrandCode === "FUSION" ? "Fusion" : "Forza");

  return (
    <DashboardShell
      fullName={profile.full_name || user.email || "Forza User"}
      avatarUrl={profile.avatar_url || null}
      role={role}
      modules={modules}
      brands={brands}
      selectedBrand={selectedBrand}
    >
      <section className="glass-panel rounded-[2rem] p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Protected Settings
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">
              {selectedBrandName} Settings
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              This page is for private system settings and configuration.
              Brand creation, groups, categories, and branch units are managed
              separately in the Brand Management module.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <SlidersHorizontal size={24} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Settings Context
                </p>
                <p className="text-2xl font-black text-slate-950">
                  {requestedBrandCode}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {settingCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="glass-panel forza-transition forza-hover rounded-[2rem] p-6"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Icon size={22} />
              </div>
              <h2 className="text-xl font-black text-slate-950">
                {card.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {card.description}
              </p>
            </div>
          );
        })}
      </section>

      <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-6">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm">
            <LockKeyhole size={20} />
          </div>
          <div>
            <h2 className="font-black text-amber-900">
              Brand Management is separated
            </h2>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              Settings is now independent from Brand Management. Use the Brand
              Management sidebar item for brand, group, category, and branch
              unit CRUD.
            </p>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}