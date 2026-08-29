import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  MapPin,
  ShieldCheck,
} from "lucide-react";

import LocationSelector from "@/app/location-selector";
import LogoutButton from "@/app/logout-button";
import SwitchLocationButton from "@/app/switch-location-button";

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

  return (
    <main className="min-h-dvh bg-zinc-50 px-5 py-10">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-6xl flex-col">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-950">
              Order Me System by Forza
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Human and Technology System
            </p>
          </div>

          <div className="flex flex-wrap items-start gap-2 sm:items-center">
            {activeLocation ? (
              <>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700">
                  <MapPin
                    size={15}
                    aria-hidden="true"
                  />

                  Current Location:

                  <span className="text-zinc-950">
                    {activeLocation.name}
                  </span>
                </div>

                <SwitchLocationButton />
              </>
            ) : null}

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600">
              <ShieldCheck
                size={15}
                aria-hidden="true"
              />

              Secure Session
            </div>

            <LogoutButton />
          </div>
        </header>

        <section className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-3xl">
            {activeLocation ? (
              <div className="mx-auto max-w-xl rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm sm:p-10">
                <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-zinc-950 text-white">
                  <MapPin
                    size={25}
                    aria-hidden="true"
                  />
                </div>

                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
                  Active Location
                </p>

                <h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
                  {activeLocation.name}
                </h1>

                <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-600">
                  <span>
                    {activeLocation.code}
                  </span>

                  <span className="text-zinc-300">
                    •
                  </span>

                  <span>
                    Operational Context
                  </span>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}

            <p className="mt-8 text-center text-xs text-zinc-400">
              Developed by Chef Alex
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}