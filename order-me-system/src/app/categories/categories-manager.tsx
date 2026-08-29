"use client";

import {
  FormEvent,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  FolderPlus,
  Loader2,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
  type CategoryRecord,
} from "@/app/categories/actions";

import {
  useToast,
} from "@/components/toast-provider";

type CategoriesManagerProps = {
  initialCategories: CategoryRecord[];
};

export default function CategoriesManager({
  initialCategories,
}: CategoriesManagerProps) {
  const router = useRouter();
  const toast = useToast();

  const [
    categories,
    setCategories,
  ] = useState<CategoryRecord[]>(
    initialCategories
  );

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    newCategoryName,
    setNewCategoryName,
  ] = useState("");

  const [
    editingCategoryId,
    setEditingCategoryId,
  ] = useState<string | null>(
    null
  );

  const [
    editingCategoryName,
    setEditingCategoryName,
  ] = useState("");

  const [
    deletingCategoryId,
    setDeletingCategoryId,
  ] = useState<string | null>(
    null
  );

  const [
    isCreating,
    startCreating,
  ] = useTransition();

  const [
    isUpdating,
    startUpdating,
  ] = useTransition();

  const [
    isDeleting,
    startDeleting,
  ] = useTransition();

  const filteredCategories =
    useMemo(() => {
      const normalizedSearch =
        searchQuery
          .trim()
          .toLowerCase();

      if (!normalizedSearch) {
        return categories;
      }

      return categories.filter(
        (category) =>
          category.name
            .toLowerCase()
            .includes(
              normalizedSearch
            )
      );
    }, [
      categories,
      searchQuery,
    ]);

  function handleCreateCategory(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const categoryName =
      newCategoryName
        .trim()
        .replace(/\s+/g, " ");

    if (!categoryName) {
      toast.warning(
        "Category Name Required",
        "Enter a category name before saving."
      );

      return;
    }

    startCreating(async () => {
      const loadingToast =
        toast.saving(
          "Saving Category",
          categoryName
        );

      const formData =
        new FormData();

      formData.set(
        "name",
        categoryName
      );

      const result =
        await createCategoryAction(
          null,
          formData
        );

      toast.dismissToast(
        loadingToast
      );

      if (
        !result.success ||
        !result.category
      ) {
        toast.error(
          "Unable to Save Category",
          result.message
        );

        return;
      }

      setCategories(
        (current) =>
          [...current, result.category!]
            .sort((a, b) =>
              a.name.localeCompare(
                b.name,
                undefined,
                {
                  sensitivity:
                    "base",
                }
              )
            )
      );

      setNewCategoryName(
        ""
      );

      toast.success(
        "Category Saved",
        `${result.category.name} was added successfully.`
      );

      router.refresh();
    });
  }

  function beginEditing(
    category: CategoryRecord
  ) {
    if (
      isCreating ||
      isUpdating ||
      isDeleting
    ) {
      return;
    }

    setDeletingCategoryId(
      null
    );

    setEditingCategoryId(
      category.id
    );

    setEditingCategoryName(
      category.name
    );
  }

  function cancelEditing() {
    if (isUpdating) {
      return;
    }

    setEditingCategoryId(
      null
    );

    setEditingCategoryName(
      ""
    );
  }

  function handleUpdateCategory(
    event: FormEvent<HTMLFormElement>,
    category: CategoryRecord
  ) {
    event.preventDefault();

    const categoryName =
      editingCategoryName
        .trim()
        .replace(/\s+/g, " ");

    if (!categoryName) {
      toast.warning(
        "Category Name Required",
        "Enter a category name before updating."
      );

      return;
    }

    if (
      categoryName ===
      category.name
    ) {
      cancelEditing();

      toast.info(
        "No Changes",
        "The category name was not changed."
      );

      return;
    }

    startUpdating(async () => {
      const loadingToast =
        toast.updating(
          "Updating Category",
          category.name
        );

      const formData =
        new FormData();

      formData.set(
        "categoryId",
        category.id
      );

      formData.set(
        "name",
        categoryName
      );

      const result =
        await updateCategoryAction(
          null,
          formData
        );

      toast.dismissToast(
        loadingToast
      );

      if (
        !result.success ||
        !result.category
      ) {
        toast.error(
          "Unable to Update Category",
          result.message
        );

        return;
      }

      setCategories(
        (current) =>
          current
            .map((item) =>
              item.id ===
              category.id
                ? result.category!
                : item
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
            )
      );

      setEditingCategoryId(
        null
      );

      setEditingCategoryName(
        ""
      );

      toast.success(
        "Category Updated",
        `${result.category.name} was updated successfully.`
      );

      router.refresh();
    });
  }

  function requestDelete(
    categoryId: string
  ) {
    if (
      isCreating ||
      isUpdating ||
      isDeleting
    ) {
      return;
    }

    setEditingCategoryId(
      null
    );

    setEditingCategoryName(
      ""
    );

    setDeletingCategoryId(
      categoryId
    );
  }

  function cancelDelete() {
    if (isDeleting) {
      return;
    }

    setDeletingCategoryId(
      null
    );
  }

  function confirmDelete(
    category: CategoryRecord
  ) {
    startDeleting(async () => {
      const loadingToast =
        toast.deleting(
          "Deleting Category",
          category.name
        );

      const result =
        await deleteCategoryAction(
          category.id
        );

      toast.dismissToast(
        loadingToast
      );

      if (!result.success) {
        toast.error(
          "Unable to Delete Category",
          result.message
        );

        setDeletingCategoryId(
          null
        );

        return;
      }

      setCategories(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              category.id
          )
      );

      setDeletingCategoryId(
        null
      );

      toast.success(
        "Category Deleted",
        result.message
      );

      router.refresh();
    });
  }

  const operationInProgress =
    isCreating ||
    isUpdating ||
    isDeleting;

  return (
    <div className="space-y-6">
      {/* ===================================================
          CREATE CATEGORY
      =================================================== */}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-zinc-950 text-white">
            <FolderPlus
              size={19}
              aria-hidden="true"
            />
          </div>

          <div>
            <h2 className="text-base font-bold text-zinc-950">
              Add Category
            </h2>

            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Create a product category for the current
              operational location.
            </p>
          </div>
        </div>

        <form
          onSubmit={
            handleCreateCategory
          }
          className="mt-5 flex flex-col gap-3 sm:flex-row"
        >
          <div className="flex-1">
            <label
              htmlFor="new-category-name"
              className="sr-only"
            >
              Category name
            </label>

            <input
              id="new-category-name"
              type="text"
              value={
                newCategoryName
              }
              onChange={(event) =>
                setNewCategoryName(
                  event.target.value
                )
              }
              maxLength={100}
              disabled={
                operationInProgress
              }
              placeholder="Enter category name"
              autoComplete="off"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
            />
          </div>

          <button
            type="submit"
            disabled={
              operationInProgress
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                  aria-hidden="true"
                />

                Saving...
              </>
            ) : (
              <>
                <FolderPlus
                  size={16}
                  aria-hidden="true"
                />

                Save Category
              </>
            )}
          </button>
        </form>
      </section>

      {/* ===================================================
          SEARCH + COUNT
      =================================================== */}

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-zinc-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-base font-bold text-zinc-950">
              Category List
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {categories.length ===
              1
                ? "1 category"
                : `${categories.length} categories`}
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
            />

            <label
              htmlFor="category-search"
              className="sr-only"
            >
              Search categories
            </label>

            <input
              id="category-search"
              type="search"
              value={
                searchQuery
              }
              onChange={(event) =>
                setSearchQuery(
                  event.target.value
                )
              }
              placeholder="Search categories..."
              autoComplete="off"
              className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-4 focus:ring-zinc-100"
            />
          </div>
        </div>

        {/* =================================================
            CATEGORY RECORDS
        ================================================= */}

        {filteredCategories.length >
        0 ? (
          <div className="divide-y divide-zinc-100">
            {filteredCategories.map(
              (category) => {
                const isEditing =
                  editingCategoryId ===
                  category.id;

                const isDeleteConfirmation =
                  deletingCategoryId ===
                  category.id;

                return (
                  <article
                    key={
                      category.id
                    }
                    className="p-5 sm:p-6"
                  >
                    {isEditing ? (
                      <form
                        onSubmit={(
                          event
                        ) =>
                          handleUpdateCategory(
                            event,
                            category
                          )
                        }
                        className="flex flex-col gap-3 sm:flex-row sm:items-center"
                      >
                        <div className="flex-1">
                          <label
                            htmlFor={`edit-category-${category.id}`}
                            className="sr-only"
                          >
                            Edit category
                          </label>

                          <input
                            id={`edit-category-${category.id}`}
                            type="text"
                            value={
                              editingCategoryName
                            }
                            onChange={(
                              event
                            ) =>
                              setEditingCategoryName(
                                event
                                  .target
                                  .value
                              )
                            }
                            maxLength={
                              100
                            }
                            disabled={
                              isUpdating
                            }
                            autoFocus
                            autoComplete="off"
                            className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={
                              isUpdating
                            }
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isUpdating ? (
                              <Loader2
                                size={
                                  16
                                }
                                className="animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <Check
                                size={
                                  16
                                }
                                aria-hidden="true"
                              />
                            )}

                            Save
                          </button>

                          <button
                            type="button"
                            onClick={
                              cancelEditing
                            }
                            disabled={
                              isUpdating
                            }
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <X
                              size={
                                16
                              }
                              aria-hidden="true"
                            />

                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : isDeleteConfirmation ? (
                      <div className="flex flex-col gap-4 rounded-xl border border-red-100 bg-red-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-bold text-zinc-950">
                            Delete{" "}
                            {
                              category.name
                            }
                            ?
                          </p>

                          <p className="mt-1 text-sm leading-5 text-zinc-500">
                            This action
                            cannot be
                            undone. A
                            category used
                            by products
                            cannot be
                            deleted.
                          </p>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              confirmDelete(
                                category
                              )
                            }
                            disabled={
                              isDeleting
                            }
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isDeleting ? (
                              <Loader2
                                size={
                                  16
                                }
                                className="animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <Trash2
                                size={
                                  16
                                }
                                aria-hidden="true"
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
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-zinc-950">
                            {
                              category.name
                            }
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                category.is_active
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-zinc-100 text-zinc-500"
                              }`}
                            >
                              {category.is_active
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              beginEditing(
                                category
                              )
                            }
                            disabled={
                              operationInProgress
                            }
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Pencil
                              size={
                                14
                              }
                              aria-hidden="true"
                            />

                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              requestDelete(
                                category.id
                              )
                            }
                            disabled={
                              operationInProgress
                            }
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-red-100 bg-white px-3 text-xs font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2
                              size={
                                14
                              }
                              aria-hidden="true"
                            />

                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              }
            )}
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-zinc-100 text-zinc-500">
              <Search
                size={20}
                aria-hidden="true"
              />
            </div>

            <p className="mt-4 text-sm font-bold text-zinc-950">
              {searchQuery.trim()
                ? "No categories found"
                : "No categories yet"}
            </p>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
              {searchQuery.trim()
                ? `No category matches "${searchQuery.trim()}".`
                : "Create the first category for this operational location."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}