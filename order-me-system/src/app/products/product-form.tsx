"use client";

import {
  type FormEvent,
  useMemo,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import {
  useRouter,
} from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Hash,
  Loader2,
  Package,
  Save,
  X,
} from "lucide-react";

import {
  createProductAction,
  updateProductAction,
  type ProductPackagingUom,
  type ProductRecord,
  type ProductUom,
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

type ProductFormMode =
  | "create"
  | "edit";

type ProductFormProps = {
  mode: ProductFormMode;
  categories: CategoryRecord[];
  product?: ProductRecord;
};

type ProductFormState = {
  name: string;
  categoryId: string;
  amountQty: string;
  uom: ProductUom;
  packagingSizeAmount: string;
  packagingUom: ProductPackagingUom;
};

// =========================================================
// CONSTANTS
// =========================================================

const PRODUCT_UOMS: {
  value: ProductUom;
  label: string;
}[] = [
  {
    value: "ml",
    label: "ml",
  },
  {
    value: "pc",
    label: "pc",
  },
  {
    value: "gram",
    label: "gram",
  },
];

const PACKAGING_UOMS: {
  value: ProductPackagingUom;
  label: string;
}[] = [
  {
    value: "bottle",
    label: "bottle",
  },
  {
    value: "box",
    label: "box",
  },
  {
    value: "pack",
    label: "pack",
  },
  {
    value: "can",
    label: "can",
  },
];

// =========================================================
// HELPERS
// =========================================================

function numericValueToInput(
  value:
    | number
    | null
    | undefined
): string {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "";
  }

  return String(value);
}

function createInitialState(
  product:
    | ProductRecord
    | undefined
): ProductFormState {
  if (!product) {
    return {
      name: "",
      categoryId: "",
      amountQty: "",
      uom: "ml",
      packagingSizeAmount: "",
      packagingUom: "bottle",
    };
  }

  return {
    name:
      product.name,

    categoryId:
      product.category_id,

    amountQty:
      numericValueToInput(
        product.amount_qty
      ),

    uom:
      product.uom,

    packagingSizeAmount:
      numericValueToInput(
        product.packaging_size_amount
      ),

    packagingUom:
      product.packaging_uom,
  };
}

function isValidPositiveDecimal(
  value: string
): boolean {
  const normalized =
    value.trim();

  if (
    !/^(?:\d{1,14})(?:\.\d{1,4})?$/.test(
      normalized
    )
  ) {
    return false;
  }

  const numericValue =
    Number(normalized);

  return (
    Number.isFinite(
      numericValue
    ) &&
    numericValue > 0
  );
}

// =========================================================
// COMPONENT
// =========================================================

export default function ProductForm({
  mode,
  categories,
  product,
}: ProductFormProps) {
  const router =
    useRouter();

  const toast =
    useToast();

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [
    form,
    setForm,
  ] =
    useState<ProductFormState>(
      () =>
        createInitialState(
          product
        )
    );

  // =======================================================
  // ACTIVE CATEGORIES ONLY
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

  const hasCategories =
    activeCategories.length >
    0;

  const isEditMode =
    mode === "edit";

  // =======================================================
  // FIELD UPDATE
  // =======================================================

  function updateField<
    K extends keyof ProductFormState,
  >(
    field: K,
    value: ProductFormState[K]
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]:
          value,
      })
    );
  }

  // =======================================================
  // CLIENT VALIDATION
  // =======================================================

  function validateForm():
    | string
    | null {
    const productName =
      form.name
        .trim()
        .replace(
          /\s+/g,
          " "
        );

    if (!productName) {
      return "Enter a product name.";
    }

    if (
      productName.length >
      200
    ) {
      return "Product name must not exceed 200 characters.";
    }

    if (
      !form.categoryId
    ) {
      return "Select a product category.";
    }

    if (
      !isValidPositiveDecimal(
        form.amountQty
      )
    ) {
      return "Amount QTY must be greater than zero and may contain up to 4 decimal places.";
    }

    if (
      !isValidPositiveDecimal(
        form.packagingSizeAmount
      )
    ) {
      return "Packaging Size Amount must be greater than zero and may contain up to 4 decimal places.";
    }

    return null;
  }

  // =======================================================
  // SUBMIT
  // =======================================================

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    if (!hasCategories) {
      toast.warning(
        "Category Required",
        "Create at least one active category before adding a product."
      );

      return;
    }

    const validationError =
      validateForm();

    if (
      validationError
    ) {
      toast.warning(
        "Check Product Details",
        validationError
      );

      return;
    }

    startTransition(
      async () => {
        const loadingToast =
          isEditMode
            ? toast.updating(
                "Updating Product",
                form.name.trim()
              )
            : toast.saving(
                "Saving Product",
                form.name.trim()
              );

        const formData =
          new FormData();

        if (
          isEditMode &&
          product
        ) {
          formData.set(
            "productId",
            product.id
          );
        }

        formData.set(
          "name",
          form.name
            .trim()
            .replace(
              /\s+/g,
              " "
            )
        );

        formData.set(
          "categoryId",
          form.categoryId
        );

        formData.set(
          "amountQty",
          form.amountQty.trim()
        );

        formData.set(
          "uom",
          form.uom
        );

        formData.set(
          "packagingSizeAmount",
          form.packagingSizeAmount.trim()
        );

        formData.set(
          "packagingUom",
          form.packagingUom
        );

        const result =
          isEditMode
            ? await updateProductAction(
                null,
                formData
              )
            : await createProductAction(
                null,
                formData
              );

        toast.dismissToast(
          loadingToast
        );

        if (
          !result.success ||
          !result.product
        ) {
          toast.error(
            isEditMode
              ? "Unable to Update Product"
              : "Unable to Save Product",
            result.message
          );

          return;
        }

        toast.success(
          isEditMode
            ? "Product Updated"
            : "Product Saved",
          isEditMode
            ? `${result.product.name} was updated successfully.`
            : `${result.product.name} was created as ${result.product.sku}.`
        );

        router.push(
          "/products"
        );

        router.refresh();
      }
    );
  }

  // =======================================================
  // UI
  // =======================================================

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="space-y-6"
    >
      {/* ===================================================
          PRODUCT IDENTITY
      =================================================== */}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-zinc-950 text-white">
              <Package
                size={19}
                aria-hidden="true"
              />
            </div>

            <div>
              <h2 className="text-base font-bold text-zinc-950">
                Product Details
              </h2>

              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Enter the product information used by the
                ordering and production system.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-2">
          {/* ===============================================
              PRODUCT NAME
          =============================================== */}

          <div className="lg:col-span-2">
            <label
              htmlFor="product-name"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              Product Name
            </label>

            <input
              id="product-name"
              name="name"
              type="text"
              value={
                form.name
              }
              onChange={(
                event
              ) =>
                updateField(
                  "name",
                  event.target
                    .value
                )
              }
              maxLength={
                200
              }
              disabled={
                isPending
              }
              autoComplete="off"
              placeholder="Enter product name"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
            />

            <p className="mt-2 text-xs text-zinc-400">
              Maximum 200
              characters.
            </p>
          </div>

          {/* ===============================================
              SKU
          =============================================== */}

          <div>
            <label
              htmlFor="product-sku"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              SKU
            </label>

            <div className="relative">
              <Hash
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                id="product-sku"
                type="text"
                readOnly
                tabIndex={-1}
                value={
                  product?.sku ??
                  "System generated on save"
                }
                className="h-11 w-full cursor-default rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm font-semibold text-zinc-500 outline-none"
              />
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400">
              <CheckCircle2
                size={13}
                aria-hidden="true"
              />

              SKU is generated automatically and cannot be
              manually changed.
            </div>
          </div>

          {/* ===============================================
              CATEGORY
          =============================================== */}

          <div>
            <label
              htmlFor="product-category"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              Product Category
            </label>

            <div className="relative">
              <select
                id="product-category"
                name="categoryId"
                value={
                  form.categoryId
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "categoryId",
                    event.target
                      .value
                  )
                }
                disabled={
                  isPending ||
                  !hasCategories
                }
                className="h-11 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-4 pr-10 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
              >
                <option value="">
                  Select category
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
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          PRODUCT QUANTITY
      =================================================== */}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-5 sm:p-6">
          <h2 className="text-base font-bold text-zinc-950">
            Product Quantity
          </h2>

          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Define the base amount and unit of measurement
            for this product.
          </p>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-2">
          {/* ===============================================
              AMOUNT QTY
          =============================================== */}

          <div>
            <label
              htmlFor="amount-qty"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              Amount QTY
            </label>

            <input
              id="amount-qty"
              name="amountQty"
              type="number"
              min="0.0001"
              max="99999999999999.9999"
              step="0.0001"
              inputMode="decimal"
              value={
                form.amountQty
              }
              onChange={(
                event
              ) =>
                updateField(
                  "amountQty",
                  event.target
                    .value
                )
              }
              disabled={
                isPending
              }
              placeholder="0"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
            />

            <p className="mt-2 text-xs text-zinc-400">
              Decimals up to
              4 places are
              supported.
            </p>
          </div>

          {/* ===============================================
              UOM
          =============================================== */}

          <div>
            <label
              htmlFor="product-uom"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              UOM
            </label>

            <div className="relative">
              <select
                id="product-uom"
                name="uom"
                value={
                  form.uom
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "uom",
                    event.target
                      .value as ProductUom
                  )
                }
                disabled={
                  isPending
                }
                className="h-11 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-4 pr-10 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
              >
                {PRODUCT_UOMS.map(
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
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
            </div>

            <p className="mt-2 text-xs text-zinc-400">
              Allowed units:
              ml, pc, gram.
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================
          PACKAGING
      =================================================== */}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-5 sm:p-6">
          <h2 className="text-base font-bold text-zinc-950">
            Packaging
          </h2>

          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Define how the product is packed or ordered.
          </p>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-2">
          {/* ===============================================
              PACKAGING SIZE AMOUNT
          =============================================== */}

          <div>
            <label
              htmlFor="packaging-size"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              Packaging Size Amount
            </label>

            <input
              id="packaging-size"
              name="packagingSizeAmount"
              type="number"
              min="0.0001"
              max="99999999999999.9999"
              step="0.0001"
              inputMode="decimal"
              value={
                form.packagingSizeAmount
              }
              onChange={(
                event
              ) =>
                updateField(
                  "packagingSizeAmount",
                  event.target
                    .value
                )
              }
              disabled={
                isPending
              }
              placeholder="0"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
            />

            <p className="mt-2 text-xs text-zinc-400">
              Example: 24
              bottles per box.
            </p>
          </div>

          {/* ===============================================
              PACKAGING UOM
          =============================================== */}

          <div>
            <label
              htmlFor="packaging-uom"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              Packaging UOM
            </label>

            <div className="relative">
              <select
                id="packaging-uom"
                name="packagingUom"
                value={
                  form.packagingUom
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "packagingUom",
                    event.target
                      .value as ProductPackagingUom
                  )
                }
                disabled={
                  isPending
                }
                className="h-11 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-4 pr-10 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
              >
                {PACKAGING_UOMS.map(
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
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
            </div>

            <p className="mt-2 text-xs text-zinc-400">
              Allowed packaging:
              bottle, box, pack,
              can.
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================
          NO CATEGORY WARNING
      =================================================== */}

      {!hasCategories ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={19}
              className="mt-0.5 shrink-0 text-amber-700"
              aria-hidden="true"
            />

            <div>
              <p className="text-sm font-bold text-amber-900">
                Category Required
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                At least one active category is required
                before a product can be saved.
              </p>

              <Link
                href="/categories"
                className="mt-3 inline-flex text-sm font-bold text-amber-900 underline underline-offset-4"
              >
                Manage Categories
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* ===================================================
          ACTIONS
      =================================================== */}

      <section className="flex flex-col-reverse gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-end sm:p-6">
        <Link
          href="/products"
          aria-disabled={
            isPending
          }
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 ${
            isPending
              ? "pointer-events-none opacity-50"
              : ""
          }`}
        >
          <X
            size={16}
            aria-hidden="true"
          />

          Cancel
        </Link>

        <button
          type="submit"
          disabled={
            isPending ||
            !hasCategories
          }
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2
                size={16}
                className="animate-spin"
                aria-hidden="true"
              />

              {isEditMode
                ? "Updating..."
                : "Saving..."}
            </>
          ) : (
            <>
              <Save
                size={16}
                aria-hidden="true"
              />

              {isEditMode
                ? "Update Product"
                : "Save Product"}
            </>
          )}
        </button>
      </section>
    </form>
  );
}