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
  AlertTriangle,
  Beaker,
  ChevronDown,
  FlaskConical,
  GripVertical,
  Loader2,
  PackageSearch,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  createProductionRecipeAction,
  getRecipeProductOptions,
  updateProductionRecipeAction,
  type ProductionRecipeRecord,
  type RecipeProductOption,
  type RecipeUom,
} from "@/app/recipes/actions";

import {
  useToast,
} from "@/components/toast-provider";

// =========================================================
// TYPES
// =========================================================

type RecipeFormMode =
  | "create"
  | "edit";

type RecipeFormProps = {
  mode: RecipeFormMode;
  initialProductOptions: RecipeProductOption[];
  recipe?: ProductionRecipeRecord;
};

type RecipeFormIngredient = {
  rowKey: string;
  productId: string;
  qty: string;
  uom:
    | RecipeUom
    | "";
};

type RecipeFormState = {
  name: string;
  batchQty: string;
  yieldQty: string;
  yieldUom: RecipeUom;
  ingredients: RecipeFormIngredient[];
};

// =========================================================
// CONSTANTS
// =========================================================

const RECIPE_UOMS: {
  value: RecipeUom;
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

// =========================================================
// HELPERS
// =========================================================

function numberToInput(
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
    return "";
  }

  return String(
    value
  );
}

function createBlankIngredient(
  index: number
): RecipeFormIngredient {
  return {
    rowKey:
      `new-${Date.now()}-${index}`,

    productId: "",

    qty: "",

    uom: "",
  };
}

function createInitialState(
  recipe:
    | ProductionRecipeRecord
    | undefined
): RecipeFormState {
  if (!recipe) {
    return {
      name: "",

      batchQty:
        "1",

      yieldQty:
        "",

      yieldUom:
        "ml",

      ingredients: [
        createBlankIngredient(
          0
        ),
      ],
    };
  }

  return {
    name:
      recipe.name,

    batchQty:
      numberToInput(
        recipe.batch_qty
      ),

    yieldQty:
      numberToInput(
        recipe.yield_qty
      ),

    yieldUom:
      recipe.yield_uom,

    ingredients:
      recipe.ingredients.length >
      0
        ? recipe.ingredients.map(
            (
              ingredient
            ) => ({
              rowKey:
                ingredient.id,

              productId:
                ingredient.product_id,

              qty:
                numberToInput(
                  ingredient.qty
                ),

              uom:
                ingredient.uom,
            })
          )
        : [
            createBlankIngredient(
              0
            ),
          ],
  };
}

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

  const numeric =
    Number(
      normalized
    );

  return (
    Number.isFinite(
      numeric
    ) &&
    numeric > 0
  );
}

function mergeProductOptions(
  current:
    RecipeProductOption[],
  incoming:
    RecipeProductOption[]
): RecipeProductOption[] {
  const map =
    new Map<
      string,
      RecipeProductOption
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
// COMPONENT
// =========================================================

export default function RecipeForm({
  mode,
  initialProductOptions,
  recipe,
}: RecipeFormProps) {
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
    useState<RecipeFormState>(
      () =>
        createInitialState(
          recipe
        )
    );

  const [
    productCatalog,
    setProductCatalog,
  ] =
    useState<
      RecipeProductOption[]
    >(() =>
      initialProductOptions
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
  // MERGE INITIAL PRODUCTS WHEN SERVER PROPS CHANGE
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
  // SERVER PRODUCT SEARCH
  // =======================================================
  //
  // The first product set is loaded by the page.
  //
  // Additional searches are sent to the secure server action
  // after a short debounce. Results are merged into the local
  // catalog so products already selected never disappear.
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
              await getRecipeProductOptions(
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
                "Unable to search products."
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
  // FILTERED PRODUCT CATALOG
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
              )
        );
      },
      [
        productCatalog,
        productSearch,
      ]
    );

  const productMap =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            RecipeProductOption
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
          form.ingredients
            .map(
              (
                ingredient
              ) =>
                ingredient.productId
            )
            .filter(
              Boolean
            )
        ),
      [
        form.ingredients,
      ]
    );

  const hasProducts =
    productCatalog.length >
    0;

  // =======================================================
  // MAIN FIELD UPDATE
  // =======================================================

  function updateMainField<
    K extends
      | "name"
      | "batchQty"
      | "yieldQty"
      | "yieldUom",
  >(
    field: K,
    value: RecipeFormState[K]
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
  // INGREDIENT UPDATE
  // =======================================================

  function updateIngredient(
    rowKey: string,
    changes: Partial<RecipeFormIngredient>
  ) {
    setForm(
      (
        current
      ) => ({
        ...current,

        ingredients:
          current.ingredients.map(
            (
              ingredient
            ) =>
              ingredient.rowKey ===
              rowKey
                ? {
                    ...ingredient,
                    ...changes,
                  }
                : ingredient
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
      updateIngredient(
        rowKey,
        {
          productId:
            "",

          uom:
            "",
        }
      );

      return;
    }

    const duplicate =
      form.ingredients.some(
        (
          ingredient
        ) =>
          ingredient.rowKey !==
            rowKey &&
          ingredient.productId ===
            productId
      );

    if (duplicate) {
      const product =
        productMap.get(
          productId
        );

      toast.warning(
        "Duplicate Ingredient",
        product
          ? `${product.name} is already included in this recipe.`
          : "This product is already included in the recipe."
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
        "The selected product could not be loaded."
      );

      return;
    }

    updateIngredient(
      rowKey,
      {
        productId:
          product.id,

        uom:
          product.uom,
      }
    );
  }

  // =======================================================
  // ADD INGREDIENT
  // =======================================================

  function addIngredient() {
    setForm(
      (
        current
      ) => ({
        ...current,

        ingredients: [
          ...current.ingredients,

          createBlankIngredient(
            current.ingredients.length
          ),
        ],
      })
    );
  }

  // =======================================================
  // REMOVE INGREDIENT
  // =======================================================

  function removeIngredient(
    rowKey: string
  ) {
    setForm(
      (
        current
      ) => {
        if (
          current.ingredients.length ===
          1
        ) {
          return {
            ...current,

            ingredients: [
              createBlankIngredient(
                0
              ),
            ],
          };
        }

        return {
          ...current,

          ingredients:
            current.ingredients.filter(
              (
                ingredient
              ) =>
                ingredient.rowKey !==
                rowKey
            ),
        };
      }
    );
  }

  // =======================================================
  // FORM VALIDATION
  // =======================================================

  function validateForm():
    | string
    | null {
    const name =
      form.name
        .trim()
        .replace(
          /\s+/g,
          " "
        );

    if (!name) {
      return "Enter a production recipe name.";
    }

    if (
      name.length >
      200
    ) {
      return "Recipe name must not exceed 200 characters.";
    }

    if (
      !isValidPositiveDecimal(
        form.batchQty
      )
    ) {
      return "Batch QTY must be greater than zero and may contain up to 4 decimal places.";
    }

    if (
      !isValidPositiveDecimal(
        form.yieldQty
      )
    ) {
      return "Yield QTY must be greater than zero and may contain up to 4 decimal places.";
    }

    if (
      form.ingredients.length ===
      0
    ) {
      return "Add at least one ingredient.";
    }

    const productIds =
      new Set<string>();

    for (
      let index = 0;
      index <
      form.ingredients.length;
      index += 1
    ) {
      const ingredient =
        form.ingredients[
          index
        ];

      if (
        !ingredient.productId
      ) {
        return `Select a product for ingredient ${index + 1}.`;
      }

      if (
        productIds.has(
          ingredient.productId
        )
      ) {
        return "The same product cannot appear more than once in the recipe.";
      }

      productIds.add(
        ingredient.productId
      );

      if (
        !isValidPositiveDecimal(
          ingredient.qty
        )
      ) {
        return `Enter a valid quantity for ingredient ${index + 1}.`;
      }

      if (
        !ingredient.uom
      ) {
        return `Ingredient ${index + 1} does not have a valid UOM.`;
      }

      const product =
        productMap.get(
          ingredient.productId
        );

      if (
        product &&
        product.uom !==
          ingredient.uom
      ) {
        return `${product.name} must use ${product.uom} as its ingredient UOM.`;
      }
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

    if (isSaving) {
      return;
    }

    const validationError =
      validateForm();

    if (
      validationError
    ) {
      toast.warning(
        "Check Recipe Details",
        validationError
      );

      return;
    }

    startSaveTransition(
      async () => {
        const loadingToast =
          isEditMode
            ? toast.updating(
                "Updating Recipe",
                form.name.trim()
              )
            : toast.saving(
                "Saving Recipe",
                form.name.trim()
              );

        const formData =
          new FormData();

        if (
          isEditMode &&
          recipe
        ) {
          formData.set(
            "recipeId",
            recipe.id
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
          "batchQty",
          form.batchQty.trim()
        );

        formData.set(
          "yieldQty",
          form.yieldQty.trim()
        );

        formData.set(
          "yieldUom",
          form.yieldUom
        );

        formData.set(
          "items",
          JSON.stringify(
            form.ingredients.map(
              (
                ingredient
              ) => ({
                productId:
                  ingredient.productId,

                qty:
                  ingredient.qty.trim(),

                uom:
                  ingredient.uom,
              })
            )
          )
        );

        const result =
          isEditMode
            ? await updateProductionRecipeAction(
                null,
                formData
              )
            : await createProductionRecipeAction(
                null,
                formData
              );

        toast.dismissToast(
          loadingToast
        );

        if (
          !result.success ||
          !result.recipe
        ) {
          toast.error(
            isEditMode
              ? "Unable to Update Recipe"
              : "Unable to Save Recipe",
            result.message
          );

          return;
        }

        toast.success(
          isEditMode
            ? "Recipe Updated"
            : "Recipe Saved",
          `${result.recipe.name} was ${
            isEditMode
              ? "updated"
              : "created"
          } successfully.`
        );

        router.push(
          "/recipes"
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
          RECIPE DETAILS
      =================================================== */}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-zinc-950 text-white">
              <FlaskConical
                size={20}
                aria-hidden="true"
              />
            </div>

            <div>
              <h2 className="text-base font-bold text-zinc-950">
                Recipe Details
              </h2>

              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Define the production batch and finished
                recipe yield.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-3">
          {/* ===============================================
              RECIPE NAME
          =============================================== */}

          <div className="lg:col-span-3">
            <label
              htmlFor="recipe-name"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              Name of Recipe
            </label>

            <input
              id="recipe-name"
              type="text"
              value={
                form.name
              }
              onChange={(
                event
              ) =>
                updateMainField(
                  "name",
                  event.target
                    .value
                )
              }
              disabled={
                isSaving
              }
              maxLength={
                200
              }
              autoComplete="off"
              placeholder="Example: Teriyaki Sauce"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
            />

            <p className="mt-2 text-xs text-zinc-400">
              Recipe names must be unique within the current
              operational location.
            </p>
          </div>

          {/* ===============================================
              BATCH QTY
          =============================================== */}

          <div>
            <label
              htmlFor="recipe-batch-qty"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              Batch QTY
            </label>

            <input
              id="recipe-batch-qty"
              type="number"
              min="0.0001"
              max="99999999999999.9999"
              step="0.0001"
              inputMode="decimal"
              value={
                form.batchQty
              }
              onChange={(
                event
              ) =>
                updateMainField(
                  "batchQty",
                  event.target
                    .value
                )
              }
              disabled={
                isSaving
              }
              placeholder="1"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
            />

            <p className="mt-2 text-xs leading-5 text-zinc-400">
              Number or size of batches represented by this
              base recipe.
            </p>
          </div>

          {/* ===============================================
              YIELD QTY
          =============================================== */}

          <div>
            <label
              htmlFor="recipe-yield-qty"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              Yield QTY
            </label>

            <input
              id="recipe-yield-qty"
              type="number"
              min="0.0001"
              max="99999999999999.9999"
              step="0.0001"
              inputMode="decimal"
              value={
                form.yieldQty
              }
              onChange={(
                event
              ) =>
                updateMainField(
                  "yieldQty",
                  event.target
                    .value
                )
              }
              disabled={
                isSaving
              }
              placeholder="0"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
            />

            <p className="mt-2 text-xs leading-5 text-zinc-400">
              Finished quantity produced by the base recipe.
            </p>
          </div>

          {/* ===============================================
              YIELD UOM
          =============================================== */}

          <div>
            <label
              htmlFor="recipe-yield-uom"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              Yield UOM
            </label>

            <div className="relative">
              <select
                id="recipe-yield-uom"
                value={
                  form.yieldUom
                }
                onChange={(
                  event
                ) =>
                  updateMainField(
                    "yieldUom",
                    event.target
                      .value as RecipeUom
                  )
                }
                disabled={
                  isSaving
                }
                className="h-11 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-4 pr-10 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
              >
                {RECIPE_UOMS.map(
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

            <p className="mt-2 text-xs leading-5 text-zinc-400">
              Allowed units: ml, pc, gram.
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================
          INGREDIENTS
      =================================================== */}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="border-b border-zinc-200 p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
                <Beaker
                  size={20}
                  aria-hidden="true"
                />
              </div>

              <div>
                <h2 className="text-base font-bold text-zinc-950">
                  Ingredients
                </h2>

                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Select products and enter the quantity used
                  by the base production recipe.
                </p>
              </div>
            </div>

            {/* =============================================
                PRODUCT SEARCH
            ============================================= */}

            <div className="w-full lg:max-w-sm">
              <label
                htmlFor="recipe-product-search"
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
                  id="recipe-product-search"
                  type="search"
                  value={
                    productSearch
                  }
                  onChange={(
                    event
                  ) =>
                    setProductSearch(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    isSaving
                  }
                  placeholder="Search name or SKU..."
                  autoComplete="off"
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
                    aria-label="Clear product search"
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
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={19}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-amber-700"
              />

              <div>
                <p className="text-sm font-bold text-amber-900">
                  Products Required
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  At least one active product must exist before
                  ingredients can be added to a production
                  recipe.
                </p>

                <Link
                  href="/products/new"
                  className="mt-3 inline-flex text-sm font-bold text-amber-900 underline underline-offset-4"
                >
                  Add Product
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {/* =================================================
            INGREDIENT ROWS
        ================================================= */}

        <div className="divide-y divide-zinc-100">
          {form.ingredients.map(
            (
              ingredient,
              index
            ) => {
              const selectedProduct =
                productMap.get(
                  ingredient.productId
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
                    ingredient.rowKey
                  }
                  className="p-5 sm:p-6"
                >
                  {/* =======================================
                      ROW HEADER
                  ======================================= */}

                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <GripVertical
                        size={16}
                        aria-hidden="true"
                        className="text-zinc-300"
                      />

                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
                        Ingredient{" "}
                        {index + 1}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeIngredient(
                          ingredient.rowKey
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
                      FIELDS
                  ======================================= */}

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(160px,0.7fr)_minmax(120px,0.5fr)]">
                    {/* =====================================
                        PRODUCT
                    ===================================== */}

                    <div>
                      <label
                        htmlFor={`ingredient-product-${ingredient.rowKey}`}
                        className="mb-2 block text-sm font-semibold text-zinc-800"
                      >
                        Product
                      </label>

                      <div className="relative">
                        <select
                          id={`ingredient-product-${ingredient.rowKey}`}
                          value={
                            ingredient.productId
                          }
                          onChange={(
                            event
                          ) =>
                            handleProductSelect(
                              ingredient.rowKey,
                              event.target
                                .value
                            )
                          }
                          disabled={
                            isSaving ||
                            !hasProducts
                          }
                          className="h-11 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-4 pr-10 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
                        >
                          <option value="">
                            Select product
                          </option>

                          {visibleProducts.map(
                            (
                              product
                            ) => {
                              const usedElsewhere =
                                selectedProductIds.has(
                                  product.id
                                ) &&
                                ingredient.productId !==
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
                                  {product.sku}
                                  {" — "}
                                  {
                                    product.name
                                  }
                                  {" ("}
                                  {
                                    product.uom
                                  }
                                  {")"}
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
                        <p className="mt-2 text-xs text-zinc-400">
                          SKU:{" "}
                          <span className="font-mono font-semibold text-zinc-600">
                            {
                              selectedProduct.sku
                            }
                          </span>
                        </p>
                      ) : null}
                    </div>

                    {/* =====================================
                        QTY
                    ===================================== */}

                    <div>
                      <label
                        htmlFor={`ingredient-qty-${ingredient.rowKey}`}
                        className="mb-2 block text-sm font-semibold text-zinc-800"
                      >
                        Qty
                      </label>

                      <input
                        id={`ingredient-qty-${ingredient.rowKey}`}
                        type="number"
                        min="0.0001"
                        max="99999999999999.9999"
                        step="0.0001"
                        inputMode="decimal"
                        value={
                          ingredient.qty
                        }
                        onChange={(
                          event
                        ) =>
                          updateIngredient(
                            ingredient.rowKey,
                            {
                              qty:
                                event
                                  .target
                                  .value,
                            }
                          )
                        }
                        disabled={
                          isSaving
                        }
                        placeholder="0"
                        className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
                      />
                    </div>

                    {/* =====================================
                        UOM
                    ===================================== */}

                    <div>
                      <label
                        htmlFor={`ingredient-uom-${ingredient.rowKey}`}
                        className="mb-2 block text-sm font-semibold text-zinc-800"
                      >
                        UOM
                      </label>

                      <input
                        id={`ingredient-uom-${ingredient.rowKey}`}
                        type="text"
                        readOnly
                        value={
                          ingredient.uom ||
                          "Auto"
                        }
                        tabIndex={-1}
                        className="h-11 w-full cursor-default rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-600 outline-none"
                      />

                      <p className="mt-2 text-xs text-zinc-400">
                        Synced automatically with Product UOM.
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>

        {/* =================================================
            ADD INGREDIENT
        ================================================= */}

        <div className="border-t border-zinc-200 bg-zinc-50/60 p-5 sm:p-6">
          <button
            type="button"
            onClick={
              addIngredient
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

            Add Ingredient
          </button>
        </div>
      </section>

      {/* ===================================================
          RECIPE SUMMARY
      =================================================== */}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
            <PackageSearch
              size={18}
              aria-hidden="true"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-zinc-950">
              Recipe Summary
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                  Batch QTY
                </p>

                <p className="mt-1 text-sm font-bold text-zinc-800">
                  {form.batchQty ||
                    "—"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                  Base Yield
                </p>

                <p className="mt-1 text-sm font-bold text-zinc-800">
                  {form.yieldQty ||
                    "—"}{" "}
                  {
                    form.yieldUom
                  }
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                  Ingredients
                </p>

                <p className="mt-1 text-sm font-bold text-zinc-800">
                  {
                    form.ingredients.filter(
                      (
                        ingredient
                      ) =>
                        ingredient.productId
                    ).length
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          ACTIONS
      =================================================== */}

      <section className="flex flex-col-reverse gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-end sm:p-6">
        <Link
          href="/recipes"
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
                ? "Update Recipe"
                : "Save Recipe"}
            </>
          )}
        </button>
      </section>
    </form>
  );
}