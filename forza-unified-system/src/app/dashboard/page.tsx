import {
  AlertTriangle,
  BarChart3,
  Bell,
  Boxes,
  CalendarClock,
  ChefHat,
  CircleDollarSign,
  ClipboardList,
  GlassWater,
  LayoutDashboard,
  PieChart,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";

const modules = [
  {
    title: "Kitchen Ops",
    description: "Delivery, production, sold items, products, SKU, and stock.",
    icon: ChefHat,
    href: "/kitchen-ops",
  },
  {
    title: "Bar Ops",
    description: "Bar delivery, bottle balance, sold items, and realtime stock.",
    icon: GlassWater,
    href: "/bar-ops",
  },
  {
    title: "Inventory",
    description: "Stock count, discrepancy tracking, expiry alerts, and balance.",
    icon: Boxes,
    href: "/inventory",
  },
  {
    title: "Recipe Maker",
    description: "Recipe costing, batch yield, ingredient sync, and margins.",
    icon: ClipboardList,
    href: "/recipe-maker",
  },
  {
    title: "Payroll Budget",
    description: "FOH, BOH, Management, Support, and custom departments.",
    icon: Users,
    href: "/payroll-budget",
  },
  {
    title: "Operational Budget",
    description: "Food, beverage, utilities, maintenance, and custom costs.",
    icon: WalletCards,
    href: "/operational-budget",
  },
  {
    title: "Sales Performance",
    description: "Daily, weekly, monthly, yearly, and custom range analytics.",
    icon: TrendingUp,
    href: "/sales-performance",
  },
  {
    title: "Reports",
    description: "PDF and CSV reports with header, footer, and filters.",
    icon: BarChart3,
    href: "/reports",
  },
];

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
    description: "Stock count versus system balance validation will be added.",
    icon: ShieldCheck,
  },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="liquid-sidebar glass-panel rounded-[2rem] p-5 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <LayoutDashboard size={22} />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-950">Forza</h1>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Unified System
              </p>
            </div>
          </div>

          <nav className="space-y-2">
            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <a
                  key={module.title}
                  href={module.href}
                  className="forza-transition flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-white hover:text-slate-950 hover:shadow-sm"
                >
                  <Icon size={18} />
                  {module.title}
                </a>
              );
            })}
          </nav>
        </aside>

        <section className="space-y-6">
          <header className="glass-panel rounded-[2rem] p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
                  Modern Dashboard
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                  Brand Command Center
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                  The Phase 1 dashboard shell is ready. Next phase will connect
                  Supabase Auth, role access, and database tables.
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white/80 p-3 shadow-sm">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-600" />
                <div>
                  <p className="text-sm font-black text-slate-950">
                    Super Admin
                  </p>
                  <p className="text-xs font-bold text-slate-400">
                    Avatar Ready
                  </p>
                </div>
              </div>
            </div>
          </header>

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
                    Complete Function Structure
                  </p>
                  <h3 className="text-2xl font-black text-slate-950">
                    System Modules
                  </h3>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {modules.map((module) => {
                  const Icon = module.icon;

                  return (
                    <a
                      key={module.title}
                      href={module.href}
                      className="forza-transition forza-hover rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm"
                    >
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                        <Icon size={22} />
                      </div>
                      <h4 className="text-lg font-black text-slate-950">
                        {module.title}
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {module.description}
                      </p>
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="glass-panel rounded-[2rem] p-6">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
                Trigger System
              </p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">
                Alerts Ready
              </h3>

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
                          <h4 className="font-black text-slate-950">
                            {alert.title}
                          </h4>
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
        </section>
      </div>
    </main>
  );
}