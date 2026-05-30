import {
  AlertTriangle,
  BarChart3,
  Bell,
  Boxes,
  CalendarClock,
  CircleDollarSign,
  PieChart,
  ShieldCheck,
} from "lucide-react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  getAllowedModules,
  type UserRole,
} from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const metrics = [
  {
    label: "Sales Performance",
    value: "₱0.00",
    status: "Ready",
    icon: CircleDollarSign,
  },
  {
    label: "Budget Status",
    value: "On Budget",
    status: "Trigger Ready",
    icon: PieChart,
  },
  {
    label: "Stock Health",
    value: "On Track",
    status: "Realtime Ready",
    icon: Boxes,
  },
  {
    label: "Expiry Alerts",
    value: "0",
    status: "Monitoring Ready",
    icon: CalendarClock,
  },
];

const alerts = [
  {
    title: "Over Budget / On Budget",
    description: "Budget trigger system prepared for payroll and operations.",
    icon: AlertTriangle,
  },
  {
    title: "Over Stocked / Low Stock",
    description: "Inventory thresholds will monitor product stock health.",
    icon: Bell,
  },
  {
    title: "Inventory Discrepancy / On Track",
    description: "Stock count versus system balance validation is ready.",
    icon: ShieldCheck,
  },
];

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role || "manager") as UserRole;
  const modules = getAllowedModules(role);

  return (
    <DashboardShell
      fullName={profile?.full_name || user.email || "Forza User"}
      avatarUrl={profile?.avatar_url || null}
      role={role}
      modules={modules}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
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
                Role-Based Module Access
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
                key={module.href}
                href={module.href}
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
            Trigger System
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Alerts Ready
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
    </DashboardShell>
  );
}