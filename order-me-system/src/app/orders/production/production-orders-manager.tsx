"use client";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import {
  type FormEvent,
  useEffect,
  useState,
  useTransition,
} from "react";

import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Filter,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  deleteProductionOrderAction,
  type ProductionOrderListResult,
  type ProductionOrderStatus,
} from "@/app/orders/production/actions";

import {
  useToast,
} from "@/components/toast-provider";

// =========================================================
// TYPES
// =========================================================

type ProductionOrdersManagerProps = {
  result:
    ProductionOrderListResult;

  locationName:
    string;

  filters?: {
    search?: string;

    status?:
      | ProductionOrderStatus
      | "";

    dateFrom?: string;
    dateTo?: string;
  };
};

type FilterState = {
  search: string;

  status:
    | ProductionOrderStatus
    | "";

  dateFrom: string;
  dateTo: string;
};

type DeleteTarget = {
  id: string;
  orderNumber: string;
};

// =========================================================
// CONSTANTS
// =========================================================

const STATUS_OPTIONS: {
  value:
    | ProductionOrderStatus
    | "";
  label: string;
}[] = [
  {
    value:
      "",
    label:
      "All Statuses",
  },
  {
    value:
      "draft",
    label:
      "Draft",
  },
  {
    value:
      "submitted",
    label:
      "Submitted",
  },
  {
    value:
      "completed",
    label:
      "Completed",
  },
  {
    value:
      "cancelled",
    label:
      "Cancelled",
  },
];

// =========================================================
// HELPERS
// =========================================================

function createInitialFilters(
  filters:
    ProductionOrdersManagerProps["filters"]
): FilterState {
  return {
    search:
      filters?.search ??
      "",

    status:
      filters?.status ??
      "",

    dateFrom:
      filters?.dateFrom ??
      "",

    dateTo:
      filters?.dateTo ??
      "",
  };
}

function formatDate(
  value: string
): string {
  if (
    !value
  ) {
    return "—";
  }

  const date =
    new Date(
      `${value}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    }
  ).format(
    date
  );
}

function formatDateTime(
  value: string
): string {
  if (
    !value
  ) {
    return "—";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    date
  );
}

function getStatusLabel(
  status:
    ProductionOrderStatus
): string {
  switch (
    status
  ) {
    case "draft":
      return "Draft";

    case "submitted":
      return "Submitted";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    default:
      return status;
  }
}

function getStatusClassName(
  status:
    ProductionOrderStatus
): string {
  switch (
    status
  ) {
    case "draft":
      return "border-zinc-200 bg-zinc-100 text-zinc-700";

    case "submitted":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "cancelled":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-zinc-200 bg-zinc-100 text-zinc-700";
  }
}

// =========================================================
// COMPONENT
// =========================================================

export default function ProductionOrdersManager({
  result,
  locationName,
  filters,
}: ProductionOrdersManagerProps) {
  const router =
    useRouter();

  const toast =
    useToast();

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const [
    filterState,
    setFilterState,
  ] =
    useState<FilterState>(
      () =>
        createInitialFilters(
          filters
        )
    );

  const [
    deleteTarget,
    setDeleteTarget,
  ] =
    useState<DeleteTarget | null>(
      null
    );

  const [
    isDeleting,
    setIsDeleting,
  ] =
    useState(false);

  // =======================================================
  // SYNCHRONIZE FILTER PROPS
  // =======================================================

  useEffect(
    () => {
      setFilterState(
        createInitialFilters(
          filters
        )
      );
    },
    [
      filters?.search,
      filters?.status,
      filters?.dateFrom,
      filters?.dateTo,
    ]
  );

  // =======================================================
  // FILTER STATE
  // =======================================================

  function updateFilter<
    K extends keyof FilterState,
  >(
    key: K,
    value:
      FilterState[K]
  ) {
    setFilterState(
      (
        current
      ) => ({
        ...current,
        [key]:
          value,
      })
    );
  }

  // =======================================================
  // BUILD QUERY
  // =======================================================

  function buildUrl(
    nextPage:
      number = 1,
    source:
      FilterState =
      filterState
  ): string {
    const params =
      new URLSearchParams();

    const search =
      source.search
        .trim()
        .replace(
          /\s+/g,
          " "
        );

    if (
      search
    ) {
      params.set(
        "search",
        search
      );
    }

    if (
      source.status
    ) {
      params.set(
        "status",
        source.status
      );
    }

    if (
      source.dateFrom
    ) {
      params.set(
        "dateFrom",
        source.dateFrom
      );
    }

    if (
      source.dateTo
    ) {
      params.set(
        "dateTo",
        source.dateTo
      );
    }

    if (
      nextPage >
      1
    ) {
      params.set(
        "page",
        String(
          nextPage
        )
      );
    }

    if (
      result.pageSize !==
      10
    ) {
      params.set(
        "pageSize",
        String(
          result.pageSize
        )
      );
    }

    const query =
      params.toString();

    return query
      ? `/orders/production?${query}`
      : "/orders/production";
  }

  // =======================================================
  // APPLY FILTERS
  // =======================================================

  function handleFilterSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      isPending
    ) {
      return;
    }

    if (
      filterState.dateFrom &&
      filterState.dateTo &&
      filterState.dateTo <
        filterState.dateFrom
    ) {
      toast.warning(
        "Check Date Range",
        "The ending date cannot be before the starting date."
      );

      return;
    }

    startTransition(
      () => {
        router.push(
          buildUrl(
            1
          )
        );
      }
    );
  }

  // =======================================================
  // CLEAR FILTERS
  // =======================================================

  function clearFilters() {
    if (
      isPending
    ) {
      return;
    }

    const empty:
      FilterState = {
      search:
        "",

      status:
        "",

      dateFrom:
        "",

      dateTo:
        "",
    };

    setFilterState(
      empty
    );

    startTransition(
      () => {
        router.push(
          "/orders/production"
        );
      }
    );
  }

  // =======================================================
  // PAGINATION
  // =======================================================

  function goToPage(
    page: number
  ) {
    if (
      isPending ||
      page <
        1 ||
      page >
        result.totalPages
    ) {
      return;
    }

    startTransition(
      () => {
        router.push(
          buildUrl(
            page,
            {
              search:
                filters?.search ??
                "",

              status:
                filters?.status ??
                "",

              dateFrom:
                filters?.dateFrom ??
                "",

              dateTo:
                filters?.dateTo ??
                "",
            }
          )
        );
      }
    );
  }

  // =======================================================
  // DELETE
  // =======================================================

  async function confirmDelete() {
    if (
      !deleteTarget ||
      isDeleting
    ) {
      return;
    }

    setIsDeleting(
      true
    );

    const deletingToast =
      toast.deleting(
        "Deleting Production Order",
        deleteTarget.orderNumber
      );

    try {
      const result =
        await deleteProductionOrderAction(
          deleteTarget.id
        );

      toast.dismissToast(
        deletingToast
      );

      if (
        !result.success
      ) {
        toast.error(
          "Unable to Delete Production Order",
          result.message
        );

        return;
      }

      toast.success(
        "Production Order Deleted",
        `${deleteTarget.orderNumber} was deleted successfully.`
      );

      setDeleteTarget(
        null
      );

      router.refresh();
    } catch (
      error
    ) {
      toast.dismissToast(
        deletingToast
      );

      console.error(
        "Production Order delete UI failed:",
        error
      );

      toast.error(
        "Unable to Delete Production Order",
        "The production order could not be deleted."
      );
    } finally {
      setIsDeleting(
        false
      );
    }
  }

  // =======================================================
  // DERIVED VALUES
  // =======================================================

  const hasFilters =
    Boolean(
      filters?.search ||
        filters?.status ||
        filters?.dateFrom ||
        filters?.dateTo
    );

  const hasOrders =
    result.orders.length >
    0;

  const firstResult =
    result.total ===
    0
      ? 0
      : (
          result.page -
          1
        ) *
          result.pageSize +
        1;

  const lastResult =
    result.total ===
    0
      ? 0
      : Math.min(
          result.page *
            result.pageSize,
          result.total
        );

  // =======================================================
  // UI
  // =======================================================

  return (
    <>
      <div className="space-y-6">
        {/* =================================================
            FILTERS
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Filter
                    size={18}
                    aria-hidden="true"
                    className="text-zinc-500"
                  />

                  <h2 className="text-base font-bold text-zinc-950">
                    Search & Filter
                  </h2>
                </div>

                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Search production orders and filter the
                  history by status or order date.
                </p>
              </div>

              <Link
                href="/orders/production/new"
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                <Plus
                  size={16}
                  aria-hidden="true"
                />

                Create Production Order
              </Link>
            </div>
          </div>

          <form
            onSubmit={
              handleFilterSubmit
            }
            className="grid gap-4 p-5 sm:p-6 lg:grid-cols-12"
          >
            {/* =============================================
                SEARCH
            ============================================= */}

            <div className="lg:col-span-4">
              <label
                htmlFor="production-order-search"
                className="mb-2 block text-sm font-semibold text-zinc-800"
              >
                Search
              </label>

              <div className="relative">
                <Search
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                />

                <input
                  id="production-order-search"
                  type="search"
                  value={
                    filterState.search
                  }
                  onChange={(
                    event
                  ) =>
                    updateFilter(
                      "search",
                      event.target
                        .value
                    )
                  }
                  disabled={
                    isPending
                  }
                  maxLength={
                    200
                  }
                  autoComplete="off"
                  placeholder="Order number or ordered by"
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
                />
              </div>
            </div>

            {/* =============================================
                STATUS
            ============================================= */}

            <div className="lg:col-span-2">
              <label
                htmlFor="production-order-status-filter"
                className="mb-2 block text-sm font-semibold text-zinc-800"
              >
                Status
              </label>

              <div className="relative">
                <select
                  id="production-order-status-filter"
                  value={
                    filterState.status
                  }
                  onChange={(
                    event
                  ) =>
                    updateFilter(
                      "status",
                      event.target
                        .value as FilterState["status"]
                    )
                  }
                  disabled={
                    isPending
                  }
                  className="h-11 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-4 pr-10 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
                >
                  {STATUS_OPTIONS.map(
                    (
                      option
                    ) => (
                      <option
                        key={
                          option.value ||
                          "all"
                        }
                        value={
                          option.value
                        }
                      >
                        {
                          option.label
                        }
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                />
              </div>
            </div>

            {/* =============================================
                DATE FROM
            ============================================= */}

            <div className="lg:col-span-2">
              <label
                htmlFor="production-order-date-from"
                className="mb-2 block text-sm font-semibold text-zinc-800"
              >
                Date From
              </label>

              <div className="relative">
                <CalendarDays
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                />

                <input
                  id="production-order-date-from"
                  type="date"
                  value={
                    filterState.dateFrom
                  }
                  onChange={(
                    event
                  ) =>
                    updateFilter(
                      "dateFrom",
                      event.target
                        .value
                    )
                  }
                  disabled={
                    isPending
                  }
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
                />
              </div>
            </div>

            {/* =============================================
                DATE TO
            ============================================= */}

            <div className="lg:col-span-2">
              <label
                htmlFor="production-order-date-to"
                className="mb-2 block text-sm font-semibold text-zinc-800"
              >
                Date To
              </label>

              <div className="relative">
                <CalendarDays
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                />

                <input
                  id="production-order-date-to"
                  type="date"
                  value={
                    filterState.dateTo
                  }
                  onChange={(
                    event
                  ) =>
                    updateFilter(
                      "dateTo",
                      event.target
                        .value
                    )
                  }
                  disabled={
                    isPending
                  }
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
                />
              </div>
            </div>

            {/* =============================================
                FILTER ACTIONS
            ============================================= */}

            <div className="flex items-end gap-2 lg:col-span-2">
              <button
                type="submit"
                disabled={
                  isPending
                }
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Search
                    size={16}
                    aria-hidden="true"
                  />
                )}

                Apply
              </button>

              <button
                type="button"
                onClick={
                  clearFilters
                }
                disabled={
                  isPending ||
                  (!hasFilters &&
                    !filterState.search &&
                    !filterState.status &&
                    !filterState.dateFrom &&
                    !filterState.dateTo)
                }
                aria-label="Clear filters"
                title="Clear filters"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X
                  size={16}
                  aria-hidden="true"
                />
              </button>
            </div>
          </form>
        </section>

        {/* =================================================
            RESULT SUMMARY
        ================================================= */}

        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-zinc-950">
              Batch Production Orders
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Current Location:{" "}
              <span className="font-semibold text-zinc-700">
                {
                  locationName
                }
              </span>
            </p>
          </div>

          <div className="text-sm text-zinc-500">
            Showing{" "}
            <span className="font-bold text-zinc-950">
              {
                firstResult
              }
            </span>
            {" – "}
            <span className="font-bold text-zinc-950">
              {
                lastResult
              }
            </span>
            {" of "}
            <span className="font-bold text-zinc-950">
              {
                result.total
              }
            </span>
          </div>
        </section>

        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {!hasOrders ? (
          <section className="rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-zinc-100 text-zinc-400">
              <ClipboardList
                size={24}
                aria-hidden="true"
              />
            </div>

            <h2 className="mt-4 text-lg font-bold text-zinc-950">
              {hasFilters
                ? "No production orders found."
                : "No production orders yet."}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              {hasFilters
                ? "No Batch Production Orders match the current search or filter criteria."
                : "Create your first Batch Production Order to calculate recipe requirements and ingredient ordering quantities."}
            </p>

            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              {hasFilters ? (
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  disabled={
                    isPending
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                >
                  <X
                    size={16}
                    aria-hidden="true"
                  />

                  Clear Filters
                </button>
              ) : null}

              <Link
                href="/orders/production/new"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                <Plus
                  size={16}
                  aria-hidden="true"
                />

                Create Production Order
              </Link>
            </div>
          </section>
        ) : (
          <>
            {/* ===============================================
                DESKTOP TABLE
            =============================================== */}

            <section className="hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:block">
              <div className="overflow-x-auto">
                <table className="min-w-[1180px] w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-bold uppercase tracking-wide text-zinc-500">
                      <th className="px-5 py-3">
                        Order Number
                      </th>

                      <th className="px-4 py-3">
                        Date
                      </th>

                      <th className="px-4 py-3">
                        Location
                      </th>

                      <th className="px-4 py-3">
                        Ordered By
                      </th>

                      <th className="px-4 py-3 text-center">
                        Recipes
                      </th>

                      <th className="px-4 py-3 text-center">
                        Items
                      </th>

                      <th className="px-4 py-3">
                        Status
                      </th>

                      <th className="px-4 py-3">
                        Created
                      </th>

                      <th className="px-5 py-3 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {result.orders.map(
                      (
                        order
                      ) => (
                        <tr
                          key={
                            order.id
                          }
                          className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/70"
                        >
                          <td className="whitespace-nowrap px-5 py-4">
                            <Link
                              href={`/orders/production/${order.id}`}
                              className="text-sm font-bold text-zinc-950 underline-offset-4 hover:underline"
                            >
                              {
                                order.order_number
                              }
                            </Link>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-sm text-zinc-600">
                            {
                              formatDate(
                                order.order_date
                              )
                            }
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-zinc-700">
                            {
                              locationName
                            }
                          </td>

                          <td className="max-w-[200px] px-4 py-4">
                            <p
                              className="truncate text-sm font-medium text-zinc-700"
                              title={
                                order.ordered_by
                              }
                            >
                              {
                                order.ordered_by
                              }
                            </p>
                          </td>

                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex min-w-8 justify-center rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-bold tabular-nums text-zinc-700">
                              {
                                order.recipe_count
                              }
                            </span>
                          </td>

                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex min-w-8 justify-center rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-bold tabular-nums text-zinc-700">
                              {
                                order.item_count
                              }
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusClassName(
                                order.status
                              )}`}
                            >
                              {
                                getStatusLabel(
                                  order.status
                                )
                              }
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-xs text-zinc-500">
                            {
                              formatDateTime(
                                order.created_at
                              )
                            }
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/orders/production/${order.id}`}
                                title="View"
                                aria-label={`View ${order.order_number}`}
                                className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
                              >
                                <Eye
                                  size={15}
                                  aria-hidden="true"
                                />
                              </Link>

                              <Link
                                href={`/orders/production/${order.id}/edit`}
                                title="Edit"
                                aria-label={`Edit ${order.order_number}`}
                                className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
                              >
                                <Pencil
                                  size={15}
                                  aria-hidden="true"
                                />
                              </Link>

                              <a
                                href={`/api/orders/production/${order.id}/pdf`}
                                title="Export PDF"
                                aria-label={`Export ${order.order_number} PDF`}
                                className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
                              >
                                <Download
                                  size={15}
                                  aria-hidden="true"
                                />
                              </a>

                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget(
                                    {
                                      id:
                                        order.id,

                                      orderNumber:
                                        order.order_number,
                                    }
                                  )
                                }
                                disabled={
                                  isDeleting
                                }
                                title="Delete"
                                aria-label={`Delete ${order.order_number}`}
                                className="grid h-9 w-9 place-items-center rounded-lg border border-red-200 bg-white text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Trash2
                                  size={15}
                                  aria-hidden="true"
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ===============================================
                MOBILE / TABLET CARDS
            =============================================== */}

            <section className="grid gap-4 lg:hidden">
              {result.orders.map(
                (
                  order
                ) => (
                  <article
                    key={
                      order.id
                    }
                    className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4 border-b border-zinc-200 bg-zinc-50 p-4">
                      <div className="min-w-0">
                        <Link
                          href={`/orders/production/${order.id}`}
                          className="block truncate text-sm font-bold text-zinc-950 underline-offset-4 hover:underline"
                        >
                          {
                            order.order_number
                          }
                        </Link>

                        <p className="mt-1 text-xs text-zinc-500">
                          {
                            formatDate(
                              order.order_date
                            )
                          }
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusClassName(
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

                    <div className="grid grid-cols-2 gap-x-4 gap-y-5 p-4">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">
                          Location
                        </p>

                        <p className="mt-1 text-sm font-semibold text-zinc-700">
                          {
                            locationName
                          }
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">
                          Ordered By
                        </p>

                        <p className="mt-1 truncate text-sm font-semibold text-zinc-700">
                          {
                            order.ordered_by
                          }
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">
                          Recipes
                        </p>

                        <p className="mt-1 text-sm font-bold tabular-nums text-zinc-950">
                          {
                            order.recipe_count
                          }
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">
                          Ingredients
                        </p>

                        <p className="mt-1 text-sm font-bold tabular-nums text-zinc-950">
                          {
                            order.item_count
                          }
                        </p>
                      </div>

                      <div className="col-span-2">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">
                          Created
                        </p>

                        <p className="mt-1 text-sm text-zinc-600">
                          {
                            formatDateTime(
                              order.created_at
                            )
                          }
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 border-t border-zinc-200">
                      <Link
                        href={`/orders/production/${order.id}`}
                        className="flex h-12 items-center justify-center gap-1.5 border-r border-zinc-200 text-xs font-bold text-zinc-600 transition hover:bg-zinc-50"
                      >
                        <Eye
                          size={14}
                          aria-hidden="true"
                        />

                        View
                      </Link>

                      <Link
                        href={`/orders/production/${order.id}/edit`}
                        className="flex h-12 items-center justify-center gap-1.5 border-r border-zinc-200 text-xs font-bold text-zinc-600 transition hover:bg-zinc-50"
                      >
                        <Pencil
                          size={14}
                          aria-hidden="true"
                        />

                        Edit
                      </Link>

                      <a
                        href={`/api/orders/production/${order.id}/pdf`}
                        className="flex h-12 items-center justify-center gap-1.5 border-r border-zinc-200 text-xs font-bold text-zinc-600 transition hover:bg-zinc-50"
                      >
                        <FileText
                          size={14}
                          aria-hidden="true"
                        />

                        PDF
                      </a>

                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget(
                            {
                              id:
                                order.id,

                              orderNumber:
                                order.order_number,
                            }
                          )
                        }
                        disabled={
                          isDeleting
                        }
                        className="flex h-12 items-center justify-center gap-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2
                          size={14}
                          aria-hidden="true"
                        />

                        Delete
                      </button>
                    </div>
                  </article>
                )
              )}
            </section>

            {/* ===============================================
                PAGINATION
            =============================================== */}

            {result.totalPages >
            1 ? (
              <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-zinc-500">
                  Page{" "}
                  <span className="font-bold text-zinc-950">
                    {
                      result.page
                    }
                  </span>
                  {" of "}
                  <span className="font-bold text-zinc-950">
                    {
                      result.totalPages
                    }
                  </span>
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      goToPage(
                        result.page -
                          1
                      )
                    }
                    disabled={
                      isPending ||
                      result.page <=
                        1
                    }
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft
                      size={16}
                      aria-hidden="true"
                    />

                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      goToPage(
                        result.page +
                          1
                      )
                    }
                    disabled={
                      isPending ||
                      result.page >=
                        result.totalPages
                    }
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next

                    <ChevronRight
                      size={16}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>

      {/* ===================================================
          DELETE CONFIRMATION MODAL
      =================================================== */}

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget &&
              !isDeleting
            ) {
              setDeleteTarget(
                null
              );
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-production-order-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
          >
            <div className="border-b border-zinc-200 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600">
                  <Trash2
                    size={19}
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <h2
                    id="delete-production-order-title"
                    className="text-base font-bold text-zinc-950"
                  >
                    Delete Production Order?
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-red-500">
                  Production Order
                </p>

                <p className="mt-1 text-sm font-bold text-red-900">
                  {
                    deleteTarget.orderNumber
                  }
                </p>
              </div>

              <p className="mt-4 text-sm leading-6 text-zinc-600">
                Deleting this order will permanently remove its
                recipe selections, historical recipe ingredient
                snapshots, and consolidated ingredient
                requirements.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 bg-zinc-50 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setDeleteTarget(
                    null
                  )
                }
                disabled={
                  isDeleting
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X
                  size={16}
                  aria-hidden="true"
                />

                Cancel
              </button>

              <button
                type="button"
                onClick={
                  confirmDelete
                }
                disabled={
                  isDeleting
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                      aria-hidden="true"
                    />

                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2
                      size={16}
                      aria-hidden="true"
                    />

                    Delete Order
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}