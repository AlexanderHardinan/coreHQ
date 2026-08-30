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
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Hash,
  Loader2,
  PackageSearch,
  Plus,
  Save,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import {
  createNormalOrderAction,
  getNormalOrderProductOptions,
  updateNormalOrderAction,
  type NormalOrderProductOption,
  type NormalOrderRecord,
  type NormalOrderStatus,
} from "@/app/orders/normal/actions";

import {
  useToast,
} from "@/components/toast-provider";

// =========================================================
// TYPES
// =========================================================

type NormalOrderFormMode =
  | "create"
  | "edit";

type NormalOrderFormProps = {
  mode: NormalOrderFormMode;

  initialProductOptions:
    NormalOrderProductOption[];

  order?: NormalOrderRecord;
};

type NormalOrderFormItem = {
  rowKey: string;

  productId: string;

  onHandQty: string;

  requestedQty: string;
};

type NormalOrderFormState = {
  orderDate: string;

  orderedBy: string;

  status: NormalOrderStatus;

  items: NormalOrderFormItem[];
};

type ProductCatalogRecord =
  NormalOrderProductOption & {
    source:
      | "live"
      | "current-order";
  };

// =========================================================
// CONSTANTS
// =========================================================

const STATUS_OPTIONS: {
  value: NormalOrderStatus;
  label: string;
}[] = [
  {
    value: "draft",
    label: "Draft",
  },
  {
    value: "submitted",
    label: "Submitted",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
];

// =========================================================
// LOCAL DATE
// =========================================================

function getLocalDateInputValue():
  string {
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
// NUMBER → INPUT
// =========================================================

function quantityToInput(
  value:
    | number
    | null
    | undefined
): string {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(
      value
    )
  ) {
    return "0";
  }

  return String(
    value
  );
}

// =========================================================
// BLANK ROW
// =========================================================

function createBlankItem(
  index: number
): NormalOrderFormItem {
  return {
    rowKey:
      `new-${Date.now()}-${index}`,

    productId:
      "",

    onHandQty:
      "0",

    requestedQty:
      "0",
  };
}

// =========================================================
// INITIAL FORM STATE
// =========================================================

function createInitialState(
  order:
    | NormalOrderRecord
    | undefined
): NormalOrderFormState {
  if (!order) {
    return {
      orderDate:
        getLocalDateInputValue(),

      orderedBy:
        "",

      status:
        "draft",

      items: [
        createBlankItem(
          0
        ),
      ],
    };
  }

  return {
    orderDate:
      order.order_date,

    orderedBy:
      order.ordered_by,

    status:
      order.status,

    items:
      order.items.length >
      0
        ? order.items.map(
            (
              item
            ) => ({
              rowKey:
                item.id,

              productId:
                item.product_id,

              onHandQty:
                quantityToInput(
                  item.on_hand_qty
                ),

              requestedQty:
                quantityToInput(
                  item.requested_qty
                ),
            })
          )
        : [
            createBlankItem(
              0
            ),
          ],
  };
}

// =========================================================
// INITIAL PRODUCT CATALOG
// =========================================================
//
// Existing order items may not appear in the first Product
// search result page.
//
// Their historical snapshot data is therefore added to the
// local UI catalog so Edit mode never loses the Product that
// is already displayed on the saved order.
//
// Live search results replace these records when available.
// =========================================================

function createInitialProductCatalog(
  initialProductOptions:
    NormalOrderProductOption[],
  order:
    | NormalOrderRecord
    | undefined
): ProductCatalogRecord[] {
  const map =
    new Map<
      string,
      ProductCatalogRecord
    >();

  for (
    const product of
    initialProductOptions
  ) {
    map.set(
      product.id,
      {
        ...product,
        source:
          "live",
      }
    );
  }

  if (order) {
    for (
      const item of
      order.items
    ) {
      if (
        map.has(
          item.product_id
        )
      ) {
        continue;
      }

      map.set(
        item.product_id,
        {
          id:
            item.product_id,

          sku:
            item.sku_snapshot,

          name:
            item.product_name_snapshot,

          category_id:
            "",

          category_name:
            item.category_name_snapshot,

          uom:
            item.uom,

          is_active:
            true,

          source:
            "current-order",
        }
      );
    }
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
// MERGE LIVE SEARCH RESULTS
// =========================================================

function mergeProductOptions(
  current:
    ProductCatalogRecord[],
  incoming:
    NormalOrderProductOption[]
): ProductCatalogRecord[] {
  const map =
    new Map<
      string,
      ProductCatalogRecord
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
      {
        ...product,
        source:
          "live",
      }
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
// DECIMAL VALIDATION
// =========================================================

function isValidNonNegativeDecimal(
  value: string
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
    numeric >= 0
  );
}

// =========================================================
// COMPONENT
// =========================================================

export default function NormalOrderForm({
  mode,
  initialProductOptions,
  order,
}: NormalOrderFormProps) {
  const router =
    useRouter();

  const toast =
    useToast();

  const isEditMode =
    mode === "edit";

  const [
    isSaving,
    startSaveTransition,
  ] =
    useTransition();

  const [
    form,
    setForm,
  ] =
    useState<NormalOrderFormState>(
      () =>
        createInitialState(
          order
        )
    );

  const [
    productCatalog,
    setProductCatalog,
  ] =
    useState<
      ProductCatalogRecord[]
    >(
      () =>
        createInitialProductCatalog(
          initialProductOptions,
          order
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
  // PROP PRODUCT SYNC
  // =======================================================

  useEffect(() => {
    setProductCatalog(
      (
        current
      ) =>
        mergeProductOptions(
          current,
          initialProductOptions
        )
    );
  }, [
    initialProductOptions,
  ]);

  // =======================================================
  // PRODUCT SEARCH
  // =======================================================

  useEffect(() => {
    const normalizedSearch =
      productSearch
        .trim()
        .replace(
          /\s+/g,
          " "
        );

    if (!normalizedSearch) {
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
              await getNormalOrderProductOptions(
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
        400
      );

    return () => {
      window.clearTimeout(
        timeout
      );
    };
  }, [
    productSearch,
  ]);

  // =======================================================
  // PRODUCT MAP
  // =======================================================

  const productMap =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            ProductCatalogRecord
          >();

        for (
          const product of
          productCatalog
        ) {
          map.set(
            product.id,
            product
          );
        }

        return map;
      },
      [
        productCatalog,
      ]
    );

  // =======================================================
  // FILTERED PRODUCTS
  // =======================================================

  const filteredProducts =
    useMemo(
      () => {
        const search =
          productSearch
            .trim()
            .toLowerCase();

        if (!search) {
          return productCatalog;
        }

        return productCatalog.filter(
          (
            product
          ) =>
            product.name
              .toLowerCase()
              .includes(
                search
              ) ||
            product.sku
              .toLowerCase()
              .includes(
                search
              ) ||
            product.category_name
              .toLowerCase()
              .includes(
                search
              )
        );
      },
      [
        productCatalog,
        productSearch,
      ]
    );

  // =======================================================
  // SELECTED PRODUCT IDS
  // =======================================================

  const selectedProductIds =
    useMemo(
      () =>
        new Set(
          form.items
            .map(
              (
                item
              ) =>
                item.productId
            )
            .filter(
              Boolean
            )
        ),
      [
        form.items,
      ]
    );

  const hasProducts =
    productCatalog.length >
    0;

  // =======================================================
  // MAIN FIELD
  // =======================================================

  function updateMainField<
    K extends
      | "orderDate"
      | "orderedBy"
      | "status",
  >(
    field: K,
    value: NormalOrderFormState[K]
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
  // ITEM FIELD
  // =======================================================

  function updateItem(
    rowKey: string,
    changes: Partial<NormalOrderFormItem>
  ) {
    setForm(
      (
        current
      ) => ({
        ...current,

        items:
          current.items.map(
            (
              item
            ) =>
              item.rowKey ===
              rowKey
                ? {
                    ...item,
                    ...changes,
                  }
                : item
          ),
      })
    );
  }

  // =======================================================
  // PRODUCT SELECT
  // =======================================================

  function handleProductSelect(
    rowKey: string,
    productId: string
  ) {
    if (!productId) {
      updateItem(
        rowKey,
        {
          productId:
            "",
        }
      );

      return;
    }

    const duplicate =
      form.items.some(
        (
          item
        ) =>
          item.rowKey !==
            rowKey &&
          item.productId ===
            productId
      );

    if (duplicate) {
      const product =
        productMap.get(
          productId
        );

      toast.warning(
        "Duplicate Product",
        product
          ? `${product.name} is already included in this Normal Order.`
          : "This Product is already included in this Normal Order."
      );

      return;
    }

    const product =
      productMap.get(
        productId
      );

    if (!product) {
      toast.error(
        "Product Unavailable",
        "The selected Product could not be loaded."
      );

      return;
    }

    updateItem(
      rowKey,
      {
        productId:
          product.id,
      }
    );
  }

  // =======================================================
  // ADD PRODUCT
  // =======================================================

  function addProductRow() {
    setForm(
      (
        current
      ) => ({
        ...current,

        items: [
          ...current.items,

          createBlankItem(
            current.items.length
          ),
        ],
      })
    );
  }

  // =======================================================
  // REMOVE PRODUCT
  // =======================================================

  function removeProductRow(
    rowKey: string
  ) {
    setForm(
      (
        current
      ) => {
        if (
          current.items.length ===
          1
        ) {
          return {
            ...current,

            items: [
              createBlankItem(
                0
              ),
            ],
          };
        }

        return {
          ...current,

          items:
            current.items.filter(
              (
                item
              ) =>
                item.rowKey !==
                rowKey
            ),
        };
      }
    );
  }

  // =======================================================
  // VALIDATION
  // =======================================================

  function validateForm():
    | string
    | null {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        form.orderDate
      )
    ) {
      return "Select a valid Order Date.";
    }

    const orderedBy =
      form.orderedBy
        .trim()
        .replace(
          /\s+/g,
          " "
        );

    if (!orderedBy) {
      return "Enter the person responsible in Ordered By.";
    }

    if (
      orderedBy.length >
      200
    ) {
      return "Ordered By must not exceed 200 characters.";
    }

    if (
      form.items.length ===
      0
    ) {
      return "Add at least one Product.";
    }

    const productIds =
      new Set<string>();

    for (
      let index = 0;
      index <
      form.items.length;
      index += 1
    ) {
      const item =
        form.items[
          index
        ];

      if (
        !item.productId
      ) {
        return `Select a Product for row ${index + 1}.`;
      }

      if (
        productIds.has(
          item.productId
        )
      ) {
        return "The same Product cannot appear more than once in the Normal Order.";
      }

      productIds.add(
        item.productId
      );

      if (
        !isValidNonNegativeDecimal(
          item.onHandQty
        )
      ) {
        return `Enter a valid On Hand Qty for row ${index + 1}.`;
      }

      if (
        !isValidNonNegativeDecimal(
          item.requestedQty
        )
      ) {
        return `Enter a valid Order Request Qty for row ${index + 1}.`;
      }
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

    if (isSaving) {
      return;
    }

    const validationError =
      validateForm();

    if (
      validationError
    ) {
      toast.warning(
        "Check Order Details",
        validationError
      );

      return;
    }

    startSaveTransition(
      async () => {
        const loadingToast =
          isEditMode
            ? toast.updating(
                "Updating Normal Order",
                order?.order_number ??
                  form.orderedBy.trim()
              )
            : toast.saving(
                "Saving Normal Order",
                form.orderedBy.trim()
              );

        const formData =
          new FormData();

        if (
          isEditMode &&
          order
        ) {
          formData.set(
            "orderId",
            order.id
          );
        }

        formData.set(
          "orderDate",
          form.orderDate
        );

        formData.set(
          "orderedBy",
          form.orderedBy
            .trim()
            .replace(
              /\s+/g,
              " "
            )
        );

        formData.set(
          "status",
          form.status
        );

        formData.set(
          "items",
          JSON.stringify(
            form.items.map(
              (
                item
              ) => ({
                productId:
                  item.productId,

                onHandQty:
                  item.onHandQty.trim(),

                requestedQty:
                  item.requestedQty.trim(),
              })
            )
          )
        );

        const result =
          isEditMode
            ? await updateNormalOrderAction(
                null,
                formData
              )
            : await createNormalOrderAction(
                null,
                formData
              );

        toast.dismissToast(
          loadingToast
        );

        if (
          !result.success ||
          !result.order
        ) {
          toast.error(
            isEditMode
              ? "Unable to Update Order"
              : "Unable to Save Order",
            result.message
          );

          return;
        }

        toast.success(
          isEditMode
            ? "Normal Order Updated"
            : "Normal Order Saved",
          result.message
        );

        router.push(
          "/orders/normal"
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
          ORDER HEADER
      =================================================== */}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-zinc-950 text-white">
              <ClipboardList
                size={20}
                aria-hidden="true"
              />
            </div>

            <div>
              <h2 className="text-base font-bold text-zinc-950">
                Order Information
              </h2>

              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Define the Normal Order date, responsible
                person, and current order status.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-3">
          {/* ===============================================
              ORDER NUMBER — EDIT ONLY
          =============================================== */}

          {isEditMode &&
          order ? (
            <div className="lg:col-span-3">
              <label
                htmlFor="normal-order-number"
                className="mb-2 block text-sm font-semibold text-zinc-800"
              >
                Order Number
              </label>

              <div className="relative">
                <Hash
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                />

                <input
                  id="normal-order-number"
                  type="text"
                  readOnly
                  value={
                    order.order_number
                  }
                  className="h-11 w-full cursor-default rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 font-mono text-sm font-semibold text-zinc-700 outline-none"
                />
              </div>

              <p className="mt-2 text-xs text-zinc-400">
                Order numbers are generated by the system and
                cannot be changed.
              </p>
            </div>
          ) : null}

          {/* ===============================================
              ORDER DATE
          =============================================== */}

          <div>
            <label
              htmlFor="normal-order-date"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              Date
            </label>

            <div className="relative">
              <CalendarDays
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                id="normal-order-date"
                type="date"
                min="2000-01-01"
                max="9999-12-31"
                value={
                  form.orderDate
                }
                onChange={(
                  event
                ) =>
                  updateMainField(
                    "orderDate",
                    event.target.value
                  )
                }
                disabled={
                  isSaving
                }
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
              />
            </div>
          </div>

          {/* ===============================================
              ORDERED BY
          =============================================== */}

          <div>
            <label
              htmlFor="normal-order-ordered-by"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              Order By
            </label>

            <div className="relative">
              <UserRound
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                id="normal-order-ordered-by"
                type="text"
                value={
                  form.orderedBy
                }
                onChange={(
                  event
                ) =>
                  updateMainField(
                    "orderedBy",
                    event.target.value
                  )
                }
                disabled={
                  isSaving
                }
                maxLength={
                  200
                }
                autoComplete="off"
                placeholder="Enter name"
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
              />
            </div>
          </div>

          {/* ===============================================
              STATUS
          =============================================== */}

          <div>
            <label
              htmlFor="normal-order-status"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              Status
            </label>

            <div className="relative">
              <select
                id="normal-order-status"
                value={
                  form.status
                }
                onChange={(
                  event
                ) =>
                  updateMainField(
                    "status",
                    event.target
                      .value as NormalOrderStatus
                  )
                }
                disabled={
                  isSaving
                }
                className="h-11 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-4 pr-10 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
              >
                {STATUS_OPTIONS.map(
                  (
                    status
                  ) => (
                    <option
                      key={
                        status.value
                      }
                      value={
                        status.value
                      }
                    >
                      {
                        status.label
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
          PRODUCT ORDER TABLE
      =================================================== */}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {/* =================================================
            PRODUCT TABLE HEADER
        ================================================= */}

        <div className="border-b border-zinc-200 p-5 sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
                <PackageSearch
                  size={20}
                  aria-hidden="true"
                />
              </div>

              <div>
                <h2 className="text-base font-bold text-zinc-950">
                  Products
                </h2>

                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Add Products and enter the current On Hand
                  and Order Request quantities.
                </p>
              </div>
            </div>

            {/* =============================================
                PRODUCT SEARCH
            ============================================= */}

            <div className="w-full xl:max-w-md">
              <label
                htmlFor="normal-order-product-search"
                className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-zinc-500"
              >
                Search Product Database
              </label>

              <div className="relative">
                {isSearchingProducts ? (
                  <Loader2
                    size={16}
                    aria-hidden="true"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 animate-spin text-zinc-400"
                  />
                ) : (
                  <Search
                    size={16}
                    aria-hidden="true"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                )}

                <input
                  id="normal-order-product-search"
                  type="search"
                  value={
                    productSearch
                  }
                  onChange={(
                    event
                  ) =>
                    setProductSearch(
                      event.target.value
                    )
                  }
                  disabled={
                    isSaving
                  }
                  autoComplete="off"
                  placeholder="Search SKU, Product or Category..."
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-10 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-4 focus:ring-zinc-100 disabled:bg-zinc-50"
                />

                {productSearch ? (
                  <button
                    type="button"
                    onClick={() =>
                      setProductSearch(
                        ""
                      )
                    }
                    disabled={
                      isSaving
                    }
                    className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                    aria-label="Clear Product search"
                  >
                    <X
                      size={14}
                    />
                  </button>
                ) : null}
              </div>

              {productSearchError ? (
                <p className="mt-2 text-xs font-medium text-red-600">
                  {
                    productSearchError
                  }
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* =================================================
            NO PRODUCTS
        ================================================= */}

        {!hasProducts ? (
          <div className="border-b border-amber-200 bg-amber-50 p-5 sm:p-6">
            <p className="text-sm font-bold text-amber-900">
              Products Required
            </p>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              Create at least one active Product before
              creating a Normal Order.
            </p>

            <Link
              href="/products/new"
              className="mt-3 inline-flex text-sm font-bold text-amber-900 underline underline-offset-4"
            >
              Add Product
            </Link>
          </div>
        ) : null}

        {/* =================================================
            PRODUCT ROWS
        ================================================= */}

        <div className="divide-y divide-zinc-100">
          {form.items.map(
            (
              item,
              index
            ) => {
              const selectedProduct =
                productMap.get(
                  item.productId
                );

              const visibleProducts =
                selectedProduct &&
                !filteredProducts.some(
                  (
                    product
                  ) =>
                    product.id ===
                    selectedProduct.id
                )
                  ? [
                      selectedProduct,
                      ...filteredProducts,
                    ]
                  : filteredProducts;

              return (
                <div
                  key={
                    item.rowKey
                  }
                  className="p-5 sm:p-6"
                >
                  {/* =======================================
                      ROW HEADER
                  ======================================= */}

                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
                      Product{" "}
                      {index + 1}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        removeProductRow(
                          item.rowKey
                        )
                      }
                      disabled={
                        isSaving
                      }
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2
                        size={14}
                        aria-hidden="true"
                      />

                      Remove
                    </button>
                  </div>

                  {/* =======================================
                      PRODUCT / CATEGORY / UOM
                  ======================================= */}

                  <div className="grid gap-4 xl:grid-cols-[minmax(260px,1.7fr)_minmax(170px,1fr)_100px_minmax(150px,0.8fr)_minmax(170px,0.9fr)]">
                    {/* =====================================
                        PRODUCT
                    ===================================== */}

                    <div>
                      <label
                        htmlFor={`normal-order-product-${item.rowKey}`}
                        className="mb-2 block text-sm font-semibold text-zinc-800"
                      >
                        Product
                      </label>

                      <div className="relative">
                        <select
                          id={`normal-order-product-${item.rowKey}`}
                          value={
                            item.productId
                          }
                          onChange={(
                            event
                          ) =>
                            handleProductSelect(
                              item.rowKey,
                              event.target.value
                            )
                          }
                          disabled={
                            isSaving ||
                            !hasProducts
                          }
                          className="h-11 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-4 pr-10 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
                        >
                          <option value="">
                            Select Product
                          </option>

                          {visibleProducts.map(
                            (
                              product
                            ) => {
                              const usedElsewhere =
                                selectedProductIds.has(
                                  product.id
                                ) &&
                                item.productId !==
                                  product.id;

                              return (
                                <option
                                  key={
                                    product.id
                                  }
                                  value={
                                    product.id
                                  }
                                  disabled={
                                    usedElsewhere
                                  }
                                >
                                  {
                                    product.sku
                                  }
                                  {" — "}
                                  {
                                    product.name
                                  }
                                </option>
                              );
                            }
                          )}
                        </select>

                        <ChevronDown
                          size={16}
                          aria-hidden="true"
                          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                        />
                      </div>

                      {selectedProduct ? (
                        <p className="mt-2 font-mono text-xs font-semibold text-zinc-500">
                          {
                            selectedProduct.sku
                          }
                        </p>
                      ) : null}
                    </div>

                    {/* =====================================
                        CATEGORY
                    ===================================== */}

                    <div>
                      <label
                        htmlFor={`normal-order-category-${item.rowKey}`}
                        className="mb-2 block text-sm font-semibold text-zinc-800"
                      >
                        Category
                      </label>

                      <input
                        id={`normal-order-category-${item.rowKey}`}
                        type="text"
                        readOnly
                        tabIndex={-1}
                        value={
                          selectedProduct?.category_name ??
                          "Auto"
                        }
                        className="h-11 w-full cursor-default rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-600 outline-none"
                      />
                    </div>

                    {/* =====================================
                        UOM
                    ===================================== */}

                    <div>
                      <label
                        htmlFor={`normal-order-uom-${item.rowKey}`}
                        className="mb-2 block text-sm font-semibold text-zinc-800"
                      >
                        UOM
                      </label>

                      <input
                        id={`normal-order-uom-${item.rowKey}`}
                        type="text"
                        readOnly
                        tabIndex={-1}
                        value={
                          selectedProduct?.uom ??
                          "Auto"
                        }
                        className="h-11 w-full cursor-default rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold text-zinc-600 outline-none"
                      />
                    </div>

                    {/* =====================================
                        ON HAND
                    ===================================== */}

                    <div>
                      <label
                        htmlFor={`normal-order-on-hand-${item.rowKey}`}
                        className="mb-2 block text-sm font-semibold text-zinc-800"
                      >
                        On Hand Qty
                      </label>

                      <input
                        id={`normal-order-on-hand-${item.rowKey}`}
                        type="number"
                        min="0"
                        max="99999999999999.9999"
                        step="0.0001"
                        inputMode="decimal"
                        value={
                          item.onHandQty
                        }
                        onChange={(
                          event
                        ) =>
                          updateItem(
                            item.rowKey,
                            {
                              onHandQty:
                                event.target.value,
                            }
                          )
                        }
                        disabled={
                          isSaving
                        }
                        className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:bg-zinc-50"
                      />
                    </div>

                    {/* =====================================
                        REQUESTED
                    ===================================== */}

                    <div>
                      <label
                        htmlFor={`normal-order-requested-${item.rowKey}`}
                        className="mb-2 block text-sm font-semibold text-zinc-800"
                      >
                        Order Request Qty
                      </label>

                      <input
                        id={`normal-order-requested-${item.rowKey}`}
                        type="number"
                        min="0"
                        max="99999999999999.9999"
                        step="0.0001"
                        inputMode="decimal"
                        value={
                          item.requestedQty
                        }
                        onChange={(
                          event
                        ) =>
                          updateItem(
                            item.rowKey,
                            {
                              requestedQty:
                                event.target.value,
                            }
                          )
                        }
                        disabled={
                          isSaving
                        }
                        className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:bg-zinc-50"
                      />
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>

        {/* =================================================
            ADD PRODUCT
        ================================================= */}

        <div className="border-t border-zinc-200 bg-zinc-50/60 p-5 sm:p-6">
          <button
            type="button"
            onClick={
              addProductRow
            }
            disabled={
              isSaving ||
              !hasProducts
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus
              size={16}
              aria-hidden="true"
            />

            Add Product
          </button>
        </div>
      </section>

      {/* ===================================================
          ORDER SUMMARY
      =================================================== */}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
              Date
            </p>

            <p className="mt-1 text-sm font-bold text-zinc-800">
              {form.orderDate ||
                "—"}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
              Ordered By
            </p>

            <p className="mt-1 truncate text-sm font-bold text-zinc-800">
              {form.orderedBy.trim() ||
                "—"}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
              Products
            </p>

            <p className="mt-1 text-sm font-bold text-zinc-800">
              {
                form.items.filter(
                  (
                    item
                  ) =>
                    item.productId
                ).length
              }
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
              Status
            </p>

            <p className="mt-1 text-sm font-bold capitalize text-zinc-800">
              {
                form.status
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
          href="/orders/normal"
          aria-disabled={
            isSaving
          }
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 ${
            isSaving
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
            isSaving ||
            !hasProducts
          }
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2
                size={16}
                aria-hidden="true"
                className="animate-spin"
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
                ? "Update Normal Order"
                : "Save Normal Order"}
            </>
          )}
        </button>
      </section>
    </form>
  );
}