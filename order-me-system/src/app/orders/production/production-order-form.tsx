"use client";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  AlertTriangle,
  Calculator,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Factory,
  Hash,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import {
  saveProductionOrderAction,
  type ProductionOrderRecipeOption,
  type ProductionOrderRecord,
  type ProductionOrderStatus,
  type ProductionOrderUom,
} from "@/app/orders/production/actions";

import {
  useToast,
} from "@/components/toast-provider";

// =========================================================
// TYPES
// =========================================================

type ProductionOrderFormMode =
  | "create"
  | "edit";

export type ProductionOrderHistoricalRecipeIngredient = {
  recipe_id: string;
  product_id: string;

  sku_snapshot: string;
  product_name_snapshot: string;
  category_name_snapshot: string;

  uom:
    ProductionOrderUom;

  base_qty_snapshot: string;
};

type ProductionOrderFormProps = {
  mode:
    ProductionOrderFormMode;

  recipeOptions:
    ProductionOrderRecipeOption[];

  order?:
    ProductionOrderRecord;

  historicalRecipeItems?:
    ProductionOrderHistoricalRecipeIngredient[];
};

type ProductionOrderFormState = {
  orderDate: string;
  orderedBy: string;
  status:
    ProductionOrderStatus;
};

type SelectedRecipe = {
  recipeId: string;
  requiredYieldQty: string;
};

type CalculationIngredient = {
  productId: string;

  sku: string;
  productName: string;
  categoryName: string;

  uom:
    ProductionOrderUom;

  baseQty: string;
};

type RecipeCalculation = {
  recipeId: string;

  recipeName: string;

  batchQty: string;
  baseYieldQty: string;
  yieldUom:
    ProductionOrderUom;

  requiredYieldQty: string;

  multiplierUnits10:
    bigint | null;

  multiplierDisplay: string;

  ingredients:
    CalculationIngredient[];

  isHistorical: boolean;
  isActive: boolean;

  ready: boolean;

  error:
    string | null;
};

type ConsolidatedIngredient = {
  productId: string;

  sku: string;
  productName: string;
  categoryName: string;

  uom:
    ProductionOrderUom;

  requiredUnits4:
    bigint;

  requiredDisplay:
    string;
};

type ParsedDecimal = {
  units: bigint;
  scale: number;
};

// =========================================================
// CONSTANTS
// =========================================================

const MAX_DECIMAL_VALUE =
  "99999999999999.9999";

// =========================================================
// BIGINT CONSTANTS
// =========================================================
//
// Do not use BigInt literal syntax such as:
//
// 0n
// 10n
// 10_000n
//
// The current application TypeScript target is below ES2020.
//
// Using BigInt() preserves exact fixed-point arithmetic
// without requiring a global tsconfig target change.
// =========================================================

const BIGINT_ZERO =
  BigInt(0);

const BIGINT_TWO =
  BigInt(2);

const BIGINT_TEN =
  BigInt(10);

const POW10_4 =
  BigInt(10000);

const POW10_10 =
  BigInt(10000000000);

const ORDER_STATUSES: {
  value:
    ProductionOrderStatus;
  label: string;
}[] = [
  {
    value:
      "draft",
    label:
      "Draft",
  },
  {
    value:
      "submitted",
    label:
      "Submitted",
  },
  {
    value:
      "completed",
    label:
      "Completed",
  },
  {
    value:
      "cancelled",
    label:
      "Cancelled",
  },
];

// =========================================================
// DATE
// =========================================================

function getLocalToday():
  string {
  const now =
    new Date();

  const local =
    new Date(
      now.getTime() -
        now.getTimezoneOffset() *
          60_000
    );

  return local
    .toISOString()
    .slice(
      0,
      10
    );
}

// =========================================================
// DECIMAL HELPERS
// =========================================================
//
// Client calculations are previews.
//
// PostgreSQL remains authoritative.
//
// These helpers use BigInt rather than floating-point
// arithmetic so the preview can closely mirror PostgreSQL's
// NUMERIC calculations.
// =========================================================

function powerOfTen(
  scale: number
): bigint {
  return (
    BIGINT_TEN **
    BigInt(
      scale
    )
  );
}

function parseDecimal(
  value: string
): ParsedDecimal | null {
  const normalized =
    value.trim();

  if (
    !/^\d+(?:\.\d+)?$/.test(
      normalized
    )
  ) {
    return null;
  }

  const [
    whole,
    fraction = "",
  ] =
    normalized.split(
      "."
    );

  const combined =
    `${whole}${fraction}`;

  try {
    return {
      units:
        BigInt(
          combined
        ),

      scale:
        fraction.length,
    };
  } catch {
    return null;
  }
}

function roundPositiveDivision(
  numerator: bigint,
  denominator: bigint
): bigint {
  if (
    denominator <=
    BIGINT_ZERO
  ) {
    throw new Error(
      "Invalid decimal denominator."
    );
  }

  return (
    numerator +
    denominator /
      BIGINT_TWO
  ) /
    denominator;
}

function calculateMultiplierUnits10(
  requiredYield:
    string,
  baseYield:
    string
): bigint | null {
  const required =
    parseDecimal(
      requiredYield
    );

  const base =
    parseDecimal(
      baseYield
    );

  if (
    !required ||
    !base ||
    required.units <=
      BIGINT_ZERO ||
    base.units <=
      BIGINT_ZERO
  ) {
    return null;
  }

  const numerator =
    required.units *
    powerOfTen(
      base.scale
    ) *
    POW10_10;

  const denominator =
    base.units *
    powerOfTen(
      required.scale
    );

  return roundPositiveDivision(
    numerator,
    denominator
  );
}

function calculateRequiredUnits4(
  baseQty: string,
  multiplierUnits10:
    bigint
): bigint | null {
  const base =
    parseDecimal(
      baseQty
    );

  if (
    !base ||
    base.units <=
      BIGINT_ZERO
  ) {
    return null;
  }

  const numerator =
    base.units *
    multiplierUnits10 *
    POW10_4;

  const denominator =
    powerOfTen(
      base.scale
    ) *
    POW10_10;

  return roundPositiveDivision(
    numerator,
    denominator
  );
}

function decimalToUnits4(
  value: string
): bigint | null {
  const parsed =
    parseDecimal(
      value
    );

  if (
    !parsed ||
    parsed.scale >
      4
  ) {
    return null;
  }

  return (
    parsed.units *
    powerOfTen(
      4 -
        parsed.scale
    )
  );
}

function formatScaledInteger(
  units: bigint,
  scale: number
): string {
  const negative =
    units <
    BIGINT_ZERO;

  const absolute =
    negative
      ? -units
      : units;

  if (
    scale ===
    0
  ) {
    return `${
      negative
        ? "-"
        : ""
    }${absolute.toString()}`;
  }

  const raw =
    absolute
      .toString()
      .padStart(
        scale +
          1,
        "0"
      );

  const whole =
    raw.slice(
      0,
      -scale
    );

  const fraction =
    raw
      .slice(
        -scale
      )
      .replace(
        /0+$/,
        ""
      );

  const result =
    fraction
      ? `${whole}.${fraction}`
      : whole;

  return `${
    negative
      ? "-"
      : ""
  }${result}`;
}

function normalizeDatabaseDecimal(
  value: string
): string {
  const parsed =
    parseDecimal(
      value
    );

  if (
    !parsed
  ) {
    return value;
  }

  return formatScaledInteger(
    parsed.units,
    parsed.scale
  );
}

// =========================================================
// INPUT VALIDATION
// =========================================================

function isValidPositiveDecimal(
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

  const parsed =
    parseDecimal(
      normalized
    );

  return Boolean(
    parsed &&
      parsed.units >
        BIGINT_ZERO
  );
}

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

  const parsed =
    parseDecimal(
      normalized
    );

  return Boolean(
    parsed &&
      parsed.units >=
        BIGINT_ZERO
  );
}

// =========================================================
// INITIAL STATE
// =========================================================

function createInitialFormState(
  order:
    | ProductionOrderRecord
    | undefined
): ProductionOrderFormState {
  return {
    orderDate:
      order?.order_date ??
      "",

    orderedBy:
      order?.ordered_by ??
      "",

    status:
      order?.status ??
      "draft",
  };
}

function createInitialSelectedRecipes(
  order:
    | ProductionOrderRecord
    | undefined
): SelectedRecipe[] {
  if (
    !order
  ) {
    return [];
  }

  return order.recipes.map(
    (
      recipe
    ) => ({
      recipeId:
        recipe.recipe_id,

      requiredYieldQty:
        normalizeDatabaseDecimal(
          recipe.required_yield_qty
        ),
    })
  );
}

// =========================================================
// COMPONENT
// =========================================================

export default function ProductionOrderForm({
  mode,
  recipeOptions,
  order,
  historicalRecipeItems = [],
}: ProductionOrderFormProps) {
  const router =
    useRouter();

  const toast =
    useToast();

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const [
    form,
    setForm,
  ] =
    useState<ProductionOrderFormState>(
      () =>
        createInitialFormState(
          order
        )
    );

  const [
    selectedRecipes,
    setSelectedRecipes,
  ] =
    useState<SelectedRecipe[]>(
      () =>
        createInitialSelectedRecipes(
          order
        )
    );

  const [
    recipeSearch,
    setRecipeSearch,
  ] =
    useState("");

  const [
    recipeToAdd,
    setRecipeToAdd,
  ] =
    useState("");

  const [
    onHandValues,
    setOnHandValues,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const isEditMode =
    mode ===
    "edit";

  // =======================================================
  // DEFAULT DATE
  // =======================================================

  useEffect(
    () => {
      if (
        mode ===
          "create" &&
        !form.orderDate
      ) {
        setForm(
          (
            current
          ) => ({
            ...current,
            orderDate:
              getLocalToday(),
          })
        );
      }
    },
    [
      mode,
      form.orderDate,
    ]
  );

  // =======================================================
  // LOOKUP MAPS
  // =======================================================

  const recipeOptionMap =
    useMemo(
      () =>
        new Map(
          recipeOptions.map(
            (
              recipe
            ) => [
              recipe.id,
              recipe,
            ]
          )
        ),
      [
        recipeOptions,
      ]
    );

  const existingRecipeMap =
    useMemo(
      () =>
        new Map(
          (
            order?.recipes ??
            []
          ).map(
            (
              recipe
            ) => [
              recipe.recipe_id,
              recipe,
            ]
          )
        ),
      [
        order,
      ]
    );

  const originalRecipeIds =
    useMemo(
      () =>
        new Set(
          (
            order?.recipes ??
            []
          ).map(
            (
              recipe
            ) =>
              recipe.recipe_id
          )
        ),
      [
        order,
      ]
    );

  const historicalIngredientsByRecipe =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            ProductionOrderHistoricalRecipeIngredient[]
          >();

        for (
          const item of
          historicalRecipeItems
        ) {
          const existing =
            map.get(
              item.recipe_id
            ) ??
            [];

          existing.push(
            item
          );

          map.set(
            item.recipe_id,
            existing
          );
        }

        return map;
      },
      [
        historicalRecipeItems,
      ]
    );

  const existingOnHandMap =
    useMemo(
      () =>
        new Map(
          (
            order?.items ??
            []
          ).map(
            (
              item
            ) => [
              item.product_id,
              normalizeDatabaseDecimal(
                item.on_hand_qty
              ),
            ]
          )
        ),
      [
        order,
      ]
    );

  // =======================================================
  // AVAILABLE RECIPE OPTIONS
  // =======================================================

  const selectedRecipeIdSet =
    useMemo(
      () =>
        new Set(
          selectedRecipes.map(
            (
              recipe
            ) =>
              recipe.recipeId
          )
        ),
      [
        selectedRecipes,
      ]
    );

  const availableRecipeOptions =
    useMemo(
      () => {
        const normalizedSearch =
          recipeSearch
            .trim()
            .toLocaleLowerCase();

        return recipeOptions
          .filter(
            (
              recipe
            ) =>
              !selectedRecipeIdSet.has(
                recipe.id
              )
          )
          .filter(
            (
              recipe
            ) =>
              recipe.is_active ||
              originalRecipeIds.has(
                recipe.id
              )
          )
          .filter(
            (
              recipe
            ) =>
              !normalizedSearch ||
              recipe.name
                .toLocaleLowerCase()
                .includes(
                  normalizedSearch
                )
          )
          .sort(
            (
              a,
              b
            ) =>
              a.name.localeCompare(
                b.name,
                undefined,
                {
                  sensitivity:
                    "base",
                }
              )
          );
      },
      [
        recipeOptions,
        recipeSearch,
        selectedRecipeIdSet,
        originalRecipeIds,
      ]
    );

  // =======================================================
  // RECIPE CALCULATIONS
  // =======================================================

  const recipeCalculations =
    useMemo<
      RecipeCalculation[]
    >(
      () =>
        selectedRecipes.map(
          (
            selected
          ) => {
            const historicalRecipe =
              existingRecipeMap.get(
                selected.recipeId
              );

            const masterRecipe =
              recipeOptionMap.get(
                selected.recipeId
              );

            // ===============================================
            // EXISTING HISTORICAL RECIPE
            // ===============================================

            if (
              historicalRecipe
            ) {
              const historicalIngredients =
                historicalIngredientsByRecipe.get(
                  selected.recipeId
                ) ??
                [];

              const multiplierUnits10 =
                calculateMultiplierUnits10(
                  selected.requiredYieldQty,
                  historicalRecipe.base_yield_qty_snapshot
                );

              return {
                recipeId:
                  selected.recipeId,

                recipeName:
                  historicalRecipe.recipe_name_snapshot,

                batchQty:
                  normalizeDatabaseDecimal(
                    historicalRecipe.batch_qty_snapshot
                  ),

                baseYieldQty:
                  normalizeDatabaseDecimal(
                    historicalRecipe.base_yield_qty_snapshot
                  ),

                yieldUom:
                  historicalRecipe.yield_uom_snapshot,

                requiredYieldQty:
                  selected.requiredYieldQty,

                multiplierUnits10,

                multiplierDisplay:
                  multiplierUnits10 ===
                  null
                    ? "—"
                    : formatScaledInteger(
                        multiplierUnits10,
                        10
                      ),

                ingredients:
                  historicalIngredients.map(
                    (
                      item
                    ) => ({
                      productId:
                        item.product_id,

                      sku:
                        item.sku_snapshot,

                      productName:
                        item.product_name_snapshot,

                      categoryName:
                        item.category_name_snapshot,

                      uom:
                        item.uom,

                      baseQty:
                        item.base_qty_snapshot,
                    })
                  ),

                isHistorical:
                  true,

                isActive:
                  masterRecipe?.is_active ??
                  false,

                ready:
                  historicalIngredients.length >
                    0 &&
                  multiplierUnits10 !==
                    null,

                error:
                  historicalIngredients.length ===
                  0
                    ? "Historical ingredient snapshots are required to edit this saved recipe safely."
                    : multiplierUnits10 ===
                        null
                      ? "Enter a valid Required Yield greater than zero."
                      : null,
              };
            }

            // ===============================================
            // NEW MASTER RECIPE
            // ===============================================

            if (
              !masterRecipe
            ) {
              return {
                recipeId:
                  selected.recipeId,

                recipeName:
                  "Unavailable Recipe",

                batchQty:
                  "—",

                baseYieldQty:
                  "—",

                yieldUom:
                  "gram",

                requiredYieldQty:
                  selected.requiredYieldQty,

                multiplierUnits10:
                  null,

                multiplierDisplay:
                  "—",

                ingredients:
                  [],

                isHistorical:
                  false,

                isActive:
                  false,

                ready:
                  false,

                error:
                  "This production recipe is no longer available.",
              };
            }

            const multiplierUnits10 =
              calculateMultiplierUnits10(
                selected.requiredYieldQty,
                masterRecipe.yield_qty
              );

            return {
              recipeId:
                selected.recipeId,

              recipeName:
                masterRecipe.name,

              batchQty:
                normalizeDatabaseDecimal(
                  masterRecipe.batch_qty
                ),

              baseYieldQty:
                normalizeDatabaseDecimal(
                  masterRecipe.yield_qty
                ),

              yieldUom:
                masterRecipe.yield_uom,

              requiredYieldQty:
                selected.requiredYieldQty,

              multiplierUnits10,

              multiplierDisplay:
                multiplierUnits10 ===
                null
                  ? "—"
                  : formatScaledInteger(
                      multiplierUnits10,
                      10
                    ),

              ingredients:
                masterRecipe.ingredients.map(
                  (
                    item
                  ) => ({
                    productId:
                      item.product_id,

                    sku:
                      item.sku,

                    productName:
                      item.product_name,

                    categoryName:
                      item.category_name,

                    uom:
                      item.uom,

                    baseQty:
                      item.qty,
                  })
                ),

              isHistorical:
                false,

              isActive:
                masterRecipe.is_active,

              ready:
                masterRecipe.ingredients.length >
                  0 &&
                multiplierUnits10 !==
                  null,

              error:
                masterRecipe.ingredients.length ===
                0
                  ? "This production recipe has no ingredients."
                  : multiplierUnits10 ===
                      null
                    ? "Enter a valid Required Yield greater than zero."
                    : null,
            };
          }
        ),
      [
        selectedRecipes,
        existingRecipeMap,
        recipeOptionMap,
        historicalIngredientsByRecipe,
      ]
    );

  // =======================================================
  // CONSOLIDATE INGREDIENTS
  // =======================================================

  const {
    consolidatedIngredients,
    calculationError,
  } =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            ConsolidatedIngredient
          >();

        let error:
          string | null =
          null;

        for (
          const recipe of
          recipeCalculations
        ) {
          if (
            !recipe.ready ||
            recipe.multiplierUnits10 ===
              null
          ) {
            error =
              recipe.error ??
              "One or more production recipes cannot be calculated.";

            continue;
          }

          for (
            const ingredient of
            recipe.ingredients
          ) {
            const requiredUnits4 =
              calculateRequiredUnits4(
                ingredient.baseQty,
                recipe.multiplierUnits10
              );

            if (
              requiredUnits4 ===
                null ||
              requiredUnits4 <=
                BIGINT_ZERO
            ) {
              error =
                `${recipe.recipeName} produces an ingredient quantity that rounds to zero. Increase the Required Yield.`;

              continue;
            }

            const existing =
              map.get(
                ingredient.productId
              );

            if (
              existing
            ) {
              if (
                existing.uom !==
                ingredient.uom
              ) {
                error =
                  `Ingredient UOM conflict detected for ${ingredient.productName}.`;

                continue;
              }

              const combined =
                existing.requiredUnits4 +
                requiredUnits4;

              map.set(
                ingredient.productId,
                {
                  ...existing,

                  requiredUnits4:
                    combined,

                  requiredDisplay:
                    formatScaledInteger(
                      combined,
                      4
                    ),
                }
              );

              continue;
            }

            map.set(
              ingredient.productId,
              {
                productId:
                  ingredient.productId,

                sku:
                  ingredient.sku,

                productName:
                  ingredient.productName,

                categoryName:
                  ingredient.categoryName,

                uom:
                  ingredient.uom,

                requiredUnits4,

                requiredDisplay:
                  formatScaledInteger(
                    requiredUnits4,
                    4
                  ),
              }
            );
          }
        }

        const items =
          Array.from(
            map.values()
          ).sort(
            (
              a,
              b
            ) =>
              a.productName.localeCompare(
                b.productName,
                undefined,
                {
                  sensitivity:
                    "base",
                }
              )
          );

        return {
          consolidatedIngredients:
            items,

          calculationError:
            error,
        };
      },
      [
        recipeCalculations,
      ]
    );

  // =======================================================
  // SYNCHRONIZE ON HAND INPUTS
  // =======================================================

  useEffect(
    () => {
      setOnHandValues(
        (
          current
        ) => {
          const next:
            Record<
              string,
              string
            > = {};

          let changed =
            false;

          for (
            const ingredient of
            consolidatedIngredients
          ) {
            if (
              Object.prototype.hasOwnProperty.call(
                current,
                ingredient.productId
              )
            ) {
              next[
                ingredient.productId
              ] =
                current[
                  ingredient.productId
                ];

              continue;
            }

            const savedValue =
              existingOnHandMap.get(
                ingredient.productId
              );

            next[
              ingredient.productId
            ] =
              savedValue ??
              "";

            changed =
              true;
          }

          const currentKeys =
            Object.keys(
              current
            );

          if (
            currentKeys.length !==
            Object.keys(
              next
            ).length
          ) {
            changed =
              true;
          }

          if (
            !changed
          ) {
            for (
              const key of
              currentKeys
            ) {
              if (
                current[
                  key
                ] !==
                next[
                  key
                ]
              ) {
                changed =
                  true;

                break;
              }
            }
          }

          return changed
            ? next
            : current;
        }
      );
    },
    [
      consolidatedIngredients,
      existingOnHandMap,
    ]
  );

  // =======================================================
  // FORM FIELD UPDATE
  // =======================================================

  function updateFormField<
    K extends keyof ProductionOrderFormState,
  >(
    field: K,
    value:
      ProductionOrderFormState[K]
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
  // ADD RECIPE
  // =======================================================

  function addRecipe() {
    if (
      isPending
    ) {
      return;
    }

    if (
      !recipeToAdd
    ) {
      toast.warning(
        "Select Recipe",
        "Choose a production recipe before adding it to the order."
      );

      return;
    }

    if (
      selectedRecipeIdSet.has(
        recipeToAdd
      )
    ) {
      toast.warning(
        "Recipe Already Added",
        "The same production recipe cannot appear more than once."
      );

      return;
    }

    const option =
      recipeOptionMap.get(
        recipeToAdd
      );

    const historical =
      existingRecipeMap.get(
        recipeToAdd
      );

    if (
      !option &&
      !historical
    ) {
      toast.error(
        "Recipe Unavailable",
        "The selected production recipe could not be loaded."
      );

      return;
    }

    if (
      option &&
      !option.is_active &&
      !historical
    ) {
      toast.warning(
        "Inactive Recipe",
        "Inactive production recipes cannot be added to a new production order."
      );

      return;
    }

    const requiredYield =
      historical
        ? normalizeDatabaseDecimal(
            historical.required_yield_qty
          )
        : normalizeDatabaseDecimal(
            option?.yield_qty ??
              ""
          );

    setSelectedRecipes(
      (
        current
      ) => [
        ...current,
        {
          recipeId:
            recipeToAdd,

          requiredYieldQty:
            requiredYield,
        },
      ]
    );

    setRecipeToAdd(
      ""
    );

    setRecipeSearch(
      ""
    );
  }

  // =======================================================
  // REMOVE RECIPE
  // =======================================================

  function removeRecipe(
    recipeId: string
  ) {
    if (
      isPending
    ) {
      return;
    }

    setSelectedRecipes(
      (
        current
      ) =>
        current.filter(
          (
            recipe
          ) =>
            recipe.recipeId !==
            recipeId
        )
    );
  }

  // =======================================================
  // REQUIRED YIELD
  // =======================================================

  function updateRequiredYield(
    recipeId: string,
    value: string
  ) {
    setSelectedRecipes(
      (
        current
      ) =>
        current.map(
          (
            recipe
          ) =>
            recipe.recipeId ===
            recipeId
              ? {
                  ...recipe,
                  requiredYieldQty:
                    value,
                }
              : recipe
        )
    );
  }

  // =======================================================
  // ON HAND
  // =======================================================

  function updateOnHand(
    productId: string,
    value: string
  ) {
    setOnHandValues(
      (
        current
      ) => ({
        ...current,
        [productId]:
          value,
      })
    );
  }

  // =======================================================
  // REQUESTED QTY PREVIEW
  // =======================================================

  function getRequestedQty(
    ingredient:
      ConsolidatedIngredient
  ): string {
    const onHand =
      onHandValues[
        ingredient.productId
      ];

    if (
      !onHand ||
      !isValidNonNegativeDecimal(
        onHand
      )
    ) {
      return "—";
    }

    const onHandUnits4 =
      decimalToUnits4(
        onHand
      );

    if (
      onHandUnits4 ===
      null
    ) {
      return "—";
    }

    const requested =
      ingredient.requiredUnits4 >
      onHandUnits4
        ? ingredient.requiredUnits4 -
          onHandUnits4
        : BIGINT_ZERO;

    return formatScaledInteger(
      requested,
      4
    );
  }

  // =======================================================
  // VALIDATE FORM
  // =======================================================

  function validateForm():
    string | null {
    if (
      !form.orderDate
    ) {
      return "Select the production order date.";
    }

    if (
      !form.orderedBy
        .trim()
    ) {
      return "Enter Ordered By.";
    }

    if (
      form.orderedBy
        .trim()
        .length >
      200
    ) {
      return "Ordered By must not exceed 200 characters.";
    }

    if (
      selectedRecipes.length ===
      0
    ) {
      return "Add at least one production recipe.";
    }

    for (
      const recipe of
      selectedRecipes
    ) {
      if (
        !isValidPositiveDecimal(
          recipe.requiredYieldQty
        )
      ) {
        return "Every production recipe requires a valid Required Yield greater than zero with up to 4 decimal places.";
      }
    }

    for (
      const recipe of
      recipeCalculations
    ) {
      if (
        !recipe.ready
      ) {
        return (
          recipe.error ??
          "One or more production recipes cannot be calculated."
        );
      }
    }

    if (
      calculationError
    ) {
      return calculationError;
    }

    if (
      consolidatedIngredients.length ===
      0
    ) {
      return "The selected production recipes do not contain any calculated ingredients.";
    }

    for (
      const ingredient of
      consolidatedIngredients
    ) {
      const value =
        onHandValues[
          ingredient.productId
        ];

      if (
        !isValidNonNegativeDecimal(
          value ??
            ""
        )
      ) {
        return `Enter a valid On Hand Qty for ${ingredient.productName}. Zero is allowed.`;
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
      isPending
    ) {
      return;
    }

    const validationError =
      validateForm();

    if (
      validationError
    ) {
      toast.warning(
        "Check Production Order",
        validationError
      );

      return;
    }

    startTransition(
      async () => {
        const loadingToast =
          isEditMode
            ? toast.updating(
                "Updating Production Order",
                order?.order_number ??
                  "Production Order"
              )
            : toast.saving(
                "Saving Production Order",
                "Calculating recipe and ingredient requirements."
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
          "recipes",
          JSON.stringify(
            selectedRecipes.map(
              (
                recipe
              ) => ({
                recipe_id:
                  recipe.recipeId,

                required_yield_qty:
                  recipe.requiredYieldQty.trim(),
              })
            )
          )
        );

        formData.set(
          "onHandItems",
          JSON.stringify(
            consolidatedIngredients.map(
              (
                ingredient
              ) => ({
                product_id:
                  ingredient.productId,

                on_hand_qty:
                  onHandValues[
                    ingredient.productId
                  ].trim(),
              })
            )
          )
        );

        const result =
          await saveProductionOrderAction(
            null,
            formData
          );

        toast.dismissToast(
          loadingToast
        );

        if (
          !result.success ||
          !result.orderId
        ) {
          toast.error(
            isEditMode
              ? "Unable to Update Production Order"
              : "Unable to Save Production Order",
            result.message
          );

          return;
        }

        toast.success(
          isEditMode
            ? "Production Order Updated"
            : "Production Order Created",
          isEditMode
            ? `${order?.order_number ?? "Production order"} was updated successfully.`
            : "The production order was created successfully."
        );

        router.push(
          `/orders/production/${result.orderId}`
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
          ORDER DETAILS
      =================================================== */}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-zinc-950 text-white">
              <ClipboardList
                size={19}
                aria-hidden="true"
              />
            </div>

            <div>
              <h2 className="text-base font-bold text-zinc-950">
                Production Order Details
              </h2>

              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Define the production date, person responsible,
                and current order status.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-2">
          <div>
            <label
              htmlFor="production-order-number"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              Production Order Number
            </label>

            <div className="relative">
              <Hash
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                id="production-order-number"
                type="text"
                readOnly
                tabIndex={-1}
                value={
                  order?.order_number ??
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

              Order number is generated automatically by the
              system.
            </div>
          </div>

          <div>
            <label
              htmlFor="production-order-date"
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
                id="production-order-date"
                type="date"
                value={
                  form.orderDate
                }
                onChange={(
                  event
                ) =>
                  updateFormField(
                    "orderDate",
                    event.target
                      .value
                  )
                }
                disabled={
                  isPending
                }
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="production-ordered-by"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              Ordered By
            </label>

            <div className="relative">
              <UserRound
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                id="production-ordered-by"
                type="text"
                value={
                  form.orderedBy
                }
                onChange={(
                  event
                ) =>
                  updateFormField(
                    "orderedBy",
                    event.target
                      .value
                  )
                }
                maxLength={
                  200
                }
                autoComplete="off"
                disabled={
                  isPending
                }
                placeholder="Enter name"
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="production-order-status"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              Status
            </label>

            <div className="relative">
              <select
                id="production-order-status"
                value={
                  form.status
                }
                onChange={(
                  event
                ) =>
                  updateFormField(
                    "status",
                    event.target
                      .value as ProductionOrderStatus
                  )
                }
                disabled={
                  isPending
                }
                className="h-11 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-4 pr-10 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
              >
                {ORDER_STATUSES.map(
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
          RECIPE SELECTION
      =================================================== */}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
              <Factory
                size={19}
                aria-hidden="true"
              />
            </div>

            <div>
              <h2 className="text-base font-bold text-zinc-950">
                Production Recipes
              </h2>

              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Select one or more production recipes and enter
                the finished quantity required for each recipe.
              </p>
            </div>
          </div>
        </div>

        <div className="border-b border-zinc-200 bg-zinc-50/60 p-5 sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
            <div className="relative">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                type="search"
                value={
                  recipeSearch
                }
                onChange={(
                  event
                ) => {
                  setRecipeSearch(
                    event.target
                      .value
                  );

                  setRecipeToAdd(
                    ""
                  );
                }}
                disabled={
                  isPending
                }
                placeholder="Search production recipe"
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
              />
            </div>

            <div className="relative">
              <select
                value={
                  recipeToAdd
                }
                onChange={(
                  event
                ) =>
                  setRecipeToAdd(
                    event.target
                      .value
                  )
                }
                disabled={
                  isPending ||
                  availableRecipeOptions.length ===
                    0
                }
                className="h-11 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-4 pr-10 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
              >
                <option value="">
                  {availableRecipeOptions.length >
                  0
                    ? "Select recipe"
                    : "No matching recipes"}
                </option>

                {availableRecipeOptions.map(
                  (
                    recipe
                  ) => (
                    <option
                      key={
                        recipe.id
                      }
                      value={
                        recipe.id
                      }
                    >
                      {recipe.name}
                      {!recipe.is_active
                        ? " (Historical)"
                        : ""}
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

            <button
              type="button"
              onClick={
                addRecipe
              }
              disabled={
                isPending ||
                !recipeToAdd
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus
                size={16}
                aria-hidden="true"
              />

              Add Recipe
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {selectedRecipes.length ===
          0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-5 py-10 text-center">
              <Factory
                size={28}
                aria-hidden="true"
                className="mx-auto text-zinc-300"
              />

              <p className="mt-3 text-sm font-bold text-zinc-700">
                No production recipes added.
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                Search and add a recipe to begin the production
                calculation.
              </p>

              {recipeOptions.length ===
              0 ? (
                <Link
                  href="/recipes"
                  className="mt-4 inline-flex text-sm font-bold text-zinc-950 underline underline-offset-4"
                >
                  Create Production Recipe
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              {recipeCalculations.map(
                (
                  recipe,
                  index
                ) => (
                  <div
                    key={
                      recipe.recipeId
                    }
                    className="overflow-hidden rounded-2xl border border-zinc-200"
                  >
                    <div className="flex flex-col gap-4 border-b border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="grid h-7 w-7 place-items-center rounded-lg bg-zinc-950 text-xs font-bold text-white">
                            {index +
                              1}
                          </span>

                          <h3 className="font-bold text-zinc-950">
                            {
                              recipe.recipeName
                            }
                          </h3>

                          {recipe.isHistorical ? (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                              Historical Snapshot
                            </span>
                          ) : null}

                          {!recipe.isActive &&
                          recipe.isHistorical ? (
                            <span className="rounded-full bg-zinc-200 px-2.5 py-1 text-[11px] font-bold text-zinc-600">
                              Master Recipe Inactive
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 text-xs text-zinc-500">
                          Base Batch:{" "}
                          <span className="font-semibold text-zinc-700">
                            {
                              recipe.batchQty
                            }
                          </span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeRecipe(
                            recipe.recipeId
                          )
                        }
                        disabled={
                          isPending
                        }
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2
                          size={14}
                          aria-hidden="true"
                        />

                        Remove
                      </button>
                    </div>

                    <div className="grid gap-4 p-4 md:grid-cols-3">
                      <div className="rounded-xl bg-zinc-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                          Base Yield
                        </p>

                        <p className="mt-2 text-lg font-bold text-zinc-950">
                          {
                            recipe.baseYieldQty
                          }{" "}
                          <span className="text-sm font-semibold text-zinc-500">
                            {
                              recipe.yieldUom
                            }
                          </span>
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor={`required-yield-${recipe.recipeId}`}
                          className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500"
                        >
                          Required Yield
                        </label>

                        <div className="flex">
                          <input
                            id={`required-yield-${recipe.recipeId}`}
                            type="number"
                            min="0.0001"
                            max={
                              MAX_DECIMAL_VALUE
                            }
                            step="0.0001"
                            inputMode="decimal"
                            value={
                              recipe.requiredYieldQty
                            }
                            onChange={(
                              event
                            ) =>
                              updateRequiredYield(
                                recipe.recipeId,
                                event.target
                                  .value
                              )
                            }
                            disabled={
                              isPending
                            }
                            placeholder="0"
                            className="h-11 min-w-0 flex-1 rounded-l-xl border border-r-0 border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
                          />

                          <div className="flex h-11 items-center rounded-r-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-bold text-zinc-500">
                            {
                              recipe.yieldUom
                            }
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl bg-zinc-950 p-4 text-white">
                        <div className="flex items-center gap-2">
                          <Calculator
                            size={15}
                            aria-hidden="true"
                            className="text-zinc-400"
                          />

                          <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                            Yield Multiplier
                          </p>
                        </div>

                        <p className="mt-2 text-lg font-bold">
                          {
                            recipe.multiplierDisplay
                          }
                          ×
                        </p>
                      </div>
                    </div>

                    {recipe.error ? (
                      <div className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                        {
                          recipe.error
                        }
                      </div>
                    ) : null}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </section>

      {/* ===================================================
          INGREDIENT REQUIREMENTS
      =================================================== */}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
              <Calculator
                size={19}
                aria-hidden="true"
              />
            </div>

            <div>
              <h2 className="text-base font-bold text-zinc-950">
                Ingredient Requirement
              </h2>

              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Duplicate ingredients are consolidated
                automatically. Enter the physical On Hand Qty;
                the Order Request Qty is calculated automatically.
              </p>
            </div>
          </div>
        </div>

        {calculationError ? (
          <div className="border-b border-amber-200 bg-amber-50 p-4 sm:px-6">
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={18}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-amber-700"
              />

              <p className="text-sm font-medium leading-6 text-amber-800">
                {
                  calculationError
                }
              </p>
            </div>
          </div>
        ) : null}

        {consolidatedIngredients.length ===
        0 ? (
          <div className="px-5 py-10 text-center sm:px-6">
            <p className="text-sm font-semibold text-zinc-500">
              Add a production recipe to calculate ingredient
              requirements.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3 sm:px-5">
                    SKU
                  </th>

                  <th className="px-4 py-3">
                    Ingredient
                  </th>

                  <th className="px-4 py-3">
                    Category
                  </th>

                  <th className="px-4 py-3 text-right">
                    Required Qty
                  </th>

                  <th className="px-4 py-3">
                    On Hand Qty
                  </th>

                  <th className="px-4 py-3 text-right">
                    Order Request Qty
                  </th>

                  <th className="px-4 py-3 text-center sm:pr-5">
                    UOM
                  </th>
                </tr>
              </thead>

              <tbody>
                {consolidatedIngredients.map(
                  (
                    ingredient
                  ) => {
                    const requestedQty =
                      getRequestedQty(
                        ingredient
                      );

                    return (
                      <tr
                        key={
                          ingredient.productId
                        }
                        className="border-b border-zinc-100 last:border-b-0"
                      >
                        <td className="whitespace-nowrap px-4 py-4 text-xs font-bold text-zinc-500 sm:px-5">
                          {
                            ingredient.sku
                          }
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-sm font-bold text-zinc-950">
                            {
                              ingredient.productName
                            }
                          </p>
                        </td>

                        <td className="px-4 py-4 text-sm text-zinc-500">
                          {
                            ingredient.categoryName
                          }
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-bold tabular-nums text-zinc-950">
                          {
                            ingredient.requiredDisplay
                          }
                        </td>

                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            max={
                              MAX_DECIMAL_VALUE
                            }
                            step="0.0001"
                            inputMode="decimal"
                            value={
                              onHandValues[
                                ingredient.productId
                              ] ??
                              ""
                            }
                            onChange={(
                              event
                            ) =>
                              updateOnHand(
                                ingredient.productId,
                                event.target
                                  .value
                              )
                            }
                            disabled={
                              isPending
                            }
                            placeholder="Enter count"
                            aria-label={`On Hand Qty for ${ingredient.productName}`}
                            className="h-10 w-36 rounded-xl border border-zinc-200 bg-white px-3 text-right text-sm tabular-nums text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
                          />
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right">
                          <span
                            className={`inline-flex min-w-20 justify-end rounded-lg px-3 py-1.5 text-sm font-bold tabular-nums ${
                              requestedQty ===
                              "—"
                                ? "bg-zinc-100 text-zinc-400"
                                : requestedQty ===
                                    "0"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {
                              requestedQty
                            }
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center text-xs font-bold uppercase text-zinc-500 sm:pr-5">
                          {
                            ingredient.uom
                          }
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}

        {consolidatedIngredients.length >
        0 ? (
          <div className="border-t border-zinc-200 bg-zinc-50 px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
              <span>
                Consolidated Ingredients:{" "}
                <strong className="text-zinc-800">
                  {
                    consolidatedIngredients.length
                  }
                </strong>
              </span>

              <span>
                Formula: Required Qty − On Hand Qty = Order
                Request Qty
              </span>
            </div>
          </div>
        ) : null}
      </section>

      {/* ===================================================
          CALCULATION SAFETY
      =================================================== */}

      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2
            size={19}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-zinc-600"
          />

          <div>
            <p className="text-sm font-bold text-zinc-800">
              Database-Controlled Calculation
            </p>

            <p className="mt-1 text-sm leading-6 text-zinc-500">
              The values shown above are an operational preview.
              When saved, PostgreSQL recalculates the recipe
              multiplier, ingredient requirement, consolidation,
              and final requested quantity from the authoritative
              production-order database.
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================
          ACTIONS
      =================================================== */}

      <section className="flex flex-col-reverse gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-end sm:p-6">
        <Link
          href={
            isEditMode &&
            order
              ? `/orders/production/${order.id}`
              : "/orders/production"
          }
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
            isPending
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
                ? "Update Production Order"
                : "Save Production Order"}
            </>
          )}
        </button>
      </section>
    </form>
  );
}