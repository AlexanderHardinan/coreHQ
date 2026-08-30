"use client";

import {
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";

import Link from "next/link";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  ArrowDownAZ,
  ArrowUpAZ,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  deleteNormalOrderAction,
  type NormalOrderListOptions,
  type NormalOrderListRecord,
  type NormalOrderStatus,
} from "@/app/orders/normal/actions";

import {
  useToast,
} from "@/components/toast-provider";

// =========================================================
// TYPES
// =========================================================

type NormalOrderSortBy =
  NonNullable<
    NormalOrderListOptions["sortBy"]
  >;

type NormalOrderSortDirection =
  NonNullable<
    NormalOrderListOptions["sortDirection"]
  >;

type StatusFilter =
  | NormalOrderStatus
  | "all";

type NormalOrdersManagerProps = {
  initialOrders:
    NormalOrderListRecord[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;

  initialSearch: string;

  initialDateFrom: string;

  initialDateTo: string;

  initialStatus:
    StatusFilter;

  initialSortBy:
    NormalOrderSortBy;

  initialSortDirection:
    NormalOrderSortDirection;
};

type QueryChanges = Record<
  string,
  string | null
>;

// =========================================================
// CONSTANTS
// =========================================================

const SORT_OPTIONS: {
  value: NormalOrderSortBy;
  label: string;
}[] = [
  {
    value: "order_date",
    label: "Order Date",
  },
  {
    value: "order_number",
    label: "Order Number",
  },
  {
    value: "ordered_by",
    label: "Ordered By",
  },
  {
    value: "created_at",
    label: "Created Date",
  },
  {
    value: "updated_at",
    label: "Updated Date",
  },
];

const STATUS_OPTIONS: {
  value: StatusFilter;
  label: string;
}[] = [
  {
    value: "all",
    label: "All Status",
  },
  {
    value: "draft",
    label: "Draft",
  },
  {
    value: "submitted",
    label: "Submitted",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
];

const PAGE_SIZE_OPTIONS = [
  10,
  20,
  50,
  100,
];

// =========================================================
// FORMAT DATE
// =========================================================

function formatDate(
  value: string
): string {
  if (
    !value
  ) {
    return "—";
  }

  const parts =
    value.split("-");

  if (
    parts.length !== 3
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
      month - 1,
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
      year: "numeric",
      month: "short",
      day: "2-digit",
    }
  ).format(date);
}

// =========================================================
// FORMAT DATE TIME
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
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

// =========================================================
// STATUS STYLE
// =========================================================

function getStatusClasses(
  status:
    NormalOrderStatus
): string {
  switch (status) {
    case "submitted":
      return "bg-blue-50 text-blue-700";

    case "completed":
      return "bg-emerald-50 text-emerald-700";

    case "cancelled":
      return "bg-red-50 text-red-700";

    case "draft":
    default:
      return "bg-amber-50 text-amber-700";
  }
}

// =========================================================
// STATUS LABEL
// =========================================================

function getStatusLabel(
  status:
    NormalOrderStatus
): string {
  switch (status) {
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
// COMPONENT
// =========================================================

export default function NormalOrdersManager({
  initialOrders,

  total,

  page,

  pageSize,

  totalPages,

  initialSearch,

  initialDateFrom,

  initialDateTo,

  initialStatus,

  initialSortBy,

  initialSortDirection,
}: NormalOrdersManagerProps) {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const searchParams =
    useSearchParams();

  const toast =
    useToast();

  const [
    orders,
    setOrders,
  ] =
    useState<
      NormalOrderListRecord[]
    >(
      initialOrders
    );

  const [
    searchValue,
    setSearchValue,
  ] =
    useState(
      initialSearch
    );

  const [
    dateFromValue,
    setDateFromValue,
  ] =
    useState(
      initialDateFrom
    );

  const [
    dateToValue,
    setDateToValue,
  ] =
    useState(
      initialDateTo
    );

  const [
    deletingOrderId,
    setDeletingOrderId,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    isDeleting,
    startDeleteTransition,
  ] =
    useTransition();

  // =======================================================
  // SYNC SERVER RESULTS
  // =======================================================

  useEffect(() => {
    setOrders(
      initialOrders
    );
  }, [
    initialOrders,
  ]);

  // =======================================================
  // SYNC SEARCH
  // =======================================================

  useEffect(() => {
    setSearchValue(
      initialSearch
    );
  }, [
    initialSearch,
  ]);

  // =======================================================
  // SYNC DATES
  // =======================================================

  useEffect(() => {
    setDateFromValue(
      initialDateFrom
    );
  }, [
    initialDateFrom,
  ]);

  useEffect(() => {
    setDateToValue(
      initialDateTo
    );
  }, [
    initialDateTo,
  ]);

  // =======================================================
  // UPDATE URL QUERY
  // =======================================================

  const updateQuery =
    useCallback(
      (
        changes:
          QueryChanges
      ) => {
        const params =
          new URLSearchParams(
            searchParams.toString()
          );

        for (
          const [
            key,
            value,
          ] of Object.entries(
            changes
          )
        ) {
          if (
            value === null ||
            value === ""
          ) {
            params.delete(
              key
            );
          } else {
            params.set(
              key,
              value
            );
          }
        }

        const queryString =
          params.toString();

        router.replace(
          queryString
            ? `${pathname}?${queryString}`
            : pathname,
          {
            scroll: false,
          }
        );
      },
      [
        pathname,
        router,
        searchParams,
      ]
    );

  // =======================================================
  // DEBOUNCED SEARCH
  // =======================================================

  useEffect(() => {
    const normalized =
      searchValue
        .trim()
        .replace(
          /\s+/g,
          " "
        );

    if (
      normalized ===
      initialSearch
    ) {
      return;
    }

    const timeout =
      window.setTimeout(
        () => {
          updateQuery({
            q:
              normalized ||
              null,

            page:
              "1",
          });
        },
        450
      );

    return () => {
      window.clearTimeout(
        timeout
      );
    };
  }, [
    initialSearch,
    searchValue,
    updateQuery,
  ]);

  // =======================================================
  // DATE FROM
  // =======================================================

  function handleDateFromChange(
    value: string
  ) {
    setDateFromValue(
      value
    );

    updateQuery({
      from:
        value ||
        null,

      page:
        "1",
    });
  }

  // =======================================================
  // DATE TO
  // =======================================================

  function handleDateToChange(
    value: string
  ) {
    setDateToValue(
      value
    );

    updateQuery({
      to:
        value ||
        null,

      page:
        "1",
    });
  }

  // =======================================================
  // STATUS
  // =======================================================

  function handleStatusChange(
    value:
      StatusFilter
  ) {
    updateQuery({
      status:
        value ===
        "all"
          ? null
          : value,

      page:
        "1",
    });
  }

  // =======================================================
  // SORT FIELD
  // =======================================================

  function handleSortChange(
    value:
      NormalOrderSortBy
  ) {
    updateQuery({
      sort:
        value,

      page:
        "1",
    });
  }

  // =======================================================
  // SORT DIRECTION
  // =======================================================

  function toggleSortDirection() {
    updateQuery({
      direction:
        initialSortDirection ===
        "asc"
          ? "desc"
          : "asc",

      page:
        "1",
    });
  }

  // =======================================================
  // PAGE SIZE
  // =======================================================

  function handlePageSizeChange(
    value: number
  ) {
    updateQuery({
      pageSize:
        String(
          value
        ),

      page:
        "1",
    });
  }

  // =======================================================
  // PAGINATION
  // =======================================================

  function goToPage(
    nextPage: number
  ) {
    if (
      nextPage < 1
    ) {
      return;
    }

    if (
      totalPages > 0 &&
      nextPage >
        totalPages
    ) {
      return;
    }

    updateQuery({
      page:
        String(
          nextPage
        ),
    });
  }

  // =======================================================
  // RESET
  // =======================================================

  function resetFilters() {
    setSearchValue(
      ""
    );

    setDateFromValue(
      ""
    );

    setDateToValue(
      ""
    );

    router.replace(
      pathname,
      {
        scroll: false,
      }
    );
  }

  // =======================================================
  // REQUEST DELETE
  // =======================================================

  function requestDelete(
    orderId: string
  ) {
    if (
      isDeleting
    ) {
      return;
    }

    setDeletingOrderId(
      orderId
    );
  }

  // =======================================================
  // CANCEL DELETE
  // =======================================================

  function cancelDelete() {
    if (
      isDeleting
    ) {
      return;
    }

    setDeletingOrderId(
      null
    );
  }

  // =======================================================
  // CONFIRM DELETE
  // =======================================================

  function confirmDelete(
    order:
      NormalOrderListRecord
  ) {
    if (
      isDeleting
    ) {
      return;
    }

    startDeleteTransition(
      async () => {
        const loadingToast =
          toast.deleting(
            "Deleting Normal Order",
            order.order_number
          );

        const result =
          await deleteNormalOrderAction(
            order.id
          );

        toast.dismissToast(
          loadingToast
        );

        if (
          !result.success
        ) {
          setDeletingOrderId(
            null
          );

          toast.error(
            "Unable to Delete Order",
            result.message
          );

          return;
        }

        setOrders(
          (
            current
          ) =>
            current.filter(
              (
                currentOrder
              ) =>
                currentOrder.id !==
                order.id
            )
        );

        setDeletingOrderId(
          null
        );

        toast.success(
          "Normal Order Deleted",
          result.message
        );

        if (
          orders.length ===
            1 &&
          page > 1
        ) {
          updateQuery({
            page:
              String(
                page - 1
              ),
          });

          return;
        }

        router.refresh();
      }
    );
  }

  // =======================================================
  // PAGINATION INFORMATION
  // =======================================================

  const rangeStart =
    total === 0
      ? 0
      : (
          page - 1
        ) *
          pageSize +
        1;

  const rangeEnd =
    total === 0
      ? 0
      : Math.min(
          page *
            pageSize,
          total
        );

  // =======================================================
  // ACTIVE FILTER STATE
  // =======================================================

  const hasActiveFilters =
    Boolean(
      initialSearch ||
        initialDateFrom ||
        initialDateTo ||
        initialStatus !==
          "all" ||
        initialSortBy !==
          "order_date" ||
        initialSortDirection !==
          "desc" ||
        pageSize !==
          20
    );

  // =======================================================
  // UI
  // =======================================================

  return (
    <div className="space-y-5">
      {/* ===================================================
          FILTER PANEL
      =================================================== */}

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="space-y-5 p-5 sm:p-6">
          {/* =================================================
              SEARCH + CREATE
          ================================================= */}

          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            {/* ===============================================
                SEARCH
            =============================================== */}

            <div className="w-full xl:max-w-lg">
              <label
                htmlFor="normal-order-search"
                className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-zinc-500"
              >
                Search Normal Orders
              </label>

              <div className="relative">
                <Search
                  size={17}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                />

                <input
                  id="normal-order-search"
                  type="search"
                  value={
                    searchValue
                  }
                  onChange={(
                    event
                  ) =>
                    setSearchValue(
                      event.target
                        .value
                    )
                  }
                  autoComplete="off"
                  placeholder="Order number, ordered by, SKU, Product or Category..."
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-10 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-4 focus:ring-zinc-100"
                />

                {searchValue ? (
                  <button
                    type="button"
                    onClick={() =>
                      setSearchValue(
                        ""
                      )
                    }
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                    aria-label="Clear Normal Order search"
                  >
                    <X
                      size={15}
                    />
                  </button>
                ) : null}
              </div>
            </div>

            {/* ===============================================
                CREATE ORDER
            =============================================== */}

            <Link
              href="/orders/normal/new"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              <Plus
                size={17}
                aria-hidden="true"
              />

              Create Normal Order
            </Link>
          </div>

          {/* =================================================
              FILTERS
          ================================================= */}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {/* ===============================================
                FROM DATE
            =============================================== */}

            <div>
              <label
                htmlFor="normal-order-date-from"
                className="mb-2 block text-xs font-semibold text-zinc-500"
              >
                From Date
              </label>

              <div className="relative">
                <CalendarDays
                  size={15}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />

                <input
                  id="normal-order-date-from"
                  type="date"
                  min="2000-01-01"
                  max="9999-12-31"
                  value={
                    dateFromValue
                  }
                  onChange={(
                    event
                  ) =>
                    handleDateFromChange(
                      event.target
                        .value
                    )
                  }
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-xs font-semibold text-zinc-700 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                />
              </div>
            </div>

            {/* ===============================================
                TO DATE
            =============================================== */}

            <div>
              <label
                htmlFor="normal-order-date-to"
                className="mb-2 block text-xs font-semibold text-zinc-500"
              >
                To Date
              </label>

              <div className="relative">
                <CalendarDays
                  size={15}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />

                <input
                  id="normal-order-date-to"
                  type="date"
                  min="2000-01-01"
                  max="9999-12-31"
                  value={
                    dateToValue
                  }
                  onChange={(
                    event
                  ) =>
                    handleDateToChange(
                      event.target
                        .value
                    )
                  }
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-xs font-semibold text-zinc-700 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                />
              </div>
            </div>

            {/* ===============================================
                STATUS
            =============================================== */}

            <div>
              <label
                htmlFor="normal-order-status-filter"
                className="mb-2 block text-xs font-semibold text-zinc-500"
              >
                Status
              </label>

              <div className="relative">
                <select
                  id="normal-order-status-filter"
                  value={
                    initialStatus
                  }
                  onChange={(
                    event
                  ) =>
                    handleStatusChange(
                      event.target
                        .value as StatusFilter
                    )
                  }
                  className="h-10 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 pr-9 text-xs font-semibold text-zinc-700 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                >
                  {STATUS_OPTIONS.map(
                    (
                      option
                    ) => (
                      <option
                        key={
                          option.value
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
                  size={14}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
              </div>
            </div>

            {/* ===============================================
                SORT BY
            =============================================== */}

            <div>
              <label
                htmlFor="normal-order-sort"
                className="mb-2 block text-xs font-semibold text-zinc-500"
              >
                Sort By
              </label>

              <div className="relative">
                <select
                  id="normal-order-sort"
                  value={
                    initialSortBy
                  }
                  onChange={(
                    event
                  ) =>
                    handleSortChange(
                      event.target
                        .value as NormalOrderSortBy
                    )
                  }
                  className="h-10 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 pr-9 text-xs font-semibold text-zinc-700 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                >
                  {SORT_OPTIONS.map(
                    (
                      option
                    ) => (
                      <option
                        key={
                          option.value
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
                  size={14}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
              </div>
            </div>

            {/* ===============================================
                DIRECTION
            =============================================== */}

            <div>
              <span className="mb-2 block text-xs font-semibold text-zinc-500">
                Direction
              </span>

              <button
                type="button"
                onClick={
                  toggleSortDirection
                }
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                {initialSortDirection ===
                "asc" ? (
                  <ArrowUpAZ
                    size={15}
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowDownAZ
                    size={15}
                    aria-hidden="true"
                  />
                )}

                {initialSortDirection ===
                "asc"
                  ? "Ascending"
                  : "Descending"}
              </button>
            </div>

            {/* ===============================================
                RESET
            =============================================== */}

            <div>
              <span className="mb-2 block text-xs font-semibold text-zinc-500">
                Filters
              </span>

              <button
                type="button"
                onClick={
                  resetFilters
                }
                disabled={
                  !hasActiveFilters
                }
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X
                  size={14}
                  aria-hidden="true"
                />

                Reset
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          ORDER HISTORY
      =================================================== */}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col gap-4 border-b border-zinc-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-base font-bold text-zinc-950">
              Normal Order History
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {total === 1
                ? "1 Normal Order"
                : `${total} Normal Orders`}
            </p>
          </div>

          {/* ===============================================
              PAGE SIZE
          =============================================== */}

          <div className="flex items-center gap-2">
            <label
              htmlFor="normal-order-page-size"
              className="text-xs font-semibold text-zinc-500"
            >
              Rows
            </label>

            <div className="relative">
              <select
                id="normal-order-page-size"
                value={
                  pageSize
                }
                onChange={(
                  event
                ) =>
                  handlePageSizeChange(
                    Number(
                      event.target
                        .value
                    )
                  )
                }
                className="h-9 appearance-none rounded-xl border border-zinc-200 bg-white pl-3 pr-8 text-xs font-semibold text-zinc-700 outline-none focus:border-zinc-400"
              >
                {PAGE_SIZE_OPTIONS.map(
                  (
                    option
                  ) => (
                    <option
                      key={
                        option
                      }
                      value={
                        option
                      }
                    >
                      {
                        option
                      }
                    </option>
                  )
                )}
              </select>

              <ChevronDown
                size={14}
                aria-hidden="true"
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
            </div>
          </div>
        </div>

        {/* =================================================
            ORDER RESULTS
        ================================================= */}

        {orders.length >
        0 ? (
          <>
            {/* =============================================
                DESKTOP TABLE
            ============================================= */}

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1200px] border-collapse">
                <thead className="bg-zinc-50">
                  <tr className="border-b border-zinc-200">
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Order Number
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Date
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Ordered By
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Items
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Created
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map(
                    (
                      order
                    ) => {
                      const confirmingDelete =
                        deletingOrderId ===
                        order.id;

                      return (
                        <tr
                          key={
                            order.id
                          }
                          className="border-b border-zinc-100 last:border-b-0"
                        >
                          {/* =================================
                              ORDER NUMBER
                          ================================= */}

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-600">
                                <ClipboardList
                                  size={16}
                                  aria-hidden="true"
                                />
                              </div>

                              <Link
                                href={`/orders/normal/${order.id}`}
                                className="font-mono text-sm font-bold text-zinc-950 transition hover:text-amber-700"
                              >
                                {
                                  order.order_number
                                }
                              </Link>
                            </div>
                          </td>

                          {/* =================================
                              ORDER DATE
                          ================================= */}

                          <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-zinc-700">
                            {formatDate(
                              order.order_date
                            )}
                          </td>

                          {/* =================================
                              ORDERED BY
                          ================================= */}

                          <td className="px-5 py-4">
                            <p className="max-w-[220px] truncate text-sm font-semibold text-zinc-800">
                              {
                                order.ordered_by
                              }
                            </p>
                          </td>

                          {/* =================================
                              ITEM COUNT
                          ================================= */}

                          <td className="whitespace-nowrap px-5 py-4 text-right">
                            <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-700">
                              {
                                order.item_count
                              }
                            </span>
                          </td>

                          {/* =================================
                              STATUS
                          ================================= */}

                          <td className="whitespace-nowrap px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${getStatusClasses(
                                order.status
                              )}`}
                            >
                              {getStatusLabel(
                                order.status
                              )}
                            </span>
                          </td>

                          {/* =================================
                              CREATED
                          ================================= */}

                          <td className="whitespace-nowrap px-5 py-4 text-xs text-zinc-500">
                            {formatDateTime(
                              order.created_at
                            )}
                          </td>

                          {/* =================================
                              ACTIONS
                          ================================= */}

                          <td className="px-5 py-4">
                            {confirmingDelete ? (
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    confirmDelete(
                                      order
                                    )
                                  }
                                  disabled={
                                    isDeleting
                                  }
                                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-3 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isDeleting ? (
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Trash2
                                      size={14}
                                    />
                                  )}

                                  Confirm
                                </button>

                                <button
                                  type="button"
                                  onClick={
                                    cancelDelete
                                  }
                                  disabled={
                                    isDeleting
                                  }
                                  className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-1">
                                <Link
                                  href={`/orders/normal/${order.id}`}
                                  className="grid h-9 w-9 place-items-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
                                  aria-label={`View ${order.order_number}`}
                                  title="View"
                                >
                                  <Eye
                                    size={16}
                                  />
                                </Link>

                                <Link
                                  href={`/orders/normal/${order.id}/edit`}
                                  className="grid h-9 w-9 place-items-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
                                  aria-label={`Edit ${order.order_number}`}
                                  title="Edit"
                                >
                                  <Pencil
                                    size={15}
                                  />
                                </Link>

                                <a
                                  href={`/api/orders/normal/${order.id}/pdf`}
                                  className="grid h-9 w-9 place-items-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
                                  aria-label={`Export ${order.order_number} as PDF`}
                                  title="Export PDF"
                                >
                                  <Download
                                    size={16}
                                  />
                                </a>

                                <button
                                  type="button"
                                  onClick={() =>
                                    requestDelete(
                                      order.id
                                    )
                                  }
                                  disabled={
                                    isDeleting
                                  }
                                  className="grid h-9 w-9 place-items-center rounded-xl text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                                  aria-label={`Delete ${order.order_number}`}
                                  title="Delete"
                                >
                                  <Trash2
                                    size={15}
                                  />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>

            {/* =============================================
                MOBILE / TABLET
            ============================================= */}

            <div className="divide-y divide-zinc-100 lg:hidden">
              {orders.map(
                (
                  order
                ) => {
                  const confirmingDelete =
                    deletingOrderId ===
                    order.id;

                  return (
                    <article
                      key={
                        order.id
                      }
                      className="p-5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-600">
                          <ClipboardList
                            size={17}
                            aria-hidden="true"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          {/* =================================
                              TITLE + STATUS
                          ================================= */}

                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <Link
                                href={`/orders/normal/${order.id}`}
                                className="truncate font-mono text-sm font-bold text-zinc-950"
                              >
                                {
                                  order.order_number
                                }
                              </Link>

                              <p className="mt-1 truncate text-xs text-zinc-500">
                                Ordered by{" "}
                                <span className="font-semibold">
                                  {
                                    order.ordered_by
                                  }
                                </span>
                              </p>
                            </div>

                            <span
                              className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-bold ${getStatusClasses(
                                order.status
                              )}`}
                            >
                              {getStatusLabel(
                                order.status
                              )}
                            </span>
                          </div>

                          {/* =================================
                              DETAILS
                          ================================= */}

                          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                Order Date
                              </p>

                              <p className="mt-1 text-sm font-semibold text-zinc-800">
                                {formatDate(
                                  order.order_date
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                Products
                              </p>

                              <p className="mt-1 text-sm font-semibold text-zinc-800">
                                {
                                  order.item_count
                                }
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                Created
                              </p>

                              <p className="mt-1 text-xs font-semibold text-zinc-700">
                                {formatDateTime(
                                  order.created_at
                                )}
                              </p>
                            </div>
                          </div>

                          {/* =================================
                              DELETE CONFIRMATION
                          ================================= */}

                          {confirmingDelete ? (
                            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4">
                              <p className="text-sm font-bold text-zinc-950">
                                Delete{" "}
                                {
                                  order.order_number
                                }
                                ?
                              </p>

                              <p className="mt-1 text-xs leading-5 text-zinc-500">
                                This action cannot be undone.
                                All Product rows belonging to
                                this Normal Order will also be
                                deleted.
                              </p>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    confirmDelete(
                                      order
                                    )
                                  }
                                  disabled={
                                    isDeleting
                                  }
                                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-semibold text-white disabled:opacity-50"
                                >
                                  {isDeleting ? (
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Trash2
                                      size={14}
                                    />
                                  )}

                                  Delete
                                </button>

                                <button
                                  type="button"
                                  onClick={
                                    cancelDelete
                                  }
                                  disabled={
                                    isDeleting
                                  }
                                  className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* =================================
                                ACTIONS
                            ================================= */

                            <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
                              <Link
                                href={`/orders/normal/${order.id}`}
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700"
                              >
                                <Eye
                                  size={14}
                                />

                                View
                              </Link>

                              <Link
                                href={`/orders/normal/${order.id}/edit`}
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700"
                              >
                                <Pencil
                                  size={14}
                                />

                                Edit
                              </Link>

                              <a
                                href={`/api/orders/normal/${order.id}/pdf`}
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700"
                              >
                                <Download
                                  size={14}
                                />

                                PDF
                              </a>

                              <button
                                type="button"
                                onClick={() =>
                                  requestDelete(
                                    order.id
                                  )
                                }
                                disabled={
                                  isDeleting
                                }
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-red-100 bg-white px-3 text-xs font-semibold text-red-600 disabled:opacity-50"
                              >
                                <Trash2
                                  size={14}
                                />

                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </>
        ) : (
          /* =================================================
              EMPTY STATE
          ================================================= */

          <div className="px-6 py-16 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-zinc-100 text-zinc-500">
              <ClipboardList
                size={23}
                aria-hidden="true"
              />
            </div>

            <h3 className="mt-4 text-sm font-bold text-zinc-950">
              {hasActiveFilters
                ? "No Normal Orders found"
                : "No Normal Orders available"}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              {hasActiveFilters
                ? "No saved orders match the current search or filter settings."
                : "Create the first Normal Order for this operational location."}
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={
                    resetFilters
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  <X
                    size={15}
                  />

                  Clear Filters
                </button>
              ) : null}

              <Link
                href="/orders/normal/new"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                <Plus
                  size={16}
                />

                Create Normal Order
              </Link>
            </div>
          </div>
        )}

        {/* =================================================
            PAGINATION
        ================================================= */}

        <div className="flex flex-col gap-4 border-t border-zinc-200 bg-zinc-50/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-zinc-500">
            Showing{" "}
            <span className="font-semibold text-zinc-700">
              {rangeStart}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-zinc-700">
              {rangeEnd}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-zinc-700">
              {total}
            </span>{" "}
            orders
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                goToPage(
                  page - 1
                )
              }
              disabled={
                page <= 1 ||
                total === 0
              }
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft
                size={15}
                aria-hidden="true"
              />

              Previous
            </button>

            <span className="min-w-20 text-center text-xs font-semibold text-zinc-600">
              Page{" "}
              {total === 0
                ? 0
                : page}{" "}
              of{" "}
              {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                goToPage(
                  page + 1
                )
              }
              disabled={
                total === 0 ||
                totalPages ===
                  0 ||
                page >=
                  totalPages
              }
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next

              <ChevronRight
                size={15}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}