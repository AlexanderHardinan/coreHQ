import {
  ClipboardList,
  MapPin,
} from "lucide-react";

import {
  getNormalOrders,
  type NormalOrderListOptions,
  type NormalOrderStatus,
} from "@/app/orders/normal/actions";

import NormalOrdersManager from "@/app/orders/normal/normal-orders-manager";

import AppShell from "@/components/app-shell";

import {
  requireOperationalSession,
} from "@/lib/auth/require-operational-session";

// =========================================================
// TYPES
// =========================================================

type SearchParams = {
  [key: string]:
    | string
    | string[]
    | undefined;
};

type NormalOrdersPageProps = {
  searchParams:
    Promise<SearchParams>;
};

type NormalOrderSortBy =
  NonNullable<
    NormalOrderListOptions["sortBy"]
  >;

type NormalOrderSortDirection =
  NonNullable<
    NormalOrderListOptions["sortDirection"]
  >;

type NormalOrderStatusFilter =
  | NormalOrderStatus
  | "all";

// =========================================================
// CONSTANTS
// =========================================================

const DEFAULT_PAGE =
  1;

const DEFAULT_PAGE_SIZE =
  20;

const DEFAULT_SORT_BY:
  NormalOrderSortBy =
  "order_date";

const DEFAULT_SORT_DIRECTION:
  NormalOrderSortDirection =
  "desc";

const ALLOWED_PAGE_SIZES =
  new Set([
    10,
    20,
    50,
    100,
  ]);

const ALLOWED_SORT_FIELDS =
  new Set<NormalOrderSortBy>([
    "order_number",
    "order_date",
    "ordered_by",
    "created_at",
    "updated_at",
  ]);

const ALLOWED_STATUSES =
  new Set<NormalOrderStatus>([
    "draft",
    "submitted",
    "completed",
    "cancelled",
  ]);

// =========================================================
// SINGLE QUERY VALUE
// =========================================================

function getSingleValue(
  value:
    | string
    | string[]
    | undefined
): string {
  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  if (
    Array.isArray(
      value
    ) &&
    typeof value[0] ===
      "string"
  ) {
    return value[0];
  }

  return "";
}

// =========================================================
// SEARCH
// =========================================================

function normalizeSearch(
  value:
    | string
    | string[]
    | undefined
): string {
  return getSingleValue(
    value
  )
    .trim()
    .replace(
      /\s+/g,
      " "
    )
    .slice(
      0,
      100
    );
}

// =========================================================
// POSITIVE INTEGER
// =========================================================

function normalizePositiveInteger(
  value:
    | string
    | string[]
    | undefined,
  fallback: number
): number {
  const raw =
    getSingleValue(
      value
    );

  const parsed =
    Number(raw);

  if (
    !Number.isInteger(
      parsed
    ) ||
    parsed < 1
  ) {
    return fallback;
  }

  return parsed;
}

// =========================================================
// PAGE SIZE
// =========================================================

function normalizePageSize(
  value:
    | string
    | string[]
    | undefined
): number {
  const parsed =
    normalizePositiveInteger(
      value,
      DEFAULT_PAGE_SIZE
    );

  if (
    !ALLOWED_PAGE_SIZES.has(
      parsed
    )
  ) {
    return DEFAULT_PAGE_SIZE;
  }

  return parsed;
}

// =========================================================
// DATE
// =========================================================

function normalizeDate(
  value:
    | string
    | string[]
    | undefined
): string {
  const raw =
    getSingleValue(
      value
    ).trim();

  if (!raw) {
    return "";
  }

  const match =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    return "";
  }

  const year =
    Number(
      match[1]
    );

  const month =
    Number(
      match[2]
    );

  const day =
    Number(
      match[3]
    );

  if (
    !Number.isInteger(
      year
    ) ||
    year < 2000 ||
    year > 9999
  ) {
    return "";
  }

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  if (
    date.getUTCFullYear() !==
      year ||
    date.getUTCMonth() !==
      month - 1 ||
    date.getUTCDate() !==
      day
  ) {
    return "";
  }

  return raw;
}

// =========================================================
// STATUS
// =========================================================

function normalizeStatus(
  value:
    | string
    | string[]
    | undefined
): NormalOrderStatusFilter {
  const raw =
    getSingleValue(
      value
    )
      .trim()
      .toLowerCase();

  if (!raw) {
    return "all";
  }

  if (
    ALLOWED_STATUSES.has(
      raw as NormalOrderStatus
    )
  ) {
    return raw as NormalOrderStatus;
  }

  return "all";
}

// =========================================================
// SORT
// =========================================================

function normalizeSortBy(
  value:
    | string
    | string[]
    | undefined
): NormalOrderSortBy {
  const raw =
    getSingleValue(
      value
    ) as NormalOrderSortBy;

  if (
    ALLOWED_SORT_FIELDS.has(
      raw
    )
  ) {
    return raw;
  }

  return DEFAULT_SORT_BY;
}

// =========================================================
// SORT DIRECTION
// =========================================================

function normalizeSortDirection(
  value:
    | string
    | string[]
    | undefined
): NormalOrderSortDirection {
  const raw =
    getSingleValue(
      value
    )
      .trim()
      .toLowerCase();

  if (
    raw === "asc"
  ) {
    return "asc";
  }

  return DEFAULT_SORT_DIRECTION;
}

// =========================================================
// PAGE
// =========================================================

export default async function NormalOrdersPage({
  searchParams,
}: NormalOrdersPageProps) {
  // =======================================================
  // VERIFY OPERATIONAL SESSION
  // =======================================================

  const activeLocation =
    await requireOperationalSession();

  // =======================================================
  // READ URL PARAMETERS
  // =======================================================

  const params =
    await searchParams;

  const search =
    normalizeSearch(
      params.q
    );

  const requestedPage =
    normalizePositiveInteger(
      params.page,
      DEFAULT_PAGE
    );

  const pageSize =
    normalizePageSize(
      params.pageSize
    );

  let dateFrom =
    normalizeDate(
      params.from
    );

  let dateTo =
    normalizeDate(
      params.to
    );

  // =======================================================
  // NORMALIZE REVERSED DATE RANGE
  // =======================================================

  if (
    dateFrom &&
    dateTo &&
    dateFrom >
      dateTo
  ) {
    [
      dateFrom,
      dateTo,
    ] = [
      dateTo,
      dateFrom,
    ];
  }

  const status =
    normalizeStatus(
      params.status
    );

  const sortBy =
    normalizeSortBy(
      params.sort
    );

  const sortDirection =
    normalizeSortDirection(
      params.direction
    );

  // =======================================================
  // LOAD LOCATION-SCOPED NORMAL ORDERS
  // =======================================================

  let orderResult =
    await getNormalOrders({
      page:
        requestedPage,

      pageSize,

      search,

      dateFrom:
        dateFrom ||
        undefined,

      dateTo:
        dateTo ||
        undefined,

      status,

      sortBy,

      sortDirection,
    });

  // =======================================================
  // OUT-OF-RANGE PAGE RECOVERY
  // =======================================================
  //
  // Example:
  //
  // Current page: 4
  // User deletes the final order on page 4.
  // Available pages now: 3.
  //
  // Reload the final valid page instead of showing an
  // incorrect empty page.
  // =======================================================

  if (
    orderResult.total >
      0 &&
    orderResult.totalPages >
      0 &&
    requestedPage >
      orderResult.totalPages
  ) {
    orderResult =
      await getNormalOrders({
        page:
          orderResult.totalPages,

        pageSize,

        search,

        dateFrom:
          dateFrom ||
          undefined,

        dateTo:
          dateTo ||
          undefined,

        status,

        sortBy,

        sortDirection,
      });
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
              Normal Orders
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Create, review, filter, and manage Product
              ordering records for the current operational
              location.
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

            {activeLocation.name}

            <span className="text-zinc-400">
              {activeLocation.code}
            </span>
          </div>
        </section>

        {/* =================================================
            NORMAL ORDER HISTORY MANAGER
        ================================================= */}

        <NormalOrdersManager
          initialOrders={
            orderResult.orders
          }

          total={
            orderResult.total
          }

          page={
            orderResult.page
          }

          pageSize={
            orderResult.pageSize
          }

          totalPages={
            orderResult.totalPages
          }

          initialSearch={
            search
          }

          initialDateFrom={
            dateFrom
          }

          initialDateTo={
            dateTo
          }

          initialStatus={
            status
          }

          initialSortBy={
            sortBy
          }

          initialSortDirection={
            sortDirection
          }
        />
      </div>
    </AppShell>
  );
}