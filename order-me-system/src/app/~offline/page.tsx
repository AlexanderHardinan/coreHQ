"use client";

import {
  RefreshCw,
  WifiOff,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

// =========================================================
// OFFLINE PAGE
// =========================================================

export default function OfflinePage() {
  const [
    isOnline,
    setIsOnline,
  ] =
    useState(false);

  // =======================================================
  // CONNECTION STATUS
  // =======================================================

  useEffect(() => {
    function updateConnectionStatus() {
      setIsOnline(
        navigator.onLine
      );
    }

    updateConnectionStatus();

    window.addEventListener(
      "online",
      updateConnectionStatus
    );

    window.addEventListener(
      "offline",
      updateConnectionStatus
    );

    return () => {
      window.removeEventListener(
        "online",
        updateConnectionStatus
      );

      window.removeEventListener(
        "offline",
        updateConnectionStatus
      );
    };
  }, []);

  // =======================================================
  // RETRY
  // =======================================================

  function retryConnection() {
    window.location.href =
      "/";
  }

  // =======================================================
  // UI
  // =======================================================

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-5 py-10">
      <section className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-sm sm:p-8">
        {/* =================================================
            LOGO
        ================================================= */}

        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
          <img
            src="/forzalogo.png"
            alt="Forza Kitchen"
            className="h-full w-full object-contain"
          />
        </div>

        {/* =================================================
            STATUS ICON
        ================================================= */}

        <div className="mx-auto mt-6 grid h-12 w-12 place-items-center rounded-2xl bg-zinc-100 text-zinc-600">
          <WifiOff
            size={22}
            aria-hidden="true"
          />
        </div>

        {/* =================================================
            MESSAGE
        ================================================= */}

        <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
          Order Me System by Forza
        </p>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">
          Connection unavailable
        </h1>

        <p className="mt-3 text-sm leading-6 text-zinc-500">
          Order Me requires an active connection to display
          current operational data. Products, orders, recipes,
          inventory, and reports are not shown from stale
          offline data.
        </p>

        {/* =================================================
            CONNECTION STATE
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-zinc-600">
              Connection
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                isOnline
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-zinc-200 text-zinc-600"
              }`}
            >
              {isOnline
                ? "Online"
                : "Offline"}
            </span>
          </div>
        </div>

        {/* =================================================
            RETRY
        ================================================= */}

        <button
          type="button"
          onClick={
            retryConnection
          }
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          <RefreshCw
            size={16}
            aria-hidden="true"
          />

          {isOnline
            ? "Return to Order Me"
            : "Try Again"}
        </button>

        <p className="mt-5 text-xs leading-5 text-zinc-400">
          Human and Technology System
          <br />
          Developed by Chef Alex
        </p>
      </section>
    </main>
  );
}