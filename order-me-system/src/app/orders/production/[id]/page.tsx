import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Clock3,
  Download,
  Factory,
  MapPin,
  Package,
  Pencil,
  UserRound,
} from "lucide-react";

import {
  getProductionOrderById,
  type ProductionOrderStatus,
} from "@/app/orders/production/actions";

import AppShell from "@/components/app-shell";

import {
  requireOperationalSession,
} from "@/lib/auth/require-operational-session";

// =========================================================
// TYPES
// =========================================================

type ProductionOrderViewPageProps = {
  params: Promise<{
    id: string;
  }>;
};

// =========================================================
// FORMAT DECIMAL
// =========================================================
//
// PostgreSQL NUMERIC values are returned as strings.
//
// Formatting directly from the string avoids introducing
// unnecessary JavaScript floating-point calculation into
// the historical Production Order view.
// =========================================================

function formatDecimal(
  value:
    | string
    | number,
  maximumFractionDigits:
    number = 4
): string {
  const raw =
    String(
      value
    ).trim();

  if (
    !/^-?\d+(?:\.\d+)?$/.test(
      raw
    )
  ) {
    return "—";
  }

  const negative =
    raw.startsWith(
      "-"
    );

  const unsigned =
    negative
      ? raw.slice(
          1
        )
      : raw;

  const [
    wholeRaw,
    fractionRaw = "",
  ] =
    unsigned.split(
      "."
    );

  const normalizedWhole =
    wholeRaw.replace(
      /^0+(?=\d)/,
      ""
    ) ||
    "0";

  const groupedWhole =
    normalizedWhole.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      ","
    );

  const fraction =
    fractionRaw
      .slice(
        0,
        maximumFractionDigits
      )
      .replace(
        /0+$/,
        ""
      );

  const formatted =
    fraction
      ? `${groupedWhole}.${fraction}`
      : groupedWhole;

  return negative
    ? `-${formatted}`
    : formatted;
}

// =========================================================
// FORMAT DATE
// =========================================================

function formatDate(
  value: string
): string {
  const parts =
    value.split(
      "-"
    );

  if (
    parts.length !==
    3
  ) {
    return value;
  }

  const year =
    Number(
      parts[0]
    );

  const month =
    Number(
      parts[1]
    );

  const day =
    Number(
      parts[2]
    );

  if (
    !Number.isInteger(
      year
    ) ||
    !Number.isInteger(
      month
    ) ||
    !Number.isInteger(
      day
    )
  ) {
    return value;
  }

  const date =
    new Date(
      year,
      month -
        1,
      day
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      year:
        "numeric",

      month:
        "long",

      day:
        "2-digit",
    }
  ).format(
    date
  );
}

// =========================================================
// FORMAT DATE TIME
// =========================================================

function formatDateTime(
  value: string
): string {
  const date =
    new Date(
      value
    );

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
      year:
        "numeric",

      month:
        "long",

      day:
        "2-digit",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    date
  );
}

// =========================================================
// STATUS LABEL
// =========================================================

function getStatusLabel(
  status:
    ProductionOrderStatus
): string {
  switch (
    status
  ) {
    case "submitted":
      return "Submitted";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    case "draft":
    default:
      return "Draft";
  }
}

// =========================================================
// STATUS CLASSES
// =========================================================

function getStatusClasses(
  status:
    ProductionOrderStatus
): string {
  switch (
    status
  ) {
    case "submitted":
      return "bg-blue-50 text-blue-700 border-blue-100";

    case "completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";

    case "cancelled":
      return "bg-red-50 text-red-700 border-red-100";

    case "draft":
    default:
      return "bg-amber-50 text-amber-700 border-amber-100";
  }
}

// =========================================================
// PAGE
// =========================================================

export default async function ProductionOrderViewPage({
  params,
}: ProductionOrderViewPageProps) {
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
  } =
    await params;

  // =======================================================
  // LOAD LOCATION-SCOPED ORDER
  // =======================================================

  const order =
    await getProductionOrderById(
      id
    );

  if (
    !order
  ) {
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
              Batch Production Order Details
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Review the complete historical recipe production
              plan and consolidated ingredient requirements for
              the current operational location.
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

              {
                activeLocation.name
              }

              <span className="text-zinc-400">
                {
                  activeLocation.code
                }
              </span>
            </div>

            {/* =============================================
                STATUS
            ============================================= */}

            <span
              className={`inline-flex items-center rounded-full border px-4 py-2 text-xs font-bold ${getStatusClasses(
                order.status
              )}`}
            >
              {
                getStatusLabel(
                  order.status
                )
              }
            </span>
          </div>
        </section>

        {/* =================================================
            ORDER HEADER CARD
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-zinc-950 text-white">
                  <ClipboardList
                    size={24}
                    aria-hidden="true"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
                    Production Order Number
                  </p>

                  <h2 className="mt-1 break-all font-mono text-xl font-bold text-zinc-950 sm:text-2xl">
                    {
                      order.order_number
                    }
                  </h2>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/orders/production"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  <ArrowLeft
                    size={16}
                    aria-hidden="true"
                  />

                  Back
                </Link>

                <a
                  href={`/api/orders/production/${order.id}/pdf`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  <Download
                    size={16}
                    aria-hidden="true"
                  />

                  Export PDF
                </a>

                <Link
                  href={`/orders/production/${order.id}/edit`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  <Pencil
                    size={15}
                    aria-hidden="true"
                  />

                  Edit Order
                </Link>
              </div>
            </div>
          </div>

          {/* =================================================
              ORDER SUMMARY
          ================================================= */}

          <div className="grid gap-px bg-zinc-200 sm:grid-cols-2 xl:grid-cols-4">
            {/* ===============================================
                DATE
            =============================================== */}

            <div className="bg-white p-5 sm:p-6">
              <div className="flex items-center gap-2 text-zinc-400">
                <CalendarDays
                  size={15}
                  aria-hidden="true"
                />

                <p className="text-xs font-bold uppercase tracking-[0.12em]">
                  Order Date
                </p>
              </div>

              <p className="mt-3 text-base font-bold text-zinc-950">
                {
                  formatDate(
                    order.order_date
                  )
                }
              </p>
            </div>

            {/* ===============================================
                ORDERED BY
            =============================================== */}

            <div className="bg-white p-5 sm:p-6">
              <div className="flex items-center gap-2 text-zinc-400">
                <UserRound
                  size={15}
                  aria-hidden="true"
                />

                <p className="text-xs font-bold uppercase tracking-[0.12em]">
                  Ordered By
                </p>
              </div>

              <p className="mt-3 break-words text-base font-bold text-zinc-950">
                {
                  order.ordered_by
                }
              </p>
            </div>

            {/* ===============================================
                RECIPES
            =============================================== */}

            <div className="bg-white p-5 sm:p-6">
              <div className="flex items-center gap-2 text-zinc-400">
                <Factory
                  size={15}
                  aria-hidden="true"
                />

                <p className="text-xs font-bold uppercase tracking-[0.12em]">
                  Recipes
                </p>
              </div>

              <p className="mt-3 text-base font-bold text-zinc-950">
                {
                  order.recipes.length
                }
              </p>
            </div>

            {/* ===============================================
                STATUS
            =============================================== */}

            <div className="bg-white p-5 sm:p-6">
              <div className="flex items-center gap-2 text-zinc-400">
                <Clock3
                  size={15}
                  aria-hidden="true"
                />

                <p className="text-xs font-bold uppercase tracking-[0.12em]">
                  Status
                </p>
              </div>

              <p className="mt-3 text-base font-bold text-zinc-950">
                {
                  getStatusLabel(
                    order.status
                  )
                }
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            PRODUCTION SUMMARY
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
                <Factory
                  size={18}
                  aria-hidden="true"
                />
              </div>

              <div>
                <h2 className="text-base font-bold text-zinc-950">
                  Production Summary
                </h2>

                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Historical recipe yield snapshots and calculated
                  production multipliers captured for this order.
                </p>
              </div>
            </div>
          </div>

          {order.recipes.length >
          0 ? (
            <>
              {/* =============================================
                  DESKTOP TABLE
              ============================================= */}

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead className="bg-zinc-50">
                    <tr className="border-b border-zinc-200">
                      <th className="w-16 px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                        #
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                        Recipe
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-500">
                        Base Yield
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-500">
                        Required Yield
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-500">
                        Multiplier
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {order.recipes.map(
                      (
                        recipe,
                        index
                      ) => (
                        <tr
                          key={
                            recipe.id
                          }
                          className="border-b border-zinc-100 last:border-b-0"
                        >
                          <td className="px-5 py-4 text-sm font-semibold text-zinc-400">
                            {
                              index +
                              1
                            }
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-zinc-950">
                              {
                                recipe.recipe_name_snapshot
                              }
                            </p>

                            <p className="mt-1 text-xs text-zinc-400">
                              Base Batch:{" "}
                              <span className="font-semibold text-zinc-600">
                                {
                                  formatDecimal(
                                    recipe.batch_qty_snapshot
                                  )
                                }
                              </span>
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-zinc-700">
                            {formatDecimal(
                              recipe.base_yield_qty_snapshot
                            )}{" "}
                            <span className="text-xs font-bold uppercase text-zinc-500">
                              {
                                recipe.yield_uom_snapshot
                              }
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold text-zinc-950">
                            {formatDecimal(
                              recipe.required_yield_qty
                            )}{" "}
                            <span className="text-xs font-bold uppercase text-zinc-500">
                              {
                                recipe.yield_uom_snapshot
                              }
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold text-zinc-950">
                            {formatDecimal(
                              recipe.yield_multiplier,
                              10
                            )}
                            ×
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* =============================================
                  MOBILE / TABLET CARDS
              ============================================= */}

              <div className="divide-y divide-zinc-100 lg:hidden">
                {order.recipes.map(
                  (
                    recipe,
                    index
                  ) => (
                    <article
                      key={
                        recipe.id
                      }
                      className="p-5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-100 text-xs font-bold text-zinc-600">
                          {
                            index +
                            1
                          }
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-zinc-950">
                            {
                              recipe.recipe_name_snapshot
                            }
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            Base Batch:{" "}
                            <span className="font-semibold text-zinc-700">
                              {
                                formatDecimal(
                                  recipe.batch_qty_snapshot
                                )
                              }
                            </span>
                          </p>

                          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                Base Yield
                              </p>

                              <p className="mt-1 text-sm font-semibold text-zinc-800">
                                {formatDecimal(
                                  recipe.base_yield_qty_snapshot
                                )}{" "}
                                {
                                  recipe.yield_uom_snapshot
                                }
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                Required Yield
                              </p>

                              <p className="mt-1 text-sm font-bold text-zinc-950">
                                {formatDecimal(
                                  recipe.required_yield_qty
                                )}{" "}
                                {
                                  recipe.yield_uom_snapshot
                                }
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                Multiplier
                              </p>

                              <p className="mt-1 text-sm font-bold text-zinc-950">
                                {formatDecimal(
                                  recipe.yield_multiplier,
                                  10
                                )}
                                ×
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
                <Factory
                  size={20}
                  aria-hidden="true"
                />
              </div>

              <p className="mt-4 text-sm font-bold text-zinc-950">
                No Production Recipes Available
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                This Production Order currently contains no saved
                recipe records.
              </p>
            </div>
          )}
        </section>

        {/* =================================================
            INGREDIENT REQUIREMENTS
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
                <Package
                  size={18}
                  aria-hidden="true"
                />
              </div>

              <div>
                <h2 className="text-base font-bold text-zinc-950">
                  Ingredient Requirement
                </h2>

                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Consolidated historical ingredient requirements
                  calculated from all selected production recipes.
                </p>
              </div>
            </div>
          </div>

          {order.items.length >
          0 ? (
            <>
              {/* =============================================
                  DESKTOP TABLE
              ============================================= */}

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1150px] border-collapse">
                  <thead className="bg-zinc-50">
                    <tr className="border-b border-zinc-200">
                      <th className="w-16 px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                        #
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                        SKU
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                        Ingredient
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                        Category
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-500">
                        Required Qty
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-500">
                        On Hand Qty
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-500">
                        Order Request Qty
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                        UOM
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {order.items.map(
                      (
                        item,
                        index
                      ) => (
                        <tr
                          key={
                            item.id
                          }
                          className="border-b border-zinc-100 last:border-b-0"
                        >
                          <td className="px-5 py-4 text-sm font-semibold text-zinc-400">
                            {
                              index +
                              1
                            }
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <span className="rounded-lg bg-zinc-100 px-2.5 py-1.5 font-mono text-xs font-bold text-zinc-700">
                              {
                                item.sku_snapshot
                              }
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-zinc-950">
                              {
                                item.product_name_snapshot
                              }
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-zinc-600">
                              {
                                item.category_name_snapshot
                              }
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-zinc-700">
                            {
                              formatDecimal(
                                item.required_qty
                              )
                            }
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-zinc-700">
                            {
                              formatDecimal(
                                item.on_hand_qty
                              )
                            }
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold text-zinc-950">
                            {
                              formatDecimal(
                                item.requested_qty
                              )
                            }
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-zinc-700">
                            {
                              item.uom
                            }
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* =============================================
                  MOBILE / TABLET CARDS
              ============================================= */}

              <div className="divide-y divide-zinc-100 lg:hidden">
                {order.items.map(
                  (
                    item,
                    index
                  ) => (
                    <article
                      key={
                        item.id
                      }
                      className="p-5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-100 text-xs font-bold text-zinc-600">
                          {
                            index +
                            1
                          }
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-bold text-zinc-950">
                              {
                                item.product_name_snapshot
                              }
                            </p>

                            <p className="font-mono text-xs font-semibold text-zinc-500">
                              {
                                item.sku_snapshot
                              }
                            </p>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                Category
                              </p>

                              <p className="mt-1 text-xs font-semibold text-zinc-700">
                                {
                                  item.category_name_snapshot
                                }
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                Required
                              </p>

                              <p className="mt-1 text-sm font-semibold text-zinc-800">
                                {
                                  formatDecimal(
                                    item.required_qty
                                  )
                                }
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                On Hand
                              </p>

                              <p className="mt-1 text-sm font-semibold text-zinc-800">
                                {
                                  formatDecimal(
                                    item.on_hand_qty
                                  )
                                }
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                Requested
                              </p>

                              <p className="mt-1 text-sm font-bold text-zinc-950">
                                {
                                  formatDecimal(
                                    item.requested_qty
                                  )
                                }
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                UOM
                              </p>

                              <p className="mt-1 text-sm font-bold text-zinc-800">
                                {
                                  item.uom
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
                <Package
                  size={20}
                  aria-hidden="true"
                />
              </div>

              <p className="mt-4 text-sm font-bold text-zinc-950">
                No Ingredient Rows Available
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                This Production Order currently contains no
                consolidated ingredient requirements.
              </p>
            </div>
          )}

          {order.items.length >
          0 ? (
            <div className="border-t border-zinc-200 bg-zinc-50 px-5 py-4 sm:px-6">
              <p className="text-xs text-zinc-500">
                Consolidated Ingredients:{" "}
                <span className="font-bold text-zinc-800">
                  {
                    order.items.length
                  }
                </span>
              </p>
            </div>
          ) : null}
        </section>

        {/* =================================================
            RECORD INFORMATION
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 p-5 sm:p-6">
            <h2 className="text-base font-bold text-zinc-950">
              Record Information
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Database timestamps for this Batch Production
              Order.
            </p>
          </div>

          <div className="grid gap-px bg-zinc-200 sm:grid-cols-2">
            <div className="bg-white p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
                Created
              </p>

              <p className="mt-3 text-sm font-semibold text-zinc-800">
                {
                  formatDateTime(
                    order.created_at
                  )
                }
              </p>
            </div>

            <div className="bg-white p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
                Last Updated
              </p>

              <p className="mt-3 text-sm font-semibold text-zinc-800">
                {
                  formatDateTime(
                    order.updated_at
                  )
                }
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <section className="flex flex-col-reverse gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-end sm:p-6">
          <Link
            href="/orders/production"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            <ArrowLeft
              size={16}
              aria-hidden="true"
            />

            Back to Production Orders
          </Link>

          <a
            href={`/api/orders/production/${order.id}/pdf`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            <Download
              size={16}
              aria-hidden="true"
            />

            Export PDF
          </a>

          <Link
            href={`/orders/production/${order.id}/edit`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            <Pencil
              size={16}
              aria-hidden="true"
            />

            Edit Production Order
          </Link>
        </section>
      </div>
    </AppShell>
  );
}