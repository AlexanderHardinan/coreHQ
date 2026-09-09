import {
  MapPin,
  Trash2,
} from "lucide-react";

import {
  getWasteProductOptions,
} from "@/app/waste/actions";

import WasteForm from "@/app/waste/waste-form";

import AppShell from "@/components/app-shell";

import {
  requireOperationalSession,
} from "@/lib/auth/require-operational-session";

// =========================================================
// PAGE
// =========================================================

export default async function NewWastePage() {
  // =======================================================
  // VERIFY OPERATIONAL SESSION
  // =======================================================

  const activeLocation =
    await requireOperationalSession();

  // =======================================================
  // INITIAL PRODUCT OPTIONS
  // =======================================================
  //
  // Only active Products belonging to the trusted current
  // operational location are returned.
  //
  // Additional Product searching is handled dynamically by
  // WasteForm through getWasteProductOptions().
  // =======================================================

  const productOptions =
    await getWasteProductOptions();

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
              <Trash2
                size={17}
                className="text-amber-700"
                aria-hidden="true"
              />

              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                Operational Waste Control
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
              Add Waste
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Record Product waste for the current operational
              location using the existing Product List and
              automatic Product UOM.
            </p>
          </div>

          {/* ===============================================
              ACTIVE LOCATION
          =============================================== */}

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm">
            <MapPin
              size={14}
              aria-hidden="true"
            />

            {
              activeLocation.name
            }

            <span className="text-zinc-400">
              {
                activeLocation.code
              }
            </span>
          </div>
        </section>

        {/* =================================================
            WASTE FORM
        ================================================= */}

        <WasteForm
          mode="create"
          initialProductOptions={
            productOptions
          }
        />
      </div>
    </AppShell>
  );
}