import {
  FlaskConical,
  MapPin,
} from "lucide-react";

import {
  getRecipeProductOptions,
} from "@/app/recipes/actions";

import RecipeForm from "@/app/recipes/recipe-form";

import AppShell from "@/components/app-shell";

import {
  requireOperationalSession,
} from "@/lib/auth/require-operational-session";

// =========================================================
// PAGE
// =========================================================

export default async function NewProductionRecipePage() {
  // =======================================================
  // VERIFY OPERATIONAL SESSION
  // =======================================================

  const activeLocation =
    await requireOperationalSession();

  // =======================================================
  // LOAD LOCATION-SCOPED ACTIVE PRODUCTS
  // =======================================================
  //
  // getRecipeProductOptions() resolves the trusted database
  // location server-side and only returns active products
  // available to the selected Forza / Fusion workspace.
  // =======================================================

  const productOptions =
    await getRecipeProductOptions();

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

        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical
                size={17}
                className="text-amber-700"
                aria-hidden="true"
              />

              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                Production Management
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
              Create Production Batch Recipe
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Define the base production batch, finished yield,
              and ingredient quantities for the current
              operational location.
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
            RECIPE FORM
        ================================================= */}

        <RecipeForm
          mode="create"
          initialProductOptions={
            productOptions
          }
        />
      </div>
    </AppShell>
  );
}