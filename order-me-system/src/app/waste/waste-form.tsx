"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  Loader2,
  PackageSearch,
  Save,
  Search,
  Tag,
  X,
} from "lucide-react";

import {
  createWasteEntryAction,
  getWasteProductOptions,
  updateWasteEntryAction,
  type WasteProductOption,
  type WasteReason,
  type WasteRecord,
} from "@/app/waste/actions";

import {
  useToast,
} from "@/components/toast-provider";

// =========================================================
// TYPES
// =========================================================

type WasteFormMode =
  | "create"
  | "edit";

type WasteFormProps = {
  mode:
    WasteFormMode;

  initialProductOptions:
    WasteProductOption[];

  waste?:
    WasteRecord;
};

type WasteFormState = {
  wasteDate:
    string;

  productId:
    string;

  qty:
    string;

  reason:
    WasteReason;
};

// =========================================================
// REASON OPTIONS
// =========================================================

const REASON_OPTIONS: {
  value:
    WasteReason;

  label:
    string;
}[] = [
  {
    value:
      "spoiled",

    label:
      "Spoiled",
  },
  {
    value:
      "expired",

    label:
      "Expired",
  },
  {
    value:
      "bad_quality",

    label:
      "Bad quality",
  },
  {
    value:
      "guest_complaint",

    label:
      "Guest Complaint",
  },
];

// =========================================================
// LOCAL DATE
// =========================================================

function getCurrentLocalDate(): string {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

// =========================================================
// NUMBER TO INPUT
// =========================================================

function numberToInput(
  value:
    | number
    | null
    | undefined
): string {
  if (
    value ===
      null ||
    value ===
      undefined ||
    !Number.isFinite(
      value
    )
  ) {
    return "";
  }

  return String(
    value
  );
}

// =========================================================
// INITIAL FORM
// =========================================================

function createInitialState(
  waste:
    | WasteRecord
    | undefined
): WasteFormState {
  if (!waste) {
    return {
      wasteDate:
        getCurrentLocalDate(),

      productId:
        "",

      qty:
        "",

      reason:
        "spoiled",
    };
  }

  return {
    wasteDate:
      waste.waste_date,

    productId:
      waste.product_id,

    qty:
      numberToInput(
        waste.qty
      ),

    reason:
      waste.reason,
  };
}

// =========================================================
// HISTORICAL SELECTED PRODUCT
// =========================================================
//
// In Edit mode the selected Product may not be inside the
// first 100 active Product search results.
//
// The historical Waste snapshot is therefore added to the
// local catalog so the current record can still display
// correctly.
//
// The server remains authoritative when saving.
// =========================================================

function createHistoricalProductOption(
  waste:
    | WasteRecord
    | undefined
): WasteProductOption | null {
  if (!waste) {
    return null;
  }

  return {
    id:
      waste.product_id,

    sku:
      waste.sku_snapshot,

    name:
      waste.product_name_snapshot,

    category_id:
      "",

    category_name:
      waste.category_name_snapshot,

    uom:
      waste.uom_snapshot,

    is_active:
      true,
  };
}

// =========================================================
// MERGE PRODUCT OPTIONS
// =========================================================

function mergeProductOptions(
  current:
    WasteProductOption[],

  incoming:
    WasteProductOption[]
): WasteProductOption[] {
  const map =
    new Map<
      string,
      WasteProductOption
    >();

  for (
    const product of
    current
  ) {
    map.set(
      product.id,
      product
    );
  }

  for (
    const product of
    incoming
  ) {
    map.set(
      product.id,
      product
    );
  }

  return Array.from(
    map.values()
  ).sort(
    (
      first,
      second
    ) =>
      first.name.localeCompare(
        second.name,
        undefined,
        {
          sensitivity:
            "base",
        }
      )
  );
}

// =========================================================
// INITIAL PRODUCT CATALOG
// =========================================================

function createInitialProductCatalog(
  initialProductOptions:
    WasteProductOption[],

  waste:
    | WasteRecord
    | undefined
): WasteProductOption[] {
  const historicalProduct =
    createHistoricalProductOption(
      waste
    );

  if (
    !historicalProduct
  ) {
    return mergeProductOptions(
      [],
      initialProductOptions
    );
  }

  return mergeProductOptions(
    [
      historicalProduct,
    ],
    initialProductOptions
  );
}

// =========================================================
// POSITIVE DECIMAL VALIDATION
// =========================================================

function isValidPositiveDecimal(
  value:
    string
): boolean {
  const normalized =
    value.trim();

  if (
    !/^\d{1,14}(?:\.\d{1,4})?$/.test(
      normalized
    )
  ) {
    return false;
  }

  const numeric =
    Number(
      normalized
    );

  return (
    Number.isFinite(
      numeric
    ) &&
    numeric >
      0
  );
}

// =========================================================
// DATE VALIDATION
// =========================================================

function isValidDate(
  value:
    string
): boolean {
  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    return false;
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
    year <
      2000 ||
    year >
      9999
  ) {
    return false;
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

  return (
    date.getUTCFullYear() ===
      year &&
    date.getUTCMonth() ===
      month -
        1 &&
    date.getUTCDate() ===
      day
  );
}

// =========================================================
// COMPONENT
// =========================================================

export default function WasteForm({
  mode,

  initialProductOptions,

  waste,
}: WasteFormProps) {
  const router =
    useRouter();

  const toast =
    useToast();

  const isEditMode =
    mode ===
    "edit";

  const [
    isSaving,
    startSaveTransition,
  ] =
    useTransition();

  const [
    form,
    setForm,
  ] =
    useState<
      WasteFormState
    >(
      () =>
        createInitialState(
          waste
        )
    );

  const [
    productCatalog,
    setProductCatalog,
  ] =
    useState<
      WasteProductOption[]
    >(
      () =>
        createInitialProductCatalog(
          initialProductOptions,
          waste
        )
    );

  const [
    productSearch,
    setProductSearch,
  ] =
    useState(
      ""
    );

  const [
    productPickerOpen,
    setProductPickerOpen,
  ] =
    useState(
      false
    );

  const [
    isSearchingProducts,
    setIsSearchingProducts,
  ] =
    useState(
      false
    );

  const [
    productSearchError,
    setProductSearchError,
  ] =
    useState<
      string | null
    >(
      null
    );

  const searchRequestRef =
    useRef(
      0
    );

  // =======================================================
  // INITIAL PRODUCT PROP SYNC
  // =======================================================

  useEffect(
    () => {
      setProductCatalog(
        (
          current
        ) =>
          mergeProductOptions(
            current,
            initialProductOptions
          )
      );
    },
    [
      initialProductOptions,
    ]
  );

  // =======================================================
  // SELECTED PRODUCT
  // =======================================================

  const selectedProduct =
    useMemo(
      () =>
        productCatalog.find(
          (
            product
          ) =>
            product.id ===
            form.productId
        ) ??
        null,
      [
        form.productId,
        productCatalog,
      ]
    );

  // =======================================================
  // LOCAL FILTERED PRODUCTS
  // =======================================================

  const filteredProducts =
    useMemo(
      () => {
        const normalizedSearch =
          productSearch
            .trim()
            .toLowerCase();

        if (
          !normalizedSearch
        ) {
          return productCatalog.slice(
            0,
            30
          );
        }

        return productCatalog
          .filter(
            (
              product
            ) => {
              const searchable =
                [
                  product.sku,
                  product.name,
                  product.category_name,
                  product.uom,
                ]
                  .join(
                    " "
                  )
                  .toLowerCase();

              return searchable.includes(
                normalizedSearch
              );
            }
          )
          .slice(
            0,
            30
          );
      },
      [
        productCatalog,
        productSearch,
      ]
    );

  // =======================================================
  // SERVER PRODUCT SEARCH
  // =======================================================

  useEffect(
    () => {
      if (
        !productPickerOpen
      ) {
        return;
      }

      const normalizedSearch =
        productSearch
          .trim()
          .replace(
            /\s+/g,
            " "
          );

      if (
        !normalizedSearch
      ) {
        setProductSearchError(
          null
        );

        setIsSearchingProducts(
          false
        );

        return;
      }

      const requestId =
        searchRequestRef.current +
        1;

      searchRequestRef.current =
        requestId;

      const timeout =
        window.setTimeout(
          async () => {
            setIsSearchingProducts(
              true
            );

            setProductSearchError(
              null
            );

            try {
              const results =
                await getWasteProductOptions(
                  normalizedSearch
                );

              if (
                searchRequestRef.current !==
                requestId
              ) {
                return;
              }

              setProductCatalog(
                (
                  current
                ) =>
                  mergeProductOptions(
                    current,
                    results
                  )
              );
            } catch {
              if (
                searchRequestRef.current ===
                requestId
              ) {
                setProductSearchError(
                  "Unable to search Products."
                );
              }
            } finally {
              if (
                searchRequestRef.current ===
                requestId
              ) {
                setIsSearchingProducts(
                  false
                );
              }
            }
          },
          350
        );

      return () => {
        window.clearTimeout(
          timeout
        );
      };
    },
    [
      productPickerOpen,
      productSearch,
    ]
  );

  // =======================================================
  // UPDATE FIELD
  // =======================================================

  function updateField<
    K extends keyof WasteFormState,
  >(
    field:
      K,

    value:
      WasteFormState[K]
  ) {
    setForm(
      (
        current
      ) => ({
        ...current,

        [field]:
          value,
      })
    );
  }

  // =======================================================
  // SELECT PRODUCT
  // =======================================================

  function selectProduct(
    product:
      WasteProductOption
  ) {
    updateField(
      "productId",
      product.id
    );

    setProductSearch(
      ""
    );

    setProductPickerOpen(
      false
    );

    setProductSearchError(
      null
    );
  }

  // =======================================================
  // CLEAR PRODUCT
  // =======================================================

  function clearProduct() {
    if (
      isSaving
    ) {
      return;
    }

    updateField(
      "productId",
      ""
    );

    setProductSearch(
      ""
    );

    setProductPickerOpen(
      true
    );
  }

  // =======================================================
  // VALIDATION
  // =======================================================

  function validateForm():
    | string
    | null {
    if (
      !isValidDate(
        form.wasteDate
      )
    ) {
      return "Select a valid Waste Date.";
    }

    if (
      !form.productId
    ) {
      return "Select a Product.";
    }

    if (
      !selectedProduct
    ) {
      return "The selected Product could not be resolved.";
    }

    if (
      !isValidPositiveDecimal(
        form.qty
      )
    ) {
      return "Waste Qty must be greater than zero and may contain up to 4 decimal places.";
    }

    if (
      !REASON_OPTIONS.some(
        (
          option
        ) =>
          option.value ===
          form.reason
      )
    ) {
      return "Select a valid Waste reason.";
    }

    return null;
  }

  // =======================================================
  // SUBMIT
  // =======================================================

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      isSaving
    ) {
      return;
    }

    const validationError =
      validateForm();

    if (
      validationError
    ) {
      toast.warning(
        "Check Waste Details",
        validationError
      );

      return;
    }

    startSaveTransition(
      async () => {
        const loadingToast =
          isEditMode
            ? toast.updating(
                "Updating Waste Entry",
                selectedProduct?.name ??
                  "Waste Data"
              )
            : toast.saving(
                "Saving Waste Entry",
                selectedProduct?.name ??
                  "Waste Data"
              );

        const formData =
          new FormData();

        if (
          isEditMode &&
          waste
        ) {
          formData.set(
            "wasteId",
            waste.id
          );
        }

        formData.set(
          "wasteDate",
          form.wasteDate
        );

        formData.set(
          "productId",
          form.productId
        );

        formData.set(
          "qty",
          form.qty.trim()
        );

        formData.set(
          "reason",
          form.reason
        );

        const result =
          isEditMode
            ? await updateWasteEntryAction(
                null,
                formData
              )
            : await createWasteEntryAction(
                null,
                formData
              );

        toast.dismissToast(
          loadingToast
        );

        if (
          !result.success ||
          !result.waste
        ) {
          toast.error(
            isEditMode
              ? "Unable to Update Waste"
              : "Unable to Save Waste",
            result.message
          );

          return;
        }

        toast.success(
          isEditMode
            ? "Waste Entry Updated"
            : "Waste Entry Saved",
          result.message
        );

        router.push(
          "/waste"
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
          MAIN FORM
      =================================================== */}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6">
          <h2 className="text-base font-bold text-zinc-950">
            {
              isEditMode
                ? "Edit Waste Entry"
                : "Waste Entry Details"
            }
          </h2>

          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Select the Product from the existing Product List.
            SKU, Category, and UOM are loaded automatically.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {/* ===============================================
              DATE
          =============================================== */}

          <div>
            <label
              htmlFor="waste-date"
              className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500"
            >
              Date
            </label>

            <div className="relative">
              <CalendarDays
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />

              <input
                id="waste-date"
                type="date"
                value={
                  form.wasteDate
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "wasteDate",
                    event.target.value
                  )
                }
                disabled={
                  isSaving
                }
                required
                className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-11 pr-4 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500"
              />
            </div>
          </div>

          {/* ===============================================
              REASON
          =============================================== */}

          <div>
            <label
              htmlFor="waste-reason"
              className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500"
            >
              Reason
            </label>

            <div className="relative">
              <Tag
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />

              <select
                id="waste-reason"
                value={
                  form.reason
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "reason",
                    event.target.value as WasteReason
                  )
                }
                disabled={
                  isSaving
                }
                className="h-12 w-full appearance-none rounded-xl border border-zinc-200 bg-white pl-11 pr-10 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-50"
              >
                {REASON_OPTIONS.map(
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
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />
            </div>
          </div>

          {/* ===============================================
              PRODUCT PICKER
          =============================================== */}

          <div className="xl:col-span-2">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500">
              Product Name
            </label>

            <div className="relative">
              {/* ===========================================
                  SELECTED PRODUCT
              =========================================== */}

              {selectedProduct &&
              !productPickerOpen ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex items-start gap-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-amber-700 shadow-sm ring-1 ring-zinc-200">
                      <Check
                        size={18}
                        aria-hidden="true"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-zinc-500">
                          {
                            selectedProduct.sku
                          }
                        </span>

                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                          Selected
                        </span>
                      </div>

                      <p className="mt-1 text-sm font-bold text-zinc-950">
                        {
                          selectedProduct.name
                        }
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        <span>
                          {
                            selectedProduct.category_name
                          }
                        </span>

                        <span>
                          •
                        </span>

                        <span className="font-bold uppercase">
                          {
                            selectedProduct.uom
                          }
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={
                        clearProduct
                      }
                      disabled={
                        isSaving
                      }
                      className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* =======================================
                      SEARCH INPUT
                  ======================================= */}

                  <div className="relative">
                    <Search
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                      aria-hidden="true"
                    />

                    <input
                      type="search"
                      value={
                        productSearch
                      }
                      onFocus={() =>
                        setProductPickerOpen(
                          true
                        )
                      }
                      onChange={(
                        event
                      ) => {
                        setProductSearch(
                          event.target.value
                        );

                        setProductPickerOpen(
                          true
                        );
                      }}
                      disabled={
                        isSaving
                      }
                      placeholder="Search Product name, SKU, or Category"
                      autoComplete="off"
                      className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-11 pr-11 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-50"
                    />

                    {productSearch ? (
                      <button
                        type="button"
                        onClick={() =>
                          setProductSearch(
                            ""
                          )
                        }
                        className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                        aria-label="Clear Product search"
                      >
                        <X
                          size={15}
                        />
                      </button>
                    ) : null}
                  </div>

                  {/* =======================================
                      RESULTS
                  ======================================= */}

                  {productPickerOpen ? (
                    <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
                      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                        <div>
                          <p className="text-xs font-bold text-zinc-700">
                            Product List
                          </p>

                          <p className="mt-0.5 text-[10px] text-zinc-400">
                            Select one Product
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setProductPickerOpen(
                              false
                            )
                          }
                          className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                          aria-label="Close Product picker"
                        >
                          <X
                            size={15}
                          />
                        </button>
                      </div>

                      {productSearchError ? (
                        <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
                          {
                            productSearchError
                          }
                        </div>
                      ) : null}

                      <div className="max-h-80 overflow-y-auto">
                        {filteredProducts.length >
                        0 ? (
                          filteredProducts.map(
                            (
                              product
                            ) => (
                              <button
                                key={
                                  product.id
                                }
                                type="button"
                                onClick={() =>
                                  selectProduct(
                                    product
                                  )
                                }
                                className="flex w-full items-start gap-3 border-b border-zinc-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-zinc-50"
                              >
                                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-500">
                                  <PackageSearch
                                    size={16}
                                  />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-zinc-500">
                                      {
                                        product.sku
                                      }
                                    </span>

                                    {product.id ===
                                    form.productId ? (
                                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                                        Current
                                      </span>
                                    ) : null}
                                  </div>

                                  <p className="mt-1 text-sm font-semibold text-zinc-950">
                                    {
                                      product.name
                                    }
                                  </p>

                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                                    <span>
                                      {
                                        product.category_name
                                      }
                                    </span>

                                    <span>
                                      •
                                    </span>

                                    <span className="font-semibold uppercase">
                                      {
                                        product.uom
                                      }
                                    </span>
                                  </div>
                                </div>
                              </button>
                            )
                          )
                        ) : (
                          <div className="px-4 py-10 text-center">
                            {isSearchingProducts ? (
                              <>
                                <Loader2
                                  size={21}
                                  className="mx-auto animate-spin text-zinc-400"
                                />

                                <p className="mt-3 text-xs font-semibold text-zinc-500">
                                  Searching Products...
                                </p>
                              </>
                            ) : (
                              <>
                                <PackageSearch
                                  size={22}
                                  className="mx-auto text-zinc-300"
                                />

                                <p className="mt-3 text-xs font-semibold text-zinc-700">
                                  No Products found
                                </p>

                                <p className="mt-1 text-[11px] text-zinc-400">
                                  Try another Product name, SKU, or Category.
                                </p>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {isSearchingProducts &&
                      filteredProducts.length >
                        0 ? (
                        <div className="flex items-center justify-center gap-2 border-t border-zinc-100 bg-zinc-50 px-4 py-2 text-[10px] font-semibold text-zinc-500">
                          <Loader2
                            size={12}
                            className="animate-spin"
                          />

                          Searching complete Product List...
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {/* ===============================================
              PRODUCT INFORMATION
          =============================================== */}

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500">
              SKU
            </label>

            <div className="flex min-h-12 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-4 font-mono text-sm font-semibold text-zinc-600">
              {
                selectedProduct?.sku ??
                "Automatic from Product List"
              }
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500">
              Category
            </label>

            <div className="flex min-h-12 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-600">
              {
                selectedProduct?.category_name ??
                "Automatic from Product List"
              }
            </div>
          </div>

          {/* ===============================================
              QTY
          =============================================== */}

          <div>
            <label
              htmlFor="waste-qty"
              className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500"
            >
              Qty
            </label>

            <input
              id="waste-qty"
              type="number"
              inputMode="decimal"
              min="0.0001"
              max="99999999999999.9999"
              step="0.0001"
              value={
                form.qty
              }
              onChange={(
                event
              ) =>
                updateField(
                  "qty",
                  event.target.value
                )
              }
              disabled={
                isSaving
              }
              placeholder="Enter Waste Qty"
              required
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-50"
            />

            <p className="mt-2 text-[11px] text-zinc-400">
              Waste Qty must be greater than zero.
            </p>
          </div>

          {/* ===============================================
              AUTOMATIC UOM
          =============================================== */}

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500">
              UOM
            </label>

            <div className="flex h-12 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-4">
              {selectedProduct ? (
                <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-bold uppercase text-zinc-700">
                  {
                    selectedProduct.uom
                  }
                </span>
              ) : (
                <span className="text-sm text-zinc-400">
                  Automatic from Product List
                </span>
              )}
            </div>

            <p className="mt-2 text-[11px] text-zinc-400">
              UOM cannot be manually changed in Waste Data.
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================
          SUMMARY
      =================================================== */}

      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
          Waste Entry Summary
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
              Date
            </p>

            <p className="mt-1 text-sm font-semibold text-zinc-800">
              {
                form.wasteDate ||
                "—"
              }
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
              Product
            </p>

            <p className="mt-1 truncate text-sm font-semibold text-zinc-800">
              {
                selectedProduct?.name ??
                "—"
              }
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
              Waste Qty
            </p>

            <p className="mt-1 text-sm font-semibold text-zinc-800">
              {
                form.qty ||
                "—"
              }{" "}
              {
                selectedProduct?.uom ??
                ""
              }
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
              Reason
            </p>

            <p className="mt-1 text-sm font-semibold text-zinc-800">
              {
                REASON_OPTIONS.find(
                  (
                    option
                  ) =>
                    option.value ===
                    form.reason
                )?.label ??
                "—"
              }
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================
          ACTIONS
      =================================================== */}

      <section className="flex flex-col-reverse gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-end sm:p-6">
        <Link
          href="/waste"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          <ArrowLeft
            size={16}
            aria-hidden="true"
          />

          Cancel
        </Link>

        <button
          type="submit"
          disabled={
            isSaving
          }
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? (
            <Loader2
              size={16}
              className="animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Save
              size={16}
              aria-hidden="true"
            />
          )}

          {isSaving
            ? isEditMode
              ? "Updating..."
              : "Saving..."
            : isEditMode
              ? "Update Waste"
              : "Save Waste"}
        </button>
      </section>
    </form>
  );
}