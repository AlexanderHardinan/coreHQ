"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireDatabaseLocation,
} from "@/lib/location/database-location";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

// =========================================================
// TYPES
// =========================================================

export type ProductionOrderStatus =
  | "draft"
  | "submitted"
  | "completed"
  | "cancelled";

export type ProductionOrderUom =
  | "ml"
  | "pc"
  | "gram";

export type ProductionOrderActionResult = {
  success: boolean;
  message: string;
  orderId?: string;
};

export type ProductionOrderRecipeOptionIngredient = {
  id: string;
  product_id: string;

  sku: string;
  product_name: string;
  category_name: string;

  qty: string;
  uom: ProductionOrderUom;

  sort_order: number;
};

export type ProductionOrderRecipeOption = {
  id: string;
  location_id: string;

  name: string;

  batch_qty: string;
  yield_qty: string;
  yield_uom: ProductionOrderUom;

  is_active: boolean;

  ingredients:
    ProductionOrderRecipeOptionIngredient[];
};

// =========================================================
// HISTORICAL PRODUCTION RECIPE INGREDIENT
// =========================================================
//
// Used when editing an existing Production Order.
//
// These values come from:
//
// production_order_recipe_items
//
// rather than the current master production_recipe_items.
//
// This preserves the historical composition that was active
// when the Production Order was originally created.
// =========================================================

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

export type ProductionOrderRecipeRecord = {
  id: string;
  location_id: string;
  order_id: string;
  recipe_id: string;

  recipe_name_snapshot: string;

  batch_qty_snapshot: string;
  base_yield_qty_snapshot: string;
  yield_uom_snapshot:
    ProductionOrderUom;

  required_yield_qty: string;
  yield_multiplier: string;

  sort_order: number;

  created_at: string;
  updated_at: string;
};

export type ProductionOrderItemRecord = {
  id: string;
  location_id: string;
  order_id: string;
  product_id: string;

  sku_snapshot: string;
  product_name_snapshot: string;
  category_name_snapshot: string;

  uom: ProductionOrderUom;

  required_qty: string;
  on_hand_qty: string;
  requested_qty: string;

  created_at: string;
  updated_at: string;
};

export type ProductionOrderRecord = {
  id: string;
  location_id: string;

  order_number: string;
  order_date: string;
  ordered_by: string;

  status:
    ProductionOrderStatus;

  created_at: string;
  updated_at: string;

  recipes:
    ProductionOrderRecipeRecord[];

  items:
    ProductionOrderItemRecord[];
};

export type ProductionOrderListItem = {
  id: string;
  location_id: string;

  order_number: string;
  order_date: string;
  ordered_by: string;

  status:
    ProductionOrderStatus;

  recipe_count: number;
  item_count: number;

  created_at: string;
  updated_at: string;
};

export type ProductionOrderListOptions = {
  page?: number;
  pageSize?: number;

  search?: string;

  status?:
    | ProductionOrderStatus
    | "";

  dateFrom?: string;
  dateTo?: string;
};

export type ProductionOrderListResult = {
  orders:
    ProductionOrderListItem[];

  total: number;

  page: number;
  pageSize: number;
  totalPages: number;
};

// =========================================================
// DATABASE ROW TYPES
// =========================================================

type ProductionRecipeDatabaseRow = {
  id: string;
  location_id: string;

  name: string;

  batch_qty: string;
  yield_qty: string;
  yield_uom: string;

  is_active: boolean;
};

type ProductionRecipeItemDatabaseRow = {
  id: string;
  location_id: string;
  recipe_id: string;
  product_id: string;

  qty: string;
  uom: string;

  sort_order: number;
};

type ProductDatabaseRow = {
  id: string;
  location_id: string;
  category_id: string;

  sku: string;
  name: string;
  uom: string;
};

type CategoryDatabaseRow = {
  id: string;
  location_id: string;
  name: string;
};

type ProductionOrderDatabaseRow = {
  id: string;
  location_id: string;

  order_number: string;
  order_date: string;
  ordered_by: string;

  status: string;

  created_at: string;
  updated_at: string;
};

type ProductionOrderRecipeDatabaseRow = {
  id: string;
  location_id: string;
  order_id: string;
  recipe_id: string;

  recipe_name_snapshot:
    string;

  batch_qty_snapshot:
    string;

  base_yield_qty_snapshot:
    string;

  yield_uom_snapshot:
    string;

  required_yield_qty:
    string;

  yield_multiplier:
    string;

  sort_order: number;

  created_at: string;
  updated_at: string;
};

type ProductionOrderRecipeItemSnapshotDatabaseRow = {
  id: string;
  location_id: string;
  order_id: string;

  production_order_recipe_id:
    string;

  product_id: string;

  sku_snapshot: string;
  product_name_snapshot: string;
  category_name_snapshot: string;

  uom: string;

  base_qty_snapshot: string;
  required_qty: string;

  created_at: string;
  updated_at: string;
};

type ProductionOrderItemDatabaseRow = {
  id: string;
  location_id: string;
  order_id: string;
  product_id: string;

  sku_snapshot: string;
  product_name_snapshot:
    string;

  category_name_snapshot:
    string;

  uom: string;

  required_qty: string;
  on_hand_qty: string;
  requested_qty: string;

  created_at: string;
  updated_at: string;
};

// =========================================================
// SAVE PAYLOAD TYPES
// =========================================================

type ProductionOrderRecipePayload = {
  recipe_id: string;
  required_yield_qty: string;
};

type ProductionOrderOnHandPayload = {
  product_id: string;
  on_hand_qty: string;
};

// =========================================================
// CONSTANTS
// =========================================================

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/;

const DECIMAL_PATTERN =
  /^[0-9]{1,14}(\.[0-9]{1,4})?$/;

const MAX_PAGE_SIZE =
  100;

const DEFAULT_PAGE_SIZE =
  10;

const MAX_SEARCH_LENGTH =
  200;

// =========================================================
// NORMALIZATION
// =========================================================

function normalizeUuid(
  value: unknown
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  if (
    !UUID_PATTERN.test(
      normalized
    )
  ) {
    return null;
  }

  return normalized;
}

function normalizePage(
  value: unknown
): number {
  const parsed =
    Number(value);

  if (
    !Number.isInteger(
      parsed
    ) ||
    parsed < 1
  ) {
    return 1;
  }

  return parsed;
}

function normalizePageSize(
  value: unknown
): number {
  const parsed =
    Number(value);

  if (
    !Number.isInteger(
      parsed
    ) ||
    parsed < 1
  ) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(
    parsed,
    MAX_PAGE_SIZE
  );
}

function normalizeSearch(
  value: unknown
): string {
  if (
    typeof value !==
    "string"
  ) {
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

function normalizeOrderedBy(
  value: unknown
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
    !normalized ||
    normalized.length >
      200
  ) {
    return null;
  }

  return normalized;
}

function normalizeStatus(
  value: unknown
):
  | ProductionOrderStatus
  | null {
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
    normalized ===
      "draft" ||
    normalized ===
      "submitted" ||
    normalized ===
      "completed" ||
    normalized ===
      "cancelled"
  ) {
    return normalized;
  }

  return null;
}

function normalizeDate(
  value: unknown
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  if (
    !DATE_PATTERN.test(
      normalized
    )
  ) {
    return null;
  }

  const [
    yearText,
    monthText,
    dayText,
  ] =
    normalized.split("-");

  const year =
    Number(yearText);

  const month =
    Number(monthText);

  const day =
    Number(dayText);

  if (
    year < 2000 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  if (
    date.getUTCFullYear() !==
      year ||
    date.getUTCMonth() !==
      month - 1 ||
    date.getUTCDate() !==
      day
  ) {
    return null;
  }

  return normalized;
}

function normalizeDecimal(
  value: unknown,
  allowZero: boolean
): string | null {
  if (
    typeof value !==
      "string" &&
    typeof value !==
      "number"
  ) {
    return null;
  }

  const normalized =
    String(value).trim();

  if (
    !DECIMAL_PATTERN.test(
      normalized
    )
  ) {
    return null;
  }

  const numericValue =
    Number(normalized);

  if (
    !Number.isFinite(
      numericValue
    )
  ) {
    return null;
  }

  if (
    allowZero
      ? numericValue < 0
      : numericValue <= 0
  ) {
    return null;
  }

  if (
    numericValue >
    99999999999999.9999
  ) {
    return null;
  }

  return normalized;
}

function normalizeUom(
  value: unknown
):
  | ProductionOrderUom
  | null {
  if (
    value === "ml" ||
    value === "pc" ||
    value === "gram"
  ) {
    return value;
  }

  return null;
}

function escapePostgrestQuotedValue(
  value: string
): string {
  return value
    .replace(
      /\\/g,
      "\\\\"
    )
    .replace(
      /"/g,
      '\\"'
    );
}

// =========================================================
// JSON
// =========================================================

function parseJsonArray(
  value: FormDataEntryValue | null
): unknown[] | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(
        value
      );

    return Array.isArray(
      parsed
    )
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function normalizeRecipePayload(
  value: unknown
):
  | ProductionOrderRecipePayload
  | null {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return null;
  }

  const object =
    value as Record<
      string,
      unknown
    >;

  const recipeId =
    normalizeUuid(
      object.recipe_id
    );

  const requiredYield =
    normalizeDecimal(
      object.required_yield_qty,
      false
    );

  if (
    !recipeId ||
    !requiredYield
  ) {
    return null;
  }

  return {
    recipe_id:
      recipeId,

    required_yield_qty:
      requiredYield,
  };
}

function normalizeOnHandPayload(
  value: unknown
):
  | ProductionOrderOnHandPayload
  | null {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return null;
  }

  const object =
    value as Record<
      string,
      unknown
    >;

  const productId =
    normalizeUuid(
      object.product_id
    );

  const onHandQty =
    normalizeDecimal(
      object.on_hand_qty,
      true
    );

  if (
    !productId ||
    onHandQty ===
      null
  ) {
    return null;
  }

  return {
    product_id:
      productId,

    on_hand_qty:
      onHandQty,
  };
}

// =========================================================
// DUPLICATE VALIDATION
// =========================================================

function hasDuplicateIds(
  values: string[]
): boolean {
  return (
    new Set(
      values
    ).size !==
    values.length
  );
}

// =========================================================
// ERROR MESSAGE
// =========================================================

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}

// =========================================================
// REVALIDATION
// =========================================================

function revalidateProductionOrderPages(
  orderId?: string
) {
  revalidatePath(
    "/dashboard"
  );

  revalidatePath(
    "/orders/production"
  );

  revalidatePath(
    "/orders/production/new"
  );

  if (
    orderId
  ) {
    revalidatePath(
      `/orders/production/${orderId}`
    );

    revalidatePath(
      `/orders/production/${orderId}/edit`
    );
  }
}

// =========================================================
// RECIPE OPTIONS
// =========================================================
//
// Used by the Production Order form.
//
// This loads master recipe information for the current
// signed operational location.
//
// Live calculations in the UI are PREVIEW calculations only.
//
// PostgreSQL remains authoritative when the order is saved.
// =========================================================

export async function getProductionOrderRecipeOptions(
  includeRecipeIds:
    string[] = []
): Promise<
  ProductionOrderRecipeOption[]
> {
  const location =
    await requireDatabaseLocation();

  const supabase =
    createAdminClient();

  const normalizedIncludeIds =
    Array.from(
      new Set(
        includeRecipeIds
          .map(
            normalizeUuid
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(
                value
              )
          )
      )
    );

  let recipeQuery =
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
          is_active
        `
      )
      .eq(
        "location_id",
        location.id
      );

  if (
    normalizedIncludeIds.length ===
    0
  ) {
    recipeQuery =
      recipeQuery.eq(
        "is_active",
        true
      );
  } else {
    const quotedIds =
      normalizedIncludeIds
        .map(
          (id) =>
            `"${id}"`
        )
        .join(",");

    recipeQuery =
      recipeQuery.or(
        `is_active.eq.true,id.in.(${quotedIds})`
      );
  }

  const {
    data: recipeData,
    error: recipeError,
  } =
    await recipeQuery.order(
      "name",
      {
        ascending:
          true,
      }
    );

  if (
    recipeError
  ) {
    console.error(
      "Order Me Production Order recipe options failed:",
      recipeError.message
    );

    throw new Error(
      "Unable to load production recipes."
    );
  }

  const recipeRows =
    (
      recipeData ??
      []
    ) as ProductionRecipeDatabaseRow[];

  if (
    recipeRows.length ===
    0
  ) {
    return [];
  }

  const recipeIds =
    recipeRows.map(
      (recipe) =>
        recipe.id
    );

  const {
    data: ingredientData,
    error: ingredientError,
  } =
    await supabase
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
          sort_order
        `
      )
      .eq(
        "location_id",
        location.id
      )
      .in(
        "recipe_id",
        recipeIds
      )
      .order(
        "sort_order",
        {
          ascending:
            true,
        }
      );

  if (
    ingredientError
  ) {
    console.error(
      "Order Me Production Order ingredient options failed:",
      ingredientError.message
    );

    throw new Error(
      "Unable to load production recipe ingredients."
    );
  }

  const ingredientRows =
    (
      ingredientData ??
      []
    ) as ProductionRecipeItemDatabaseRow[];

  const productIds =
    Array.from(
      new Set(
        ingredientRows.map(
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

  const categoryMap =
    new Map<
      string,
      string
    >();

  if (
    productIds.length >
    0
  ) {
    const {
      data: productData,
      error: productError,
    } =
      await supabase
        .from(
          "products"
        )
        .select(
          `
            id,
            location_id,
            category_id,
            sku,
            name,
            uom
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

    if (
      productError
    ) {
      console.error(
        "Order Me Production Order product mapping failed:",
        productError.message
      );

      throw new Error(
        "Unable to load production order ingredient products."
      );
    }

    const productRows =
      (
        productData ??
        []
      ) as ProductDatabaseRow[];

    for (
      const product of
      productRows
    ) {
      productMap.set(
        product.id,
        product
      );
    }

    const categoryIds =
      Array.from(
        new Set(
          productRows.map(
            (product) =>
              product.category_id
          )
        )
      );

    if (
      categoryIds.length >
      0
    ) {
      const {
        data: categoryData,
        error: categoryError,
      } =
        await supabase
          .from(
            "categories"
          )
          .select(
            `
              id,
              location_id,
              name
            `
          )
          .eq(
            "location_id",
            location.id
          )
          .in(
            "id",
            categoryIds
          );

      if (
        categoryError
      ) {
        console.error(
          "Order Me Production Order category mapping failed:",
          categoryError.message
        );

        throw new Error(
          "Unable to load production order ingredient categories."
        );
      }

      for (
        const category of
        (
          categoryData ??
          []
        ) as CategoryDatabaseRow[]
      ) {
        categoryMap.set(
          category.id,
          category.name
        );
      }
    }
  }

  const ingredientsByRecipe =
    new Map<
      string,
      ProductionOrderRecipeOptionIngredient[]
    >();

  for (
    const ingredient of
    ingredientRows
  ) {
    const product =
      productMap.get(
        ingredient.product_id
      );

    if (
      !product
    ) {
      continue;
    }

    const uom =
      normalizeUom(
        ingredient.uom
      );

    if (
      !uom
    ) {
      continue;
    }

    const mapped:
      ProductionOrderRecipeOptionIngredient =
      {
        id:
          ingredient.id,

        product_id:
          ingredient.product_id,

        sku:
          product.sku,

        product_name:
          product.name,

        category_name:
          categoryMap.get(
            product.category_id
          ) ??
          "Unknown Category",

        qty:
          ingredient.qty,

        uom,

        sort_order:
          ingredient.sort_order,
      };

    const current =
      ingredientsByRecipe.get(
        ingredient.recipe_id
      ) ??
      [];

    current.push(
      mapped
    );

    ingredientsByRecipe.set(
      ingredient.recipe_id,
      current
    );
  }

  return recipeRows
    .map(
      (
        recipe
      ):
        ProductionOrderRecipeOption | null => {
        const yieldUom =
          normalizeUom(
            recipe.yield_uom
          );

        if (
          !yieldUom
        ) {
          return null;
        }

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
            yieldUom,

          is_active:
            recipe.is_active,

          ingredients:
            ingredientsByRecipe.get(
              recipe.id
            ) ??
            [],
        };
      }
    )
    .filter(
      (
        recipe
      ): recipe is
        ProductionOrderRecipeOption =>
        recipe !==
        null
    );
}

// =========================================================
// HISTORICAL RECIPE INGREDIENT SNAPSHOTS
// =========================================================
//
// Required by:
// /orders/production/[id]/edit
//
// An existing order must be previewed using the ingredient
// composition saved with that order, not today's master recipe.
//
// production_order_recipes.id
//        ↓
// production_order_recipe_items.production_order_recipe_id
//
// The selected recipe row is mapped back to recipe_id so the
// client form can associate each historical ingredient with
// the correct Production Recipe.
// =========================================================

export async function getProductionOrderHistoricalRecipeItems(
  orderId: string
): Promise<
  ProductionOrderHistoricalRecipeIngredient[]
> {
  const location =
    await requireDatabaseLocation();

  const normalizedOrderId =
    normalizeUuid(
      orderId
    );

  if (
    !normalizedOrderId
  ) {
    return [];
  }

  const supabase =
    createAdminClient();

  // =======================================================
  // SELECTED PRODUCTION RECIPES
  // =======================================================

  const {
    data: recipeData,
    error: recipeError,
  } =
    await supabase
      .from(
        "production_order_recipes"
      )
      .select(
        `
          id,
          recipe_id
        `
      )
      .eq(
        "order_id",
        normalizedOrderId
      )
      .eq(
        "location_id",
        location.id
      );

  if (
    recipeError
  ) {
    console.error(
      "Order Me Production Order historical recipe lookup failed:",
      recipeError.message
    );

    throw new Error(
      "Unable to load historical production recipes."
    );
  }

  const selectedRecipes =
    (
      recipeData ??
      []
    ) as {
      id: string;
      recipe_id: string;
    }[];

  if (
    selectedRecipes.length ===
    0
  ) {
    return [];
  }

  // =======================================================
  // MAP ORDER-RECIPE ROW → MASTER RECIPE ID
  // =======================================================

  const recipeIdByOrderRecipeId =
    new Map<
      string,
      string
    >();

  for (
    const recipe of
    selectedRecipes
  ) {
    recipeIdByOrderRecipeId.set(
      recipe.id,
      recipe.recipe_id
    );
  }

  const orderRecipeIds =
    selectedRecipes.map(
      (recipe) =>
        recipe.id
    );

  // =======================================================
  // HISTORICAL INGREDIENT SNAPSHOTS
  // =======================================================

  const {
    data: itemData,
    error: itemError,
  } =
    await supabase
      .from(
        "production_order_recipe_items"
      )
      .select(
        `
          id,
          location_id,
          order_id,
          production_order_recipe_id,
          product_id,
          sku_snapshot,
          product_name_snapshot,
          category_name_snapshot,
          uom,
          base_qty_snapshot,
          required_qty,
          created_at,
          updated_at
        `
      )
      .eq(
        "order_id",
        normalizedOrderId
      )
      .eq(
        "location_id",
        location.id
      )
      .in(
        "production_order_recipe_id",
        orderRecipeIds
      )
      .order(
        "product_name_snapshot",
        {
          ascending:
            true,
        }
      );

  if (
    itemError
  ) {
    console.error(
      "Order Me Production Order historical ingredient lookup failed:",
      itemError.message
    );

    throw new Error(
      "Unable to load historical production order ingredients."
    );
  }

  const rows =
    (
      itemData ??
      []
    ) as ProductionOrderRecipeItemSnapshotDatabaseRow[];

  const result:
    ProductionOrderHistoricalRecipeIngredient[] =
    [];

  for (
    const row of
    rows
  ) {
    const recipeId =
      recipeIdByOrderRecipeId.get(
        row.production_order_recipe_id
      );

    if (
      !recipeId
    ) {
      continue;
    }

    const uom =
      normalizeUom(
        row.uom
      );

    if (
      !uom
    ) {
      continue;
    }

    result.push({
      recipe_id:
        recipeId,

      product_id:
        row.product_id,

      sku_snapshot:
        row.sku_snapshot,

      product_name_snapshot:
        row.product_name_snapshot,

      category_name_snapshot:
        row.category_name_snapshot,

      uom,

      base_qty_snapshot:
        row.base_qty_snapshot,
    });
  }

  return result;
}

// =========================================================
// LIST PRODUCTION ORDERS
// =========================================================

export async function getProductionOrders(
  options:
    ProductionOrderListOptions = {}
): Promise<
  ProductionOrderListResult
> {
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

  const status =
    options.status
      ? normalizeStatus(
          options.status
        )
      : null;

  const dateFrom =
    options.dateFrom
      ? normalizeDate(
          options.dateFrom
        )
      : null;

  const dateTo =
    options.dateTo
      ? normalizeDate(
          options.dateTo
        )
      : null;

  const from =
    (page - 1) *
    pageSize;

  const to =
    from +
    pageSize -
    1;

  let query =
    supabase
      .from(
        "production_orders"
      )
      .select(
        `
          id,
          location_id,
          order_number,
          order_date,
          ordered_by,
          status,
          created_at,
          updated_at
        `,
        {
          count:
            "exact",
        }
      )
      .eq(
        "location_id",
        location.id
      );

  if (
    search
  ) {
    const escaped =
      escapePostgrestQuotedValue(
        search
      );

    query =
      query.or(
        `order_number.ilike."%${escaped}%",ordered_by.ilike."%${escaped}%"`
      );
  }

  if (
    status
  ) {
    query =
      query.eq(
        "status",
        status
      );
  }

  if (
    dateFrom
  ) {
    query =
      query.gte(
        "order_date",
        dateFrom
      );
  }

  if (
    dateTo
  ) {
    query =
      query.lte(
        "order_date",
        dateTo
      );
  }

  const {
    data,
    error,
    count,
  } =
    await query
      .order(
        "order_date",
        {
          ascending:
            false,
        }
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .range(
        from,
        to
      );

  if (
    error
  ) {
    console.error(
      "Order Me Production Order list failed:",
      error.message
    );

    throw new Error(
      "Unable to load production orders."
    );
  }

  const orderRows =
    (
      data ??
      []
    ) as ProductionOrderDatabaseRow[];

  if (
    orderRows.length ===
    0
  ) {
    return {
      orders: [],
      total:
        count ??
        0,
      page,
      pageSize,
      totalPages:
        0,
    };
  }

  const orderIds =
    orderRows.map(
      (order) =>
        order.id
    );

  const [
    recipeCountResult,
    itemCountResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "production_order_recipes"
        )
        .select(
          `
            order_id
          `
        )
        .eq(
          "location_id",
          location.id
        )
        .in(
          "order_id",
          orderIds
        ),

      supabase
        .from(
          "production_order_items"
        )
        .select(
          `
            order_id
          `
        )
        .eq(
          "location_id",
          location.id
        )
        .in(
          "order_id",
          orderIds
        ),
    ]);

  if (
    recipeCountResult.error
  ) {
    console.error(
      "Order Me Production Order recipe count failed:",
      recipeCountResult.error.message
    );

    throw new Error(
      "Unable to load production order recipe counts."
    );
  }

  if (
    itemCountResult.error
  ) {
    console.error(
      "Order Me Production Order item count failed:",
      itemCountResult.error.message
    );

    throw new Error(
      "Unable to load production order item counts."
    );
  }

  const recipeCounts =
    new Map<
      string,
      number
    >();

  for (
    const row of
    recipeCountResult.data ??
    []
  ) {
    const orderId =
      String(
        row.order_id
      );

    recipeCounts.set(
      orderId,
      (
        recipeCounts.get(
          orderId
        ) ??
        0
      ) +
        1
    );
  }

  const itemCounts =
    new Map<
      string,
      number
    >();

  for (
    const row of
    itemCountResult.data ??
    []
  ) {
    const orderId =
      String(
        row.order_id
      );

    itemCounts.set(
      orderId,
      (
        itemCounts.get(
          orderId
        ) ??
        0
      ) +
        1
    );
  }

  const orders:
    ProductionOrderListItem[] =
    orderRows.map(
      (row) => ({
        id:
          row.id,

        location_id:
          row.location_id,

        order_number:
          row.order_number,

        order_date:
          row.order_date,

        ordered_by:
          row.ordered_by,

        status:
          normalizeStatus(
            row.status
          ) ??
          "draft",

        recipe_count:
          recipeCounts.get(
            row.id
          ) ??
          0,

        item_count:
          itemCounts.get(
            row.id
          ) ??
          0,

        created_at:
          row.created_at,

        updated_at:
          row.updated_at,
      })
    );

  const total =
    count ??
    0;

  const totalPages =
    total ===
    0
      ? 0
      : Math.ceil(
          total /
            pageSize
        );

  return {
    orders,
    total,
    page,
    pageSize,
    totalPages,
  };
}

// =========================================================
// GET SINGLE PRODUCTION ORDER
// =========================================================

export async function getProductionOrderById(
  orderId: string
): Promise<
  ProductionOrderRecord | null
> {
  const location =
    await requireDatabaseLocation();

  const normalizedOrderId =
    normalizeUuid(
      orderId
    );

  if (
    !normalizedOrderId
  ) {
    return null;
  }

  const supabase =
    createAdminClient();

  const {
    data: orderData,
    error: orderError,
  } =
    await supabase
      .from(
        "production_orders"
      )
      .select(
        `
          id,
          location_id,
          order_number,
          order_date,
          ordered_by,
          status,
          created_at,
          updated_at
        `
      )
      .eq(
        "id",
        normalizedOrderId
      )
      .eq(
        "location_id",
        location.id
      )
      .maybeSingle();

  if (
    orderError
  ) {
    console.error(
      "Order Me Production Order lookup failed:",
      orderError.message
    );

    throw new Error(
      "Unable to load production order."
    );
  }

  if (
    !orderData
  ) {
    return null;
  }

  const [
    recipeResult,
    itemResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "production_order_recipes"
        )
        .select(
          `
            id,
            location_id,
            order_id,
            recipe_id,
            recipe_name_snapshot,
            batch_qty_snapshot,
            base_yield_qty_snapshot,
            yield_uom_snapshot,
            required_yield_qty,
            yield_multiplier,
            sort_order,
            created_at,
            updated_at
          `
        )
        .eq(
          "order_id",
          normalizedOrderId
        )
        .eq(
          "location_id",
          location.id
        )
        .order(
          "sort_order",
          {
            ascending:
              true,
          }
        ),

      supabase
        .from(
          "production_order_items"
        )
        .select(
          `
            id,
            location_id,
            order_id,
            product_id,
            sku_snapshot,
            product_name_snapshot,
            category_name_snapshot,
            uom,
            required_qty,
            on_hand_qty,
            requested_qty,
            created_at,
            updated_at
          `
        )
        .eq(
          "order_id",
          normalizedOrderId
        )
        .eq(
          "location_id",
          location.id
        )
        .order(
          "product_name_snapshot",
          {
            ascending:
              true,
          }
        ),
    ]);

  if (
    recipeResult.error
  ) {
    console.error(
      "Order Me Production Order recipe lookup failed:",
      recipeResult.error.message
    );

    throw new Error(
      "Unable to load production order recipes."
    );
  }

  if (
    itemResult.error
  ) {
    console.error(
      "Order Me Production Order ingredient lookup failed:",
      itemResult.error.message
    );

    throw new Error(
      "Unable to load production order ingredients."
    );
  }

  const orderRow =
    orderData as ProductionOrderDatabaseRow;

  const recipes:
    ProductionOrderRecipeRecord[] =
    (
      recipeResult.data ??
      []
    )
      .map(
        (
          row
        ):
          ProductionOrderRecipeRecord | null => {
          const typedRow =
            row as ProductionOrderRecipeDatabaseRow;

          const uom =
            normalizeUom(
              typedRow.yield_uom_snapshot
            );

          if (
            !uom
          ) {
            return null;
          }

          return {
            id:
              typedRow.id,

            location_id:
              typedRow.location_id,

            order_id:
              typedRow.order_id,

            recipe_id:
              typedRow.recipe_id,

            recipe_name_snapshot:
              typedRow.recipe_name_snapshot,

            batch_qty_snapshot:
              typedRow.batch_qty_snapshot,

            base_yield_qty_snapshot:
              typedRow.base_yield_qty_snapshot,

            yield_uom_snapshot:
              uom,

            required_yield_qty:
              typedRow.required_yield_qty,

            yield_multiplier:
              typedRow.yield_multiplier,

            sort_order:
              typedRow.sort_order,

            created_at:
              typedRow.created_at,

            updated_at:
              typedRow.updated_at,
          };
        }
      )
      .filter(
        (
          recipe
        ): recipe is
          ProductionOrderRecipeRecord =>
          recipe !==
          null
      );

  const items:
    ProductionOrderItemRecord[] =
    (
      itemResult.data ??
      []
    )
      .map(
        (
          row
        ):
          ProductionOrderItemRecord | null => {
          const typedRow =
            row as ProductionOrderItemDatabaseRow;

          const uom =
            normalizeUom(
              typedRow.uom
            );

          if (
            !uom
          ) {
            return null;
          }

          return {
            id:
              typedRow.id,

            location_id:
              typedRow.location_id,

            order_id:
              typedRow.order_id,

            product_id:
              typedRow.product_id,

            sku_snapshot:
              typedRow.sku_snapshot,

            product_name_snapshot:
              typedRow.product_name_snapshot,

            category_name_snapshot:
              typedRow.category_name_snapshot,

            uom,

            required_qty:
              typedRow.required_qty,

            on_hand_qty:
              typedRow.on_hand_qty,

            requested_qty:
              typedRow.requested_qty,

            created_at:
              typedRow.created_at,

            updated_at:
              typedRow.updated_at,
          };
        }
      )
      .filter(
        (
          item
        ): item is
          ProductionOrderItemRecord =>
          item !==
          null
      );

  return {
    id:
      orderRow.id,

    location_id:
      orderRow.location_id,

    order_number:
      orderRow.order_number,

    order_date:
      orderRow.order_date,

    ordered_by:
      orderRow.ordered_by,

    status:
      normalizeStatus(
        orderRow.status
      ) ??
      "draft",

    created_at:
      orderRow.created_at,

    updated_at:
      orderRow.updated_at,

    recipes,

    items,
  };
}

// =========================================================
// SAVE PRODUCTION ORDER
// =========================================================
//
// FormData contract:
//
// orderId
// orderDate
// orderedBy
// status
// recipes
// onHandItems
//
// recipes:
// [
//   {
//     recipe_id: "...",
//     required_yield_qty: "10000"
//   }
// ]
//
// onHandItems:
// [
//   {
//     product_id: "...",
//     on_hand_qty: "1500"
//   }
// ]
// =========================================================

export async function saveProductionOrderAction(
  _previousState:
    ProductionOrderActionResult | null,
  formData: FormData
): Promise<
  ProductionOrderActionResult
> {
  try {
    const location =
      await requireDatabaseLocation();

    // =====================================================
    // ORDER ID
    // =====================================================

    const rawOrderId =
      formData.get(
        "orderId"
      );

    const orderId =
      typeof rawOrderId ===
        "string" &&
      rawOrderId.trim()
        ? normalizeUuid(
            rawOrderId
          )
        : null;

    if (
      typeof rawOrderId ===
        "string" &&
      rawOrderId.trim() &&
      !orderId
    ) {
      return {
        success:
          false,

        message:
          "Invalid production order identifier.",
      };
    }

    // =====================================================
    // ORDER DATE
    // =====================================================

    const orderDate =
      normalizeDate(
        formData.get(
          "orderDate"
        )
      );

    if (
      !orderDate
    ) {
      return {
        success:
          false,

        message:
          "Select a valid production order date.",
      };
    }

    // =====================================================
    // ORDERED BY
    // =====================================================

    const orderedBy =
      normalizeOrderedBy(
        formData.get(
          "orderedBy"
        )
      );

    if (
      !orderedBy
    ) {
      return {
        success:
          false,

        message:
          "Enter a valid Ordered By name.",
      };
    }

    // =====================================================
    // STATUS
    // =====================================================

    const status =
      normalizeStatus(
        formData.get(
          "status"
        )
      );

    if (
      !status
    ) {
      return {
        success:
          false,

        message:
          "Select a valid production order status.",
      };
    }

    // =====================================================
    // RECIPES
    // =====================================================

    const rawRecipes =
      parseJsonArray(
        formData.get(
          "recipes"
        )
      );

    if (
      !rawRecipes ||
      rawRecipes.length ===
        0
    ) {
      return {
        success:
          false,

        message:
          "Add at least one production recipe.",
      };
    }

    const recipes:
      ProductionOrderRecipePayload[] =
      [];

    for (
      const rawRecipe of
      rawRecipes
    ) {
      const recipe =
        normalizeRecipePayload(
          rawRecipe
        );

      if (
        !recipe
      ) {
        return {
          success:
            false,

          message:
            "Every production recipe requires a valid Recipe and Required Yield greater than zero.",
        };
      }

      recipes.push(
        recipe
      );
    }

    if (
      hasDuplicateIds(
        recipes.map(
          (recipe) =>
            recipe.recipe_id
        )
      )
    ) {
      return {
        success:
          false,

        message:
          "The same production recipe cannot appear more than once.",
      };
    }

    // =====================================================
    // ON HAND ITEMS
    // =====================================================

    const rawOnHandItems =
      parseJsonArray(
        formData.get(
          "onHandItems"
        )
      );

    if (
      !rawOnHandItems ||
      rawOnHandItems.length ===
        0
    ) {
      return {
        success:
          false,

        message:
          "Enter On Hand Qty for every calculated ingredient.",
      };
    }

    const onHandItems:
      ProductionOrderOnHandPayload[] =
      [];

    for (
      const rawItem of
      rawOnHandItems
    ) {
      const item =
        normalizeOnHandPayload(
          rawItem
        );

      if (
        !item
      ) {
        return {
          success:
            false,

          message:
            "Every calculated ingredient requires a valid non-negative On Hand Qty.",
        };
      }

      onHandItems.push(
        item
      );
    }

    if (
      hasDuplicateIds(
        onHandItems.map(
          (item) =>
            item.product_id
        )
      )
    ) {
      return {
        success:
          false,

        message:
          "The same ingredient cannot appear more than once in the On Hand list.",
      };
    }

    // =====================================================
    // ATOMIC DATABASE SAVE
    // =====================================================

    const supabase =
      createAdminClient();

    const {
      data,
      error,
    } =
      await supabase.rpc(
        "save_production_order",
        {
          p_location_id:
            location.id,

          p_order_id:
            orderId,

          p_order_date:
            orderDate,

          p_ordered_by:
            orderedBy,

          p_status:
            status,

          p_recipes:
            recipes,

          p_on_hand_items:
            onHandItems,
        }
      );

    if (
      error
    ) {
      console.error(
        "Order Me Production Order save failed:",
        error.message
      );

      return {
        success:
          false,

        message:
          error.message ||
          "Unable to save production order.",
      };
    }

    const savedOrderId =
      normalizeUuid(
        data
      );

    if (
      !savedOrderId
    ) {
      console.error(
        "Order Me Production Order save returned an invalid order ID."
      );

      return {
        success:
          false,

        message:
          "Production order was saved but the returned order identifier was invalid.",
      };
    }

    revalidateProductionOrderPages(
      savedOrderId
    );

    return {
      success:
        true,

      message:
        orderId
          ? "Production Order Updated"
          : "Production Order Created",

      orderId:
        savedOrderId,
    };
  } catch (
    error
  ) {
    console.error(
      "Order Me Production Order action failed:",
      error
    );

    return {
      success:
        false,

      message:
        getErrorMessage(
          error,
          "Unable to save production order."
        ),
    };
  }
}

// =========================================================
// DELETE PRODUCTION ORDER
// =========================================================

export async function deleteProductionOrderAction(
  orderId: string
): Promise<
  ProductionOrderActionResult
> {
  try {
    const location =
      await requireDatabaseLocation();

    const normalizedOrderId =
      normalizeUuid(
        orderId
      );

    if (
      !normalizedOrderId
    ) {
      return {
        success:
          false,

        message:
          "Invalid production order identifier.",
      };
    }

    const supabase =
      createAdminClient();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "production_orders"
        )
        .delete()
        .eq(
          "id",
          normalizedOrderId
        )
        .eq(
          "location_id",
          location.id
        )
        .select(
          "id"
        )
        .maybeSingle();

    if (
      error
    ) {
      console.error(
        "Order Me Production Order delete failed:",
        error.message
      );

      return {
        success:
          false,

        message:
          "Unable to delete production order.",
      };
    }

    if (
      !data
    ) {
      return {
        success:
          false,

        message:
          "Production order was not found for the current location.",
      };
    }

    revalidateProductionOrderPages(
      normalizedOrderId
    );

    return {
      success:
        true,

      message:
        "Production Order Deleted",
    };
  } catch (
    error
  ) {
    console.error(
      "Order Me Production Order delete action failed:",
      error
    );

    return {
      success:
        false,

      message:
        getErrorMessage(
          error,
          "Unable to delete production order."
        ),
    };
  }
}