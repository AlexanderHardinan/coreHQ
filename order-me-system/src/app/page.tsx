import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";

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

  // =======================================================
  // VERIFY APPLICATION SESSION
  // =======================================================

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

  // =======================================================
  // VERIFY ACTIVE LOCATION
  // =======================================================

  const locationToken =
    cookieStore.get(
      ORDER_ME_LOCATION_COOKIE
    )?.value;

  const activeLocation =
    verifyLocationToken(
      locationToken
    );

  // =======================================================
  // ACTIVE LOCATION → DASHBOARD
  // =======================================================

  if (activeLocation) {
    redirect("/dashboard");
  }

  // =======================================================
  // LOCATION GATEWAY
  // =======================================================

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