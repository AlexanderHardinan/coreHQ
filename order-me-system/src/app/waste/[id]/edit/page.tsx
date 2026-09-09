import {
  notFound,
} from "next/navigation";

import {
  MapPin,
  Pencil,
  Trash2,
} from "lucide-react";

import {
  getWasteEntryById,
  getWasteProductOptions,
} from "@/app/waste/actions";

import WasteForm from "@/app/waste/waste-form";

import AppShell from "@/components/app-shell";

import {
  requireOperationalSession,
} from "@/lib/auth/require-operational-session";

// =========================================================
// TYPES
// =========================================================

type EditWastePageProps = {
  params: Promise<{
    id: string;
  }>;
};

// =========================================================
// PAGE
// =========================================================

export default async function EditWastePage({
  params,
}: EditWastePageProps) {
  // =======================================================
  // VERIFY OPERATIONAL SESSION
  // =======================================================

  const activeLocation =
    await requireOperationalSession();

  // =======================================================
  // READ WASTE ID
  // =======================================================

  const {
    id,
  } =
    await params;

  // =======================================================
  // LOAD LOCATION-SCOPED WASTE ENTRY
  // =======================================================

  const waste =
    await getWasteEntryById(
      id
    );

  if (!waste) {
    notFound();
  }

  // =======================================================
  // INITIAL PRODUCT OPTIONS
  // =======================================================
  //
  // The shared WasteForm also injects the Waste entry's
  // historical selected Product into its local catalog.
  //
  // This means the current Product can still display even
  // when it is outside the first 100 active Product results.
  //
  // Any newly selected Product is still validated by the
  // trusted server-side location/product rules.
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
              <Pencil
                size={17}
                className="text-amber-700"
                aria-hidden="true"
              />

              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                Operational Waste Control
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
              Edit Waste
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Update the Waste date, Product, quantity, or
              reason for the current operational location.
            </p>
          </div>

          {/* ===============================================
              ACTIVE LOCATION
          =============================================== */}

          <div className="flex flex-wrap items-center gap-2">
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

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-600">
              <Trash2
                size={14}
                aria-hidden="true"
              />

              {
                waste.product_name_snapshot
              }
            </div>
          </div>
        </section>

        {/* =================================================
            WASTE FORM
        ================================================= */}

        <WasteForm
          mode="edit"
          initialProductOptions={
            productOptions
          }
          waste={
            waste
          }
        />
      </div>
    </AppShell>
  );
}