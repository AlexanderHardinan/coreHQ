import {
  ClipboardList,
  MapPin,
} from "lucide-react";

import {
  getProductionOrders,
  type ProductionOrderStatus,
} from "@/app/orders/production/actions";

import ProductionOrdersManager from "@/app/orders/production/production-orders-manager";

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

type ProductionOrdersPageProps = {
  searchParams:
    Promise<SearchParams>;
};

type ProductionOrderStatusFilter =
  | ProductionOrderStatus
  | "";

// =========================================================
// CONSTANTS
// =========================================================

const DEFAULT_PAGE =
  1;

const DEFAULT_PAGE_SIZE =
  10;

const ALLOWED_PAGE_SIZES =
  new Set([
    10,
    20,
    50,
    100,
  ]);

const ALLOWED_STATUSES =
  new Set<ProductionOrderStatus>([
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
      200
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
    Number(
      raw
    );

  if (
    !Number.isInteger(
      parsed
    ) ||
    parsed <
      1
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

  if (
    !raw
  ) {
    return "";
  }

  const match =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (
    !match
  ) {
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
    year <
      2000 ||
    year >
      9999
  ) {
    return "";
  }

  const date =
    new Date(
      Date.UTC(
        year,
        month -
          1,
        day
      )
    );

  if (
    date.getUTCFullYear() !==
      year ||
    date.getUTCMonth() !==
      month -
        1 ||
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
): ProductionOrderStatusFilter {
  const raw =
    getSingleValue(
      value
    )
      .trim()
      .toLowerCase();

  if (
    !raw
  ) {
    return "";
  }

  if (
    ALLOWED_STATUSES.has(
      raw as ProductionOrderStatus
    )
  ) {
    return raw as ProductionOrderStatus;
  }

  return "";
}

// =========================================================
// PAGE
// =========================================================

export default async function ProductionOrdersPage({
  searchParams,
}: ProductionOrdersPageProps) {
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
      params.search
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
      params.dateFrom
    );

  let dateTo =
    normalizeDate(
      params.dateTo
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

  // =======================================================
  // LOAD LOCATION-SCOPED PRODUCTION ORDERS
  // =======================================================

  let orderResult =
    await getProductionOrders({
      page:
        requestedPage,

      pageSize,

      search,

      status,

      dateFrom:
        dateFrom ||
        undefined,

      dateTo:
        dateTo ||
        undefined,
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
  // Reload the final valid page rather than rendering
  // an incorrect empty history page.
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
      await getProductionOrders({
        page:
          orderResult.totalPages,

        pageSize,

        search,

        status,

        dateFrom:
          dateFrom ||
          undefined,

        dateTo:
          dateTo ||
          undefined,
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
              Batch Production Orders
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Create, review, filter, and manage recipe-based
              production ordering requirements for the current
              operational location.
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
            PRODUCTION ORDER HISTORY MANAGER
        ================================================= */}

        <ProductionOrdersManager
          result={
            orderResult
          }

          locationName={
            activeLocation.name
          }

          filters={{
            search,

            status,

            dateFrom,

            dateTo,
          }}
        />
      </div>
    </AppShell>
  );
}