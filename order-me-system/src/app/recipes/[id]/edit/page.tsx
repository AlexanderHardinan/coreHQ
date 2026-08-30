import {
  notFound,
} from "next/navigation";

import {
  FlaskConical,
  MapPin,
  Pencil,
} from "lucide-react";

import {
  getProductionRecipeById,
  getRecipeProductOptions,
} from "@/app/recipes/actions";

import RecipeForm from "@/app/recipes/recipe-form";

import AppShell from "@/components/app-shell";

import {
  requireOperationalSession,
} from "@/lib/auth/require-operational-session";

// =========================================================
// TYPES
// =========================================================

type EditProductionRecipePageProps = {
  params: Promise<{
    id: string;
  }>;
};

// =========================================================
// PAGE
// =========================================================

export default async function EditProductionRecipePage({
  params,
}: EditProductionRecipePageProps) {
  // =======================================================
  // VERIFY OPERATIONAL SESSION
  // =======================================================

  const activeLocation =
    await requireOperationalSession();

  // =======================================================
  // READ RECIPE ID
  // =======================================================

  const {
    id,
  } = await params;

  // =======================================================
  // LOAD LOCATION-SCOPED RECIPE
  // =======================================================

  const recipe =
    await getProductionRecipeById(
      id
    );

  if (!recipe) {
    notFound();
  }

  // =======================================================
  // LOAD CURRENT LOCATION ACTIVE PRODUCTS
  // =======================================================
  //
  // This provides the current searchable product catalog
  // for adding/replacing ingredients.
  //
  // Existing ingredient product information is already
  // carried by the loaded recipe record.
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

        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Pencil
                size={17}
                className="text-amber-700"
                aria-hidden="true"
              />

              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                Production Management
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
              Edit Production Batch Recipe
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Update the base production batch, finished yield,
              and ingredient requirements for{" "}
              <span className="font-semibold text-zinc-700">
                {recipe.name}
              </span>
              .
            </p>
          </div>

          {/* =================================================
              HEADER STATUS
          ================================================= */}

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm">
              <FlaskConical
                size={14}
                aria-hidden="true"
              />

              {recipe.ingredients.length}{" "}
              {recipe.ingredients.length ===
              1
                ? "ingredient"
                : "ingredients"}
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm">
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

        {/* =================================================
            EDIT FORM
        ================================================= */}

        <RecipeForm
          mode="edit"
          initialProductOptions={
            productOptions
          }
          recipe={
            recipe
          }
        />
      </div>
    </AppShell>
  );
}