"use client";

import {
  useEffect,
  useMemo,
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Package,
  PackagePlus,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  deleteProductAction,
  type ProductListOptions,
  type ProductRecord,
} from "@/app/products/actions";

import type {
  CategoryRecord,
} from "@/app/categories/actions";

import {
  useToast,
} from "@/components/toast-provider";

// =========================================================
// TYPES
// =========================================================

type ProductSortBy =
  NonNullable<
    ProductListOptions["sortBy"]
  >;

type ProductSortDirection =
  NonNullable<
    ProductListOptions["sortDirection"]
  >;

type ProductsManagerProps = {
  initialProducts: ProductRecord[];
  categories: CategoryRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  initialSearch: string;
  initialCategoryId: string;
  initialSortBy: ProductSortBy;
  initialSortDirection: ProductSortDirection;
};

type QueryChanges = Record<
  string,
  string | null
>;

// =========================================================
// SORT OPTIONS
// =========================================================

const SORT_OPTIONS: {
  value: ProductSortBy;
  label: string;
}[] = [
  {
    value: "name",
    label: "Product Name",
  },
  {
    value: "sku",
    label: "SKU",
  },
  {
    value: "amount_qty",
    label: "Quantity",
  },
  {
    value: "updated_at",
    label: "Updated Date",
  },
  {
    value: "created_at",
    label: "Created Date",
  },
];

const PAGE_SIZE_OPTIONS = [
  10,
  20,
  50,
  100,
];

// =========================================================
// NUMBER FORMATTER
// =========================================================

function formatQuantity(
  value: number
): string {
  if (
    !Number.isFinite(value)
  ) {
    return "0";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits: 4,
    }
  ).format(value);
}

// =========================================================
// DATE FORMATTER
// =========================================================

function formatDate(
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
    }
  ).format(date);
}

// =========================================================
// COMPONENT
// =========================================================

export default function ProductsManager({
  initialProducts,
  categories,
  total,
  page,
  pageSize,
  totalPages,
  initialSearch,
  initialCategoryId,
  initialSortBy,
  initialSortDirection,
}: ProductsManagerProps) {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const searchParams =
    useSearchParams();

  const toast =
    useToast();

  const [
    products,
    setProducts,
  ] =
    useState<ProductRecord[]>(
      initialProducts
    );

  const [
    searchValue,
    setSearchValue,
  ] =
    useState(
      initialSearch
    );

  const [
    deletingProductId,
    setDeletingProductId,
  ] =
    useState<string | null>(
      null
    );

  const [
    isDeleting,
    startDeleteTransition,
  ] =
    useTransition();

  // =======================================================
  // SYNC SERVER PRODUCTS
  // =======================================================

  useEffect(() => {
    setProducts(
      initialProducts
    );
  }, [
    initialProducts,
  ]);

  // =======================================================
  // SYNC SEARCH FROM URL / SERVER
  // =======================================================

  useEffect(() => {
    setSearchValue(
      initialSearch
    );
  }, [
    initialSearch,
  ]);

  // =======================================================
  // ACTIVE CATEGORIES
  // =======================================================

  const activeCategories =
    useMemo(
      () =>
        categories
          .filter(
            (category) =>
              category.is_active
          )
          .sort((a, b) =>
            a.name.localeCompare(
              b.name,
              undefined,
              {
                sensitivity:
                  "base",
              }
            )
          ),
      [categories]
    );

  // =======================================================
  // UPDATE URL QUERY
  // =======================================================

  function updateQuery(
    changes: QueryChanges
  ) {
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
  }

  // =======================================================
  // DEBOUNCED SEARCH
  // =======================================================

  useEffect(() => {
    const normalizedSearch =
      searchValue
        .trim()
        .replace(
          /\s+/g,
          " "
        );

    if (
      normalizedSearch ===
      initialSearch
    ) {
      return;
    }

    const timeout =
      window.setTimeout(
        () => {
          updateQuery({
            q:
              normalizedSearch ||
              null,
            page: "1",
          });
        },
        450
      );

    return () => {
      window.clearTimeout(
        timeout
      );
    };
    // updateQuery intentionally uses current router/search params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchValue,
    initialSearch,
  ]);

  // =======================================================
  // CATEGORY FILTER
  // =======================================================

  function handleCategoryChange(
    categoryId: string
  ) {
    updateQuery({
      category:
        categoryId ||
        null,
      page: "1",
    });
  }

  // =======================================================
  // SORT
  // =======================================================

  function handleSortChange(
    sortBy: ProductSortBy
  ) {
    updateQuery({
      sort: sortBy,
      page: "1",
    });
  }

  function toggleSortDirection() {
    updateQuery({
      direction:
        initialSortDirection ===
        "asc"
          ? "desc"
          : "asc",
      page: "1",
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
        String(value),
      page: "1",
    });
  }

  // =======================================================
  // PAGINATION
  // =======================================================

  function goToPage(
    nextPage: number
  ) {
    if (
      nextPage < 1 ||
      (
        totalPages > 0 &&
        nextPage >
          totalPages
      )
    ) {
      return;
    }

    updateQuery({
      page:
        String(nextPage),
    });
  }

  // =======================================================
  // RESET FILTERS
  // =======================================================

  function resetFilters() {
    setSearchValue(
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
  // DELETE CONFIRMATION
  // =======================================================

  function requestDelete(
    productId: string
  ) {
    if (isDeleting) {
      return;
    }

    setDeletingProductId(
      productId
    );
  }

  function cancelDelete() {
    if (isDeleting) {
      return;
    }

    setDeletingProductId(
      null
    );
  }

  // =======================================================
  // DELETE PRODUCT
  // =======================================================

  function confirmDelete(
    product: ProductRecord
  ) {
    if (isDeleting) {
      return;
    }

    startDeleteTransition(
      async () => {
        const loadingToast =
          toast.deleting(
            "Deleting Product",
            `${product.name} (${product.sku})`
          );

        const result =
          await deleteProductAction(
            product.id
          );

        toast.dismissToast(
          loadingToast
        );

        if (
          !result.success
        ) {
          setDeletingProductId(
            null
          );

          toast.error(
            "Unable to Delete Product",
            result.message
          );

          return;
        }

        setProducts(
          (current) =>
            current.filter(
              (item) =>
                item.id !==
                product.id
            )
        );

        setDeletingProductId(
          null
        );

        toast.success(
          "Product Deleted",
          result.message
        );

        if (
          products.length ===
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

  const hasActiveFilters =
    Boolean(
      initialSearch ||
        initialCategoryId ||
        initialSortBy !==
          "name" ||
        initialSortDirection !==
          "asc" ||
        pageSize !== 20
    );

  // =======================================================
  // UI
  // =======================================================

  return (
    <div className="space-y-5">
      {/* ===================================================
          TOOLBAR
      =================================================== */}

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            {/* =============================================
                SEARCH
            ============================================= */}

            <div className="w-full xl:max-w-md">
              <label
                htmlFor="product-search"
                className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-zinc-500"
              >
                Search Products
              </label>

              <div className="relative">
                <Search
                  size={17}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                />

                <input
                  id="product-search"
                  type="search"
                  value={
                    searchValue
                  }
                  onChange={(
                    event
                  ) =>
                    setSearchValue(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="Search by product name or SKU..."
                  autoComplete="off"
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
                    aria-label="Clear product search"
                  >
                    <X
                      size={15}
                    />
                  </button>
                ) : null}
              </div>
            </div>

            {/* =============================================
                ADD PRODUCT
            ============================================= */}

            <Link
              href="/products/new"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              <PackagePlus
                size={17}
                aria-hidden="true"
              />

              Add Product
            </Link>
          </div>

          {/* ===============================================
              FILTERS
          =============================================== */}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto_auto]">
            {/* =============================================
                CATEGORY
            ============================================= */}

            <div>
              <label
                htmlFor="product-category-filter"
                className="mb-2 block text-xs font-semibold text-zinc-500"
              >
                Category
              </label>

              <div className="relative">
                <select
                  id="product-category-filter"
                  value={
                    initialCategoryId
                  }
                  onChange={(
                    event
                  ) =>
                    handleCategoryChange(
                      event
                        .target
                        .value
                    )
                  }
                  className="h-10 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 pr-9 text-sm text-zinc-700 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                >
                  <option value="">
                    All Categories
                  </option>

                  {activeCategories.map(
                    (
                      category
                    ) => (
                      <option
                        key={
                          category.id
                        }
                        value={
                          category.id
                        }
                      >
                        {
                          category.name
                        }
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={15}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
              </div>
            </div>

            {/* =============================================
                SORT
            ============================================= */}

            <div>
              <label
                htmlFor="product-sort"
                className="mb-2 block text-xs font-semibold text-zinc-500"
              >
                Sort By
              </label>

              <div className="relative">
                <select
                  id="product-sort"
                  value={
                    initialSortBy
                  }
                  onChange={(
                    event
                  ) =>
                    handleSortChange(
                      event
                        .target
                        .value as ProductSortBy
                    )
                  }
                  className="h-10 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 pr-9 text-sm text-zinc-700 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
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
                  size={15}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
              </div>
            </div>

            {/* =============================================
                SORT DIRECTION
            ============================================= */}

            <div>
              <span className="mb-2 block text-xs font-semibold text-zinc-500">
                Direction
              </span>

              <button
                type="button"
                onClick={
                  toggleSortDirection
                }
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 xl:w-auto"
              >
                {initialSortDirection ===
                "asc" ? (
                  <ArrowUpAZ
                    size={16}
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowDownAZ
                    size={16}
                    aria-hidden="true"
                  />
                )}

                {initialSortDirection ===
                "asc"
                  ? "Ascending"
                  : "Descending"}
              </button>
            </div>

            {/* =============================================
                RESET
            ============================================= */}

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
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 xl:w-auto"
              >
                <X
                  size={15}
                  aria-hidden="true"
                />

                Reset
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          PRODUCT LIST
      =================================================== */}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {/* =================================================
            LIST HEADER
        ================================================= */}

        <div className="flex flex-col gap-4 border-b border-zinc-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-base font-bold text-zinc-950">
              Product List
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {total === 1
                ? "1 product"
                : `${total} products`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="products-page-size"
              className="text-xs font-semibold text-zinc-500"
            >
              Rows
            </label>

            <div className="relative">
              <select
                id="products-page-size"
                value={
                  pageSize
                }
                onChange={(
                  event
                ) =>
                  handlePageSizeChange(
                    Number(
                      event
                        .target
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
            DESKTOP TABLE
        ================================================= */}

        {products.length >
        0 ? (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1180px] border-collapse">
                <thead className="bg-zinc-50">
                  <tr className="border-b border-zinc-200">
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                      SKU
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Product
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Category
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Quantity
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                      UOM
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Packaging Size
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Packaging UOM
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Updated
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {products.map(
                    (
                      product
                    ) => {
                      const confirmingDelete =
                        deletingProductId ===
                        product.id;

                      return (
                        <tr
                          key={
                            product.id
                          }
                          className="border-b border-zinc-100 last:border-b-0"
                        >
                          <td className="whitespace-nowrap px-5 py-4">
                            <span className="rounded-lg bg-zinc-100 px-2.5 py-1.5 font-mono text-xs font-bold text-zinc-700">
                              {
                                product.sku
                              }
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-600">
                                <Package
                                  size={
                                    16
                                  }
                                  aria-hidden="true"
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="max-w-[220px] truncate text-sm font-bold text-zinc-950">
                                  {
                                    product.name
                                  }
                                </p>

                                <p className="mt-1 text-[11px] text-zinc-400">
                                  {product.is_active
                                    ? "Active"
                                    : "Inactive"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-zinc-600">
                            {
                              product.category_name
                            }
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-zinc-800">
                            {formatQuantity(
                              product.amount_qty
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-zinc-600">
                            {
                              product.uom
                            }
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-zinc-800">
                            {formatQuantity(
                              product.packaging_size_amount
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-zinc-600">
                            {
                              product.packaging_uom
                            }
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-zinc-500">
                            {formatDate(
                              product.updated_at
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {confirmingDelete ? (
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    confirmDelete(
                                      product
                                    )
                                  }
                                  disabled={
                                    isDeleting
                                  }
                                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-3 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isDeleting ? (
                                    <Loader2
                                      size={
                                        14
                                      }
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Trash2
                                      size={
                                        14
                                      }
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
                                  href={`/products/${product.id}`}
                                  className="grid h-9 w-9 place-items-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
                                  aria-label={`View ${product.name}`}
                                  title="View"
                                >
                                  <Eye
                                    size={
                                      16
                                    }
                                  />
                                </Link>

                                <Link
                                  href={`/products/${product.id}/edit`}
                                  className="grid h-9 w-9 place-items-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
                                  aria-label={`Edit ${product.name}`}
                                  title="Edit"
                                >
                                  <Pencil
                                    size={
                                      15
                                    }
                                  />
                                </Link>

                                <button
                                  type="button"
                                  onClick={() =>
                                    requestDelete(
                                      product.id
                                    )
                                  }
                                  disabled={
                                    isDeleting
                                  }
                                  className="grid h-9 w-9 place-items-center rounded-xl text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                                  aria-label={`Delete ${product.name}`}
                                  title="Delete"
                                >
                                  <Trash2
                                    size={
                                      15
                                    }
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
                MOBILE / TABLET CARDS
            ============================================= */}

            <div className="divide-y divide-zinc-100 lg:hidden">
              {products.map(
                (
                  product
                ) => {
                  const confirmingDelete =
                    deletingProductId ===
                    product.id;

                  return (
                    <article
                      key={
                        product.id
                      }
                      className="p-5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-600">
                          <Package
                            size={
                              17
                            }
                            aria-hidden="true"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-zinc-950">
                                {
                                  product.name
                                }
                              </p>

                              <p className="mt-1 font-mono text-xs font-semibold text-zinc-500">
                                {
                                  product.sku
                                }
                              </p>
                            </div>

                            <span className="w-fit rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">
                              {
                                product.category_name
                              }
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                Quantity
                              </p>

                              <p className="mt-1 text-sm font-semibold text-zinc-800">
                                {formatQuantity(
                                  product.amount_qty
                                )}{" "}
                                {
                                  product.uom
                                }
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                Pack Size
                              </p>

                              <p className="mt-1 text-sm font-semibold text-zinc-800">
                                {formatQuantity(
                                  product.packaging_size_amount
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                Packaging
                              </p>

                              <p className="mt-1 text-sm font-semibold text-zinc-800">
                                {
                                  product.packaging_uom
                                }
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                Updated
                              </p>

                              <p className="mt-1 text-sm font-semibold text-zinc-800">
                                {formatDate(
                                  product.updated_at
                                )}
                              </p>
                            </div>
                          </div>

                          {confirmingDelete ? (
                            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4">
                              <p className="text-sm font-bold text-zinc-950">
                                Delete{" "}
                                {
                                  product.name
                                }
                                ?
                              </p>

                              <p className="mt-1 text-xs leading-5 text-zinc-500">
                                Products already used by recipes
                                or orders cannot be deleted.
                              </p>

                              <div className="mt-3 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    confirmDelete(
                                      product
                                    )
                                  }
                                  disabled={
                                    isDeleting
                                  }
                                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-semibold text-white disabled:opacity-50"
                                >
                                  {isDeleting ? (
                                    <Loader2
                                      size={
                                        14
                                      }
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Trash2
                                      size={
                                        14
                                      }
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
                            <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
                              <Link
                                href={`/products/${product.id}`}
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700"
                              >
                                <Eye
                                  size={
                                    14
                                  }
                                />

                                View
                              </Link>

                              <Link
                                href={`/products/${product.id}/edit`}
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700"
                              >
                                <Pencil
                                  size={
                                    14
                                  }
                                />

                                Edit
                              </Link>

                              <button
                                type="button"
                                onClick={() =>
                                  requestDelete(
                                    product.id
                                  )
                                }
                                disabled={
                                  isDeleting
                                }
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-red-100 bg-white px-3 text-xs font-semibold text-red-600 disabled:opacity-50"
                              >
                                <Trash2
                                  size={
                                    14
                                  }
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
              <Package
                size={23}
                aria-hidden="true"
              />
            </div>

            <h3 className="mt-4 text-sm font-bold text-zinc-950">
              {hasActiveFilters
                ? "No products found"
                : "No products added yet"}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              {hasActiveFilters
                ? "No products match the current search or filter settings."
                : "Create the first product for this operational location."}
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
                    size={
                      15
                    }
                  />

                  Clear Filters
                </button>
              ) : null}

              <Link
                href="/products/new"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                <PackagePlus
                  size={
                    16
                  }
                />

                Add Product
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
            products
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
              />

              Previous
            </button>

            <span className="min-w-20 text-center text-xs font-semibold text-zinc-600">
              Page {total === 0
                ? 0
                : page}{" "}
              of {totalPages}
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
              />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}