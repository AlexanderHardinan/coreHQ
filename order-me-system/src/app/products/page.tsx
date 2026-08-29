import {
  MapPin,
  Package,
} from "lucide-react";

import {
  getCategories,
} from "@/app/categories/actions";

import {
  getProducts,
  type ProductListOptions,
} from "@/app/products/actions";

import ProductsManager from "@/app/products/products-manager";

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

type ProductsPageProps = {
  searchParams:
    Promise<SearchParams>;
};

type ProductSortBy =
  NonNullable<
    ProductListOptions["sortBy"]
  >;

type ProductSortDirection =
  NonNullable<
    ProductListOptions["sortDirection"]
  >;

// =========================================================
// CONSTANTS
// =========================================================

const DEFAULT_PAGE =
  1;

const DEFAULT_PAGE_SIZE =
  20;

const MAX_PAGE_SIZE =
  100;

const DEFAULT_SORT_BY:
  ProductSortBy =
  "name";

const DEFAULT_SORT_DIRECTION:
  ProductSortDirection =
  "asc";

const ALLOWED_SORT_FIELDS =
  new Set<ProductSortBy>([
    "name",
    "sku",
    "amount_qty",
    "created_at",
    "updated_at",
  ]);

const ALLOWED_PAGE_SIZES =
  new Set([
    10,
    20,
    50,
    100,
  ]);

// =========================================================
// PARAMETER HELPERS
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

function normalizeCategoryId(
  value:
    | string
    | string[]
    | undefined
): string {
  const categoryId =
    getSingleValue(
      value
    )
      .trim()
      .toLowerCase();

  if (
    !categoryId
  ) {
    return "";
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      categoryId
    )
  ) {
    return "";
  }

  return categoryId;
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

  return Math.min(
    parsed,
    MAX_PAGE_SIZE
  );
}

function normalizeSortBy(
  value:
    | string
    | string[]
    | undefined
): ProductSortBy {
  const raw =
    getSingleValue(
      value
    ) as ProductSortBy;

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
): ProductSortDirection {
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

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  // =======================================================
  // VERIFY OPERATIONAL SESSION
  // =======================================================

  const activeLocation =
    await requireOperationalSession();

  // =======================================================
  // READ + VALIDATE QUERY PARAMETERS
  // =======================================================

  const params =
    await searchParams;

  const search =
    normalizeSearch(
      params.q
    );

  const categoryId =
    normalizeCategoryId(
      params.category
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
  // LOAD LOCATION-SCOPED DATA
  // =======================================================

  let productResult =
    await getProducts({
      page:
        requestedPage,

      pageSize,

      search,

      categoryId:
        categoryId ||
        undefined,

      sortBy,

      sortDirection,
    });

  // =======================================================
  // PAGE RANGE RECOVERY
  // =======================================================
  //
  // A deletion or changed filter can leave the browser on
  // a page that no longer exists.
  //
  // Example:
  //
  // Page 4
  // Last products deleted
  // New total pages = 3
  //
  // Reload the final valid page instead of displaying an
  // incorrect empty result.
  // =======================================================

  if (
    productResult.total >
      0 &&
    productResult.totalPages >
      0 &&
    requestedPage >
      productResult.totalPages
  ) {
    productResult =
      await getProducts({
        page:
          productResult.totalPages,

        pageSize,

        search,

        categoryId:
          categoryId ||
          undefined,

        sortBy,

        sortDirection,
      });
  }

  const categories =
    await getCategories();

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
              <Package
                size={17}
                className="text-amber-700"
                aria-hidden="true"
              />

              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                Product Management
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
              Product List
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Search, filter, review, edit, and manage products
              for the current operational location.
            </p>
          </div>

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
            PRODUCT MANAGER
        ================================================= */}

        <ProductsManager
          initialProducts={
            productResult.products
          }
          categories={
            categories
          }
          total={
            productResult.total
          }
          page={
            productResult.page
          }
          pageSize={
            productResult.pageSize
          }
          totalPages={
            productResult.totalPages
          }
          initialSearch={
            search
          }
          initialCategoryId={
            categoryId
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