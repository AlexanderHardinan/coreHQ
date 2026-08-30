import {
  MapPin,
  ShieldCheck,
} from "lucide-react";

import {
  getDashboardMetricsAction,
} from "@/app/dashboard/actions";

import {
  DashboardRealtimeProvider,
  DashboardRealtimeStatus,
  DashboardSummaryCards,
} from "@/app/dashboard/dashboard-realtime";

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
  // INITIAL TRUSTED DASHBOARD DATA
  // =======================================================
  //
  // The initial values are loaded server-side before the
  // Dashboard renders.
  //
  // Realtime synchronization takes over after the client
  // establishes its location-scoped Broadcast channel.
  // =======================================================

  const initialMetrics =
    await getDashboardMetricsAction();

  // =======================================================
  // DASHBOARD
  // =======================================================

  return (
    <AppShell
      activeLocation={
        activeLocation
      }
    >
      <DashboardRealtimeProvider
        initialMetrics={
          initialMetrics
        }
        locationCode={
          activeLocation.code
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
              REALTIME SUMMARY CARDS
          ================================================= */}

          <DashboardSummaryCards />

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
              REALTIME OPERATIONAL STATUS
          ================================================= */}

          <DashboardRealtimeStatus />
        </div>
      </DashboardRealtimeProvider>
    </AppShell>
  );
}