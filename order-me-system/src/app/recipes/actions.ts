"use server";

import { revalidatePath } from "next/cache";

import {
  requireDatabaseLocation,
} from "@/lib/location/database-location";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

// =========================================================
// TYPES
// =========================================================

export type RecipeUom =
  | "ml"
  | "pc"
  | "gram";

export type RecipeIngredientInput = {
  productId: string;
  qty: string;
  uom: RecipeUom;
};

export type RecipeIngredientRecord = {
  id: string;
  location_id: string;
  recipe_id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  product_uom: RecipeUom;
  qty: number;
  uom: RecipeUom;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ProductionRecipeRecord = {
  id: string;
  location_id: string;
  name: string;
  batch_qty: number;
  yield_qty: number;
  yield_uom: RecipeUom;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  ingredients: RecipeIngredientRecord[];
};

export type ProductionRecipeListRecord = {
  id: string;
  location_id: string;
  name: string;
  batch_qty: number;
  yield_qty: number;
  yield_uom: RecipeUom;
  is_active: boolean;
  ingredient_count: number;
  created_at: string;
  updated_at: string;
};

export type RecipeProductOption = {
  id: string;
  sku: string;
  name: string;
  uom: RecipeUom;
  is_active: boolean;
};

export type ProductionRecipeActionResult = {
  success: boolean;
  message: string;
  recipe?: ProductionRecipeRecord;
};

export type ProductionRecipeListOptions = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?:
    | "name"
    | "batch_qty"
    | "yield_qty"
    | "created_at"
    | "updated_at";
  sortDirection?:
    | "asc"
    | "desc";
};

export type ProductionRecipeListResult = {
  recipes: ProductionRecipeListRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// =========================================================
// DATABASE ROW TYPES
// =========================================================

type RecipeDatabaseRow = {
  id: string;
  location_id: string;
  name: string;
  batch_qty: number;
  yield_qty: number;
  yield_uom: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type RecipeItemDatabaseRow = {
  id: string;
  location_id: string;
  recipe_id: string;
  product_id: string;
  qty: number;
  uom: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type ProductDatabaseRow = {
  id: string;
  sku: string;
  name: string;
  uom: string;
  is_active: boolean;
};

// =========================================================
// CONSTANTS
// =========================================================

const MAX_RECIPE_NAME_LENGTH =
  200;

const MAX_SEARCH_LENGTH =
  100;

const DEFAULT_PAGE_SIZE =
  20;

const MAX_PAGE_SIZE =
  100;

const MAX_NUMERIC_SCALED =
  BigInt(
    "999999999999999999"
  );

const RECIPE_UOMS =
  new Set<RecipeUom>([
    "ml",
    "pc",
    "gram",
  ]);

// =========================================================
// UUID
// =========================================================

function normalizeUuid(
  value:
    | FormDataEntryValue
    | string
    | null
    | undefined
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      normalized
    )
  ) {
    return null;
  }

  return normalized;
}

// =========================================================
// TEXT
// =========================================================

function normalizeRecipeName(
  value:
    | FormDataEntryValue
    | null
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .replace(
        /\s+/g,
        " "
      );

  if (
    normalized.length ===
      0 ||
    normalized.length >
      MAX_RECIPE_NAME_LENGTH
  ) {
    return null;
  }

  return normalized;
}

// =========================================================
// EXACT DECIMAL VALIDATION
// =========================================================

function normalizePositiveDecimal(
  value: unknown
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  let normalized =
    value.trim();

  if (!normalized) {
    return null;
  }

  if (
    normalized.startsWith(
      "."
    )
  ) {
    normalized =
      `0${normalized}`;
  }

  const match =
    normalized.match(
      /^(\d{1,14})(?:\.(\d{1,4}))?$/
    );

  if (!match) {
    return null;
  }

  const integerPart =
    match[1];

  const fractionPart =
    match[2] ?? "";

  const normalizedInteger =
    BigInt(
      integerPart
    ).toString();

  const paddedFraction =
    fractionPart.padEnd(
      4,
      "0"
    );

  const scaledValue =
    BigInt(
      normalizedInteger
    ) *
      BigInt(10000) +
    BigInt(
      paddedFraction ||
        "0"
    );

  if (
    scaledValue <=
      BigInt(0) ||
    scaledValue >
      MAX_NUMERIC_SCALED
  ) {
    return null;
  }

  const trimmedFraction =
    fractionPart.replace(
      /0+$/,
      ""
    );

  if (
    trimmedFraction.length ===
    0
  ) {
    return normalizedInteger;
  }

  return `${normalizedInteger}.${trimmedFraction}`;
}

// =========================================================
// UOM
// =========================================================

function normalizeRecipeUom(
  value: unknown
): RecipeUom | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase() as RecipeUom;

  if (
    !RECIPE_UOMS.has(
      normalized
    )
  ) {
    return null;
  }

  return normalized;
}

// =========================================================
// SEARCH
// =========================================================

function normalizeSearch(
  value:
    | string
    | undefined
): string {
  if (!value) {
    return "";
  }

  return value
    .trim()
    .replace(
      /\s+/g,
      " "
    )
    .slice(
      0,
      MAX_SEARCH_LENGTH
    );
}

// =========================================================
// PAGINATION
// =========================================================

function normalizePage(
  value:
    | number
    | undefined
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isInteger(
      value
    ) ||
    value < 1
  ) {
    return 1;
  }

  return value;
}

function normalizePageSize(
  value:
    | number
    | undefined
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isInteger(
      value
    ) ||
    value < 1
  ) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(
    value,
    MAX_PAGE_SIZE
  );
}

// =========================================================
// INGREDIENT JSON
// =========================================================

function parseRecipeItems(
  value:
    | FormDataEntryValue
    | null
): RecipeIngredientInput[] | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(value);
  } catch {
    return null;
  }

  if (
    !Array.isArray(
      parsed
    ) ||
    parsed.length === 0
  ) {
    return null;
  }

  const result:
    RecipeIngredientInput[] =
    [];

  const productIds =
    new Set<string>();

  for (
    const rawItem of
    parsed
  ) {
    if (
      typeof rawItem !==
        "object" ||
      rawItem === null
    ) {
      return null;
    }

    const candidate =
      rawItem as {
        productId?: unknown;
        qty?: unknown;
        uom?: unknown;
      };

    const productId =
      normalizeUuid(
        typeof candidate.productId ===
          "string"
          ? candidate.productId
          : null
      );

    const qty =
      normalizePositiveDecimal(
        candidate.qty
      );

    const uom =
      normalizeRecipeUom(
        candidate.uom
      );

    if (
      !productId ||
      !qty ||
      !uom
    ) {
      return null;
    }

    if (
      productIds.has(
        productId
      )
    ) {
      return null;
    }

    productIds.add(
      productId
    );

    result.push({
      productId,
      qty,
      uom,
    });
  }

  return result;
}

// =========================================================
// ERROR HELPERS
// =========================================================

function isUniqueViolation(
  code:
    | string
    | undefined
): boolean {
  return (
    code === "23505"
  );
}

function isForeignKeyViolation(
  code:
    | string
    | undefined
): boolean {
  return (
    code === "23503"
  );
}

function mapRecipeDatabaseError(
  code:
    | string
    | undefined,
  message:
    | string
    | undefined
): string {
  const normalizedMessage =
    (
      message ?? ""
    ).toLowerCase();

  if (
    isUniqueViolation(
      code
    )
  ) {
    return "A production recipe with this name already exists for the current location.";
  }

  if (
    normalizedMessage.includes(
      "same product"
    ) ||
    normalizedMessage.includes(
      "more than once"
    )
  ) {
    return "The same product cannot appear more than once in a production recipe.";
  }

  if (
    normalizedMessage.includes(
      "ingredient uom"
    ) ||
    normalizedMessage.includes(
      "product uom"
    )
  ) {
    return "Ingredient UOM must match the selected product UOM.";
  }

  if (
    normalizedMessage.includes(
      "inactive products"
    )
  ) {
    return "Inactive products cannot be used as recipe ingredients.";
  }

  if (
    normalizedMessage.includes(
      "current location"
    ) ||
    normalizedMessage.includes(
      "does not belong"
    )
  ) {
    return "One or more selected ingredients are not available for the current location.";
  }

  if (
    normalizedMessage.includes(
      "recipe name"
    )
  ) {
    return "Enter a valid production recipe name.";
  }

  if (
    normalizedMessage.includes(
      "batch qty"
    )
  ) {
    return "Enter a valid Batch QTY greater than zero.";
  }

  if (
    normalizedMessage.includes(
      "yield qty"
    )
  ) {
    return "Enter a valid Yield QTY greater than zero.";
  }

  if (
    normalizedMessage.includes(
      "yield uom"
    )
  ) {
    return "Select a valid Yield UOM: ml, pc, or gram.";
  }

  if (
    normalizedMessage.includes(
      "at least one ingredient"
    )
  ) {
    return "Add at least one ingredient to the production recipe.";
  }

  return "Unable to save production recipe. Please try again.";
}

// =========================================================
// REVALIDATION
// =========================================================

function revalidateRecipePages() {
  revalidatePath(
    "/dashboard"
  );

  revalidatePath(
    "/recipes"
  );

  revalidatePath(
    "/orders/production"
  );
}

// =========================================================
// ACTIVE PRODUCT OPTIONS
// =========================================================

export async function getRecipeProductOptions(
  search = ""
): Promise<
  RecipeProductOption[]
> {
  const location =
    await requireDatabaseLocation();

  const supabase =
    createAdminClient();

  const normalizedSearch =
    normalizeSearch(
      search
    );

  let query =
    supabase
      .from("products")
      .select(
        `
          id,
          sku,
          name,
          uom,
          is_active
        `
      )
      .eq(
        "location_id",
        location.id
      )
      .eq(
        "is_active",
        true
      );

  if (
    normalizedSearch
  ) {
    query =
      query.or(
        `name.ilike.%${normalizedSearch}%,sku.ilike.%${normalizedSearch}%`
      );
  }

  const {
    data,
    error,
  } = await query
    .order(
      "name",
      {
        ascending: true,
      }
    )
    .limit(100);

  if (error) {
    console.error(
      "Order Me recipe product options failed:",
      error.message
    );

    throw new Error(
      "Unable to load recipe products."
    );
  }

  return (
    data ??
    []
  ).map(
    (row) => ({
      id:
        String(
          row.id
        ),

      sku:
        String(
          row.sku
        ),

      name:
        String(
          row.name
        ),

      uom:
        row.uom as RecipeUom,

      is_active:
        Boolean(
          row.is_active
        ),
    })
  );
}

// =========================================================
// LIST PRODUCTION RECIPES
// =========================================================

export async function getProductionRecipes(
  options: ProductionRecipeListOptions = {}
): Promise<ProductionRecipeListResult> {
  const location =
    await requireDatabaseLocation();

  const supabase =
    createAdminClient();

  const page =
    normalizePage(
      options.page
    );

  const pageSize =
    normalizePageSize(
      options.pageSize
    );

  const search =
    normalizeSearch(
      options.search
    );

  const allowedSortFields =
    new Set([
      "name",
      "batch_qty",
      "yield_qty",
      "created_at",
      "updated_at",
    ]);

  const sortBy =
    options.sortBy &&
    allowedSortFields.has(
      options.sortBy
    )
      ? options.sortBy
      : "name";

  const sortDirection =
    options.sortDirection ===
    "desc"
      ? "desc"
      : "asc";

  const from =
    (
      page - 1
    ) *
    pageSize;

  const to =
    from +
    pageSize -
    1;

  let query =
    supabase
      .from(
        "production_recipes"
      )
      .select(
        `
          id,
          location_id,
          name,
          batch_qty,
          yield_qty,
          yield_uom,
          is_active,
          created_at,
          updated_at
        `,
        {
          count: "exact",
        }
      )
      .eq(
        "location_id",
        location.id
      );

  if (search) {
    query =
      query.ilike(
        "name",
        `%${search}%`
      );
  }

  const {
    data,
    error,
    count,
  } = await query
    .order(
      sortBy,
      {
        ascending:
          sortDirection ===
          "asc",
      }
    )
    .range(
      from,
      to
    );

  if (error) {
    console.error(
      "Order Me production recipe list failed:",
      error.message
    );

    throw new Error(
      "Unable to load production recipes."
    );
  }

  const recipeRows =
    (
      data ??
      []
    ) as RecipeDatabaseRow[];

  const recipeIds =
    recipeRows.map(
      (recipe) =>
        recipe.id
    );

  const ingredientCountMap =
    new Map<
      string,
      number
    >();

  if (
    recipeIds.length >
    0
  ) {
    const {
      data:
        itemData,
      error:
        itemError,
    } = await supabase
      .from(
        "production_recipe_items"
      )
      .select(
        "recipe_id"
      )
      .eq(
        "location_id",
        location.id
      )
      .in(
        "recipe_id",
        recipeIds
      );

    if (itemError) {
      console.error(
        "Order Me production recipe ingredient counts failed:",
        itemError.message
      );

      throw new Error(
        "Unable to load production recipe ingredient counts."
      );
    }

    for (
      const item of
      itemData ?? []
    ) {
      const recipeId =
        String(
          item.recipe_id
        );

      ingredientCountMap.set(
        recipeId,
        (
          ingredientCountMap.get(
            recipeId
          ) ??
          0
        ) +
          1
      );
    }
  }

  const recipes:
    ProductionRecipeListRecord[] =
    recipeRows.map(
      (recipe) => ({
        id:
          recipe.id,

        location_id:
          recipe.location_id,

        name:
          recipe.name,

        batch_qty:
          recipe.batch_qty,

        yield_qty:
          recipe.yield_qty,

        yield_uom:
          recipe.yield_uom as RecipeUom,

        is_active:
          recipe.is_active,

        ingredient_count:
          ingredientCountMap.get(
            recipe.id
          ) ??
          0,

        created_at:
          recipe.created_at,

        updated_at:
          recipe.updated_at,
      })
    );

  const total =
    count ?? 0;

  const totalPages =
    total === 0
      ? 0
      : Math.ceil(
          total /
            pageSize
        );

  return {
    recipes,
    total,
    page,
    pageSize,
    totalPages,
  };
}

// =========================================================
// GET SINGLE PRODUCTION RECIPE
// =========================================================

export async function getProductionRecipeById(
  recipeId: string
): Promise<ProductionRecipeRecord | null> {
  const location =
    await requireDatabaseLocation();

  const normalizedId =
    normalizeUuid(
      recipeId
    );

  if (!normalizedId) {
    return null;
  }

  const supabase =
    createAdminClient();

  const {
    data:
      recipeData,
    error:
      recipeError,
  } = await supabase
    .from(
      "production_recipes"
    )
    .select(
      `
        id,
        location_id,
        name,
        batch_qty,
        yield_qty,
        yield_uom,
        is_active,
        created_at,
        updated_at
      `
    )
    .eq(
      "id",
      normalizedId
    )
    .eq(
      "location_id",
      location.id
    )
    .maybeSingle();

  if (recipeError) {
    console.error(
      "Order Me production recipe lookup failed:",
      recipeError.message
    );

    throw new Error(
      "Unable to load production recipe."
    );
  }

  if (!recipeData) {
    return null;
  }

  const recipe =
    recipeData as RecipeDatabaseRow;

  const {
    data:
      itemData,
    error:
      itemError,
  } = await supabase
    .from(
      "production_recipe_items"
    )
    .select(
      `
        id,
        location_id,
        recipe_id,
        product_id,
        qty,
        uom,
        sort_order,
        created_at,
        updated_at
      `
    )
    .eq(
      "recipe_id",
      recipe.id
    )
    .eq(
      "location_id",
      location.id
    )
    .order(
      "sort_order",
      {
        ascending: true,
      }
    );

  if (itemError) {
    console.error(
      "Order Me production recipe ingredient lookup failed:",
      itemError.message
    );

    throw new Error(
      "Unable to load production recipe ingredients."
    );
  }

  const itemRows =
    (
      itemData ??
      []
    ) as RecipeItemDatabaseRow[];

  const productIds =
    Array.from(
      new Set(
        itemRows.map(
          (item) =>
            item.product_id
        )
      )
    );

  const productMap =
    new Map<
      string,
      ProductDatabaseRow
    >();

  if (
    productIds.length >
    0
  ) {
    const {
      data:
        productData,
      error:
        productError,
    } = await supabase
      .from("products")
      .select(
        `
          id,
          sku,
          name,
          uom,
          is_active
        `
      )
      .eq(
        "location_id",
        location.id
      )
      .in(
        "id",
        productIds
      );

    if (productError) {
      console.error(
        "Order Me production recipe products lookup failed:",
        productError.message
      );

      throw new Error(
        "Unable to load production recipe products."
      );
    }

    for (
      const product of
      (
        productData ??
        []
      ) as ProductDatabaseRow[]
    ) {
      productMap.set(
        product.id,
        product
      );
    }
  }

  const ingredients:
    RecipeIngredientRecord[] =
    itemRows.map(
      (item) => {
        const product =
          productMap.get(
            item.product_id
          );

        return {
          id:
            item.id,

          location_id:
            item.location_id,

          recipe_id:
            item.recipe_id,

          product_id:
            item.product_id,

          product_sku:
            product?.sku ??
            "—",

          product_name:
            product?.name ??
            "Unavailable Product",

          product_uom:
            (
              product?.uom ??
              item.uom
            ) as RecipeUom,

          qty:
            item.qty,

          uom:
            item.uom as RecipeUom,

          sort_order:
            item.sort_order,

          created_at:
            item.created_at,

          updated_at:
            item.updated_at,
        };
      }
    );

  return {
    id:
      recipe.id,

    location_id:
      recipe.location_id,

    name:
      recipe.name,

    batch_qty:
      recipe.batch_qty,

    yield_qty:
      recipe.yield_qty,

    yield_uom:
      recipe.yield_uom as RecipeUom,

    is_active:
      recipe.is_active,

    created_at:
      recipe.created_at,

    updated_at:
      recipe.updated_at,

    ingredients,
  };
}

// =========================================================
// VALIDATE PRODUCTS FOR RECIPE SAVE
// =========================================================

async function validateRecipeProducts(
  locationId: string,
  items: RecipeIngredientInput[]
): Promise<
  | {
      success: true;
    }
  | {
      success: false;
      message: string;
    }
> {
  const supabase =
    createAdminClient();

  const productIds =
    items.map(
      (item) =>
        item.productId
    );

  const {
    data,
    error,
  } = await supabase
    .from("products")
    .select(
      `
        id,
        sku,
        name,
        uom,
        is_active
      `
    )
    .eq(
      "location_id",
      locationId
    )
    .in(
      "id",
      productIds
    );

  if (error) {
    console.error(
      "Order Me recipe ingredient validation failed:",
      error.message
    );

    return {
      success: false,
      message:
        "Unable to validate recipe ingredients.",
    };
  }

  const productRows =
    (
      data ??
      []
    ) as ProductDatabaseRow[];

  if (
    productRows.length !==
    productIds.length
  ) {
    return {
      success: false,
      message:
        "One or more selected products are not available for the current location.",
    };
  }

  const productMap =
    new Map<
      string,
      ProductDatabaseRow
    >();

  for (
    const product of
    productRows
  ) {
    productMap.set(
      product.id,
      product
    );
  }

  for (
    const item of
    items
  ) {
    const product =
      productMap.get(
        item.productId
      );

    if (!product) {
      return {
        success: false,
        message:
          "One or more selected products are not available for the current location.",
      };
    }

    if (
      !product.is_active
    ) {
      return {
        success: false,
        message:
          `"${product.name}" is inactive and cannot be used as a recipe ingredient.`,
      };
    }

    if (
      product.uom !==
      item.uom
    ) {
      return {
        success: false,
        message:
          `${product.name} must use ${product.uom} as its ingredient UOM.`,
      };
    }
  }

  return {
    success: true,
  };
}

// =========================================================
// CREATE PRODUCTION RECIPE
// =========================================================

export async function createProductionRecipeAction(
  _previousState: ProductionRecipeActionResult | null,
  formData: FormData
): Promise<ProductionRecipeActionResult> {
  try {
    const location =
      await requireDatabaseLocation();

    const name =
      normalizeRecipeName(
        formData.get(
          "name"
        )
      );

    if (!name) {
      return {
        success: false,
        message:
          "Enter a valid production recipe name.",
      };
    }

    const batchQty =
      normalizePositiveDecimal(
        formData.get(
          "batchQty"
        )
      );

    if (!batchQty) {
      return {
        success: false,
        message:
          "Enter a valid Batch QTY greater than zero with up to 4 decimal places.",
      };
    }

    const yieldQty =
      normalizePositiveDecimal(
        formData.get(
          "yieldQty"
        )
      );

    if (!yieldQty) {
      return {
        success: false,
        message:
          "Enter a valid Yield QTY greater than zero with up to 4 decimal places.",
      };
    }

    const yieldUom =
      normalizeRecipeUom(
        formData.get(
          "yieldUom"
        )
      );

    if (!yieldUom) {
      return {
        success: false,
        message:
          "Select a valid Yield UOM: ml, pc, or gram.",
      };
    }

    const items =
      parseRecipeItems(
        formData.get(
          "items"
        )
      );

    if (!items) {
      return {
        success: false,
        message:
          "Add at least one valid ingredient. Each ingredient requires Product, Qty, and UOM.",
      };
    }

    const validation =
      await validateRecipeProducts(
        location.id,
        items
      );

    if (
      !validation.success
    ) {
      return validation;
    }

    const supabase =
      createAdminClient();

    const rpcItems =
      items.map(
        (item) => ({
          product_id:
            item.productId,

          qty:
            item.qty,

          uom:
            item.uom,
        })
      );

    const {
      data:
        savedRecipeId,
      error,
    } = await supabase.rpc(
      "save_production_recipe",
      {
        p_location_id:
          location.id,

        p_recipe_id:
          null,

        p_name:
          name,

        p_batch_qty:
          batchQty,

        p_yield_qty:
          yieldQty,

        p_yield_uom:
          yieldUom,

        p_items:
          rpcItems,
      }
    );

    if (error) {
      console.error(
        "Order Me production recipe creation failed:",
        error.message
      );

      return {
        success: false,
        message:
          mapRecipeDatabaseError(
            error.code,
            error.message
          ),
      };
    }

    if (
      typeof savedRecipeId !==
        "string" ||
      !normalizeUuid(
        savedRecipeId
      )
    ) {
      return {
        success: false,
        message:
          "Recipe was saved but the saved record could not be identified.",
      };
    }

    revalidateRecipePages();

    const recipe =
      await getProductionRecipeById(
        savedRecipeId
      );

    if (!recipe) {
      return {
        success: false,
        message:
          "Recipe was saved but could not be reloaded.",
      };
    }

    return {
      success: true,
      message:
        "Production recipe saved successfully.",
      recipe,
    };
  } catch (error) {
    console.error(
      "Order Me production recipe creation failed:",
      error instanceof Error
        ? error.message
        : "Unknown production recipe creation error"
    );

    return {
      success: false,
      message:
        "Unable to save production recipe. Please try again.",
    };
  }
}

// =========================================================
// UPDATE PRODUCTION RECIPE
// =========================================================

export async function updateProductionRecipeAction(
  _previousState: ProductionRecipeActionResult | null,
  formData: FormData
): Promise<ProductionRecipeActionResult> {
  try {
    const location =
      await requireDatabaseLocation();

    const recipeId =
      normalizeUuid(
        formData.get(
          "recipeId"
        )
      );

    if (!recipeId) {
      return {
        success: false,
        message:
          "Invalid production recipe.",
      };
    }

    const name =
      normalizeRecipeName(
        formData.get(
          "name"
        )
      );

    if (!name) {
      return {
        success: false,
        message:
          "Enter a valid production recipe name.",
      };
    }

    const batchQty =
      normalizePositiveDecimal(
        formData.get(
          "batchQty"
        )
      );

    if (!batchQty) {
      return {
        success: false,
        message:
          "Enter a valid Batch QTY greater than zero with up to 4 decimal places.",
      };
    }

    const yieldQty =
      normalizePositiveDecimal(
        formData.get(
          "yieldQty"
        )
      );

    if (!yieldQty) {
      return {
        success: false,
        message:
          "Enter a valid Yield QTY greater than zero with up to 4 decimal places.",
      };
    }

    const yieldUom =
      normalizeRecipeUom(
        formData.get(
          "yieldUom"
        )
      );

    if (!yieldUom) {
      return {
        success: false,
        message:
          "Select a valid Yield UOM: ml, pc, or gram.",
      };
    }

    const items =
      parseRecipeItems(
        formData.get(
          "items"
        )
      );

    if (!items) {
      return {
        success: false,
        message:
          "Add at least one valid ingredient. Each ingredient requires Product, Qty, and UOM.",
      };
    }

    const supabase =
      createAdminClient();

    const {
      data:
        existingRecipe,
      error:
        lookupError,
    } = await supabase
      .from(
        "production_recipes"
      )
      .select(
        "id, location_id"
      )
      .eq(
        "id",
        recipeId
      )
      .eq(
        "location_id",
        location.id
      )
      .maybeSingle();

    if (lookupError) {
      console.error(
        "Order Me production recipe update lookup failed:",
        lookupError.message
      );

      return {
        success: false,
        message:
          "Unable to update production recipe. Please try again.",
      };
    }

    if (!existingRecipe) {
      return {
        success: false,
        message:
          "Production recipe was not found for the current location.",
      };
    }

    const validation =
      await validateRecipeProducts(
        location.id,
        items
      );

    if (
      !validation.success
    ) {
      return validation;
    }

    const rpcItems =
      items.map(
        (item) => ({
          product_id:
            item.productId,

          qty:
            item.qty,

          uom:
            item.uom,
        })
      );

    const {
      data:
        savedRecipeId,
      error,
    } = await supabase.rpc(
      "save_production_recipe",
      {
        p_location_id:
          location.id,

        p_recipe_id:
          recipeId,

        p_name:
          name,

        p_batch_qty:
          batchQty,

        p_yield_qty:
          yieldQty,

        p_yield_uom:
          yieldUom,

        p_items:
          rpcItems,
      }
    );

    if (error) {
      console.error(
        "Order Me production recipe update failed:",
        error.message
      );

      return {
        success: false,
        message:
          mapRecipeDatabaseError(
            error.code,
            error.message
          ),
      };
    }

    const resolvedRecipeId =
      typeof savedRecipeId ===
        "string" &&
      normalizeUuid(
        savedRecipeId
      )
        ? savedRecipeId
        : recipeId;

    revalidateRecipePages();

    const recipe =
      await getProductionRecipeById(
        resolvedRecipeId
      );

    if (!recipe) {
      return {
        success: false,
        message:
          "Recipe was updated but could not be reloaded.",
      };
    }

    return {
      success: true,
      message:
        "Production recipe updated successfully.",
      recipe,
    };
  } catch (error) {
    console.error(
      "Order Me production recipe update failed:",
      error instanceof Error
        ? error.message
        : "Unknown production recipe update error"
    );

    return {
      success: false,
      message:
        "Unable to update production recipe. Please try again.",
    };
  }
}

// =========================================================
// DELETE PRODUCTION RECIPE
// =========================================================

export async function deleteProductionRecipeAction(
  recipeId: string
): Promise<ProductionRecipeActionResult> {
  try {
    const location =
      await requireDatabaseLocation();

    const normalizedId =
      normalizeUuid(
        recipeId
      );

    if (!normalizedId) {
      return {
        success: false,
        message:
          "Invalid production recipe.",
      };
    }

    const supabase =
      createAdminClient();

    const {
      data:
        existingRecipe,
      error:
        lookupError,
    } = await supabase
      .from(
        "production_recipes"
      )
      .select(
        `
          id,
          name,
          location_id
        `
      )
      .eq(
        "id",
        normalizedId
      )
      .eq(
        "location_id",
        location.id
      )
      .maybeSingle();

    if (lookupError) {
      console.error(
        "Order Me production recipe delete lookup failed:",
        lookupError.message
      );

      return {
        success: false,
        message:
          "Unable to delete production recipe. Please try again.",
      };
    }

    if (!existingRecipe) {
      return {
        success: false,
        message:
          "Production recipe was not found for the current location.",
      };
    }

    const {
      error,
    } = await supabase
      .from(
        "production_recipes"
      )
      .delete()
      .eq(
        "id",
        normalizedId
      )
      .eq(
        "location_id",
        location.id
      );

    if (error) {
      if (
        isForeignKeyViolation(
          error.code
        )
      ) {
        return {
          success: false,
          message:
            "This production recipe cannot be deleted because it is already used by a production order or another operational record.",
        };
      }

      console.error(
        "Order Me production recipe deletion failed:",
        error.message
      );

      return {
        success: false,
        message:
          "Unable to delete production recipe. Please try again.",
      };
    }

    revalidateRecipePages();

    return {
      success: true,
      message:
        `"${existingRecipe.name}" deleted successfully.`,
    };
  } catch (error) {
    console.error(
      "Order Me production recipe deletion failed:",
      error instanceof Error
        ? error.message
        : "Unknown production recipe deletion error"
    );

    return {
      success: false,
      message:
        "Unable to delete production recipe. Please try again.",
    };
  }
}