import Link from "next/link";
import {
  notFound,
} from "next/navigation";

import {
  ArrowLeft,
  Beaker,
  CalendarDays,
  FlaskConical,
  MapPin,
  Pencil,
  Scale,
} from "lucide-react";

import {
  getProductionRecipeById,
} from "@/app/recipes/actions";

import AppShell from "@/components/app-shell";

import {
  requireOperationalSession,
} from "@/lib/auth/require-operational-session";

// =========================================================
// TYPES
// =========================================================

type ProductionRecipeViewPageProps = {
  params: Promise<{
    id: string;
  }>;
};

// =========================================================
// FORMAT QUANTITY
// =========================================================

function formatQuantity(
  value: number
): string {
  if (
    !Number.isFinite(
      value
    )
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits:
        4,
    }
  ).format(value);
}

// =========================================================
// FORMAT DATE / TIME
// =========================================================

function formatDateTime(
  value: string
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

// =========================================================
// PAGE
// =========================================================

export default async function ProductionRecipeViewPage({
  params,
}: ProductionRecipeViewPageProps) {
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
              Production Recipe Details
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Review the complete base production recipe,
              finished yield, and ingredient requirements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* =============================================
                LOCATION
            ============================================= */}

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

            {/* =============================================
                STATUS
            ============================================= */}

            <span
              className={`inline-flex rounded-full px-4 py-2 text-xs font-semibold ${
                recipe.is_active
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {recipe.is_active
                ? "Active"
                : "Inactive"}
            </span>
          </div>
        </section>

        {/* =================================================
            RECIPE IDENTITY
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-zinc-950 text-white">
                  <FlaskConical
                    size={24}
                    aria-hidden="true"
                  />
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold text-zinc-950">
                    {recipe.name}
                  </h2>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-semibold text-zinc-700">
                      <Beaker
                        size={13}
                        aria-hidden="true"
                      />

                      {recipe.ingredients.length}{" "}
                      {recipe.ingredients.length ===
                      1
                        ? "ingredient"
                        : "ingredients"}
                    </span>

                    <span className="inline-flex rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800">
                      Base Production Recipe
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <Link
                  href="/recipes"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  <ArrowLeft
                    size={16}
                    aria-hidden="true"
                  />

                  Back
                </Link>

                <Link
                  href={`/recipes/${recipe.id}/edit`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  <Pencil
                    size={15}
                    aria-hidden="true"
                  />

                  Edit Recipe
                </Link>
              </div>
            </div>
          </div>

          {/* =================================================
              RECIPE SUMMARY
          ================================================= */}

          <div className="grid gap-px bg-zinc-200 sm:grid-cols-2 xl:grid-cols-4">
            {/* ===============================================
                BATCH QTY
            =============================================== */}

            <div className="bg-white p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
                Batch QTY
              </p>

              <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-950">
                {formatQuantity(
                  recipe.batch_qty
                )}
              </p>

              <p className="mt-1 text-xs text-zinc-400">
                Base recipe batch amount
              </p>
            </div>

            {/* ===============================================
                YIELD QTY
            =============================================== */}

            <div className="bg-white p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
                Yield QTY
              </p>

              <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-950">
                {formatQuantity(
                  recipe.yield_qty
                )}
              </p>

              <p className="mt-1 text-xs text-zinc-400">
                Finished base yield
              </p>
            </div>

            {/* ===============================================
                YIELD UOM
            =============================================== */}

            <div className="bg-white p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
                Yield UOM
              </p>

              <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-950">
                {recipe.yield_uom}
              </p>

              <p className="mt-1 text-xs text-zinc-400">
                Finished yield unit
              </p>
            </div>

            {/* ===============================================
                INGREDIENT COUNT
            =============================================== */}

            <div className="bg-white p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
                Ingredients
              </p>

              <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-950">
                {
                  recipe.ingredients.length
                }
              </p>

              <p className="mt-1 text-xs text-zinc-400">
                Products in base recipe
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            INGREDIENT REQUIREMENTS
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
                <Scale
                  size={18}
                  aria-hidden="true"
                />
              </div>

              <div>
                <h2 className="text-base font-bold text-zinc-950">
                  Ingredient Requirements
                </h2>

                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Ingredient quantities required for the base
                  production recipe.
                </p>
              </div>
            </div>
          </div>

          {recipe.ingredients.length >
          0 ? (
            <>
              {/* =============================================
                  DESKTOP TABLE
              ============================================= */}

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] border-collapse">
                  <thead className="bg-zinc-50">
                    <tr className="border-b border-zinc-200">
                      <th className="w-16 px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                        #
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                        SKU
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                        Product
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-500">
                        Qty
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                        UOM
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {recipe.ingredients.map(
                      (
                        ingredient,
                        index
                      ) => (
                        <tr
                          key={
                            ingredient.id
                          }
                          className="border-b border-zinc-100 last:border-b-0"
                        >
                          <td className="px-5 py-4 text-sm font-semibold text-zinc-400">
                            {index + 1}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <span className="rounded-lg bg-zinc-100 px-2.5 py-1.5 font-mono text-xs font-bold text-zinc-700">
                              {
                                ingredient.product_sku
                              }
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-zinc-950">
                              {
                                ingredient.product_name
                              }
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold text-zinc-800">
                            {formatQuantity(
                              ingredient.qty
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-zinc-600">
                            {
                              ingredient.uom
                            }
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* =============================================
                  MOBILE CARDS
              ============================================= */}

              <div className="divide-y divide-zinc-100 md:hidden">
                {recipe.ingredients.map(
                  (
                    ingredient,
                    index
                  ) => (
                    <article
                      key={
                        ingredient.id
                      }
                      className="p-5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-100 text-xs font-bold text-zinc-600">
                          {index + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-zinc-950">
                            {
                              ingredient.product_name
                            }
                          </p>

                          <p className="mt-1 font-mono text-xs font-semibold text-zinc-500">
                            {
                              ingredient.product_sku
                            }
                          </p>

                          <div className="mt-4 grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                Qty
                              </p>

                              <p className="mt-1 text-sm font-bold text-zinc-800">
                                {formatQuantity(
                                  ingredient.qty
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                UOM
                              </p>

                              <p className="mt-1 text-sm font-bold text-zinc-800">
                                {
                                  ingredient.uom
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                )}
              </div>
            </>
          ) : (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-zinc-100 text-zinc-500">
                <Beaker
                  size={20}
                  aria-hidden="true"
                />
              </div>

              <p className="mt-4 text-sm font-bold text-zinc-950">
                No ingredients available
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                This recipe currently has no ingredient records.
              </p>
            </div>
          )}
        </section>

        {/* =================================================
            RECORD INFORMATION
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
                <CalendarDays
                  size={18}
                  aria-hidden="true"
                />
              </div>

              <div>
                <h2 className="text-base font-bold text-zinc-950">
                  Record Information
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Database timestamps for this production recipe.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-px bg-zinc-200 sm:grid-cols-2">
            <div className="bg-white p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
                Created
              </p>

              <p className="mt-3 text-sm font-semibold text-zinc-800">
                {formatDateTime(
                  recipe.created_at
                )}
              </p>
            </div>

            <div className="bg-white p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
                Last Updated
              </p>

              <p className="mt-3 text-sm font-semibold text-zinc-800">
                {formatDateTime(
                  recipe.updated_at
                )}
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <section className="flex flex-col-reverse gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-end sm:p-6">
          <Link
            href="/recipes"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            <ArrowLeft
              size={16}
              aria-hidden="true"
            />

            Back to Recipe List
          </Link>

          <Link
            href={`/recipes/${recipe.id}/edit`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            <Pencil
              size={16}
              aria-hidden="true"
            />

            Edit Recipe
          </Link>
        </section>
      </div>
    </AppShell>
  );
}