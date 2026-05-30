import {
  AlertTriangle,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Layers3,
  PieChart,
  ShieldCheck,
  Store,
} from "lucide-react";
import { redirect } from "next/navigation";
import { DashboardShell, type DashboardBrand } from "@/components/layout/dashboard-shell";
import { getAllowedModules, type UserRole } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type DashboardPageProps = {
  searchParams?: Promise<{
    brand?: string;
  }>;
};

const protectedMetrics = [
  {
    label: "Brand Workspace",
    value: "Protected",
    status: "Private",
    icon: ShieldCheck,
  },
  {
    label: "Branch Context",
    value: "Active",
    status: "Selected",
    icon: Store,
  },
  {
    label: "Operations Health",
    value: "On Track",
    status: "Ready",
    icon: Boxes,
  },
  {
    label: "Expiry Watch",
    value: "Monitoring",
    status: "Ready",
    icon: CalendarClock,
  },
];

const alerts = [
  {
    title: "Budget Watch",
    description: "Protected budget status monitoring for authorized users.",
    icon: AlertTriangle,
  },
  {
    title: "Stock Watch",
    description: "Private stock condition monitoring by selected brand context.",
    icon: Bell,
  },
  {
    title: "Inventory Accuracy",
    description: "Internal stock-count validation remains inside the dashboard.",
    icon: ShieldCheck,
  },
];

function normalizeBrandCode(value: string | undefined) {
  const brand = String(value || "FORZA").trim().toUpperCase();

  if (brand === "FUSION") {
    return "FUSION";
  }

  return "FORZA";
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
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

  if (profile?.is_active === false) {
    redirect("/sign-in");
  }

  const role = (profile?.role || "manager") as UserRole;
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

  const selectedBrandCode = selectedBrand?.code || requestedBrandCode;
  const selectedBrandName =
    selectedBrand?.name || (selectedBrandCode === "FUSION" ? "Fusion" : "Forza");

  return (
    <DashboardShell
      fullName={profile?.full_name || user.email || "Forza User"}
      avatarUrl={profile?.avatar_url || null}
      role={role}
      modules={modules}
      brands={brands}
      selectedBrand={selectedBrand}
    >
      <section className="glass-panel rounded-[2rem] p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Protected Brand Workspace
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              {selectedBrandName} Command View
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              This dashboard is private and displays internal tools only after
              authentication. Brand context is controlled here, keeping public
              pages separate from protected operations.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Building2 size={24} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Active Brand
                </p>
                <p className="text-2xl font-black text-slate-950">
                  {selectedBrandName}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {protectedMetrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div
              key={metric.label}
              className="glass-panel forza-transition forza-hover rounded-[2rem] p-5"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Icon size={22} />
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  {metric.status}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-400">
                {metric.label}
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {metric.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="glass-panel rounded-[2rem] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
                {selectedBrandName} Access
              </p>
              <h2 className="text-2xl font-black text-slate-950">
                Available Modules
              </h2>
            </div>
            <BarChart3 className="text-slate-400" size={28} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {modules.map((module) => (
              <a
                key={`${module.href}-${module.title}`}
                href={`${module.href}?brand=${selectedBrandCode}`}
                className="forza-transition forza-hover rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm"
              >
                <h3 className="text-lg font-black text-slate-950">
                  {module.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {module.description}
                </p>
              </a>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-[2rem] p-6">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
            Protected Alerts
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            {selectedBrandName} Watch Center
          </h2>

          <div className="mt-5 space-y-3">
            {alerts.map((alert) => {
              const Icon = alert.icon;

              return (
                <div
                  key={alert.title}
                  className="rounded-3xl border border-slate-200 bg-white/75 p-4"
                >
                  <div className="flex gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-950">
                        {alert.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {role === "super_admin" ? (
        <section className="glass-panel rounded-[2rem] p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_280px] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-slate-400">
                Super Admin Control
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Brand Management Entry
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Super Admin can manage brands, brand groups, categories,
                branches, user access, and protected settings from the private
                workspace.
              </p>
            </div>

            <a
              href={`/settings?brand=${selectedBrandCode}`}
              className="forza-button-hover flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl"
            >
              <Layers3 size={18} />
              Open Brand Control
            </a>
          </div>
        </section>
      ) : null}
    </DashboardShell>
  );
}