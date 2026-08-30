import {
  FlaskConical,
  MapPin,
} from "lucide-react";

import {
  getProductionRecipes,
  type ProductionRecipeListOptions,
} from "@/app/recipes/actions";

import RecipesManager from "@/app/recipes/recipes-manager";

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

type RecipesPageProps = {
  searchParams:
    Promise<SearchParams>;
};

type RecipeSortBy =
  NonNullable<
    ProductionRecipeListOptions["sortBy"]
  >;

type RecipeSortDirection =
  NonNullable<
    ProductionRecipeListOptions["sortDirection"]
  >;

// =========================================================
// CONSTANTS
// =========================================================

const DEFAULT_PAGE =
  1;

const DEFAULT_PAGE_SIZE =
  20;

const DEFAULT_SORT_BY:
  RecipeSortBy =
  "name";

const DEFAULT_SORT_DIRECTION:
  RecipeSortDirection =
  "asc";

const ALLOWED_PAGE_SIZES =
  new Set([
    10,
    20,
    50,
    100,
  ]);

const ALLOWED_SORT_FIELDS =
  new Set<RecipeSortBy>([
    "name",
    "batch_qty",
    "yield_qty",
    "created_at",
    "updated_at",
  ]);

// =========================================================
// QUERY HELPERS
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
    Array.isArray(value) &&
    typeof value[0] ===
      "string"
  ) {
    return value[0];
  }

  return "";
}

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

function normalizeSortBy(
  value:
    | string
    | string[]
    | undefined
): RecipeSortBy {
  const raw =
    getSingleValue(
      value
    ) as RecipeSortBy;

  if (
    ALLOWED_SORT_FIELDS.has(
      raw
    )
  ) {
    return raw;
  }

  return DEFAULT_SORT_BY;
}

function normalizeSortDirection(
  value:
    | string
    | string[]
    | undefined
): RecipeSortDirection {
  const raw =
    getSingleValue(
      value
    )
      .trim()
      .toLowerCase();

  if (
    raw === "desc"
  ) {
    return "desc";
  }

  return DEFAULT_SORT_DIRECTION;
}

// =========================================================
// PAGE
// =========================================================

export default async function RecipesPage({
  searchParams,
}: RecipesPageProps) {
  // =======================================================
  // VERIFY OPERATIONAL SESSION
  // =======================================================

  const activeLocation =
    await requireOperationalSession();

  // =======================================================
  // READ + VALIDATE URL PARAMETERS
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

  const sortBy =
    normalizeSortBy(
      params.sort
    );

  const sortDirection =
    normalizeSortDirection(
      params.direction
    );

  // =======================================================
  // LOAD LOCATION-SCOPED RECIPE DATA
  // =======================================================

  let recipeResult =
    await getProductionRecipes({
      page:
        requestedPage,

      pageSize,

      search,

      sortBy,

      sortDirection,
    });

  // =======================================================
  // INVALID PAGE RECOVERY
  // =======================================================
  //
  // Example:
  //
  // User is on Page 4.
  // Recipes are deleted.
  // Only Page 3 remains.
  //
  // Instead of displaying an incorrect empty page, reload
  // the last valid page.
  // =======================================================

  if (
    recipeResult.total >
      0 &&
    recipeResult.totalPages >
      0 &&
    requestedPage >
      recipeResult.totalPages
  ) {
    recipeResult =
      await getProductionRecipes({
        page:
          recipeResult.totalPages,

        pageSize,

        search,

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
              Production Batch Recipes
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Create and manage base production recipes,
              ingredient quantities, batch sizes, and finished
              yields for the current operational location.
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
            RECIPE MANAGER
        ================================================= */}

        <RecipesManager
          initialRecipes={
            recipeResult.recipes
          }
          total={
            recipeResult.total
          }
          page={
            recipeResult.page
          }
          pageSize={
            recipeResult.pageSize
          }
          totalPages={
            recipeResult.totalPages
          }
          initialSearch={
            search
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