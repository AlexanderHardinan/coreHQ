import {
  notFound,
} from "next/navigation";

import {
  ClipboardList,
  MapPin,
  Pencil,
} from "lucide-react";

import {
  getProductionOrderById,
  getProductionOrderHistoricalRecipeItems,
  getProductionOrderRecipeOptions,
} from "@/app/orders/production/actions";

import ProductionOrderForm from "@/app/orders/production/production-order-form";

import AppShell from "@/components/app-shell";

import {
  requireOperationalSession,
} from "@/lib/auth/require-operational-session";

// =========================================================
// TYPES
// =========================================================

type EditProductionOrderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

// =========================================================
// PAGE
// =========================================================

export default async function EditProductionOrderPage({
  params,
}: EditProductionOrderPageProps) {
  // =======================================================
  // VERIFY OPERATIONAL SESSION
  // =======================================================

  const activeLocation =
    await requireOperationalSession();

  // =======================================================
  // READ ORDER ID
  // =======================================================

  const {
    id,
  } = await params;

  // =======================================================
  // LOAD LOCATION-SCOPED PRODUCTION ORDER
  // =======================================================

  const order =
    await getProductionOrderById(
      id
    );

  if (!order) {
    notFound();
  }

  // =======================================================
  // EXISTING RECIPE IDS
  // =======================================================
  //
  // Existing Production Orders may contain a Production
  // Recipe that has since been made inactive.
  //
  // Those existing historical selections must remain
  // available while editing the saved order.
  // =======================================================

  const existingRecipeIds =
    order.recipes.map(
      (recipe) =>
        recipe.recipe_id
    );

  // =======================================================
  // LOAD EDIT DEPENDENCIES
  // =======================================================
  //
  // recipeOptions:
  //
  // Current active Production Recipes for the trusted
  // location, plus any historical recipes already attached
  // to this saved order.
  //
  // historicalRecipeItems:
  //
  // Ingredient composition originally captured when this
  // Production Order was saved.
  //
  // Existing Production Order recipes must use these
  // historical snapshots during editing rather than today's
  // potentially modified master recipe composition.
  // =======================================================

  const [
    recipeOptions,
    historicalRecipeItems,
  ] =
    await Promise.all([
      getProductionOrderRecipeOptions(
        existingRecipeIds
      ),

      getProductionOrderHistoricalRecipeItems(
        order.id
      ),
    ]);

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
                Order Management
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
              Edit Batch Production Order
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Update the Order Date, Ordered By, status,
              Production Recipe selection, Required Yield,
              and ingredient On Hand quantities for{" "}
              <span className="font-mono font-semibold text-zinc-700">
                {
                  order.order_number
                }
              </span>
              .
            </p>
          </div>

          {/* =================================================
              HEADER INFORMATION
          ================================================= */}

          <div className="flex flex-wrap items-center gap-2">
            {/* =============================================
                ORDER NUMBER
            ============================================= */}

            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm">
              <ClipboardList
                size={14}
                aria-hidden="true"
              />

              <span className="font-mono">
                {
                  order.order_number
                }
              </span>
            </div>

            {/* =============================================
                LOCATION
            ============================================= */}

            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm">
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
          </div>
        </section>

        {/* =================================================
            EDIT PRODUCTION ORDER FORM
        ================================================= */}

        <ProductionOrderForm
          mode="edit"
          recipeOptions={
            recipeOptions
          }
          order={
            order
          }
          historicalRecipeItems={
            historicalRecipeItems
          }
        />
      </div>
    </AppShell>
  );
}