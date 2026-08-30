"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  requireDatabaseLocation,
} from "@/lib/location/database-location";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

// =========================================================
// TYPES
// =========================================================

export type ProductUom =
  | "ml"
  | "pc"
  | "gram";

export type ProductPackagingUom =
  | "bottle"
  | "box"
  | "pack"
  | "can"
  | "kilo"
  | "liter";

export type ProductRecord = {
  id: string;
  location_id: string;
  category_id: string;
  category_name: string;
  sku: string;
  name: string;
  amount_qty: number;
  uom: ProductUom;
  packaging_size_amount: number;
  packaging_uom: ProductPackagingUom;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ProductDatabaseRow = {
  id: string;
  location_id: string;
  category_id: string;
  sku: string;
  name: string;
  amount_qty: number;
  uom: string;
  packaging_size_amount: number;
  packaging_uom: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type CategoryDatabaseRow = {
  id: string;
  name: string;
  is_active: boolean;
};

type ProductNameDatabaseRow = {
  id: string;
  name: string;
};

type DatabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string;
};

export type ProductActionResult = {
  success: boolean;
  message: string;
  product?: ProductRecord;
};

export type ProductListOptions = {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  sortBy?:
    | "name"
    | "sku"
    | "amount_qty"
    | "created_at"
    | "updated_at";
  sortDirection?:
    | "asc"
    | "desc";
};

export type ProductListResult = {
  products: ProductRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// =========================================================
// CONSTANTS
// =========================================================

const MAX_PRODUCT_NAME_LENGTH =
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

const PRODUCT_UOMS =
  new Set<ProductUom>([
    "ml",
    "pc",
    "gram",
  ]);

const PACKAGING_UOMS =
  new Set<ProductPackagingUom>([
    "bottle",
    "box",
    "pack",
    "can",
    "kilo",
    "liter",
  ]);

// =========================================================
// BASIC VALIDATION
// =========================================================

function normalizeText(
  value: FormDataEntryValue | null
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

  if (!normalized) {
    return null;
  }

  return normalized;
}

function normalizeProductName(
  value: FormDataEntryValue | null
): string | null {
  const normalized =
    normalizeText(
      value
    );

  if (!normalized) {
    return null;
  }

  if (
    normalized.length >
    MAX_PRODUCT_NAME_LENGTH
  ) {
    return null;
  }

  return normalized;
}

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
// EXACT DECIMAL VALIDATION
// =========================================================
// PostgreSQL column:
// numeric(18, 4)
//
// We normalize using strings + BigInt instead of relying
// on floating-point arithmetic for validation.
// =========================================================

function normalizePositiveDecimal(
  value: FormDataEntryValue | null
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

  const fourDigitFraction =
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
      fourDigitFraction ||
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
// UOM VALIDATION
// =========================================================

function normalizeProductUom(
  value: FormDataEntryValue | null
): ProductUom | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase() as ProductUom;

  if (
    !PRODUCT_UOMS.has(
      normalized
    )
  ) {
    return null;
  }

  return normalized;
}

function normalizePackagingUom(
  value: FormDataEntryValue | null
): ProductPackagingUom | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase() as ProductPackagingUom;

  if (
    !PACKAGING_UOMS.has(
      normalized
    )
  ) {
    return null;
  }

  return normalized;
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
// DATABASE ERROR HELPERS
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

function isCheckViolation(
  code:
    | string
    | undefined
): boolean {
  return (
    code === "23514"
  );
}

function isProductNameUniqueViolation(
  error: DatabaseErrorLike
): boolean {
  if (
    !isUniqueViolation(
      error.code
    )
  ) {
    return false;
  }

  const errorText =
    `${
      error.message ??
      ""
    } ${
      error.details ??
      ""
    }`
      .toLowerCase();

  return errorText.includes(
    "products_location_name_unique_ci"
  );
}

// =========================================================
// PRODUCT NAME DUPLICATE VALIDATION
// =========================================================

function escapeLikePattern(
  value: string
): string {
  return value
    .replace(
      /\\/g,
      "\\\\"
    )
    .replace(
      /%/g,
      "\\%"
    )
    .replace(
      /_/g,
      "\\_"
    );
}

async function getDuplicateProductByName(
  supabase: SupabaseClient,
  locationId: string,
  productName: string,
  excludeProductId?:
    | string
    | null
): Promise<ProductNameDatabaseRow | null> {
  let query =
    supabase
      .from("products")
      .select(
        `
          id,
          name
        `
      )
      .eq(
        "location_id",
        locationId
      )
      .ilike(
        "name",
        escapeLikePattern(
          productName
        )
      );

  if (
    excludeProductId
  ) {
    query =
      query.neq(
        "id",
        excludeProductId
      );
  }

  const {
    data,
    error,
  } = await query
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "Order Me duplicate product validation failed:",
      error.message
    );

    throw new Error(
      "Unable to validate product name."
    );
  }

  if (!data) {
    return null;
  }

  return data as ProductNameDatabaseRow;
}

// =========================================================
// CATEGORY VALIDATION
// =========================================================

async function getValidCategory(
  supabase: SupabaseClient,
  locationId: string,
  categoryId: string
): Promise<CategoryDatabaseRow | null> {
  const {
    data,
    error,
  } = await supabase
    .from("categories")
    .select(
      `
        id,
        name,
        is_active
      `
    )
    .eq(
      "id",
      categoryId
    )
    .eq(
      "location_id",
      locationId
    )
    .eq(
      "is_active",
      true
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Order Me product category validation failed:",
      error.message
    );

    throw new Error(
      "Unable to validate product category."
    );
  }

  if (!data) {
    return null;
  }

  return data as CategoryDatabaseRow;
}

// =========================================================
// CATEGORY NAME MAPPING
// =========================================================

async function attachCategoryNames(
  supabase: SupabaseClient,
  locationId: string,
  productRows: ProductDatabaseRow[]
): Promise<ProductRecord[]> {
  if (
    productRows.length ===
    0
  ) {
    return [];
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

  const {
    data:
      categoryData,
    error:
      categoryError,
  } = await supabase
    .from("categories")
    .select(
      `
        id,
        name,
        is_active
      `
    )
    .eq(
      "location_id",
      locationId
    )
    .in(
      "id",
      categoryIds
    );

  if (categoryError) {
    console.error(
      "Order Me product category mapping failed:",
      categoryError.message
    );

    throw new Error(
      "Unable to load product categories."
    );
  }

  const categoryMap =
    new Map<
      string,
      string
    >();

  for (
    const category of
    (categoryData ??
      []) as CategoryDatabaseRow[]
  ) {
    categoryMap.set(
      category.id,
      category.name
    );
  }

  return productRows.map(
    (product) => ({
      id:
        product.id,

      location_id:
        product.location_id,

      category_id:
        product.category_id,

      category_name:
        categoryMap.get(
          product.category_id
        ) ??
        "Unknown Category",

      sku:
        product.sku,

      name:
        product.name,

      amount_qty:
        product.amount_qty,

      uom:
        product.uom as ProductUom,

      packaging_size_amount:
        product.packaging_size_amount,

      packaging_uom:
        product.packaging_uom as ProductPackagingUom,

      is_active:
        product.is_active,

      created_at:
        product.created_at,

      updated_at:
        product.updated_at,
    })
  );
}

// =========================================================
// REVALIDATION
// =========================================================

function revalidateProductPages() {
  revalidatePath(
    "/dashboard"
  );

  revalidatePath(
    "/products"
  );

  revalidatePath(
    "/products/new"
  );

  revalidatePath(
    "/recipes"
  );

  revalidatePath(
    "/orders/normal"
  );

  revalidatePath(
    "/orders/production"
  );
}

// =========================================================
// LIST PRODUCTS
// =========================================================

export async function getProducts(
  options: ProductListOptions = {}
): Promise<ProductListResult> {
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

  const categoryId =
    options.categoryId
      ? normalizeUuid(
          options.categoryId
        )
      : null;

  const allowedSortFields =
    new Set([
      "name",
      "sku",
      "amount_qty",
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
    (page - 1) *
    pageSize;

  const to =
    from +
    pageSize -
    1;

  let query =
    supabase
      .from("products")
      .select(
        `
          id,
          location_id,
          category_id,
          sku,
          name,
          amount_qty,
          uom,
          packaging_size_amount,
          packaging_uom,
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

  if (
    options.categoryId
  ) {
    if (!categoryId) {
      return {
        products: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }

    query =
      query.eq(
        "category_id",
        categoryId
      );
  }

  if (search) {
    const escapedSearch =
      escapePostgrestQuotedValue(
        search
      );

    query =
      query.or(
        `name.ilike."%${escapedSearch}%",sku.ilike."%${escapedSearch}%"`
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
      "Order Me product list failed:",
      error.message
    );

    throw new Error(
      "Unable to load products."
    );
  }

  const productRows =
    (data ??
      []) as ProductDatabaseRow[];

  const products =
    await attachCategoryNames(
      supabase,
      location.id,
      productRows
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
    products,
    total,
    page,
    pageSize,
    totalPages,
  };
}

// =========================================================
// GET SINGLE PRODUCT
// =========================================================

export async function getProductById(
  productId: string
): Promise<ProductRecord | null> {
  const location =
    await requireDatabaseLocation();

  const normalizedId =
    normalizeUuid(
      productId
    );

  if (!normalizedId) {
    return null;
  }

  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from("products")
    .select(
      `
        id,
        location_id,
        category_id,
        sku,
        name,
        amount_qty,
        uom,
        packaging_size_amount,
        packaging_uom,
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

  if (error) {
    console.error(
      "Order Me product lookup failed:",
      error.message
    );

    throw new Error(
      "Unable to load product."
    );
  }

  if (!data) {
    return null;
  }

  const products =
    await attachCategoryNames(
      supabase,
      location.id,
      [
        data as ProductDatabaseRow,
      ]
    );

  return (
    products[0] ??
    null
  );
}

// =========================================================
// CREATE PRODUCT
// =========================================================

export async function createProductAction(
  _previousState: ProductActionResult | null,
  formData: FormData
): Promise<ProductActionResult> {
  try {
    const location =
      await requireDatabaseLocation();

    // =====================================================
    // PRODUCT NAME
    // =====================================================

    const productName =
      normalizeProductName(
        formData.get(
          "name"
        )
      );

    if (!productName) {
      return {
        success: false,
        message:
          "Enter a valid product name.",
      };
    }

    // =====================================================
    // CATEGORY
    // =====================================================

    const categoryId =
      normalizeUuid(
        formData.get(
          "categoryId"
        )
      );

    if (!categoryId) {
      return {
        success: false,
        message:
          "Select a valid product category.",
      };
    }

    // =====================================================
    // AMOUNT QTY
    // =====================================================

    const amountQty =
      normalizePositiveDecimal(
        formData.get(
          "amountQty"
        )
      );

    if (!amountQty) {
      return {
        success: false,
        message:
          "Enter a valid Amount QTY greater than zero with up to 4 decimal places.",
      };
    }

    // =====================================================
    // UOM
    // =====================================================

    const uom =
      normalizeProductUom(
        formData.get(
          "uom"
        )
      );

    if (!uom) {
      return {
        success: false,
        message:
          "Select a valid UOM: ml, pc, or gram.",
      };
    }

    // =====================================================
    // PACKAGING SIZE
    // =====================================================

    const packagingSizeAmount =
      normalizePositiveDecimal(
        formData.get(
          "packagingSizeAmount"
        )
      );

    if (
      !packagingSizeAmount
    ) {
      return {
        success: false,
        message:
          "Enter a valid Packaging Size Amount greater than zero with up to 4 decimal places.",
      };
    }

    // =====================================================
    // PACKAGING UOM
    // =====================================================

    const packagingUom =
      normalizePackagingUom(
        formData.get(
          "packagingUom"
        )
      );

    if (
      !packagingUom
    ) {
      return {
        success: false,
        message:
          "Select a valid Packaging UOM: bottle, box, pack, or can, kilo, or liter.",
      };
    }

    const supabase =
      createAdminClient();

    // =====================================================
    // PREVENT DUPLICATE PRODUCT NAME
    // =====================================================

    const duplicateProduct =
      await getDuplicateProductByName(
        supabase,
        location.id,
        productName
      );

    if (
      duplicateProduct
    ) {
      return {
        success: false,
        message:
          `"${productName}" already exists in ${location.name}. Duplicate products are not allowed.`,
      };
    }

    // =====================================================
    // VERIFY CATEGORY BELONGS TO ACTIVE LOCATION
    // =====================================================

    const category =
      await getValidCategory(
        supabase,
        location.id,
        categoryId
      );

    if (!category) {
      return {
        success: false,
        message:
          "The selected category is not available for the current location.",
      };
    }

    // =====================================================
    // INSERT
    // =====================================================
    //
    // IMPORTANT:
    //
    // SKU IS NOT PROVIDED.
    //
    // PostgreSQL generate_product_sku() creates it
    // atomically before the INSERT is completed.
    // =====================================================

    const {
      data,
      error,
    } = await supabase
      .from("products")
      .insert({
        location_id:
          location.id,

        category_id:
          category.id,

        name:
          productName,

        amount_qty:
          amountQty,

        uom,

        packaging_size_amount:
          packagingSizeAmount,

        packaging_uom:
          packagingUom,

        is_active:
          true,
      })
      .select(
        `
          id,
          location_id,
          category_id,
          sku,
          name,
          amount_qty,
          uom,
          packaging_size_amount,
          packaging_uom,
          is_active,
          created_at,
          updated_at
        `
      )
      .single();

    if (error) {
      if (
        isProductNameUniqueViolation(
          error
        )
      ) {
        return {
          success: false,
          message:
            `"${productName}" already exists in ${location.name}. Duplicate products are not allowed.`,
        };
      }

      if (
        isUniqueViolation(
          error.code
        )
      ) {
        return {
          success: false,
          message:
            "Unable to generate a unique product SKU. Please try again.",
        };
      }

      if (
        isForeignKeyViolation(
          error.code
        )
      ) {
        return {
          success: false,
          message:
            "The selected category is no longer available for this location.",
        };
      }

      if (
        isCheckViolation(
          error.code
        )
      ) {
        return {
          success: false,
          message:
            "One or more product values are outside the allowed range.",
        };
      }

      console.error(
        "Order Me product creation failed:",
        error.message
      );

      return {
        success: false,
        message:
          "Unable to create product. Please try again.",
      };
    }

    const products =
      await attachCategoryNames(
        supabase,
        location.id,
        [
          data as ProductDatabaseRow,
        ]
      );

    const product =
      products[0];

    if (!product) {
      return {
        success: false,
        message:
          "Product was created but could not be reloaded.",
      };
    }

    revalidateProductPages();

    return {
      success: true,
      message:
        "Product saved successfully.",
      product,
    };
  } catch (error) {
    console.error(
      "Order Me product creation failed:",
      error instanceof Error
        ? error.message
        : "Unknown product creation error"
    );

    return {
      success: false,
      message:
        "Unable to create product. Please try again.",
    };
  }
}

// =========================================================
// UPDATE PRODUCT
// =========================================================

export async function updateProductAction(
  _previousState: ProductActionResult | null,
  formData: FormData
): Promise<ProductActionResult> {
  try {
    const location =
      await requireDatabaseLocation();

    // =====================================================
    // PRODUCT ID
    // =====================================================

    const productId =
      normalizeUuid(
        formData.get(
          "productId"
        )
      );

    if (!productId) {
      return {
        success: false,
        message:
          "Invalid product.",
      };
    }

    // =====================================================
    // PRODUCT NAME
    // =====================================================

    const productName =
      normalizeProductName(
        formData.get(
          "name"
        )
      );

    if (!productName) {
      return {
        success: false,
        message:
          "Enter a valid product name.",
      };
    }

    // =====================================================
    // CATEGORY
    // =====================================================

    const categoryId =
      normalizeUuid(
        formData.get(
          "categoryId"
        )
      );

    if (!categoryId) {
      return {
        success: false,
        message:
          "Select a valid product category.",
      };
    }

    // =====================================================
    // AMOUNT QTY
    // =====================================================

    const amountQty =
      normalizePositiveDecimal(
        formData.get(
          "amountQty"
        )
      );

    if (!amountQty) {
      return {
        success: false,
        message:
          "Enter a valid Amount QTY greater than zero with up to 4 decimal places.",
      };
    }

    // =====================================================
    // UOM
    // =====================================================

    const uom =
      normalizeProductUom(
        formData.get(
          "uom"
        )
      );

    if (!uom) {
      return {
        success: false,
        message:
          "Select a valid UOM: ml, pc, or gram.",
      };
    }

    // =====================================================
    // PACKAGING SIZE
    // =====================================================

    const packagingSizeAmount =
      normalizePositiveDecimal(
        formData.get(
          "packagingSizeAmount"
        )
      );

    if (
      !packagingSizeAmount
    ) {
      return {
        success: false,
        message:
          "Enter a valid Packaging Size Amount greater than zero with up to 4 decimal places.",
      };
    }

    // =====================================================
    // PACKAGING UOM
    // =====================================================

    const packagingUom =
      normalizePackagingUom(
        formData.get(
          "packagingUom"
        )
      );

    if (!packagingUom) {
      return {
        success: false,
        message:
          "Select a valid Packaging UOM: bottle, box, pack, or can, kilo, or liter.",
      };
    }

    const supabase =
      createAdminClient();

    // =====================================================
    // VERIFY PRODUCT BELONGS TO CURRENT LOCATION
    // =====================================================

    const {
      data:
        existingProduct,
      error:
        lookupError,
    } = await supabase
      .from("products")
      .select(
        `
          id,
          sku,
          location_id,
          uom
        `
      )
      .eq(
        "id",
        productId
      )
      .eq(
        "location_id",
        location.id
      )
      .maybeSingle();

    if (lookupError) {
      console.error(
        "Order Me product update lookup failed:",
        lookupError.message
      );

      return {
        success: false,
        message:
          "Unable to update product. Please try again.",
      };
    }

    if (!existingProduct) {
      return {
        success: false,
        message:
          "Product was not found for the current location.",
      };
    }

    // =====================================================
    // PREVENT DUPLICATE PRODUCT NAME
    // =====================================================

    const duplicateProduct =
      await getDuplicateProductByName(
        supabase,
        location.id,
        productName,
        productId
      );

    if (
      duplicateProduct
    ) {
      return {
        success: false,
        message:
          `"${productName}" already exists in ${location.name}. Duplicate products are not allowed.`,
      };
    }

    // =====================================================
    // VERIFY CATEGORY
    // =====================================================

    const category =
      await getValidCategory(
        supabase,
        location.id,
        categoryId
      );

    if (!category) {
      return {
        success: false,
        message:
          "The selected category is not available for the current location.",
      };
    }

    // =====================================================
    // UPDATE
    // =====================================================
    //
    // sku and location_id are deliberately excluded.
    //
    // This preserves the database identity protections.
    // =====================================================

    const {
      data,
      error,
    } = await supabase
      .from("products")
      .update({
        category_id:
          category.id,

        name:
          productName,

        amount_qty:
          amountQty,

        uom,

        packaging_size_amount:
          packagingSizeAmount,

        packaging_uom:
          packagingUom,
      })
      .eq(
        "id",
        productId
      )
      .eq(
        "location_id",
        location.id
      )
      .select(
        `
          id,
          location_id,
          category_id,
          sku,
          name,
          amount_qty,
          uom,
          packaging_size_amount,
          packaging_uom,
          is_active,
          created_at,
          updated_at
        `
      )
      .single();

    if (error) {
      if (
        isProductNameUniqueViolation(
          error
        )
      ) {
        return {
          success: false,
          message:
            `"${productName}" already exists in ${location.name}. Duplicate products are not allowed.`,
        };
      }

      if (
        isForeignKeyViolation(
          error.code
        )
      ) {
        return {
          success: false,
          message:
            "The selected category is no longer available for this location.",
        };
      }

      if (
        isCheckViolation(
          error.code
        )
      ) {
        return {
          success: false,
          message:
            "One or more product values are outside the allowed range.",
        };
      }

      if (
        error.message
          .toLowerCase()
          .includes(
            "uom"
          )
      ) {
        return {
          success: false,
          message:
            "This product UOM cannot be changed because the product is already used by operational records.",
        };
      }

      console.error(
        "Order Me product update failed:",
        error.message
      );

      return {
        success: false,
        message:
          "Unable to update product. Please try again.",
      };
    }

    const products =
      await attachCategoryNames(
        supabase,
        location.id,
        [
          data as ProductDatabaseRow,
        ]
      );

    const product =
      products[0];

    if (!product) {
      return {
        success: false,
        message:
          "Product was updated but could not be reloaded.",
      };
    }

    revalidateProductPages();

    return {
      success: true,
      message:
        "Product updated successfully.",
      product,
    };
  } catch (error) {
    console.error(
      "Order Me product update failed:",
      error instanceof Error
        ? error.message
        : "Unknown product update error"
    );

    return {
      success: false,
      message:
        "Unable to update product. Please try again.",
    };
  }
}

// =========================================================
// DELETE PRODUCT
// =========================================================

export async function deleteProductAction(
  productId: string
): Promise<ProductActionResult> {
  try {
    const location =
      await requireDatabaseLocation();

    const normalizedId =
      normalizeUuid(
        productId
      );

    if (!normalizedId) {
      return {
        success: false,
        message:
          "Invalid product.",
      };
    }

    const supabase =
      createAdminClient();

    // =====================================================
    // VERIFY LOCATION OWNERSHIP
    // =====================================================

    const {
      data:
        existingProduct,
      error:
        lookupError,
    } = await supabase
      .from("products")
      .select(
        `
          id,
          sku,
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
        "Order Me product delete lookup failed:",
        lookupError.message
      );

      return {
        success: false,
        message:
          "Unable to delete product. Please try again.",
      };
    }

    if (!existingProduct) {
      return {
        success: false,
        message:
          "Product was not found for the current location.",
      };
    }

    // =====================================================
    // DELETE
    // =====================================================

    const {
      error,
    } = await supabase
      .from("products")
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
            "This product cannot be deleted because it is already used by recipes, orders, or other operational records.",
        };
      }

      console.error(
        "Order Me product deletion failed:",
        error.message
      );

      return {
        success: false,
        message:
          "Unable to delete product. Please try again.",
      };
    }

    revalidateProductPages();

    return {
      success: true,
      message:
        `"${existingProduct.name}" (${existingProduct.sku}) deleted successfully.`,
    };
  } catch (error) {
    console.error(
      "Order Me product deletion failed:",
      error instanceof Error
        ? error.message
        : "Unknown product deletion error"
    );

    return {
      success: false,
      message:
        "Unable to delete product. Please try again.",
    };
  }
}