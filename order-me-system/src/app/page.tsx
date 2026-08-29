import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  Activity,
  ClipboardList,
  CookingPot,
  MapPin,
  Package,
} from "lucide-react";

import AppShell from "@/components/app-shell";
import LocationSelector from "@/app/location-selector";

import {
  isSessionTokenValid,
  ORDER_ME_SESSION_COOKIE,
} from "@/lib/auth/session";

import {
  ORDER_ME_LOCATION_COOKIE,
  verifyLocationToken,
} from "@/lib/location/session";

export default async function Home() {
  const cookieStore = await cookies();

  const sessionToken =
    cookieStore.get(
      ORDER_ME_SESSION_COOKIE
    )?.value;

  const hasValidSession =
    isSessionTokenValid(
      sessionToken
    );

  if (!hasValidSession) {
    redirect("/login");
  }

  const locationToken =
    cookieStore.get(
      ORDER_ME_LOCATION_COOKIE
    )?.value;

  const activeLocation =
    verifyLocationToken(
      locationToken
    );

  if (!activeLocation) {
    return (
      <main className="min-h-dvh bg-zinc-50 px-5 py-10">
        <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-6xl flex-col">
          <header className="border-b border-zinc-200 pb-6">
            <div>
              <p className="text-sm font-semibold text-zinc-950">
                Order Me System by Forza
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Human and Technology System
              </p>
            </div>
          </header>

          <section className="flex flex-1 items-center justify-center py-12">
            <div className="w-full max-w-3xl">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-zinc-950 text-white">
                  <MapPin
                    size={25}
                    aria-hidden="true"
                  />
                </div>

                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
                  Operational Access
                </p>

                <h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
                  Choose Location
                </h1>

                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-500">
                  Select the operational location you want
                  to access.
                </p>
              </div>

              <LocationSelector />

              <p className="mt-8 text-center text-xs text-zinc-400">
                Developed by Chef Alex
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <AppShell
      activeLocation={
        activeLocation
      }
    >
      <div className="space-y-6">
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
            Operational Dashboard
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
            {activeLocation.name}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Current operational workspace for products,
            recipes, normal orders, and batch production
            orders.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
                <Package
                  size={19}
                  aria-hidden="true"
                />
              </div>

              <span className="text-xs font-semibold text-zinc-400">
                Products
              </span>
            </div>

            <p className="mt-6 text-2xl font-bold text-zinc-950">
              —
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Product records
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
                <CookingPot
                  size={19}
                  aria-hidden="true"
                />
              </div>

              <span className="text-xs font-semibold text-zinc-400">
                Recipes
              </span>
            </div>

            <p className="mt-6 text-2xl font-bold text-zinc-950">
              —
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Production recipes
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
                <ClipboardList
                  size={19}
                  aria-hidden="true"
                />
              </div>

              <span className="text-xs font-semibold text-zinc-400">
                Orders
              </span>
            </div>

            <p className="mt-6 text-2xl font-bold text-zinc-950">
              —
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Normal orders
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
                <Activity
                  size={19}
                  aria-hidden="true"
                />
              </div>

              <span className="text-xs font-semibold text-zinc-400">
                Production
              </span>
            </div>

            <p className="mt-6 text-2xl font-bold text-zinc-950">
              —
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Batch production orders
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-zinc-950">
                Current Location
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                Operational data is isolated to the selected
                location.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-700">
              <MapPin
                size={14}
                aria-hidden="true"
              />

              {activeLocation.name}

              <span className="text-zinc-400">
                {activeLocation.code}
              </span>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}