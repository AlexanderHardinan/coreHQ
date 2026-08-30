"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Activity,
  ClipboardList,
  CookingPot,
  Package,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

import {
  getDashboardMetricsAction,
  type DashboardMetrics,
} from "@/app/dashboard/actions";

import {
  createClient,
} from "@/lib/supabase/client";

// =========================================================
// TYPES
// =========================================================

type DashboardRealtimeProviderProps = {
  initialMetrics: DashboardMetrics;
  locationCode: string;
  children: ReactNode;
};

type RealtimeConnectionStatus =
  | "connecting"
  | "live"
  | "reconnecting"
  | "offline"
  | "error";

type DashboardRealtimeContextValue = {
  metrics: DashboardMetrics;
  connectionStatus: RealtimeConnectionStatus;
  isRefreshing: boolean;
  lastError: string | null;
};

// =========================================================
// CONSTANTS
// =========================================================

const DASHBOARD_BROADCAST_EVENT =
  "dashboard_changed";

const DASHBOARD_TOPIC_PREFIX =
  "order-me-dashboard";

const REFRESH_DEBOUNCE_MS =
  250;

// =========================================================
// CONTEXT
// =========================================================

const DashboardRealtimeContext =
  createContext<
    DashboardRealtimeContextValue | null
  >(null);

// =========================================================
// CONTEXT HOOK
// =========================================================

function useDashboardRealtime() {
  const context =
    useContext(
      DashboardRealtimeContext
    );

  if (!context) {
    throw new Error(
      "Dashboard realtime components must be used inside DashboardRealtimeProvider."
    );
  }

  return context;
}

// =========================================================
// PROVIDER
// =========================================================

export function DashboardRealtimeProvider({
  initialMetrics,
  locationCode,
  children,
}: DashboardRealtimeProviderProps) {
  const [
    metrics,
    setMetrics,
  ] =
    useState<DashboardMetrics>(
      initialMetrics
    );

  const [
    connectionStatus,
    setConnectionStatus,
  ] =
    useState<RealtimeConnectionStatus>(
      "connecting"
    );

  const [
    isRefreshing,
    setIsRefreshing,
  ] =
    useState(false);

  const [
    lastError,
    setLastError,
  ] =
    useState<string | null>(
      null
    );

  // =======================================================
  // REFS
  // =======================================================

  const mountedRef =
    useRef(false);

  const refreshTimerRef =
    useRef<
      ReturnType<typeof setTimeout> | null
    >(null);

  const refreshInFlightRef =
    useRef(false);

  const refreshQueuedRef =
    useRef(false);

  const scheduleRefreshRef =
    useRef<
      (delay?: number) => void
    >(() => {});

  // =======================================================
  // NORMALIZED LOCATION CODE
  // =======================================================

  const normalizedLocationCode =
    useMemo(
      () =>
        locationCode
          .trim()
          .toUpperCase(),
      [locationCode]
    );

  // =======================================================
  // REFRESH TRUSTED DASHBOARD METRICS
  // =======================================================

  const refreshDashboard =
    useCallback(
      async () => {
        if (
          refreshInFlightRef.current
        ) {
          refreshQueuedRef.current =
            true;

          return;
        }

        refreshInFlightRef.current =
          true;

        if (
          mountedRef.current
        ) {
          setIsRefreshing(
            true
          );
        }

        try {
          const nextMetrics =
            await getDashboardMetricsAction();

          if (
            !mountedRef.current
          ) {
            return;
          }

          setMetrics(
            nextMetrics
          );

          setLastError(
            null
          );
        } catch (error) {
          console.error(
            "Order Me dashboard realtime refresh failed:",
            error instanceof Error
              ? error.message
              : "Unknown dashboard refresh error"
          );

          if (
            mountedRef.current
          ) {
            setLastError(
              "Unable to synchronize the latest dashboard data."
            );
          }
        } finally {
          refreshInFlightRef.current =
            false;

          if (
            mountedRef.current
          ) {
            setIsRefreshing(
              false
            );
          }

          if (
            refreshQueuedRef.current &&
            mountedRef.current
          ) {
            refreshQueuedRef.current =
              false;

            scheduleRefreshRef.current(
              0
            );
          }
        }
      },
      []
    );

  // =======================================================
  // DEBOUNCED REFRESH
  // =======================================================
  //
  // Multiple database writes may happen within milliseconds.
  //
  // Example:
  //
  // Normal Order
  //   INSERT order
  //   INSERT item 1
  //   INSERT item 2
  //   INSERT item 3
  //
  // The Dashboard should not issue repeated count requests
  // for every individual database event.
  //
  // All events inside the debounce window are collapsed into
  // one trusted Dashboard refresh.
  // =======================================================

  const scheduleRefresh =
    useCallback(
      (
        delay =
          REFRESH_DEBOUNCE_MS
      ) => {
        if (
          refreshTimerRef.current
        ) {
          clearTimeout(
            refreshTimerRef.current
          );
        }

        refreshTimerRef.current =
          setTimeout(
            () => {
              refreshTimerRef.current =
                null;

              void refreshDashboard();
            },
            delay
          );
      },
      [refreshDashboard]
    );

  useEffect(
    () => {
      scheduleRefreshRef.current =
        scheduleRefresh;
    },
    [scheduleRefresh]
  );

  // =======================================================
  // REALTIME SUBSCRIPTION
  // =======================================================

  useEffect(
    () => {
      mountedRef.current =
        true;

      setConnectionStatus(
        "connecting"
      );

      setLastError(
        null
      );

      const supabase =
        createClient();

      const topic =
        `${DASHBOARD_TOPIC_PREFIX}:${normalizedLocationCode}`;

      // =====================================================
      // PUBLIC INVALIDATION CHANNEL
      // =====================================================
      //
      // IMPORTANT:
      //
      // This channel must contain ONLY an invalidation event.
      //
      // It must never broadcast:
      //
      // - Product records
      // - Recipe records
      // - Order records
      // - Quantities
      // - User/session information
      // - Location database IDs
      //
      // The browser receives only:
      //
      // dashboard_changed
      //
      // After receiving the event, trusted server-side
      // getDashboardMetricsAction() loads the actual data.
      //
      // This matches the custom signed application session
      // architecture without trusting browser-provided data.
      // =====================================================

      const channel =
        supabase.channel(
          topic,
          {
            config: {
              private:
                false,
            },
          }
        );

      channel
        .on(
          "broadcast",
          {
            event:
              DASHBOARD_BROADCAST_EVENT,
          },
          () => {
            scheduleRefreshRef.current();
          }
        )
        .subscribe(
          (
            status
          ) => {
            if (
              !mountedRef.current
            ) {
              return;
            }

            if (
              status ===
              "SUBSCRIBED"
            ) {
              setConnectionStatus(
                "live"
              );

              setLastError(
                null
              );

              // ---------------------------------------------
              // Close the small timing gap between:
              //
              // 1. Initial server-rendered Dashboard data
              // 2. WebSocket subscription becoming active
              //
              // If a database change happened during that
              // window, this synchronization catches it.
              // ---------------------------------------------

              scheduleRefreshRef.current(
                0
              );

              return;
            }

            if (
              status ===
              "TIMED_OUT"
            ) {
              setConnectionStatus(
                "reconnecting"
              );

              return;
            }

            if (
              status ===
              "CHANNEL_ERROR"
            ) {
              setConnectionStatus(
                "error"
              );

              setLastError(
                "Realtime synchronization encountered a connection error."
              );

              return;
            }

            if (
              status ===
              "CLOSED"
            ) {
              setConnectionStatus(
                "offline"
              );
            }
          }
        );

      // =====================================================
      // CLEANUP
      // =====================================================

      return () => {
        mountedRef.current =
          false;

        refreshQueuedRef.current =
          false;

        if (
          refreshTimerRef.current
        ) {
          clearTimeout(
            refreshTimerRef.current
          );

          refreshTimerRef.current =
            null;
        }

        void supabase.removeChannel(
          channel
        );
      };
    },
    [normalizedLocationCode]
  );

  // =======================================================
  // CONTEXT VALUE
  // =======================================================

  const contextValue =
    useMemo<
      DashboardRealtimeContextValue
    >(
      () => ({
        metrics,
        connectionStatus,
        isRefreshing,
        lastError,
      }),
      [
        metrics,
        connectionStatus,
        isRefreshing,
        lastError,
      ]
    );

  return (
    <DashboardRealtimeContext.Provider
      value={
        contextValue
      }
    >
      {children}
    </DashboardRealtimeContext.Provider>
  );
}

// =========================================================
// SUMMARY CARDS
// =========================================================

export function DashboardSummaryCards() {
  const {
    metrics,
  } =
    useDashboardRealtime();

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* ===================================================
          PRODUCTS
      =================================================== */}

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
            {metrics.products.toLocaleString(
              "en-US"
            )}
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            Product records
          </p>
        </div>
      </article>

      {/* ===================================================
          RECIPES
      =================================================== */}

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
            {metrics.recipes.toLocaleString(
              "en-US"
            )}
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            Production recipes
          </p>
        </div>
      </article>

      {/* ===================================================
          NORMAL ORDERS
      =================================================== */}

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
            {metrics.normalOrders.toLocaleString(
              "en-US"
            )}
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            Normal orders
          </p>
        </div>
      </article>

      {/* ===================================================
          PRODUCTION ORDERS
      =================================================== */}

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
            {metrics.productionOrders.toLocaleString(
              "en-US"
            )}
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            Batch production orders
          </p>
        </div>
      </article>
    </section>
  );
}

// =========================================================
// REALTIME STATUS
// =========================================================

export function DashboardRealtimeStatus() {
  const {
    connectionStatus,
    isRefreshing,
    lastError,
  } =
    useDashboardRealtime();

  // =======================================================
  // DISPLAY STATE
  // =======================================================

  const status =
    useMemo(
      () => {
        if (
          isRefreshing &&
          connectionStatus ===
            "live"
        ) {
          return {
            label:
              "Synchronizing data",

            description:
              "Operational changes were detected. Dashboard totals are being synchronized.",

            icon:
              "refresh" as const,
          };
        }

        if (
          connectionStatus ===
          "live"
        ) {
          return {
            label:
              "Realtime sync active",

            description:
              "Dashboard data automatically synchronizes with the current operational records.",

            icon:
              "live" as const,
          };
        }

        if (
          connectionStatus ===
          "connecting"
        ) {
          return {
            label:
              "Connecting realtime data",

            description:
              "Establishing the live Dashboard synchronization channel.",

            icon:
              "refresh" as const,
          };
        }

        if (
          connectionStatus ===
          "reconnecting"
        ) {
          return {
            label:
              "Realtime reconnecting",

            description:
              "The live connection is being restored. Current Dashboard data remains visible.",

            icon:
              "refresh" as const,
          };
        }

        if (
          connectionStatus ===
          "error"
        ) {
          return {
            label:
              "Realtime connection issue",

            description:
              lastError ??
              "The Dashboard could not establish realtime synchronization.",

            icon:
              "offline" as const,
          };
        }

        return {
          label:
            "Realtime disconnected",

          description:
            lastError ??
            "The realtime synchronization channel is currently disconnected.",

          icon:
            "offline" as const,
        };
      },
      [
        connectionStatus,
        isRefreshing,
        lastError,
      ]
    );

  // =======================================================
  // UI
  // =======================================================

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-zinc-950">
            Operational Data
          </p>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            {status.description}
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-600">
          {status.icon ===
          "live" ? (
            <Wifi
              size={15}
              aria-hidden="true"
            />
          ) : null}

          {status.icon ===
          "refresh" ? (
            <RefreshCw
              size={15}
              className="animate-spin"
              aria-hidden="true"
            />
          ) : null}

          {status.icon ===
          "offline" ? (
            <WifiOff
              size={15}
              aria-hidden="true"
            />
          ) : null}

          {status.label}
        </div>
      </div>
    </section>
  );
}