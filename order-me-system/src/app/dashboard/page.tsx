import {
  Activity,
  ClipboardList,
  CookingPot,
  MapPin,
  Package,
  ShieldCheck,
} from "lucide-react";

import AppShell from "@/components/app-shell";

import {
  requireOperationalSession,
} from "@/lib/auth/require-operational-session";

export default async function DashboardPage() {
  // =======================================================
  // VERIFY OPERATIONAL SESSION
  // =======================================================

  const activeLocation =
    await requireOperationalSession();

  // =======================================================
  // DASHBOARD
  // =======================================================

  return (
    <AppShell
      activeLocation={
        activeLocation
      }
    >
      <div className="space-y-6">
        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
              Operational Dashboard
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
              {activeLocation.name}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Overview of the current ordering and production
              workspace.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm">
            <MapPin
              size={14}
              aria-hidden="true"
            />

            {activeLocation.name}

            <span className="text-zinc-400">
              {activeLocation.code}
            </span>
          </div>
        </section>

        {/* =================================================
            SUMMARY CARDS
        ================================================= */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
                <Package
                  size={20}
                  aria-hidden="true"
                />
              </div>

              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-500">
                Products
              </span>
            </div>

            <div className="mt-7">
              <p className="text-3xl font-bold tracking-tight text-zinc-950">
                —
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                Product records
              </p>
            </div>
          </article>

          <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
                <CookingPot
                  size={20}
                  aria-hidden="true"
                />
              </div>

              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-500">
                Recipes
              </span>
            </div>

            <div className="mt-7">
              <p className="text-3xl font-bold tracking-tight text-zinc-950">
                —
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                Production recipes
              </p>
            </div>
          </article>

          <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
                <ClipboardList
                  size={20}
                  aria-hidden="true"
                />
              </div>

              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-500">
                Orders
              </span>
            </div>

            <div className="mt-7">
              <p className="text-3xl font-bold tracking-tight text-zinc-950">
                —
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                Normal orders
              </p>
            </div>
          </article>

          <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
                <Activity
                  size={20}
                  aria-hidden="true"
                />
              </div>

              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-500">
                Production
              </span>
            </div>

            <div className="mt-7">
              <p className="text-3xl font-bold tracking-tight text-zinc-950">
                —
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                Batch production orders
              </p>
            </div>
          </article>
        </section>

        {/* =================================================
            WORKSPACE STATUS
        ================================================= */}

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-zinc-950 text-white">
                <MapPin
                  size={19}
                  aria-hidden="true"
                />
              </div>

              <div>
                <p className="text-sm font-bold text-zinc-950">
                  Active Location
                </p>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  All operational records in this workspace
                  will be scoped to the selected location.
                </p>

                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700">
                  {activeLocation.name}

                  <span className="text-zinc-400">
                    {activeLocation.code}
                  </span>
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
                <ShieldCheck
                  size={19}
                  aria-hidden="true"
                />
              </div>

              <div>
                <p className="text-sm font-bold text-zinc-950">
                  Secure Operational Session
                </p>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Access is protected by the signed application
                  session and active location context.
                </p>

                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />

                  Active
                </div>
              </div>
            </div>
          </article>
        </section>

        {/* =================================================
            EMPTY OPERATIONAL STATE
        ================================================= */}

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-zinc-950">
                Operational Data
              </p>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                Product, recipe, and order statistics will
                appear here after the operational modules are
                connected to the database.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-500">
              <Activity
                size={15}
                aria-hidden="true"
              />

              Awaiting operational data
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}