"use client";

import {
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
  Beaker,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FlaskConical,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  deleteProductionRecipeAction,
  type ProductionRecipeListOptions,
  type ProductionRecipeListRecord,
} from "@/app/recipes/actions";

import {
  useToast,
} from "@/components/toast-provider";

// =========================================================
// TYPES
// =========================================================

type RecipeSortBy =
  NonNullable<
    ProductionRecipeListOptions["sortBy"]
  >;

type RecipeSortDirection =
  NonNullable<
    ProductionRecipeListOptions["sortDirection"]
  >;

type RecipesManagerProps = {
  initialRecipes: ProductionRecipeListRecord[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;

  initialSearch: string;

  initialSortBy: RecipeSortBy;

  initialSortDirection: RecipeSortDirection;
};

type QueryChanges = Record<
  string,
  string | null
>;

// =========================================================
// CONSTANTS
// =========================================================

const SORT_OPTIONS: {
  value: RecipeSortBy;
  label: string;
}[] = [
  {
    value: "name",
    label: "Recipe Name",
  },

  {
    value: "batch_qty",
    label: "Batch QTY",
  },

  {
    value: "yield_qty",
    label: "Yield QTY",
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
// FORMAT DATE
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

export default function RecipesManager({
  initialRecipes,

  total,

  page,

  pageSize,

  totalPages,

  initialSearch,

  initialSortBy,

  initialSortDirection,
}: RecipesManagerProps) {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const searchParams =
    useSearchParams();

  const toast =
    useToast();

  const [
    recipes,
    setRecipes,
  ] =
    useState<
      ProductionRecipeListRecord[]
    >(
      initialRecipes
    );

  const [
    searchValue,
    setSearchValue,
  ] =
    useState(
      initialSearch
    );

  const [
    deletingRecipeId,
    setDeletingRecipeId,
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
    setRecipes(
      initialRecipes
    );
  }, [
    initialRecipes,
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

    // updateQuery intentionally uses current URL state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchValue,
    initialSearch,
  ]);

  // =======================================================
  // SORT FIELD
  // =======================================================

  function handleSortChange(
    sortBy: RecipeSortBy
  ) {
    updateQuery({
      sort:
        sortBy,

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
        String(value),

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
    recipeId: string
  ) {
    if (
      isDeleting
    ) {
      return;
    }

    setDeletingRecipeId(
      recipeId
    );
  }

  function cancelDelete() {
    if (
      isDeleting
    ) {
      return;
    }

    setDeletingRecipeId(
      null
    );
  }

  // =======================================================
  // DELETE RECIPE
  // =======================================================

  function confirmDelete(
    recipe: ProductionRecipeListRecord
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
            "Deleting Recipe",
            recipe.name
          );

        const result =
          await deleteProductionRecipeAction(
            recipe.id
          );

        toast.dismissToast(
          loadingToast
        );

        if (
          !result.success
        ) {
          setDeletingRecipeId(
            null
          );

          toast.error(
            "Unable to Delete Recipe",
            result.message
          );

          return;
        }

        setRecipes(
          (
            current
          ) =>
            current.filter(
              (
                item
              ) =>
                item.id !==
                recipe.id
            )
        );

        setDeletingRecipeId(
          null
        );

        toast.success(
          "Recipe Deleted",
          result.message
        );

        if (
          recipes.length ===
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
  // PAGINATION INFO
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
        initialSortBy !==
          "name" ||
        initialSortDirection !==
          "asc" ||
        pageSize !==
          20
    );

  // =======================================================
  // UI
  // =======================================================

  return (
    <div className="space-y-5">
      {/* ===================================================
          SEARCH + ADD
      =================================================== */}

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            {/* =============================================
                SEARCH
            ============================================= */}

            <div className="w-full xl:max-w-md">
              <label
                htmlFor="recipe-search"
                className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-zinc-500"
              >
                Search Production Recipes
              </label>

              <div className="relative">
                <Search
                  size={17}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                />

                <input
                  id="recipe-search"
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
                  placeholder="Search recipe name..."
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
                    aria-label="Clear recipe search"
                  >
                    <X
                      size={15}
                    />
                  </button>
                ) : null}
              </div>
            </div>

            {/* =============================================
                CREATE RECIPE
            ============================================= */}

            <Link
              href="/recipes/new"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              <Plus
                size={17}
                aria-hidden="true"
              />

              Create Recipe
            </Link>
          </div>

          {/* ===============================================
              FILTERS
          =============================================== */}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_auto_auto]">
            {/* =============================================
                SORT
            ============================================= */}

            <div>
              <label
                htmlFor="recipe-sort"
                className="mb-2 block text-xs font-semibold text-zinc-500"
              >
                Sort By
              </label>

              <div className="relative">
                <select
                  id="recipe-sort"
                  value={
                    initialSortBy
                  }
                  onChange={(
                    event
                  ) =>
                    handleSortChange(
                      event.target
                        .value as RecipeSortBy
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
          RECIPE LIST
      =================================================== */}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col gap-4 border-b border-zinc-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-base font-bold text-zinc-950">
              Production Batch Recipes
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {total === 1
                ? "1 recipe"
                : `${total} recipes`}
            </p>
          </div>

          {/* ===============================================
              PAGE SIZE
          =============================================== */}

          <div className="flex items-center gap-2">
            <label
              htmlFor="recipe-page-size"
              className="text-xs font-semibold text-zinc-500"
            >
              Rows
            </label>

            <div className="relative">
              <select
                id="recipe-page-size"
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
            RECIPES
        ================================================= */}

        {recipes.length >
        0 ? (
          <>
            {/* =============================================
                DESKTOP TABLE
            ============================================= */}

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1050px] border-collapse">
                <thead className="bg-zinc-50">
                  <tr className="border-b border-zinc-200">
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Recipe
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Batch QTY
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Yield QTY
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Yield UOM
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Ingredients
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
                  {recipes.map(
                    (
                      recipe
                    ) => {
                      const confirmingDelete =
                        deletingRecipeId ===
                        recipe.id;

                      return (
                        <tr
                          key={
                            recipe.id
                          }
                          className="border-b border-zinc-100 last:border-b-0"
                        >
                          {/* =================================
                              RECIPE NAME
                          ================================= */}

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-600">
                                <FlaskConical
                                  size={16}
                                  aria-hidden="true"
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="max-w-[260px] truncate text-sm font-bold text-zinc-950">
                                  {
                                    recipe.name
                                  }
                                </p>

                                <p className="mt-1 text-[11px] text-zinc-400">
                                  {recipe.is_active
                                    ? "Active"
                                    : "Inactive"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* =================================
                              BATCH QTY
                          ================================= */}

                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-zinc-800">
                            {formatQuantity(
                              recipe.batch_qty
                            )}
                          </td>

                          {/* =================================
                              YIELD QTY
                          ================================= */}

                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-zinc-800">
                            {formatQuantity(
                              recipe.yield_qty
                            )}
                          </td>

                          {/* =================================
                              YIELD UOM
                          ================================= */}

                          <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-zinc-600">
                            {
                              recipe.yield_uom
                            }
                          </td>

                          {/* =================================
                              INGREDIENT COUNT
                          ================================= */}

                          <td className="whitespace-nowrap px-5 py-4 text-right">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                              <Beaker
                                size={13}
                                aria-hidden="true"
                              />

                              {
                                recipe.ingredient_count
                              }
                            </span>
                          </td>

                          {/* =================================
                              UPDATED
                          ================================= */}

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-zinc-500">
                            {formatDate(
                              recipe.updated_at
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
                                      recipe
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
                                      aria-hidden="true"
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Trash2
                                      size={14}
                                      aria-hidden="true"
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
                                  href={`/recipes/${recipe.id}`}
                                  className="grid h-9 w-9 place-items-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
                                  aria-label={`View ${recipe.name}`}
                                  title="View"
                                >
                                  <Eye
                                    size={16}
                                  />
                                </Link>

                                <Link
                                  href={`/recipes/${recipe.id}/edit`}
                                  className="grid h-9 w-9 place-items-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
                                  aria-label={`Edit ${recipe.name}`}
                                  title="Edit"
                                >
                                  <Pencil
                                    size={15}
                                  />
                                </Link>

                                <button
                                  type="button"
                                  onClick={() =>
                                    requestDelete(
                                      recipe.id
                                    )
                                  }
                                  disabled={
                                    isDeleting
                                  }
                                  className="grid h-9 w-9 place-items-center rounded-xl text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                                  aria-label={`Delete ${recipe.name}`}
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
              {recipes.map(
                (
                  recipe
                ) => {
                  const confirmingDelete =
                    deletingRecipeId ===
                    recipe.id;

                  return (
                    <article
                      key={
                        recipe.id
                      }
                      className="p-5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-600">
                          <FlaskConical
                            size={17}
                            aria-hidden="true"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          {/* =================================
                              TITLE
                          ================================= */}

                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-zinc-950">
                                {
                                  recipe.name
                                }
                              </p>

                              <p className="mt-1 text-xs text-zinc-400">
                                {recipe.is_active
                                  ? "Active Production Recipe"
                                  : "Inactive Production Recipe"}
                              </p>
                            </div>

                            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">
                              <Beaker
                                size={12}
                                aria-hidden="true"
                              />

                              {
                                recipe.ingredient_count
                              }{" "}
                              {recipe.ingredient_count ===
                              1
                                ? "ingredient"
                                : "ingredients"}
                            </span>
                          </div>

                          {/* =================================
                              DETAILS
                          ================================= */}

                          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                Batch QTY
                              </p>

                              <p className="mt-1 text-sm font-semibold text-zinc-800">
                                {formatQuantity(
                                  recipe.batch_qty
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                Yield
                              </p>

                              <p className="mt-1 text-sm font-semibold text-zinc-800">
                                {formatQuantity(
                                  recipe.yield_qty
                                )}{" "}
                                {
                                  recipe.yield_uom
                                }
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                Ingredients
                              </p>

                              <p className="mt-1 text-sm font-semibold text-zinc-800">
                                {
                                  recipe.ingredient_count
                                }
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                Updated
                              </p>

                              <p className="mt-1 text-sm font-semibold text-zinc-800">
                                {formatDate(
                                  recipe.updated_at
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
                                  recipe.name
                                }
                                ?
                              </p>

                              <p className="mt-1 text-xs leading-5 text-zinc-500">
                                Recipe ingredients will also be
                                removed. Recipes already used by
                                protected operational records
                                cannot be deleted.
                              </p>

                              <div className="mt-3 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    confirmDelete(
                                      recipe
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
                                href={`/recipes/${recipe.id}`}
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700"
                              >
                                <Eye
                                  size={14}
                                />

                                View
                              </Link>

                              <Link
                                href={`/recipes/${recipe.id}/edit`}
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700"
                              >
                                <Pencil
                                  size={14}
                                />

                                Edit
                              </Link>

                              <button
                                type="button"
                                onClick={() =>
                                  requestDelete(
                                    recipe.id
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
              <FlaskConical
                size={23}
                aria-hidden="true"
              />
            </div>

            <h3 className="mt-4 text-sm font-bold text-zinc-950">
              {hasActiveFilters
                ? "No production recipes found"
                : "No production recipes available"}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              {hasActiveFilters
                ? "No recipes match the current search or sorting settings."
                : "Create the first production batch recipe for this operational location."}
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
                href="/recipes/new"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                <Plus
                  size={16}
                />

                Create Recipe
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
            recipes
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
              />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}