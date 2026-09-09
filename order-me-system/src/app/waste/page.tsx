import {
  MapPin,
  Trash2,
} from "lucide-react";

import {
  getWasteEntries,
  getWastePerformance,
  type WasteReason,
} from "@/app/waste/actions";

import WasteDataManager from "@/app/waste/waste-data-manager";

import AppShell from "@/components/app-shell";

import {
  requireOperationalSession,
} from "@/lib/auth/require-operational-session";

// =========================================================
// TYPES
// =========================================================

type WastePageSearchParams = {
  search?:
    | string
    | string[];

  reason?:
    | string
    | string[];

  dateFrom?:
    | string
    | string[];

  dateTo?:
    | string
    | string[];

  page?:
    | string
    | string[];

  pageSize?:
    | string
    | string[];

  sortBy?:
    | string
    | string[];

  sortDirection?:
    | string
    | string[];
};

type WastePageProps = {
  searchParams:
    Promise<
      WastePageSearchParams
    >;
};

// =========================================================
// QUERY VALUE
// =========================================================

function getQueryValue(
  value:
    | string
    | string[]
    | undefined
): string {
  if (
    Array.isArray(
      value
    )
  ) {
    return (
      value[0] ??
      ""
    );
  }

  return (
    value ??
    ""
  );
}

// =========================================================
// PAGE NUMBER
// =========================================================

function getPageNumber(
  value: string
): number {
  const parsed =
    Number(
      value
    );

  if (
    !Number.isInteger(
      parsed
    ) ||
    parsed <
      1
  ) {
    return 1;
  }

  return parsed;
}

// =========================================================
// PAGE SIZE
// =========================================================

function getPageSize(
  value: string
): number {
  const parsed =
    Number(
      value
    );

  const allowed =
    new Set([
      10,
      20,
      50,
      100,
    ]);

  if (
    !allowed.has(
      parsed
    )
  ) {
    return 20;
  }

  return parsed;
}

// =========================================================
// REASON
// =========================================================

function getReason(
  value: string
):
  | WasteReason
  | "all" {
  switch (
    value
  ) {
    case "spoiled":
      return "spoiled";

    case "expired":
      return "expired";

    case "bad_quality":
      return "bad_quality";

    case "guest_complaint":
      return "guest_complaint";

    case "all":
    default:
      return "all";
  }
}

// =========================================================
// SORT FIELD
// =========================================================

function getSortBy(
  value: string
):
  | "waste_date"
  | "product_name_snapshot"
  | "qty"
  | "reason"
  | "created_at"
  | "updated_at" {
  switch (
    value
  ) {
    case "product_name_snapshot":
      return "product_name_snapshot";

    case "qty":
      return "qty";

    case "reason":
      return "reason";

    case "created_at":
      return "created_at";

    case "updated_at":
      return "updated_at";

    case "waste_date":
    default:
      return "waste_date";
  }
}

// =========================================================
// SORT DIRECTION
// =========================================================

function getSortDirection(
  value: string
):
  | "asc"
  | "desc" {
  return value ===
    "asc"
    ? "asc"
    : "desc";
}

// =========================================================
// PAGE
// =========================================================

export default async function WastePage({
  searchParams,
}: WastePageProps) {
  // =======================================================
  // OPERATIONAL SESSION
  // =======================================================

  const activeLocation =
    await requireOperationalSession();

  // =======================================================
  // QUERY PARAMETERS
  // =======================================================

  const params =
    await searchParams;

  const search =
    getQueryValue(
      params.search
    )
      .trim()
      .slice(
        0,
        100
      );

  const reason =
    getReason(
      getQueryValue(
        params.reason
      )
    );

  const dateFrom =
    getQueryValue(
      params.dateFrom
    );

  const dateTo =
    getQueryValue(
      params.dateTo
    );

  const page =
    getPageNumber(
      getQueryValue(
        params.page
      )
    );

  const pageSize =
    getPageSize(
      getQueryValue(
        params.pageSize
      )
    );

  const sortBy =
    getSortBy(
      getQueryValue(
        params.sortBy
      )
    );

  const sortDirection =
    getSortDirection(
      getQueryValue(
        params.sortDirection
      )
    );

  // =======================================================
  // LOAD WASTE DATA
  // =======================================================

  let wasteResult =
    await getWasteEntries({
      page,

      pageSize,

      search,

      reason,

      dateFrom,

      dateTo,

      sortBy,

      sortDirection,
    });

  // =======================================================
  // PAGE RECOVERY
  // =======================================================
  //
  // Example:
  //
  // User is on page 4.
  // Several records are deleted.
  // Only 3 pages now exist.
  //
  // Reload the final available page instead of showing an
  // invalid empty page.
  // =======================================================

  if (
    wasteResult.totalPages >
      0 &&
    page >
      wasteResult.totalPages
  ) {
    wasteResult =
      await getWasteEntries({
        page:
          wasteResult.totalPages,

        pageSize,

        search,

        reason,

        dateFrom,

        dateTo,

        sortBy,

        sortDirection,
      });
  }

  // =======================================================
  // PERFORMANCE DATA
  // =======================================================

  const performanceData =
    await getWastePerformance({
      dateFrom,

      dateTo,
    });

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
              <Trash2
                size={17}
                className="text-amber-700"
                aria-hidden="true"
              />

              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                Operational Waste Control
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
              Waste Data
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Record, review, analyze, and report Product
              waste for the current operational location.
            </p>
          </div>

          {/* ===============================================
              ACTIVE LOCATION
          =============================================== */}

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
            WASTE DATA MANAGER
        ================================================= */}

        <WasteDataManager
          initialWasteEntries={
            wasteResult.wasteEntries
          }

          total={
            wasteResult.total
          }

          page={
            wasteResult.page
          }

          pageSize={
            wasteResult.pageSize
          }

          totalPages={
            wasteResult.totalPages
          }

          performanceData={
            performanceData
          }

          initialSearch={
            search
          }

          initialReason={
            reason
          }

          initialDateFrom={
            dateFrom
          }

          initialDateTo={
            dateTo
          }

          initialSortBy={
            sortBy
          }

          initialSortDirection={
            sortDirection
          }

          locationName={
            activeLocation.name
          }

          locationCode={
            activeLocation.code
          }
        />
      </div>
    </AppShell>
  );
}