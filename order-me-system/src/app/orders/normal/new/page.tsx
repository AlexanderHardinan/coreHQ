import {
  ClipboardList,
  MapPin,
} from "lucide-react";

import {
  getNormalOrderProductOptions,
} from "@/app/orders/normal/actions";

import NormalOrderForm from "@/app/orders/normal/normal-order-form";

import AppShell from "@/components/app-shell";

import {
  requireOperationalSession,
} from "@/lib/auth/require-operational-session";

// =========================================================
// PAGE
// =========================================================

export default async function NewNormalOrderPage() {
  // =======================================================
  // VERIFY OPERATIONAL SESSION
  // =======================================================

  const activeLocation =
    await requireOperationalSession();

  // =======================================================
  // LOAD CURRENT LOCATION ACTIVE PRODUCTS
  // =======================================================
  //
  // getNormalOrderProductOptions() resolves the trusted
  // database location server-side.
  //
  // The browser does not provide or control location_id.
  // =======================================================

  const productOptions =
    await getNormalOrderProductOptions();

  // =======================================================
  // PAGE
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

        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList
                size={17}
                className="text-amber-700"
                aria-hidden="true"
              />

              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                Order Management
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
              Create Normal Order
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Create a location-specific Product order using
              current stock quantities and required order
              quantities.
            </p>
          </div>

          {/* =================================================
              LOCATION
          ================================================= */}

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
            NORMAL ORDER FORM
        ================================================= */}

        <NormalOrderForm
          mode="create"
          initialProductOptions={
            productOptions
          }
        />
      </div>
    </AppShell>
  );
}