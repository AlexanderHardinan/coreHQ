import Link from "next/link";

import {
  ArrowLeft,
  Factory,
  MapPin,
} from "lucide-react";

import {
  getProductionOrderRecipeOptions,
} from "@/app/orders/production/actions";

import ProductionOrderForm from "@/app/orders/production/production-order-form";

import AppShell from "@/components/app-shell";

import {
  requireOperationalSession,
} from "@/lib/auth/require-operational-session";

// =========================================================
// PAGE
// =========================================================

export default async function NewProductionOrderPage() {
  // =======================================================
  // VERIFY OPERATIONAL SESSION
  // =======================================================

  const activeLocation =
    await requireOperationalSession();

  // =======================================================
  // LOAD LOCATION-SCOPED PRODUCTION RECIPES
  // =======================================================
  //
  // getProductionOrderRecipeOptions() performs its own
  // trusted database-location resolution before querying.
  //
  // Only recipes belonging to the current signed
  // operational location are returned.
  // =======================================================

  const recipeOptions =
    await getProductionOrderRecipeOptions();

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
            BACK
        ================================================= */}

        <div>
          <Link
            href="/orders/production"
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-zinc-950"
          >
            <ArrowLeft
              size={16}
              aria-hidden="true"
            />

            Back to Batch Production Orders
          </Link>
        </div>

        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Factory
                size={17}
                className="text-amber-700"
                aria-hidden="true"
              />

              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                Production Planning
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
              Create Batch Production Order
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Select production recipes, enter the required
              finished yield, record physical ingredient stock,
              and let the system calculate the final ordering
              requirement.
            </p>
          </div>

          {/* =================================================
              ACTIVE LOCATION
          ================================================= */}

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
            RECIPE AVAILABILITY
        ================================================= */}

        {recipeOptions.length ===
        0 ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-amber-900">
                  No Production Recipes Available
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Create at least one active Production Batch
                  Recipe before creating a Batch Production
                  Order.
                </p>
              </div>

              <Link
                href="/recipes"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-amber-900 px-4 text-sm font-semibold text-white transition hover:bg-amber-800"
              >
                Production Recipes
              </Link>
            </div>
          </section>
        ) : null}

        {/* =================================================
            PRODUCTION ORDER FORM
        ================================================= */}

        <ProductionOrderForm
          mode="create"
          recipeOptions={
            recipeOptions
          }
        />
      </div>
    </AppShell>
  );
}