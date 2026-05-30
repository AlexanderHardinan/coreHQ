import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  ChefHat,
  ClipboardList,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const highlights = [
  {
    title: "Multi-Unit Control",
    description: "Centralized operations for restaurant groups and branches.",
    icon: Boxes,
  },
  {
    title: "Kitchen and Bar Ops",
    description: "Realtime stock, production, sold items, and SKU control.",
    icon: ChefHat,
  },
  {
    title: "Analytical Reports",
    description: "Charts, metrics, PDF, CSV, filters, and performance insights.",
    icon: BarChart3,
  },
  {
    title: "Role-Based Access",
    description: "BOH, FOH, Manager, and Super Admin permission structure.",
    icon: ShieldCheck,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl flex-col justify-center">
        <div className="glass-panel rounded-[2rem] p-8 md:p-12">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
            <Sparkles size={16} />
            Premium Multi-Unit Restaurant Platform
          </div>

          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
                Forza Unified System
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                A modern liquid-glass system for restaurant operations, kitchen
                ops, bar ops, inventory, recipe costing, budgets, payroll,
                alerts, sales performance, and executive reports.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard"
                  className="forza-transition inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 text-sm font-bold text-white shadow-xl hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  Enter Dashboard
                  <ArrowRight size={18} />
                </Link>

                <Link
                  href="/reports"
                  className="forza-transition inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/75 px-6 py-4 text-sm font-bold text-slate-900 shadow-sm hover:-translate-y-0.5 hover:bg-white"
                >
                  View Reports
                  <ClipboardList size={18} />
                </Link>
              </div>
            </div>

            <div className="glass-panel forza-hover forza-transition rounded-[2rem] p-5">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-400">
                      Executive Overview
                    </p>
                    <h2 className="text-2xl font-black text-slate-950">
                      Live Performance
                    </h2>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">
                    On Track
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["Sales", "₱0.00"],
                    ["Inventory Accuracy", "100%"],
                    ["Budget Usage", "0%"],
                    ["Stock Alerts", "0"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        {label}
                      </p>
                      <p className="mt-2 text-2xl font-black text-slate-950">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-sm font-bold text-amber-800">
                    Phase 1 foundation active. Database and role system will be
                    added next.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="forza-transition forza-hover rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-base font-black text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}