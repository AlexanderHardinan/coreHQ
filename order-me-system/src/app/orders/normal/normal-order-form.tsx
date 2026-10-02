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
  Mic,
  PackageSearch,
  Sparkles,
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
  resolveNormalOrderAiCommandAction,
  updateNormalOrderAction,
  type NormalOrderAiResolvedItem,
  type NormalOrderPackagingUom,
  type NormalOrderProductOption,
  type NormalOrderRecord,
  type NormalOrderStatus,
  type NormalOrderUom,
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

  amountQty: string;

  uom:
    | NormalOrderUom
    | "";

  packagingSizeAmount: string;

  packagingUom:
    | NormalOrderPackagingUom
    | "";
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

type ProductSearchPickerProps = {
  rowKey: string;

  selectedProduct:
    ProductCatalogRecord | undefined;

  productCatalog:
    ProductCatalogRecord[];

  selectedProductIds:
    Set<string>;

  disabled: boolean;

  onSelect: (
    productId: string
  ) => void;

  onResults: (
    products:
      NormalOrderProductOption[]
  ) => void;
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

const UOM_OPTIONS: {
  value: NormalOrderUom;
  label: string;
}[] = [
  {
    value: "ml",
    label: "ML",
  },
  {
    value: "pc",
    label: "PC",
  },
  {
    value: "gram",
    label: "Gram",
  },
];

const PACKAGING_UOM_OPTIONS: {
  value: NormalOrderPackagingUom;
  label: string;
}[] = [
  {
    value: "bottle",
    label: "Bottle",
  },
  {
    value: "box",
    label: "Box",
  },
  {
    value: "pack",
    label: "Pack",
  },
  {
    value: "can",
    label: "Can",
  },
  {
    value: "kilo",
    label: "Kilo",
  },
  {
    value: "liter",
    label: "Liter",
  },
  {
    value: "tray",
    label: "Tray",
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
// PRODUCT PACKAGING GUIDE
// =========================================================

function formatCatalogQuantity(
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
    return "—";
  }

  return Number(
    value.toFixed(4)
  ).toString();
}

function getProductPackagingGuide(
  product:
    | ProductCatalogRecord
    | undefined
): {
  productSize: string;
  packaging: string;
  guide: string;
} | null {
  if (
    !product ||
    typeof product.amount_qty !==
      "number" ||
    !Number.isFinite(
      product.amount_qty
    ) ||
    product.amount_qty <=
      0 ||
    typeof product.packaging_size_amount !==
      "number" ||
    !Number.isFinite(
      product.packaging_size_amount
    ) ||
    product.packaging_size_amount <=
      0 ||
    !product.packaging_uom
  ) {
    return null;
  }

  const amountQty =
    formatCatalogQuantity(
      product.amount_qty
    );

  const packagingSize =
    formatCatalogQuantity(
      product.packaging_size_amount
    );

  return {
    productSize:
      `${amountQty} ${product.uom}`,

    packaging:
      `${packagingSize} / ${product.packaging_uom}`,

    guide:
      `1 ${product.packaging_uom} = ${packagingSize} × ${amountQty} ${product.uom}`,
  };
}

function getEditableProductPackagingGuide(
  product:
    | ProductCatalogRecord
    | undefined,
  amountQtyValue: string,
  uom:
    | NormalOrderUom
    | "",
  packagingSizeAmount: string,
  packagingUom:
    | NormalOrderPackagingUom
    | ""
): {
  productSize: string;
  packaging: string;
  guide: string;
} | null {
  if (
    !product ||
    !uom ||
    !packagingUom
  ) {
    return null;
  }

  const amountQty =
    Number(
      amountQtyValue
    );

  if (
    !Number.isFinite(
      amountQty
    ) ||
    amountQty <=
      0
  ) {
    return null;
  }

  const packagingSize =
    Number(
      packagingSizeAmount
    );

  if (
    !Number.isFinite(
      packagingSize
    ) ||
    packagingSize <=
      0
  ) {
    return null;
  }

  const formattedAmountQty =
    formatCatalogQuantity(
      amountQty
    );

  const formattedPackagingSize =
    formatCatalogQuantity(
      packagingSize
    );

  return {
    productSize:
      `${formattedAmountQty} ${uom}`,

    packaging:
      `${formattedPackagingSize} / ${packagingUom}`,

    guide:
      `1 ${packagingUom} = ${formattedPackagingSize} × ${formattedAmountQty} ${uom}`,
  };
}

// =========================================================
// BLANK ROW
// =========================================================

function createBlankItem(
  index: number
): NormalOrderFormItem {
  return {
    rowKey:
      `new-${Date.now()}-${index}-${Math.random()
        .toString(36)
        .slice(2)}`,

    productId:
      "",

    onHandQty:
      "0",

    requestedQty:
      "0",

    amountQty:
      "0",

    uom:
      "",

    packagingSizeAmount:
      "0",

    packagingUom:
      "",
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

              amountQty:
                quantityToInput(
                  item.amount_qty_snapshot
                ),

              uom:
                item.uom,

              packagingSizeAmount:
                quantityToInput(
                  item.packaging_size_amount_snapshot
                ),

              packagingUom:
                item.packaging_uom_snapshot,
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

          amount_qty:
            item.amount_qty_snapshot,

          uom:
            item.uom,

          packaging_size_amount:
            item.packaging_size_amount_snapshot,

          packaging_uom:
            item.packaging_uom_snapshot,

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

function isValidPositiveDecimal(
  value: string
): boolean {
  if (
    !isValidNonNegativeDecimal(
      value
    )
  ) {
    return false;
  }

  return Number(
    value.trim()
  ) > 0;
}

// =========================================================
// PRODUCT SEARCH PICKER
// =========================================================
//
// Each Normal Order row has its own Product search.
//
// This prevents the user from having to scroll through a
// potentially very large Product database.
//
// Search flow:
//
// User types
//      ↓
// Local results appear immediately
//      ↓
// 350ms debounce
//      ↓
// Secure server Product search
//      ↓
// Results merged into Product catalog
//      ↓
// User selects Product
//
// The saved Product ID remains authoritative.
// SKU / Category / UOM are display helpers only.
// =========================================================

function ProductSearchPicker({
  rowKey,
  selectedProduct,
  productCatalog,
  selectedProductIds,
  disabled,
  onSelect,
  onResults,
}: ProductSearchPickerProps) {
  const [
    query,
    setQuery,
  ] =
    useState(
      ""
    );

  const [
    isOpen,
    setIsOpen,
  ] =
    useState(
      false
    );

  const [
    isSearching,
    setIsSearching,
  ] =
    useState(
      false
    );

  const [
    searchError,
    setSearchError,
  ] =
    useState<
      string | null
    >(
      null
    );

  const requestRef =
    useRef(
      0
    );

  // =======================================================
  // SERVER SEARCH
  // =======================================================

  useEffect(() => {
    if (
      !isOpen
    ) {
      return;
    }

    const normalized =
      query
        .trim()
        .replace(
          /\s+/g,
          " "
        );

    if (
      !normalized
    ) {
      setIsSearching(
        false
      );

      setSearchError(
        null
      );

      return;
    }

    const requestId =
      requestRef.current +
      1;

    requestRef.current =
      requestId;

    const timeout =
      window.setTimeout(
        async () => {
          setIsSearching(
            true
          );

          setSearchError(
            null
          );

          try {
            const results =
              await getNormalOrderProductOptions(
                normalized
              );

            if (
              requestRef.current !==
              requestId
            ) {
              return;
            }

            onResults(
              results
            );
          } catch {
            if (
              requestRef.current ===
              requestId
            ) {
              setSearchError(
                "Unable to search Products."
              );
            }
          } finally {
            if (
              requestRef.current ===
              requestId
            ) {
              setIsSearching(
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
  }, [
    isOpen,
    onResults,
    query,
  ]);

  // =======================================================
  // FILTER AVAILABLE RESULTS
  // =======================================================

  const results =
    useMemo(
      () => {
        const normalized =
          query
            .trim()
            .toLowerCase();

        const filtered =
          normalized
            ? productCatalog.filter(
                (
                  product
                ) =>
                  product.name
                    .toLowerCase()
                    .includes(
                      normalized
                    ) ||
                  product.sku
                    .toLowerCase()
                    .includes(
                      normalized
                    ) ||
                  product.category_name
                    .toLowerCase()
                    .includes(
                      normalized
                    )
              )
            : productCatalog;

        return filtered.slice(
          0,
          50
        );
      },
      [
        productCatalog,
        query,
      ]
    );

  // =======================================================
  // DISPLAY VALUE
  // =======================================================

  const displayValue =
    isOpen
      ? query
      : selectedProduct
        ? `${selectedProduct.sku} — ${selectedProduct.name}`
        : "";

  // =======================================================
  // SELECT PRODUCT
  // =======================================================

  function selectProduct(
    product:
      ProductCatalogRecord
  ) {
    const usedElsewhere =
      selectedProductIds.has(
        product.id
      ) &&
      selectedProduct?.id !==
        product.id;

    if (
      usedElsewhere
    ) {
      return;
    }

    onSelect(
      product.id
    );

    setQuery(
      ""
    );

    setIsOpen(
      false
    );

    setSearchError(
      null
    );
  }

  // =======================================================
  // CLEAR PRODUCT
  // =======================================================

  function clearProduct() {
    onSelect(
      ""
    );

    setQuery(
      ""
    );

    setIsOpen(
      true
    );
  }

  return (
    <div className="relative">
      {/* ===================================================
          SEARCH INPUT
      =================================================== */}

      <div className="relative">
        {isSearching ? (
          <Loader2
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 animate-spin text-zinc-400"
          />
        ) : (
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
          />
        )}

        <input
          id={`normal-order-product-${rowKey}`}
          type="search"
          value={
            displayValue
          }
          disabled={
            disabled
          }
          autoComplete="off"
          placeholder="Search SKU or Product..."
          onFocus={() => {
            setIsOpen(
              true
            );

            if (
              selectedProduct
            ) {
              setQuery(
                ""
              );
            }
          }}
          onChange={(
            event
          ) => {
            setQuery(
              event.target.value
            );

            setIsOpen(
              true
            );
          }}
          onKeyDown={(
            event
          ) => {
            if (
              event.key ===
              "Escape"
            ) {
              setIsOpen(
                false
              );

              setQuery(
                ""
              );

              return;
            }

            if (
              event.key ===
                "Enter" &&
              isOpen
            ) {
              event.preventDefault();

              const firstAvailable =
                results.find(
                  (
                    product
                  ) =>
                    !selectedProductIds.has(
                      product.id
                    ) ||
                    selectedProduct?.id ===
                      product.id
                );

              if (
                firstAvailable
              ) {
                selectProduct(
                  firstAvailable
                );
              }
            }
          }}
          onBlur={() => {
            window.setTimeout(
              () => {
                setIsOpen(
                  false
                );

                setQuery(
                  ""
                );
              },
              150
            );
          }}
          className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-10 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
        />

        {selectedProduct ||
        query ? (
          <button
            type="button"
            onMouseDown={(
              event
            ) => {
              event.preventDefault();
            }}
            onClick={
              clearProduct
            }
            disabled={
              disabled
            }
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40"
            aria-label="Clear selected Product"
          >
            <X
              size={14}
            />
          </button>
        ) : null}
      </div>

      {/* ===================================================
          SEARCH RESULTS
      =================================================== */}

      {isOpen &&
      !disabled ? (
        <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
          {/* =================================================
              SEARCH STATUS
          ================================================= */}

          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-3 py-2">
            <span className="text-[11px] font-semibold text-zinc-500">
              {query.trim()
                ? "Search Results"
                : "Available Products"}
            </span>

            <span className="text-[10px] font-medium text-zinc-400">
              Max 50 shown
            </span>
          </div>

          {/* =================================================
              ERROR
          ================================================= */}

          {searchError ? (
            <div className="px-3 py-3 text-xs font-medium text-red-600">
              {searchError}
            </div>
          ) : null}

          {/* =================================================
              RESULTS
          ================================================= */}

          {results.length >
          0 ? (
            <div className="max-h-72 overflow-y-auto">
              {results.map(
                (
                  product
                ) => {
                  const usedElsewhere =
                    selectedProductIds.has(
                      product.id
                    ) &&
                    selectedProduct?.id !==
                      product.id;

                  const currentlySelected =
                    selectedProduct?.id ===
                    product.id;

                  const packagingDetails =
                    getProductPackagingGuide(
                      product
                    );

                  return (
                    <button
                      key={
                        product.id
                      }
                      type="button"
                      disabled={
                        usedElsewhere
                      }
                      onMouseDown={(
                        event
                      ) => {
                        event.preventDefault();
                      }}
                      onClick={() =>
                        selectProduct(
                          product
                        )
                      }
                      className={`flex w-full items-start gap-3 border-b border-zinc-100 px-3 py-3 text-left transition last:border-b-0 ${
                        currentlySelected
                          ? "bg-amber-50"
                          : "hover:bg-zinc-50"
                      } ${
                        usedElsewhere
                          ? "cursor-not-allowed opacity-40"
                          : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-zinc-500">
                            {
                              product.sku
                            }
                          </span>

                          {currentlySelected ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                              Selected
                            </span>
                          ) : null}

                          {usedElsewhere ? (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                              Already Added
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

                        {packagingDetails ? (
                          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold text-zinc-600">
                            <span className="rounded-md bg-zinc-100 px-2 py-1">
                              Size: {packagingDetails.productSize}
                            </span>

                            <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-800">
                              Pack: {packagingDetails.packaging}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              {isSearching ? (
                <>
                  <Loader2
                    size={20}
                    className="mx-auto animate-spin text-zinc-400"
                  />

                  <p className="mt-3 text-xs font-semibold text-zinc-500">
                    Searching Products...
                  </p>
                </>
              ) : (
                <>
                  <PackageSearch
                    size={20}
                    className="mx-auto text-zinc-400"
                  />

                  <p className="mt-3 text-xs font-semibold text-zinc-700">
                    No Products found
                  </p>

                  <p className="mt-1 text-[11px] text-zinc-400">
                    Try another SKU or Product name.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* ===================================================
          SELECTED SKU
      =================================================== */}

      {selectedProduct &&
      !isOpen ? (
        <p className="mt-2 font-mono text-xs font-semibold text-zinc-500">
          {
            selectedProduct.sku
          }
        </p>
      ) : null}
    </div>
  );
}

// =========================================================
// AI VOICE HANDOFF
// =========================================================

type BrowserSpeechRecognitionResult = {
  isFinal: boolean;
  0: {
    transcript: string;
  };
};

type BrowserSpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechRecognitionResult>;
};

type BrowserSpeechRecognitionErrorEvent = {
  error: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type VoiceWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };

const ORDER_SESSION_NAME_KEY = "order-me:normal-order:ordered-by";

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
    isAiProcessing,
    startAiTransition,
  ] =
    useTransition();

  const [
    aiCommand,
    setAiCommand,
  ] =
    useState(
      ""
    );

  const [
    aiMessage,
    setAiMessage,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    isVoiceListening,
    setIsVoiceListening,
  ] =
    useState(false);

  const [
    voiceSupported,
    setVoiceSupported,
  ] =
    useState(true);

  const voiceRecognitionRef =
    useRef<BrowserSpeechRecognition | null>(
      null
    );

  const aiCommandProcessorRef =
    useRef<(command: string) => void>(
      () => undefined
    );

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

  useEffect(() => {
    if (
      isEditMode ||
      typeof window === "undefined"
    ) {
      return;
    }

    const capturedName =
      window.sessionStorage
        .getItem(ORDER_SESSION_NAME_KEY)
        ?.trim()
        .replace(/\s+/g, " ") ??
      "";

    if (!capturedName) {
      return;
    }

    setForm((current) => ({
      ...current,
      orderedBy:
        current.orderedBy.trim() ||
        capturedName,
    }));

    window.sessionStorage.removeItem(
      ORDER_SESSION_NAME_KEY
    );

    const message = `${capturedName}, what would you like to order? Tap the microphone and tell me the products and quantities you need.`;
    setAiMessage(message);

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();

      const utterance =
        new SpeechSynthesisUtterance(
          message
        );

      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;

      window.setTimeout(() => {
        window.speechSynthesis.speak(
          utterance
        );
      }, 350);
    }
  }, [isEditMode]);

  useEffect(() => {
    if (
      isEditMode ||
      typeof window === "undefined"
    ) {
      return;
    }

    const voiceWindow =
      window as VoiceWindow;

    const Recognition =
      voiceWindow.SpeechRecognition ??
      voiceWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setVoiceSupported(false);
      return;
    }

    setVoiceSupported(true);

    const recognition =
      new Recognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang =
      navigator.language || "en-US";

    recognition.onstart = () => {
      setIsVoiceListening(true);
      setAiMessage(
        "Listening... Tell me what you would like to order."
      );
    };

    recognition.onresult = (event) => {
      let transcript = "";
      let hasFinalResult = false;

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result =
          event.results[index];

        transcript +=
          result[0]?.transcript ?? "";

        if (result.isFinal) {
          hasFinalResult = true;
        }
      }

      const normalizedTranscript =
        transcript
          .trim()
          .replace(/\s+/g, " ");

      if (!normalizedTranscript) {
        return;
      }

      setAiCommand(
        normalizedTranscript
      );

      if (hasFinalResult) {
        recognition.stop();
        aiCommandProcessorRef.current(
          normalizedTranscript
        );
      }
    };

    recognition.onerror = (event) => {
      setIsVoiceListening(false);

      const message =
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
          ? "Microphone permission is required for voice ordering. You can still type your order instruction."
          : event.error === "no-speech"
            ? "I did not hear an order. Tap the microphone and try again."
            : "Voice recognition could not capture the order. Please try again or type the instruction.";

      setAiMessage(message);
    };

    recognition.onend = () => {
      setIsVoiceListening(false);
    };

    voiceRecognitionRef.current =
      recognition;

    return () => {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();

      if (
        voiceRecognitionRef.current ===
        recognition
      ) {
        voiceRecognitionRef.current =
          null;
      }
    };
  }, [isEditMode]);

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
  // MERGE PRODUCT RESULTS
  // =======================================================

  function handleProductResults(
    products:
      NormalOrderProductOption[]
  ) {
    setProductCatalog(
      (
        current
      ) =>
        mergeProductOptions(
          current,
          products
        )
    );
  }

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
  // GLOBAL PRODUCT DATABASE SEARCH
  // =======================================================

  useEffect(() => {
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
              await getNormalOrderProductOptions(
                normalizedSearch
              );

            if (
              searchRequestRef.current !==
              requestId
            ) {
              return;
            }

            handleProductResults(
              results
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
    value:
      NormalOrderFormState[K]
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
    changes:
      Partial<NormalOrderFormItem>
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
    if (
      !productId
    ) {
      updateItem(
        rowKey,
        {
          productId:
            "",

          ...(isEditMode
            ? {}
            : {
                amountQty:
                  "0",

                uom:
                  "" as const,

                packagingSizeAmount:
                  "0",

                packagingUom:
                  "" as const,
              }),
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

    if (
      duplicate
    ) {
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

    if (
      !product
    ) {
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

        ...(isEditMode
          ? {}
          : {
              amountQty:
                quantityToInput(
                  product.amount_qty
                ),

              uom:
                product.uom,

              packagingSizeAmount:
                quantityToInput(
                  product.packaging_size_amount
                ),

              packagingUom:
                product.packaging_uom ??
                "",
            }),
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
  // AI VOICE ORDER HELPERS
  // =======================================================

  function speakAiMessage(message: string) {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(message);

    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
  }

  function normalizeVoicePackagingUnit(
    value: string | null
  ): NormalOrderPackagingUom | null {
    if (!value) {
      return null;
    }

    const normalized =
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z]/g, "");

    const aliases: Record<
      string,
      NormalOrderPackagingUom
    > = {
      bottle: "bottle",
      bottles: "bottle",
      box: "box",
      boxes: "box",
      pack: "pack",
      packs: "pack",
      packet: "pack",
      packets: "pack",
      can: "can",
      cans: "can",
      kg: "kilo",
      kgs: "kilo",
      kilo: "kilo",
      kilos: "kilo",
      kilogram: "kilo",
      kilograms: "kilo",
      l: "liter",
      litre: "liter",
      litres: "liter",
      liter: "liter",
      liters: "liter",
      tray: "tray",
      trays: "tray",
    };

    return aliases[normalized] ?? null;
  }

  function isResolvedVoiceUnitCompatible(
    resolved: NormalOrderAiResolvedItem
  ): boolean {
    if (
      resolved.operation === "remove" ||
      resolved.operation === "clear" ||
      !resolved.product ||
      !resolved.requestedUnit
    ) {
      return true;
    }

    const requestedPackagingUnit =
      normalizeVoicePackagingUnit(
        resolved.requestedUnit
      );

    if (!requestedPackagingUnit) {
      return false;
    }

    return (
      requestedPackagingUnit ===
      resolved.product.packaging_uom
    );
  }

  // =======================================================
  // AI ORDER ASSISTANT
  // =======================================================

  function createAiFormItem(
    product: NormalOrderProductOption,
    requestedQty: number
  ): NormalOrderFormItem {
    return {
      rowKey:
        `ai-${Date.now()}-${product.id}-${Math.random()
          .toString(36)
          .slice(2)}`,

      productId:
        product.id,

      onHandQty:
        "0",

      requestedQty:
        quantityToInput(
          requestedQty
        ),

      amountQty:
        quantityToInput(
          product.amount_qty
        ),

      uom:
        product.uom,

      packagingSizeAmount:
        quantityToInput(
          product.packaging_size_amount
        ),

      packagingUom:
        product.packaging_uom ??
        "",
    };
  }

  function applyAiResolvedItems(
    resolvedItems:
      NormalOrderAiResolvedItem[],
    clearOrder: boolean
  ) {
    const matchedItems =
      resolvedItems.filter(
        (
          item
        ) =>
          item.matchStatus ===
            "matched" &&
          item.product &&
          isResolvedVoiceUnitCompatible(
            item
          )
      );

    setProductCatalog(
      (
        current
      ) =>
        mergeProductOptions(
          current,
          matchedItems
            .map(
              (
                item
              ) =>
                item.product
            )
            .filter(
              (
                product
              ): product is NormalOrderProductOption =>
                Boolean(
                  product
                )
            )
        )
    );

    setForm(
      (
        current
      ) => {
        let nextItems =
          clearOrder
            ? []
            : current.items.filter(
                (
                  item
                ) =>
                  Boolean(
                    item.productId
                  )
              );

        for (
          const resolved of
          matchedItems
        ) {
          const product =
            resolved.product;

          if (
            !product
          ) {
            continue;
          }

          if (
            resolved.operation ===
            "remove"
          ) {
            nextItems =
              nextItems.filter(
                (
                  item
                ) =>
                  item.productId !==
                  product.id
              );

            continue;
          }

          const existingIndex =
            nextItems.findIndex(
              (
                item
              ) =>
                item.productId ===
                product.id
            );

          const requestedQty =
            resolved.requestedQty;

          if (
            requestedQty ===
              null ||
            !Number.isFinite(
              requestedQty
            ) ||
            requestedQty <
              0
          ) {
            continue;
          }

          if (
            existingIndex >=
            0
          ) {
            nextItems =
              nextItems.map(
                (
                  item,
                  index
                ) =>
                  index ===
                  existingIndex
                    ? {
                        ...item,

                        requestedQty:
                          quantityToInput(
                            requestedQty
                          ),
                      }
                    : item
              );

            continue;
          }

          nextItems = [
            ...nextItems,
            createAiFormItem(
              product,
              requestedQty
            ),
          ];
        }

        return {
          ...current,

          items:
            nextItems.length >
            0
              ? nextItems
              : [
                  createBlankItem(
                    0
                  ),
                ],
        };
      }
    );
  }

  function processAiCommand(
    commandInput: string
  ) {
    const command =
      commandInput
        .trim()
        .replace(
          /\s+/g,
          " "
        );

    if (
      !command ||
      isAiProcessing ||
      isSaving ||
      isEditMode
    ) {
      return;
    }

    setAiMessage(
      null
    );

    startAiTransition(
      async () => {
        const result =
          await resolveNormalOrderAiCommandAction(
            command
          );

        if (
          !result.success
        ) {
          setAiMessage(
            result.message
          );

          toast.error(
            "AI Order Assistant",
            result.message
          );

          return;
        }

        const items =
          result.items ??
          [];

        applyAiResolvedItems(
          items,
          Boolean(
            result.clearOrder
          )
        );

        const ambiguous =
          items.filter(
            (item) =>
              item.matchStatus ===
              "ambiguous"
          );

        const notFound =
          items.filter(
            (item) =>
              item.matchStatus ===
              "not_found"
          );

        const incompatibleUnits =
          items.filter(
            (item) =>
              item.matchStatus ===
                "matched" &&
              item.product &&
              !isResolvedVoiceUnitCompatible(
                item
              )
          );

        const appliedItems =
          items.filter(
            (item) =>
              item.matchStatus ===
                "matched" &&
              item.product &&
              isResolvedVoiceUnitCompatible(
                item
              )
          );

        const appliedDescriptions =
          appliedItems
            .filter(
              (item) =>
                item.operation !==
                "remove"
            )
            .map((item) => {
              const productName =
                item.product?.name ??
                item.requestedProductName;

              const quantity =
                item.requestedQty;

              const unit =
                item.product?.packaging_uom;

              if (
                quantity === null ||
                !Number.isFinite(quantity)
              ) {
                return productName;
              }

              return `${quantity} ${unit ?? ""} ${productName}`
                .replace(/\s+/g, " ")
                .trim();
            });

        const removedDescriptions =
          appliedItems
            .filter(
              (item) =>
                item.operation ===
                "remove"
            )
            .map(
              (item) =>
                item.product?.name ??
                item.requestedProductName
            );

        const clarificationParts: string[] = [];

        for (const item of ambiguous) {
          const candidateNames =
            (item.candidates ?? [])
              .slice(0, 3)
              .map(
                (candidate) =>
                  candidate.name
              );

          clarificationParts.push(
            candidateNames.length > 0
              ? `I found more than one match for ${item.requestedProductName}: ${candidateNames.join(", ")}. Please say the exact product name.`
              : `I found more than one match for ${item.requestedProductName}. Please say the exact product name.`
          );
        }

        for (const item of notFound) {
          clarificationParts.push(
            `${item.requestedProductName} was not found in the active Product database.`
          );
        }

        for (const item of incompatibleUnits) {
          const productName =
            item.product?.name ??
            item.requestedProductName;

          const actualUnit =
            item.product?.packaging_uom;

          clarificationParts.push(
            actualUnit
              ? `${productName} is ordered by ${actualUnit}. Please give the quantity in ${actualUnit}.`
              : `${productName} does not have a valid ordering unit. Please review the Product setup.`
          );
        }

        let message =
          result.clearOrder
            ? "The current order has been cleared."
            : appliedDescriptions.length > 0
              ? `${appliedDescriptions.join(", ")} ${
                  appliedDescriptions.length === 1
                    ? "is"
                    : "are"
                } now on the order.`
              : removedDescriptions.length > 0
                ? `${removedDescriptions.join(", ")} removed from the order.`
                : result.message;

        if (clarificationParts.length > 0) {
          message = `${message} ${clarificationParts.join(" ")}`.trim();
        } else if (
          appliedDescriptions.length > 0 ||
          removedDescriptions.length > 0
        ) {
          message = `${message} Anything else?`;
        }

        setAiMessage(message);
        setAiCommand("");
        speakAiMessage(message);

        if (
          clarificationParts.length > 0
        ) {
          toast.warning(
            "AI Order Assistant",
            message
          );
        } else {
          toast.success(
            "AI Order Assistant",
            message
          );
        }
      }
    );
  }

  aiCommandProcessorRef.current =
    processAiCommand;

  function handleAiCommand() {
    processAiCommand(
      aiCommand
    );
  }

  function toggleVoiceOrder() {
    if (
      isSaving ||
      isAiProcessing ||
      isEditMode
    ) {
      return;
    }

    const recognition =
      voiceRecognitionRef.current;

    if (!recognition) {
      setAiMessage(
        "Voice ordering is not supported by this browser. You can still type your order instruction."
      );
      return;
    }

    if (isVoiceListening) {
      recognition.stop();
      return;
    }

    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }

    try {
      recognition.start();
    } catch {
      setAiMessage(
        "The microphone is already starting. Please wait a moment and try again."
      );
    }
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

    if (
      !orderedBy
    ) {
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

      if (
        !isEditMode &&
        !isValidPositiveDecimal(
          item.amountQty
        )
      ) {
        return `Enter a valid Product Size greater than zero for row ${index + 1}.`;
      }

      if (
        !isEditMode &&
        !item.uom
      ) {
        return `Select a Product UOM for row ${index + 1}.`;
      }

      if (
        !isEditMode &&
        !isValidPositiveDecimal(
          item.packagingSizeAmount
        )
      ) {
        return `Enter a valid Packaging Size greater than zero for row ${index + 1}.`;
      }

      if (
        !isEditMode &&
        !item.packagingUom
      ) {
        return `Select a Packaging UOM for row ${index + 1}.`;
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
              ) =>
                isEditMode
                  ? {
                      productId:
                        item.productId,

                      onHandQty:
                        item.onHandQty.trim(),

                      requestedQty:
                        item.requestedQty.trim(),
                    }
                  : {
                      productId:
                        item.productId,

                      onHandQty:
                        item.onHandQty.trim(),

                      requestedQty:
                        item.requestedQty.trim(),

                      amountQty:
                        item.amountQty.trim(),

                      uom:
                        item.uom,

                      packagingSizeAmount:
                        item.packagingSizeAmount.trim(),

                      packagingUom:
                        item.packagingUom,
                    }
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

      {!isEditMode ? (
        <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
          <div className="border-b border-amber-100 bg-amber-50/60 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500 text-white shadow-sm">
                <Sparkles
                  size={20}
                  aria-hidden="true"
                />
              </div>

              <div>
                <h2 className="text-base font-bold text-zinc-950">
                  AI Order Assistant
                </h2>

                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  Tell the assistant what you need. Matched Products are added to this order for your review before saving.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="mx-auto max-w-4xl">
              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 sm:p-5">
                <div className="flex flex-col items-center text-center">
                  <button
                    type="button"
                    onClick={toggleVoiceOrder}
                    disabled={
                      isSaving ||
                      isAiProcessing ||
                      !voiceSupported
                    }
                    aria-label={
                      isVoiceListening
                        ? "Stop listening"
                        : "Start voice order"
                    }
                    className={`grid h-20 w-20 place-items-center rounded-full border-4 shadow-sm transition sm:h-24 sm:w-24 ${
                      isVoiceListening
                        ? "border-red-200 bg-red-600 text-white shadow-red-100"
                        : "border-amber-200 bg-amber-500 text-white shadow-amber-100 hover:bg-amber-600"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {isVoiceListening ? (
                      <Loader2
                        size={30}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Mic
                        size={32}
                        aria-hidden="true"
                      />
                    )}
                  </button>

                  <h3 className="mt-4 text-base font-bold text-zinc-950">
                    {isAiProcessing
                      ? "Processing your order..."
                      : isVoiceListening
                        ? "Listening..."
                        : voiceSupported
                          ? "Tap and speak your order"
                          : "Voice unavailable on this browser"}
                  </h3>

                  <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-600">
                    Speak naturally. Example: “10 kilos chicken breast” or “5 trays salmon”. The assistant checks the actual Product database before adding anything.
                  </p>
                </div>

                {aiMessage ? (
                  <div
                    aria-live="polite"
                    className="mt-4 rounded-xl border border-white/80 bg-white px-4 py-3 text-center text-sm font-semibold leading-6 text-zinc-800 shadow-sm"
                  >
                    {aiMessage}
                  </div>
                ) : null}
              </div>

              <details className="mt-4 rounded-xl border border-zinc-200 bg-white">
                <summary className="cursor-pointer select-none px-4 py-3 text-sm font-bold text-zinc-700">
                  Prefer typing?
                </summary>

                <div className="border-t border-zinc-100 p-4">
                  <label
                    htmlFor="normal-order-ai-command"
                    className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-zinc-500"
                  >
                    Order Instruction
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                    <textarea
                      id="normal-order-ai-command"
                      value={aiCommand}
                      onChange={(event) =>
                        setAiCommand(
                          event.target.value
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey
                        ) {
                          event.preventDefault();
                          handleAiCommand();
                        }
                      }}
                      disabled={
                        isSaving ||
                        isAiProcessing
                      }
                      maxLength={2000}
                      rows={2}
                      placeholder="Example: 10 kilos chicken breast and 5 trays salmon"
                      className="min-h-20 flex-1 resize-y rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
                    />

                    <button
                      type="button"
                      onClick={handleAiCommand}
                      disabled={
                        isSaving ||
                        isAiProcessing ||
                        !aiCommand.trim()
                      }
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-40"
                    >
                      {isAiProcessing ? (
                        <Loader2
                          size={16}
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Sparkles
                          size={16}
                          aria-hidden="true"
                        />
                      )}

                      {isAiProcessing
                        ? "Processing..."
                        : "Apply Order"}
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-zinc-400">
                    <span>Enter applies. Shift + Enter adds a new line.</span>
                    <span>{aiCommand.length}/2000</span>
                  </div>
                </div>
              </details>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  "10 kilos chicken breast",
                  "5 trays salmon",
                  "Remove avocado",
                  "Clear the order",
                ].map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() =>
                      setAiCommand(example)
                    }
                    disabled={
                      isSaving ||
                      isAiProcessing
                    }
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-xs font-semibold text-zinc-600 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    “{example}”
                  </button>
                ))}
              </div>

              <p className="mt-3 text-center text-xs leading-5 text-zinc-500">
                Voice and typed instructions update the order for review only. Nothing is saved until you use Save Normal Order.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* ===================================================
          PRODUCT ORDER TABLE
      =================================================== */}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
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
                  Search and add Products, then enter the current
                  On Hand and Order Request quantities.
                </p>
              </div>
            </div>

            {/* =============================================
                GLOBAL PRODUCT DATABASE SEARCH
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
                  placeholder="Search SKU or Product..."
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

              const packagingDetails =
                isEditMode
                  ? getProductPackagingGuide(
                      selectedProduct
                    )
                  : getEditableProductPackagingGuide(
                      selectedProduct,
                      item.amountQty,
                      item.uom,
                      item.packagingSizeAmount,
                      item.packagingUom
                    );

              return (
                <div
                  key={
                    item.rowKey
                  }
                  className="p-5 sm:p-6"
                >
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

                  <div className="grid gap-4 xl:grid-cols-[minmax(300px,1.8fr)_minmax(170px,1fr)_100px_minmax(150px,0.8fr)_minmax(170px,0.9fr)]">
                    {/* =====================================
                        SEARCHABLE PRODUCT
                    ===================================== */}

                    <div>
                      <label
                        htmlFor={`normal-order-product-${item.rowKey}`}
                        className="mb-2 block text-sm font-semibold text-zinc-800"
                      >
                        Product
                      </label>

                      <ProductSearchPicker
                        rowKey={
                          item.rowKey
                        }
                        selectedProduct={
                          selectedProduct
                        }
                        productCatalog={
                          productCatalog
                        }
                        selectedProductIds={
                          selectedProductIds
                        }
                        disabled={
                          isSaving ||
                          !hasProducts
                        }
                        onSelect={(
                          productId
                        ) =>
                          handleProductSelect(
                            item.rowKey,
                            productId
                          )
                        }
                        onResults={
                          handleProductResults
                        }
                      />
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
                        ORDER UOM
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
                          item.packagingUom
                            ? item.packagingUom.toUpperCase()
                            : "Auto"
                        }
                        className="h-11 w-full cursor-default rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold uppercase text-zinc-600 outline-none"
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

                  {isEditMode ? (
                    packagingDetails ? (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">
                              Product Size
                            </p>

                            <p className="mt-1 text-sm font-bold text-zinc-900">
                              {packagingDetails.productSize}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">
                              Packaging
                            </p>

                            <p className="mt-1 text-sm font-bold text-zinc-900">
                              {packagingDetails.packaging}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">
                              Ordering Guide
                            </p>

                            <p className="mt-1 text-sm font-bold text-zinc-900">
                              {packagingDetails.guide}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null
                  ) : selectedProduct ? (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-bold text-amber-900">
                            Product Packaging
                          </p>

                          <p className="mt-1 text-[11px] leading-5 text-amber-800">
                            Edit the packaging used for this Product. Saving the Normal Order updates the Product List as the single source of truth.
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        <div>
                          <label
                            htmlFor={`normal-order-product-size-${item.rowKey}`}
                            className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700"
                          >
                            Product Size
                          </label>

                          <div className="relative">
                            <input
                              id={`normal-order-product-size-${item.rowKey}`}
                              type="number"
                              min="0.0001"
                              max="99999999999999.9999"
                              step="0.0001"
                              inputMode="decimal"
                              value={
                                item.amountQty
                              }
                              onChange={(
                                event
                              ) =>
                                updateItem(
                                  item.rowKey,
                                  {
                                    amountQty:
                                      event.target.value,
                                  }
                                )
                              }
                              disabled={
                                isSaving
                              }
                              className="h-11 w-full rounded-xl border border-amber-200 bg-white px-4 pr-20 text-sm font-semibold text-zinc-950 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100 disabled:bg-zinc-50"
                            />

                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold uppercase text-amber-700">
                              {item.uom ||
                                selectedProduct.uom}
                            </span>
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor={`normal-order-product-uom-${item.rowKey}`}
                            className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700"
                          >
                            Product UOM
                          </label>

                          <div className="relative">
                            <select
                              id={`normal-order-product-uom-${item.rowKey}`}
                              value={
                                item.uom
                              }
                              onChange={(
                                event
                              ) =>
                                updateItem(
                                  item.rowKey,
                                  {
                                    uom:
                                      event.target.value as
                                        | NormalOrderUom
                                        | "",
                                  }
                                )
                              }
                              disabled={
                                isSaving
                              }
                              className="h-11 w-full appearance-none rounded-xl border border-amber-200 bg-white px-4 pr-10 text-sm font-semibold uppercase text-zinc-950 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100 disabled:bg-zinc-50"
                            >
                              <option value="">
                                Select UOM
                              </option>

                              {UOM_OPTIONS.map(
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
                              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-amber-700"
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor={`normal-order-packaging-size-${item.rowKey}`}
                            className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700"
                          >
                            Packaging Size
                          </label>

                          <input
                            id={`normal-order-packaging-size-${item.rowKey}`}
                            type="number"
                            min="0.0001"
                            max="99999999999999.9999"
                            step="0.0001"
                            inputMode="decimal"
                            value={
                              item.packagingSizeAmount
                            }
                            onChange={(
                              event
                            ) =>
                              updateItem(
                                item.rowKey,
                                {
                                  packagingSizeAmount:
                                    event.target.value,
                                }
                              )
                            }
                            disabled={
                              isSaving
                            }
                            className="h-11 w-full rounded-xl border border-amber-200 bg-white px-4 text-sm font-semibold text-zinc-950 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100 disabled:bg-zinc-50"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`normal-order-packaging-uom-${item.rowKey}`}
                            className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700"
                          >
                            Packaging UOM
                          </label>

                          <div className="relative">
                            <select
                              id={`normal-order-packaging-uom-${item.rowKey}`}
                              value={
                                item.packagingUom
                              }
                              onChange={(
                                event
                              ) =>
                                updateItem(
                                  item.rowKey,
                                  {
                                    packagingUom:
                                      event.target.value as
                                        | NormalOrderPackagingUom
                                        | "",
                                  }
                                )
                              }
                              disabled={
                                isSaving
                              }
                              className="h-11 w-full appearance-none rounded-xl border border-amber-200 bg-white px-4 pr-10 text-sm font-semibold text-zinc-950 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100 disabled:bg-zinc-50"
                            >
                              <option value="">
                                Select UOM
                              </option>

                              {PACKAGING_UOM_OPTIONS.map(
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
                              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-amber-700"
                            />
                          </div>
                        </div>

                        <div>
                          <p className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">
                            Ordering Guide
                          </p>

                          <div className="flex min-h-11 items-center rounded-xl border border-amber-200 bg-white/70 px-4 py-2.5">
                            <p className="text-sm font-bold leading-5 text-zinc-900">
                              {packagingDetails?.guide ??
                                "Complete packaging details"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
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