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

export type WasteActiveReason =
  | "spoilage"
  | "expired"
  | "preparation_waste"
  | "excessive_trimming"
  | "overproduction"
  | "cooking_error"
  | "wrong_order"
  | "damage"
  | "plate_waste"
  | "staff_meal";

export type WasteLegacyReason =
  | "spoiled"
  | "bad_quality"
  | "guest_complaint";

export type WasteReason =
  | WasteActiveReason
  | WasteLegacyReason;

export type WasteUom =
  | "ml"
  | "pc"
  | "gram";

export type WasteProductOption = {
  id: string;
  sku: string;
  name: string;
  category_id: string;
  category_name: string;
  uom: WasteUom;
  is_active: boolean;
};

export type WasteRecord = {
  id: string;

  location_id: string;

  waste_date: string;

  product_id: string;

  qty: number;

  sku_snapshot: string;
  product_name_snapshot: string;
  category_name_snapshot: string;
  uom_snapshot: WasteUom;

  reason: WasteReason;

  created_at: string;
  updated_at: string;
};

export type WasteActionResult = {
  success: boolean;
  message: string;

  waste?: WasteRecord;
};

export type WasteDeleteActionResult = {
  success: boolean;
  message: string;
};

export type WasteListOptions = {
  page?: number;

  pageSize?: number;

  search?: string;

  reason?:
    | WasteReason
    | "all";

  dateFrom?: string;

  dateTo?: string;

  sortBy?:
    | "waste_date"
    | "product_name_snapshot"
    | "qty"
    | "reason"
    | "created_at"
    | "updated_at";

  sortDirection?:
    | "asc"
    | "desc";
};

export type WasteListResult = {
  wasteEntries: WasteRecord[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;
};

export type WastePerformanceRecord = {
  waste_date: string;

  uom: WasteUom;

  total_qty: number;

  entry_count: number;
};

export type WastePerformanceOptions = {
  dateFrom?: string;
  dateTo?: string;
};

export type WasteReportOptions = {
  search?: string;

  reason?:
    | WasteReason
    | "all";

  dateFrom?: string;

  dateTo?: string;
};

// =========================================================
// DATABASE ROW TYPES
// =========================================================

type WasteDatabaseRow = {
  id: string;

  location_id: string;

  waste_date: string;

  product_id: string;

  qty:
    | number
    | string;

  sku_snapshot: string;

  product_name_snapshot: string;

  category_name_snapshot: string;

  uom_snapshot: string;

  reason: string;

  created_at: string;
  updated_at: string;
};

type WastePerformanceDatabaseRow = {
  waste_date: string;

  uom: string;

  total_qty:
    | number
    | string;

  entry_count:
    | number
    | string;
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

const REPORT_BATCH_SIZE =
  1000;

const MAX_NUMERIC_SCALED =
  BigInt(
    "999999999999999999"
  );

const ACTIVE_WASTE_REASONS =
  new Set<WasteActiveReason>([
    "spoilage",
    "expired",
    "preparation_waste",
    "excessive_trimming",
    "overproduction",
    "cooking_error",
    "wrong_order",
    "damage",
    "plate_waste",
    "staff_meal",
  ]);

const LEGACY_WASTE_REASONS =
  new Set<WasteLegacyReason>([
    "spoiled",
    "bad_quality",
    "guest_complaint",
  ]);

const WASTE_UOMS =
  new Set<WasteUom>([
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
// POSTGREST SEARCH SAFETY
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
// DATE RANGE
// =========================================================

function normalizeDateRange(
  dateFromValue:
    | string
    | undefined,
  dateToValue:
    | string
    | undefined
): {
  dateFrom: string | null;
  dateTo: string | null;
} {
  let dateFrom =
    normalizeDate(
      dateFromValue
    );

  let dateTo =
    normalizeDate(
      dateToValue
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

  return {
    dateFrom,
    dateTo,
  };
}

// =========================================================
// REASON
// =========================================================

function normalizeWasteReasonToken(
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
      .toLowerCase()
      .replace(
        /[\s-]+/g,
        "_"
      );

  return normalized ||
    null;
}

function normalizeActiveWasteReason(
  value: unknown
): WasteActiveReason | null {
  const normalized =
    normalizeWasteReasonToken(
      value
    );

  if (
    !normalized
  ) {
    return null;
  }

  if (
    !ACTIVE_WASTE_REASONS.has(
      normalized as WasteActiveReason
    )
  ) {
    return null;
  }

  return normalized as WasteActiveReason;
}

function normalizeStoredWasteReason(
  value: unknown
): WasteReason | null {
  const normalized =
    normalizeWasteReasonToken(
      value
    );

  if (
    !normalized
  ) {
    return null;
  }

  if (
    ACTIVE_WASTE_REASONS.has(
      normalized as WasteActiveReason
    )
  ) {
    return normalized as WasteActiveReason;
  }

  if (
    LEGACY_WASTE_REASONS.has(
      normalized as WasteLegacyReason
    )
  ) {
    return normalized as WasteLegacyReason;
  }

  return null;
}

// =========================================================
// UOM
// =========================================================

function normalizeWasteUom(
  value: unknown
): WasteUom | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase() as WasteUom;

  if (
    !WASTE_UOMS.has(
      normalized
    )
  ) {
    return null;
  }

  return normalized;
}

// =========================================================
// POSITIVE DECIMAL
// =========================================================
//
// waste_entries.qty:
//
// numeric(18,4)
//
// Waste Qty must be greater than zero.
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
    match[2] ??
    "";

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
      BigInt(
        10000
      ) +
    BigInt(
      paddedFraction ||
        "0"
    );

  if (
    scaledValue <=
      BigInt(
        0
      ) ||
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
    value <
      1
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
    value <
      1
  ) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(
    value,
    MAX_PAGE_SIZE
  );
}

// =========================================================
// MAP DATABASE ROW
// =========================================================

function mapWasteRow(
  row: WasteDatabaseRow
): WasteRecord {
  const reason =
    normalizeStoredWasteReason(
      row.reason
    );

  if (
    !reason
  ) {
    throw new Error(
      "Waste entry contains an unsupported Waste reason."
    );
  }

  return {
    id:
      row.id,

    location_id:
      row.location_id,

    waste_date:
      row.waste_date,

    product_id:
      row.product_id,

    qty:
      toSafeNumber(
        row.qty
      ),

    sku_snapshot:
      row.sku_snapshot,

    product_name_snapshot:
      row.product_name_snapshot,

    category_name_snapshot:
      row.category_name_snapshot,

    uom_snapshot:
      normalizeWasteUom(
        row.uom_snapshot
      ) ??
      "pc",

    reason,

    created_at:
      row.created_at,

    updated_at:
      row.updated_at,
  };
}

// =========================================================
// DATABASE ERROR MAPPING
// =========================================================

function mapWasteDatabaseError(
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
    normalized.includes(
      "inactive products"
    ) ||
    normalized.includes(
      "inactive product"
    )
  ) {
    return "Inactive Products cannot be added to Waste Data.";
  }

  if (
    normalized.includes(
      "does not exist"
    ) ||
    normalized.includes(
      "current location"
    ) ||
    normalized.includes(
      "operational location"
    )
  ) {
    return "The selected Product is not available for the current location.";
  }

  if (
    normalized.includes(
      "waste qty"
    ) ||
    normalized.includes(
      "quantity"
    )
  ) {
    return "Enter a valid Waste Qty greater than zero.";
  }

  if (
    normalized.includes(
      "waste date"
    )
  ) {
    return "Enter a valid Waste Date.";
  }

  if (
    normalized.includes(
      "waste reason"
    ) ||
    normalized.includes(
      "reason"
    )
  ) {
    return "Select a valid Waste reason.";
  }

  if (
    normalized.includes(
      "waste entry was not found"
    )
  ) {
    return "Waste entry was not found for the current location.";
  }

  if (
    normalized.includes(
      "snapshot"
    )
  ) {
    return "Waste Product information is system-controlled and cannot be changed manually.";
  }

  return "Unable to save Waste Data. Please try again.";
}

// =========================================================
// REVALIDATION
// =========================================================

function revalidateWastePages() {
  revalidatePath(
    "/dashboard"
  );

  revalidatePath(
    "/waste"
  );
}

// =========================================================
// PRODUCT OPTIONS
// =========================================================
//
// Searchable Product selector.
//
// Only active Products belonging to the trusted current
// location are returned.
//
// Product ID remains authoritative.
//
// SKU / Product / Category / UOM are display data.
// =========================================================

export async function getWasteProductOptions(
  search = ""
): Promise<
  WasteProductOption[]
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
        [
          `name.ilike.${pattern}`,
          `sku.ilike.${pattern}`,
        ].join(
          ","
        )
      );
  }

  const {
    data,
    error,
  } = await query
    .order(
      "name",
      {
        ascending:
          true,
      }
    )
    .limit(
      100
    );

  if (error) {
    console.error(
      "Order Me Waste Product search failed:",
      error.message
    );

    throw new Error(
      "Unable to load Waste Products."
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
        `
          id,
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
        "Order Me Waste Product category lookup failed:",
        categoryError.message
      );

      throw new Error(
        "Unable to load Waste Product categories."
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

  return products
    .map(
      (
        product
      ): WasteProductOption | null => {
        const uom =
          normalizeWasteUom(
            product.uom
          );

        if (!uom) {
          return null;
        }

        return {
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

          uom,

          is_active:
            product.is_active,
        };
      }
    )
    .filter(
      (
        product
      ): product is WasteProductOption =>
        product !==
        null
    );
}

// =========================================================
// LIST WASTE ENTRIES
// =========================================================

export async function getWasteEntries(
  options:
    WasteListOptions = {}
): Promise<
  WasteListResult
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
    normalizePostgrestSearch(
      normalizeSearch(
        options.search
      )
    );

  const {
    dateFrom,
    dateTo,
  } =
    normalizeDateRange(
      options.dateFrom,
      options.dateTo
    );

  const reason =
    options.reason &&
    options.reason !==
      "all"
      ? normalizeStoredWasteReason(
          options.reason
        )
      : null;

  const allowedSortFields =
    new Set<
      NonNullable<
        WasteListOptions[
          "sortBy"
        ]
      >
    >([
      "waste_date",
      "product_name_snapshot",
      "qty",
      "reason",
      "created_at",
      "updated_at",
    ]);

  const sortBy =
    options.sortBy &&
    allowedSortFields.has(
      options.sortBy
    )
      ? options.sortBy
      : "waste_date";

  const sortDirection =
    options.sortDirection ===
    "asc"
      ? "asc"
      : "desc";

  const from =
    (
      page -
      1
    ) *
    pageSize;

  const to =
    from +
    pageSize -
    1;

  let query =
    supabase
      .from(
        "waste_entries"
      )
      .select(
        `
          id,
          location_id,
          waste_date,
          product_id,
          qty,
          sku_snapshot,
          product_name_snapshot,
          category_name_snapshot,
          uom_snapshot,
          reason,
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
        "waste_date",
        dateFrom
      );
  }

  if (
    dateTo
  ) {
    query =
      query.lte(
        "waste_date",
        dateTo
      );
  }

  if (
    reason
  ) {
    query =
      query.eq(
        "reason",
        reason
      );
  }

  if (
    search
  ) {
    const pattern =
      `%${search}%`;

    query =
      query.or(
        [
          `sku_snapshot.ilike.${pattern}`,
          `product_name_snapshot.ilike.${pattern}`,
          `category_name_snapshot.ilike.${pattern}`,
        ].join(
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
  } =
    await orderedQuery.range(
      from,
      to
    );

  if (error) {
    console.error(
      "Order Me Waste list failed:",
      error.message
    );

    throw new Error(
      "Unable to load Waste Data."
    );
  }

  const wasteEntries =
    (
      (
        data ??
        []
      ) as WasteDatabaseRow[]
    ).map(
      mapWasteRow
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
    wasteEntries,

    total,

    page,

    pageSize,

    totalPages,
  };
}

// =========================================================
// GET SINGLE WASTE ENTRY
// =========================================================

export async function getWasteEntryById(
  wasteId: string
): Promise<
  WasteRecord | null
> {
  const location =
    await requireDatabaseLocation();

  const normalizedId =
    normalizeUuid(
      wasteId
    );

  if (
    !normalizedId
  ) {
    return null;
  }

  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "waste_entries"
    )
    .select(
      `
        id,
        location_id,
        waste_date,
        product_id,
        qty,
        sku_snapshot,
        product_name_snapshot,
        category_name_snapshot,
        uom_snapshot,
        reason,
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
      "Order Me Waste lookup failed:",
      error.message
    );

    throw new Error(
      "Unable to load Waste entry."
    );
  }

  if (!data) {
    return null;
  }

  return mapWasteRow(
    data as WasteDatabaseRow
  );
}

// =========================================================
// WASTE PERFORMANCE
// =========================================================
//
// Database aggregation remains separated by UOM.
//
// ml + gram + pc are never added together.
// =========================================================

export async function getWastePerformance(
  options:
    WastePerformanceOptions = {}
): Promise<
  WastePerformanceRecord[]
> {
  const location =
    await requireDatabaseLocation();

  const supabase =
    createAdminClient();

  const {
    dateFrom,
    dateTo,
  } =
    normalizeDateRange(
      options.dateFrom,
      options.dateTo
    );

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_waste_performance",
    {
      p_location_id:
        location.id,

      p_date_from:
        dateFrom,

      p_date_to:
        dateTo,
    }
  );

  if (error) {
    console.error(
      "Order Me Waste Performance failed:",
      error.message
    );

    throw new Error(
      "Unable to load Waste Performance Data."
    );
  }

  return (
    (
      data ??
      []
    ) as WastePerformanceDatabaseRow[]
  )
    .map(
      (
        row
      ): WastePerformanceRecord | null => {
        const uom =
          normalizeWasteUom(
            row.uom
          );

        if (!uom) {
          return null;
        }

        return {
          waste_date:
            row.waste_date,

          uom,

          total_qty:
            toSafeNumber(
              row.total_qty
            ),

          entry_count:
            Math.max(
              0,
              Math.trunc(
                toSafeNumber(
                  row.entry_count
                )
              )
            ),
        };
      }
    )
    .filter(
      (
        row
      ): row is WastePerformanceRecord =>
        row !==
        null
    );
}

// =========================================================
// WASTE REPORT ROWS
// =========================================================
//
// Used by PDF export.
//
// The query reads in server-side batches so the report is
// not limited by a single 1,000-row PostgREST response.
//
// Search and date/reason filters match the Waste page.
// =========================================================

export async function getWasteReportRows(
  options:
    WasteReportOptions = {}
): Promise<
  WasteRecord[]
> {
  const location =
    await requireDatabaseLocation();

  const supabase =
    createAdminClient();

  const search =
    normalizePostgrestSearch(
      normalizeSearch(
        options.search
      )
    );

  const {
    dateFrom,
    dateTo,
  } =
    normalizeDateRange(
      options.dateFrom,
      options.dateTo
    );

  const reason =
    options.reason &&
    options.reason !==
      "all"
      ? normalizeStoredWasteReason(
          options.reason
        )
      : null;

  const results:
    WasteRecord[] =
    [];

  let from =
    0;

  while (true) {
    let query =
      supabase
        .from(
          "waste_entries"
        )
        .select(
          `
            id,
            location_id,
            waste_date,
            product_id,
            qty,
            sku_snapshot,
            product_name_snapshot,
            category_name_snapshot,
            uom_snapshot,
            reason,
            created_at,
            updated_at
          `
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
          "waste_date",
          dateFrom
        );
    }

    if (
      dateTo
    ) {
      query =
        query.lte(
          "waste_date",
          dateTo
        );
    }

    if (
      reason
    ) {
      query =
        query.eq(
          "reason",
          reason
        );
    }

    if (
      search
    ) {
      const pattern =
        `%${search}%`;

      query =
        query.or(
          [
            `sku_snapshot.ilike.${pattern}`,
            `product_name_snapshot.ilike.${pattern}`,
            `category_name_snapshot.ilike.${pattern}`,
          ].join(
            ","
          )
        );
    }

    const {
      data,
      error,
    } = await query
      .order(
        "waste_date",
        {
          ascending:
            true,
        }
      )
      .order(
        "created_at",
        {
          ascending:
            true,
        }
      )
      .range(
        from,
        from +
          REPORT_BATCH_SIZE -
          1
      );

    if (error) {
      console.error(
        "Order Me Waste Report query failed:",
        error.message
      );

      throw new Error(
        "Unable to load Waste Report Data."
      );
    }

    const rows =
      (
        data ??
        []
      ) as WasteDatabaseRow[];

    for (
      const row of
      rows
    ) {
      results.push(
        mapWasteRow(
          row
        )
      );
    }

    if (
      rows.length <
      REPORT_BATCH_SIZE
    ) {
      break;
    }

    from +=
      REPORT_BATCH_SIZE;
  }

  return results;
}

// =========================================================
// CREATE WASTE ENTRY
// =========================================================

export async function createWasteEntryAction(
  _previousState:
    WasteActionResult | null,
  formData: FormData
): Promise<
  WasteActionResult
> {
  try {
    const location =
      await requireDatabaseLocation();

    const wasteDate =
      normalizeDate(
        formData.get(
          "wasteDate"
        )
      );

    if (
      !wasteDate
    ) {
      return {
        success:
          false,

        message:
          "Enter a valid Waste Date.",
      };
    }

    const productId =
      normalizeUuid(
        formData.get(
          "productId"
        )
      );

    if (
      !productId
    ) {
      return {
        success:
          false,

        message:
          "Select a valid Product.",
      };
    }

    const qty =
      normalizePositiveDecimal(
        formData.get(
          "qty"
        )
      );

    if (
      !qty
    ) {
      return {
        success:
          false,

        message:
          "Enter a valid Waste Qty greater than zero with up to 4 decimal places.",
      };
    }

    const reason =
      normalizeActiveWasteReason(
        formData.get(
          "reason"
        )
      );

    if (
      !reason
    ) {
      return {
        success:
          false,

        message:
          "Select a valid Waste reason.",
      };
    }

    const supabase =
      createAdminClient();

    const {
      data:
        savedWasteId,
      error,
    } = await supabase.rpc(
      "save_waste_entry",
      {
        p_location_id:
          location.id,

        p_waste_id:
          null,

        p_waste_date:
          wasteDate,

        p_product_id:
          productId,

        p_qty:
          qty,

        p_reason:
          reason,
      }
    );

    if (error) {
      console.error(
        "Order Me Waste creation failed:",
        error.message
      );

      return {
        success:
          false,

        message:
          mapWasteDatabaseError(
            error.message
          ),
      };
    }

    const normalizedSavedId =
      typeof savedWasteId ===
        "string"
        ? normalizeUuid(
            savedWasteId
          )
        : null;

    if (
      !normalizedSavedId
    ) {
      return {
        success:
          false,

        message:
          "Waste entry was saved but the saved record could not be identified.",
      };
    }

    revalidateWastePages();

    const waste =
      await getWasteEntryById(
        normalizedSavedId
      );

    if (
      !waste
    ) {
      return {
        success:
          false,

        message:
          "Waste entry was saved but could not be reloaded.",
      };
    }

    return {
      success:
        true,

      message:
        "Waste entry saved successfully.",

      waste,
    };
  } catch (error) {
    console.error(
      "Order Me Waste creation failed:",
      error instanceof Error
        ? error.message
        : "Unknown Waste creation error"
    );

    return {
      success:
        false,

      message:
        "Unable to save Waste Data. Please try again.",
    };
  }
}

// =========================================================
// UPDATE WASTE ENTRY
// =========================================================

export async function updateWasteEntryAction(
  _previousState:
    WasteActionResult | null,
  formData: FormData
): Promise<
  WasteActionResult
> {
  try {
    const location =
      await requireDatabaseLocation();

    const wasteId =
      normalizeUuid(
        formData.get(
          "wasteId"
        )
      );

    if (
      !wasteId
    ) {
      return {
        success:
          false,

        message:
          "Invalid Waste entry.",
      };
    }

    const wasteDate =
      normalizeDate(
        formData.get(
          "wasteDate"
        )
      );

    if (
      !wasteDate
    ) {
      return {
        success:
          false,

        message:
          "Enter a valid Waste Date.",
      };
    }

    const productId =
      normalizeUuid(
        formData.get(
          "productId"
        )
      );

    if (
      !productId
    ) {
      return {
        success:
          false,

        message:
          "Select a valid Product.",
      };
    }

    const qty =
      normalizePositiveDecimal(
        formData.get(
          "qty"
        )
      );

    if (
      !qty
    ) {
      return {
        success:
          false,

        message:
          "Enter a valid Waste Qty greater than zero with up to 4 decimal places.",
      };
    }

    const reason =
      normalizeActiveWasteReason(
        formData.get(
          "reason"
        )
      );

    if (
      !reason
    ) {
      return {
        success:
          false,

        message:
          "Select a valid Waste reason.",
      };
    }

    const supabase =
      createAdminClient();

    // =====================================================
    // EXISTING LOCATION-SCOPED RECORD
    // =====================================================

    const {
      data:
        existingWaste,
      error:
        lookupError,
    } = await supabase
      .from(
        "waste_entries"
      )
      .select(
        `
          id,
          location_id
        `
      )
      .eq(
        "id",
        wasteId
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
        "Order Me Waste update lookup failed:",
        lookupError.message
      );

      return {
        success:
          false,

        message:
          "Unable to update Waste entry. Please try again.",
      };
    }

    if (
      !existingWaste
    ) {
      return {
        success:
          false,

        message:
          "Waste entry was not found for the current location.",
      };
    }

    const {
      data:
        savedWasteId,
      error,
    } = await supabase.rpc(
      "save_waste_entry",
      {
        p_location_id:
          location.id,

        p_waste_id:
          wasteId,

        p_waste_date:
          wasteDate,

        p_product_id:
          productId,

        p_qty:
          qty,

        p_reason:
          reason,
      }
    );

    if (error) {
      console.error(
        "Order Me Waste update failed:",
        error.message
      );

      return {
        success:
          false,

        message:
          mapWasteDatabaseError(
            error.message
          ),
      };
    }

    const resolvedWasteId =
      typeof savedWasteId ===
        "string" &&
      normalizeUuid(
        savedWasteId
      )
        ? savedWasteId
        : wasteId;

    revalidateWastePages();

    const waste =
      await getWasteEntryById(
        resolvedWasteId
      );

    if (
      !waste
    ) {
      return {
        success:
          false,

        message:
          "Waste entry was updated but could not be reloaded.",
      };
    }

    return {
      success:
        true,

      message:
        "Waste entry updated successfully.",

      waste,
    };
  } catch (error) {
    console.error(
      "Order Me Waste update failed:",
      error instanceof Error
        ? error.message
        : "Unknown Waste update error"
    );

    return {
      success:
        false,

      message:
        "Unable to update Waste entry. Please try again.",
    };
  }
}

// =========================================================
// DELETE WASTE ENTRY
// =========================================================

export async function deleteWasteEntryAction(
  wasteId: string
): Promise<
  WasteDeleteActionResult
> {
  try {
    const location =
      await requireDatabaseLocation();

    const normalizedId =
      normalizeUuid(
        wasteId
      );

    if (
      !normalizedId
    ) {
      return {
        success:
          false,

        message:
          "Invalid Waste entry.",
      };
    }

    const supabase =
      createAdminClient();

    const {
      error,
    } = await supabase.rpc(
      "delete_waste_entry",
      {
        p_location_id:
          location.id,

        p_waste_id:
          normalizedId,
      }
    );

    if (error) {
      console.error(
        "Order Me Waste deletion failed:",
        error.message
      );

      return {
        success:
          false,

        message:
          mapWasteDatabaseError(
            error.message
          ),
      };
    }

    revalidateWastePages();

    return {
      success:
        true,

      message:
        "Waste entry deleted successfully.",
    };
  } catch (error) {
    console.error(
      "Order Me Waste deletion failed:",
      error instanceof Error
        ? error.message
        : "Unknown Waste deletion error"
    );

    return {
      success:
        false,

      message:
        "Unable to delete Waste entry. Please try again.",
    };
  }
}