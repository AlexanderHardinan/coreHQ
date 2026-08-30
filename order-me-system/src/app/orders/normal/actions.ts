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

export type NormalOrderStatus =
  | "draft"
  | "submitted"
  | "completed"
  | "cancelled";

export type NormalOrderUom =
  | "ml"
  | "pc"
  | "gram";

export type NormalOrderItemInput = {
  productId: string;
  onHandQty: string;
  requestedQty: string;
};

export type NormalOrderProductOption = {
  id: string;
  sku: string;
  name: string;
  category_id: string;
  category_name: string;
  uom: NormalOrderUom;
  is_active: boolean;
};

export type NormalOrderItemRecord = {
  id: string;
  location_id: string;
  order_id: string;
  product_id: string;

  on_hand_qty: number;
  requested_qty: number;

  uom: NormalOrderUom;

  sku_snapshot: string;
  product_name_snapshot: string;
  category_name_snapshot: string;

  sort_order: number;

  created_at: string;
  updated_at: string;
};

export type NormalOrderRecord = {
  id: string;
  location_id: string;

  order_number: string;
  order_date: string;
  ordered_by: string;

  status: NormalOrderStatus;

  created_at: string;
  updated_at: string;

  items: NormalOrderItemRecord[];
};

export type NormalOrderListRecord = {
  id: string;
  location_id: string;

  order_number: string;
  order_date: string;
  ordered_by: string;

  status: NormalOrderStatus;

  item_count: number;

  created_at: string;
  updated_at: string;
};

export type NormalOrderActionResult = {
  success: boolean;
  message: string;
  order?: NormalOrderRecord;
};

export type NormalOrderListOptions = {
  page?: number;
  pageSize?: number;

  search?: string;

  dateFrom?: string;
  dateTo?: string;

  status?:
    | NormalOrderStatus
    | "all";

  sortBy?:
    | "order_number"
    | "order_date"
    | "ordered_by"
    | "created_at"
    | "updated_at";

  sortDirection?:
    | "asc"
    | "desc";
};

export type NormalOrderListResult = {
  orders: NormalOrderListRecord[];

  total: number;

  page: number;
  pageSize: number;
  totalPages: number;
};

// =========================================================
// DATABASE ROW TYPES
// =========================================================

type NormalOrderDatabaseRow = {
  id: string;
  location_id: string;

  order_number: string;
  order_date: string;
  ordered_by: string;

  status: string;

  created_at: string;
  updated_at: string;
};

type NormalOrderItemDatabaseRow = {
  id: string;
  location_id: string;
  order_id: string;
  product_id: string;

  on_hand_qty:
    | number
    | string;

  requested_qty:
    | number
    | string;

  uom: string;

  sku_snapshot: string;
  product_name_snapshot: string;
  category_name_snapshot: string;

  sort_order: number;

  created_at: string;
  updated_at: string;
};

type ProductDatabaseRow = {
  id: string;
  sku: string;
  name: string;
  category_id: string;
  uom: string;
  is_active: boolean;
};

type CategoryDatabaseRow = {
  id: string;
  name: string;
};

// =========================================================
// CONSTANTS
// =========================================================

const DEFAULT_PAGE =
  1;

const DEFAULT_PAGE_SIZE =
  20;

const MAX_PAGE_SIZE =
  100;

const MAX_SEARCH_LENGTH =
  100;

const MAX_ORDERED_BY_LENGTH =
  200;

const MAX_NUMERIC_SCALED =
  BigInt(
    "999999999999999999"
  );

const ORDER_STATUSES =
  new Set<NormalOrderStatus>([
    "draft",
    "submitted",
    "completed",
    "cancelled",
  ]);

const ORDER_UOMS =
  new Set<NormalOrderUom>([
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
// SAFE NUMBER
// =========================================================

function toSafeNumber(
  value: unknown
): number {
  const parsed =
    typeof value ===
    "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return 0;
  }

  return parsed;
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
// POSTGREST OR SEARCH SAFETY
// =========================================================
//
// PostgREST .or() uses commas and parentheses as grammar.
// Remove those control characters before embedding the
// search text into an OR filter.
//
// This is not authentication/security authorization.
// Authorization remains based on the trusted location UUID.
// =========================================================

function normalizePostgrestSearch(
  value: string
): string {
  return value
    .replace(
      /[(),\\]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

// =========================================================
// ORDERED BY
// =========================================================

function normalizeOrderedBy(
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
      MAX_ORDERED_BY_LENGTH
  ) {
    return null;
  }

  return normalized;
}

// =========================================================
// STATUS
// =========================================================

function normalizeStatus(
  value: unknown,
  fallback:
    NormalOrderStatus =
      "draft"
): NormalOrderStatus {
  if (
    typeof value !==
    "string"
  ) {
    return fallback;
  }

  const normalized =
    value
      .trim()
      .toLowerCase() as NormalOrderStatus;

  if (
    !ORDER_STATUSES.has(
      normalized
    )
  ) {
    return fallback;
  }

  return normalized;
}

// =========================================================
// UOM
// =========================================================

function normalizeUom(
  value: unknown
): NormalOrderUom | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase() as NormalOrderUom;

  if (
    !ORDER_UOMS.has(
      normalized
    )
  ) {
    return null;
  }

  return normalized;
}

// =========================================================
// DATE
// =========================================================

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

  const match =
    normalized.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    return null;
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
    !Number.isInteger(
      year
    ) ||
    year < 2000 ||
    year > 9999
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

// =========================================================
// NON-NEGATIVE DECIMAL
// =========================================================
//
// normal_order_items:
// numeric(18,4)
//
// Unlike Recipe ingredient quantities, zero is valid for:
//
// On Hand Qty
// Order Request Qty
// =========================================================

function normalizeNonNegativeDecimal(
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
    scaledValue <
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
// PAGE
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
    return DEFAULT_PAGE;
  }

  return value;
}

// =========================================================
// PAGE SIZE
// =========================================================

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
// PARSE ORDER ITEMS
// =========================================================

function parseNormalOrderItems(
  value:
    | FormDataEntryValue
    | null
): NormalOrderItemInput[] | null {
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

  const productIds =
    new Set<string>();

  const result:
    NormalOrderItemInput[] =
    [];

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
        onHandQty?: unknown;
        requestedQty?: unknown;
      };

    const productId =
      normalizeUuid(
        typeof candidate.productId ===
          "string"
          ? candidate.productId
          : null
      );

    const onHandQty =
      normalizeNonNegativeDecimal(
        candidate.onHandQty
      );

    const requestedQty =
      normalizeNonNegativeDecimal(
        candidate.requestedQty
      );

    if (
      !productId ||
      onHandQty ===
        null ||
      requestedQty ===
        null
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
      onHandQty,
      requestedQty,
    });
  }

  return result;
}

// =========================================================
// DATABASE ERROR MAPPING
// =========================================================

function mapNormalOrderDatabaseError(
  code:
    | string
    | undefined,
  message:
    | string
    | undefined
): string {
  const normalized =
    (
      message ??
      ""
    ).toLowerCase();

  if (
    code === "23505"
  ) {
    if (
      normalized.includes(
        "order_product"
      ) ||
      normalized.includes(
        "product"
      )
    ) {
      return "The same product cannot appear more than once in a normal order.";
    }

    return "Unable to generate a unique Normal Order record.";
  }

  if (
    normalized.includes(
      "same product"
    ) ||
    normalized.includes(
      "more than once"
    )
  ) {
    return "The same product cannot appear more than once in a normal order.";
  }

  if (
    normalized.includes(
      "inactive products"
    )
  ) {
    return "Inactive products cannot be added to a Normal Order.";
  }

  if (
    normalized.includes(
      "does not belong"
    ) ||
    normalized.includes(
      "does not exist in this location"
    ) ||
    normalized.includes(
      "current location"
    )
  ) {
    return "One or more selected products are not available for the current location.";
  }

  if (
    normalized.includes(
      "ordered by"
    )
  ) {
    return "Enter a valid Ordered By name.";
  }

  if (
    normalized.includes(
      "order date"
    )
  ) {
    return "Enter a valid Order Date.";
  }

  if (
    normalized.includes(
      "status"
    )
  ) {
    return "Select a valid Normal Order status.";
  }

  if (
    normalized.includes(
      "on hand"
    )
  ) {
    return "Enter a valid non-negative On Hand Qty.";
  }

  if (
    normalized.includes(
      "request qty"
    ) ||
    normalized.includes(
      "requested qty"
    )
  ) {
    return "Enter a valid non-negative Order Request Qty.";
  }

  if (
    normalized.includes(
      "at least one product"
    )
  ) {
    return "Add at least one Product to the Normal Order.";
  }

  return "Unable to save Normal Order. Please try again.";
}

// =========================================================
// REVALIDATION
// =========================================================

function revalidateNormalOrderPages() {
  revalidatePath(
    "/dashboard"
  );

  revalidatePath(
    "/orders/normal"
  );
}

// =========================================================
// PRODUCT OPTIONS
// =========================================================

export async function getNormalOrderProductOptions(
  search = ""
): Promise<
  NormalOrderProductOption[]
> {
  const location =
    await requireDatabaseLocation();

  const supabase =
    createAdminClient();

  const normalizedSearch =
    normalizePostgrestSearch(
      normalizeSearch(
        search
      )
    );

  let query =
    supabase
      .from(
        "products"
      )
      .select(
        `
          id,
          sku,
          name,
          category_id,
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
    const pattern =
      `%${normalizedSearch}%`;

    query =
      query.or(
        `name.ilike.${pattern},sku.ilike.${pattern}`
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
    .limit(
      100
    );

  if (error) {
    console.error(
      "Order Me Normal Order product options failed:",
      error.message
    );

    throw new Error(
      "Unable to load Normal Order products."
    );
  }

  const products =
    (
      data ??
      []
    ) as ProductDatabaseRow[];

  const categoryIds =
    Array.from(
      new Set(
        products.map(
          (
            product
          ) =>
            product.category_id
        )
      )
    );

  const categoryMap =
    new Map<
      string,
      string
    >();

  if (
    categoryIds.length >
    0
  ) {
    const {
      data:
        categoryData,
      error:
        categoryError,
    } = await supabase
      .from(
        "categories"
      )
      .select(
        "id, name"
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
        "Order Me Normal Order category lookup failed:",
        categoryError.message
      );

      throw new Error(
        "Unable to load Product categories."
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

  return products.map(
    (
      product
    ) => ({
      id:
        product.id,

      sku:
        product.sku,

      name:
        product.name,

      category_id:
        product.category_id,

      category_name:
        categoryMap.get(
          product.category_id
        ) ??
        "Uncategorized",

      uom:
        normalizeUom(
          product.uom
        ) ??
        "pc",

      is_active:
        product.is_active,
    })
  );
}

// =========================================================
// FIND ORDER IDS BY ITEM SEARCH
// =========================================================
//
// Allows Order History search by:
//
// SKU snapshot
// Product snapshot
// Category snapshot
//
// Snapshot search means historical orders remain searchable
// even when the current Product master record is renamed.
// =========================================================

async function findOrderIdsByItemSearch(
  locationId: string,
  search: string
): Promise<string[]> {
  const normalizedSearch =
    normalizePostgrestSearch(
      search
    );

  if (
    !normalizedSearch
  ) {
    return [];
  }

  const supabase =
    createAdminClient();

  const pattern =
    `%${normalizedSearch}%`;

  const result =
    new Set<string>();

  const batchSize =
    1000;

  let from =
    0;

  while (true) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "normal_order_items"
      )
      .select(
        "id, order_id"
      )
      .eq(
        "location_id",
        locationId
      )
      .or(
        [
          `sku_snapshot.ilike.${pattern}`,
          `product_name_snapshot.ilike.${pattern}`,
          `category_name_snapshot.ilike.${pattern}`,
        ].join(",")
      )
      .order(
        "id",
        {
          ascending: true,
        }
      )
      .range(
        from,
        from +
          batchSize -
          1
      );

    if (error) {
      console.error(
        "Order Me Normal Order item search failed:",
        error.message
      );

      throw new Error(
        "Unable to search Normal Order items."
      );
    }

    const rows =
      data ??
      [];

    for (
      const row of
      rows
    ) {
      result.add(
        String(
          row.order_id
        )
      );
    }

    if (
      rows.length <
      batchSize
    ) {
      break;
    }

    from +=
      batchSize;
  }

  return Array.from(
    result
  );
}

// =========================================================
// LIST NORMAL ORDERS
// =========================================================

export async function getNormalOrders(
  options: NormalOrderListOptions = {}
): Promise<NormalOrderListResult> {
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

  let dateFrom =
    normalizeDate(
      options.dateFrom
    );

  let dateTo =
    normalizeDate(
      options.dateTo
    );

  if (
    dateFrom &&
    dateTo &&
    dateFrom >
      dateTo
  ) {
    [
      dateFrom,
      dateTo,
    ] = [
      dateTo,
      dateFrom,
    ];
  }

  const status =
    options.status &&
    options.status !==
      "all" &&
    ORDER_STATUSES.has(
      options.status
    )
      ? options.status
      : null;

  const allowedSortFields =
    new Set<
      NonNullable<
        NormalOrderListOptions["sortBy"]
      >
    >([
      "order_number",
      "order_date",
      "ordered_by",
      "created_at",
      "updated_at",
    ]);

  const sortBy =
    options.sortBy &&
    allowedSortFields.has(
      options.sortBy
    )
      ? options.sortBy
      : "order_date";

  const sortDirection =
    options.sortDirection ===
    "asc"
      ? "asc"
      : "desc";

  const from =
    (
      page - 1
    ) *
    pageSize;

  const to =
    from +
    pageSize -
    1;

  const matchingItemOrderIds =
    search
      ? await findOrderIdsByItemSearch(
          location.id,
          search
        )
      : [];

  let query =
    supabase
      .from(
        "normal_orders"
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

  if (
    status
  ) {
    query =
      query.eq(
        "status",
        status
      );
  }

  if (search) {
    const safeSearch =
      normalizePostgrestSearch(
        search
      );

    const pattern =
      `%${safeSearch}%`;

    const searchFilters = [
      `order_number.ilike.${pattern}`,
      `ordered_by.ilike.${pattern}`,
    ];

    if (
      matchingItemOrderIds.length >
      0
    ) {
      searchFilters.push(
        `id.in.(${matchingItemOrderIds.join(
          ","
        )})`
      );
    }

    query =
      query.or(
        searchFilters.join(
          ","
        )
      );
  }

  let orderedQuery =
    query.order(
      sortBy,
      {
        ascending:
          sortDirection ===
          "asc",
      }
    );

  if (
    sortBy !==
    "created_at"
  ) {
    orderedQuery =
      orderedQuery.order(
        "created_at",
        {
          ascending:
            false,
        }
      );
  }

  const {
    data,
    error,
    count,
  } = await orderedQuery.range(
    from,
    to
  );

  if (error) {
    console.error(
      "Order Me Normal Order list failed:",
      error.message
    );

    throw new Error(
      "Unable to load Normal Orders."
    );
  }

  const orderRows =
    (
      data ??
      []
    ) as NormalOrderDatabaseRow[];

  const orderIds =
    orderRows.map(
      (
        order
      ) =>
        order.id
    );

  const itemCountMap =
    new Map<
      string,
      number
    >();

  if (
    orderIds.length >
    0
  ) {
    const {
      data:
        itemData,
      error:
        itemError,
    } = await supabase
      .from(
        "normal_order_items"
      )
      .select(
        "order_id"
      )
      .eq(
        "location_id",
        location.id
      )
      .in(
        "order_id",
        orderIds
      );

    if (itemError) {
      console.error(
        "Order Me Normal Order item counts failed:",
        itemError.message
      );

      throw new Error(
        "Unable to load Normal Order item counts."
      );
    }

    for (
      const item of
      itemData ??
      []
    ) {
      const orderId =
        String(
          item.order_id
        );

      itemCountMap.set(
        orderId,
        (
          itemCountMap.get(
            orderId
          ) ??
          0
        ) +
          1
      );
    }
  }

  const orders:
    NormalOrderListRecord[] =
    orderRows.map(
      (
        order
      ) => ({
        id:
          order.id,

        location_id:
          order.location_id,

        order_number:
          order.order_number,

        order_date:
          order.order_date,

        ordered_by:
          order.ordered_by,

        status:
          normalizeStatus(
            order.status
          ),

        item_count:
          itemCountMap.get(
            order.id
          ) ??
          0,

        created_at:
          order.created_at,

        updated_at:
          order.updated_at,
      })
    );

  const total =
    count ??
    0;

  const totalPages =
    total === 0
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
// GET SINGLE NORMAL ORDER
// =========================================================

export async function getNormalOrderById(
  orderId: string
): Promise<
  NormalOrderRecord | null
> {
  const location =
    await requireDatabaseLocation();

  const normalizedId =
    normalizeUuid(
      orderId
    );

  if (
    !normalizedId
  ) {
    return null;
  }

  const supabase =
    createAdminClient();

  const {
    data:
      orderData,
    error:
      orderError,
  } = await supabase
    .from(
      "normal_orders"
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
      normalizedId
    )
    .eq(
      "location_id",
      location.id
    )
    .maybeSingle();

  if (orderError) {
    console.error(
      "Order Me Normal Order lookup failed:",
      orderError.message
    );

    throw new Error(
      "Unable to load Normal Order."
    );
  }

  if (!orderData) {
    return null;
  }

  const order =
    orderData as NormalOrderDatabaseRow;

  const {
    data:
      itemData,
    error:
      itemError,
  } = await supabase
    .from(
      "normal_order_items"
    )
    .select(
      `
        id,
        location_id,
        order_id,
        product_id,
        on_hand_qty,
        requested_qty,
        uom,
        sku_snapshot,
        product_name_snapshot,
        category_name_snapshot,
        sort_order,
        created_at,
        updated_at
      `
    )
    .eq(
      "order_id",
      order.id
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
    );

  if (itemError) {
    console.error(
      "Order Me Normal Order item lookup failed:",
      itemError.message
    );

    throw new Error(
      "Unable to load Normal Order items."
    );
  }

  const items:
    NormalOrderItemRecord[] =
    (
      (
        itemData ??
        []
      ) as NormalOrderItemDatabaseRow[]
    ).map(
      (
        item
      ) => ({
        id:
          item.id,

        location_id:
          item.location_id,

        order_id:
          item.order_id,

        product_id:
          item.product_id,

        on_hand_qty:
          toSafeNumber(
            item.on_hand_qty
          ),

        requested_qty:
          toSafeNumber(
            item.requested_qty
          ),

        uom:
          normalizeUom(
            item.uom
          ) ??
          "pc",

        sku_snapshot:
          item.sku_snapshot,

        product_name_snapshot:
          item.product_name_snapshot,

        category_name_snapshot:
          item.category_name_snapshot,

        sort_order:
          item.sort_order,

        created_at:
          item.created_at,

        updated_at:
          item.updated_at,
      })
    );

  return {
    id:
      order.id,

    location_id:
      order.location_id,

    order_number:
      order.order_number,

    order_date:
      order.order_date,

    ordered_by:
      order.ordered_by,

    status:
      normalizeStatus(
        order.status
      ),

    created_at:
      order.created_at,

    updated_at:
      order.updated_at,

    items,
  };
}

// =========================================================
// VALIDATE PRODUCTS
// =========================================================

async function validateNormalOrderProducts(
  locationId: string,
  items: NormalOrderItemInput[]
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
      (
        item
      ) =>
        item.productId
    );

  const {
    data,
    error,
  } = await supabase
    .from(
      "products"
    )
    .select(
      `
        id,
        sku,
        name,
        category_id,
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
      "Order Me Normal Order Product validation failed:",
      error.message
    );

    return {
      success:
        false,

      message:
        "Unable to validate Normal Order products.",
    };
  }

  const products =
    (
      data ??
      []
    ) as ProductDatabaseRow[];

  if (
    products.length !==
    productIds.length
  ) {
    return {
      success:
        false,

      message:
        "One or more selected Products are not available for the current location.",
    };
  }

  const productMap =
    new Map<
      string,
      ProductDatabaseRow
    >();

  for (
    const product of
    products
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
        success:
          false,

        message:
          "One or more selected Products are not available for the current location.",
      };
    }

    if (
      !product.is_active
    ) {
      return {
        success:
          false,

        message:
          `"${product.name}" is inactive and cannot be added to a Normal Order.`,
      };
    }

    if (
      !normalizeUom(
        product.uom
      )
    ) {
      return {
        success:
          false,

        message:
          `${product.name} has an invalid Product UOM.`,
      };
    }
  }

  return {
    success:
      true,
  };
}

// =========================================================
// CREATE NORMAL ORDER
// =========================================================

export async function createNormalOrderAction(
  _previousState:
    NormalOrderActionResult | null,
  formData: FormData
): Promise<NormalOrderActionResult> {
  try {
    const location =
      await requireDatabaseLocation();

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
          "Enter a valid Order Date.",
      };
    }

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

    const status =
      normalizeStatus(
        formData.get(
          "status"
        ),
        "draft"
      );

    const items =
      parseNormalOrderItems(
        formData.get(
          "items"
        )
      );

    if (
      !items
    ) {
      return {
        success:
          false,

        message:
          "Add at least one valid Product. Each row requires Product, On Hand Qty, and Order Request Qty.",
      };
    }

    const validation =
      await validateNormalOrderProducts(
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
        (
          item
        ) => ({
          product_id:
            item.productId,

          on_hand_qty:
            item.onHandQty,

          requested_qty:
            item.requestedQty,
        })
      );

    const {
      data:
        savedOrderId,
      error,
    } = await supabase.rpc(
      "save_normal_order",
      {
        p_location_id:
          location.id,

        p_order_id:
          null,

        p_order_date:
          orderDate,

        p_ordered_by:
          orderedBy,

        p_status:
          status,

        p_items:
          rpcItems,
      }
    );

    if (error) {
      console.error(
        "Order Me Normal Order creation failed:",
        error.message
      );

      return {
        success:
          false,

        message:
          mapNormalOrderDatabaseError(
            error.code,
            error.message
          ),
      };
    }

    const normalizedSavedId =
      typeof savedOrderId ===
        "string"
        ? normalizeUuid(
            savedOrderId
          )
        : null;

    if (
      !normalizedSavedId
    ) {
      return {
        success:
          false,

        message:
          "Normal Order was saved but the saved record could not be identified.",
      };
    }

    revalidateNormalOrderPages();

    const order =
      await getNormalOrderById(
        normalizedSavedId
      );

    if (
      !order
    ) {
      return {
        success:
          false,

        message:
          "Normal Order was saved but could not be reloaded.",
      };
    }

    return {
      success:
        true,

      message:
        `Normal Order ${order.order_number} saved successfully.`,

      order,
    };
  } catch (error) {
    console.error(
      "Order Me Normal Order creation failed:",
      error instanceof Error
        ? error.message
        : "Unknown Normal Order creation error"
    );

    return {
      success:
        false,

      message:
        "Unable to save Normal Order. Please try again.",
    };
  }
}

// =========================================================
// UPDATE NORMAL ORDER
// =========================================================

export async function updateNormalOrderAction(
  _previousState:
    NormalOrderActionResult | null,
  formData: FormData
): Promise<NormalOrderActionResult> {
  try {
    const location =
      await requireDatabaseLocation();

    const orderId =
      normalizeUuid(
        formData.get(
          "orderId"
        )
      );

    if (
      !orderId
    ) {
      return {
        success:
          false,

        message:
          "Invalid Normal Order.",
      };
    }

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
          "Enter a valid Order Date.",
      };
    }

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

    const rawStatus =
      formData.get(
        "status"
      );

    if (
      typeof rawStatus !==
        "string" ||
      !ORDER_STATUSES.has(
        rawStatus
          .trim()
          .toLowerCase() as NormalOrderStatus
      )
    ) {
      return {
        success:
          false,

        message:
          "Select a valid Normal Order status.",
      };
    }

    const status =
      normalizeStatus(
        rawStatus
      );

    const items =
      parseNormalOrderItems(
        formData.get(
          "items"
        )
      );

    if (
      !items
    ) {
      return {
        success:
          false,

        message:
          "Add at least one valid Product. Each row requires Product, On Hand Qty, and Order Request Qty.",
      };
    }

    const supabase =
      createAdminClient();

    const {
      data:
        existingOrder,
      error:
        lookupError,
    } = await supabase
      .from(
        "normal_orders"
      )
      .select(
        `
          id,
          order_number,
          location_id
        `
      )
      .eq(
        "id",
        orderId
      )
      .eq(
        "location_id",
        location.id
      )
      .maybeSingle();

    if (
      lookupError
    ) {
      console.error(
        "Order Me Normal Order update lookup failed:",
        lookupError.message
      );

      return {
        success:
          false,

        message:
          "Unable to update Normal Order. Please try again.",
      };
    }

    if (
      !existingOrder
    ) {
      return {
        success:
          false,

        message:
          "Normal Order was not found for the current location.",
      };
    }

    const validation =
      await validateNormalOrderProducts(
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
        (
          item
        ) => ({
          product_id:
            item.productId,

          on_hand_qty:
            item.onHandQty,

          requested_qty:
            item.requestedQty,
        })
      );

    const {
      data:
        savedOrderId,
      error,
    } = await supabase.rpc(
      "save_normal_order",
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

        p_items:
          rpcItems,
      }
    );

    if (error) {
      console.error(
        "Order Me Normal Order update failed:",
        error.message
      );

      return {
        success:
          false,

        message:
          mapNormalOrderDatabaseError(
            error.code,
            error.message
          ),
      };
    }

    const resolvedOrderId =
      typeof savedOrderId ===
        "string" &&
      normalizeUuid(
        savedOrderId
      )
        ? savedOrderId
        : orderId;

    revalidateNormalOrderPages();

    const order =
      await getNormalOrderById(
        resolvedOrderId
      );

    if (
      !order
    ) {
      return {
        success:
          false,

        message:
          "Normal Order was updated but could not be reloaded.",
      };
    }

    return {
      success:
        true,

      message:
        `Normal Order ${order.order_number} updated successfully.`,

      order,
    };
  } catch (error) {
    console.error(
      "Order Me Normal Order update failed:",
      error instanceof Error
        ? error.message
        : "Unknown Normal Order update error"
    );

    return {
      success:
        false,

      message:
        "Unable to update Normal Order. Please try again.",
    };
  }
}

// =========================================================
// DELETE NORMAL ORDER
// =========================================================

export async function deleteNormalOrderAction(
  orderId: string
): Promise<NormalOrderActionResult> {
  try {
    const location =
      await requireDatabaseLocation();

    const normalizedId =
      normalizeUuid(
        orderId
      );

    if (
      !normalizedId
    ) {
      return {
        success:
          false,

        message:
          "Invalid Normal Order.",
      };
    }

    const supabase =
      createAdminClient();

    const {
      data:
        existingOrder,
      error:
        lookupError,
    } = await supabase
      .from(
        "normal_orders"
      )
      .select(
        `
          id,
          order_number,
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

    if (
      lookupError
    ) {
      console.error(
        "Order Me Normal Order delete lookup failed:",
        lookupError.message
      );

      return {
        success:
          false,

        message:
          "Unable to delete Normal Order. Please try again.",
      };
    }

    if (
      !existingOrder
    ) {
      return {
        success:
          false,

        message:
          "Normal Order was not found for the current location.",
      };
    }

    const {
      error,
    } = await supabase
      .from(
        "normal_orders"
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
        error.code ===
        "23503"
      ) {
        return {
          success:
            false,

          message:
            "This Normal Order cannot be deleted because it is referenced by another operational record.",
        };
      }

      console.error(
        "Order Me Normal Order deletion failed:",
        error.message
      );

      return {
        success:
          false,

        message:
          "Unable to delete Normal Order. Please try again.",
      };
    }

    revalidateNormalOrderPages();

    return {
      success:
        true,

      message:
        `Normal Order ${existingOrder.order_number} deleted successfully.`,
    };
  } catch (error) {
    console.error(
      "Order Me Normal Order deletion failed:",
      error instanceof Error
        ? error.message
        : "Unknown Normal Order deletion error"
    );

    return {
      success:
        false,

      message:
        "Unable to delete Normal Order. Please try again.",
    };
  }
}