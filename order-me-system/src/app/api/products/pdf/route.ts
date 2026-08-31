import fontkit from "@pdf-lib/fontkit";

import {
  PDFDocument,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import {
  requireDatabaseLocation,
} from "@/lib/location/database-location";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

// =========================================================
// RUNTIME
// =========================================================

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

// =========================================================
// TYPES
// =========================================================

type ProductSortBy =
  | "name"
  | "sku"
  | "amount_qty"
  | "created_at"
  | "updated_at";

type ProductSortDirection =
  | "asc"
  | "desc";

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
};

type ProductPdfRow = {
  sku: string;
  name: string;
  category: string;
  amountQty: number;
  uom: string;
  packagingSizeAmount: number;
  packagingUom: string;
  updatedAt: string;
};

type PdfFonts = {
  regular: PDFFont;
  bold: PDFFont;
};

type PdfColumn = {
  key:
    | "sku"
    | "name"
    | "category"
    | "amountQty"
    | "uom"
    | "packagingSizeAmount"
    | "packagingUom";
  label: string;
  width: number;
  align?: "left" | "right";
};

// =========================================================
// CONSTANTS
// =========================================================

const PAGE_WIDTH = 841.89;

const PAGE_HEIGHT = 595.28;

const PAGE_MARGIN_X = 34;

const PAGE_MARGIN_TOP = 32;

const PAGE_MARGIN_BOTTOM = 34;

const CONTENT_WIDTH =
  PAGE_WIDTH -
  PAGE_MARGIN_X * 2;

const HEADER_HEIGHT = 94;

const TABLE_HEADER_HEIGHT = 26;

const TABLE_ROW_MIN_HEIGHT = 25;

const CELL_PADDING_X = 6;

const CELL_PADDING_Y = 6;

const TABLE_FONT_SIZE = 7.5;

const TABLE_LINE_HEIGHT = 9;

const QUERY_BATCH_SIZE = 1000;

const MAX_SEARCH_LENGTH = 100;

const UNICODE_FONT_REGULAR_PATH =
  "/fonts/NotoSans-Regular.ttf";

const UNICODE_FONT_BOLD_PATH =
  "/fonts/NotoSans-Bold.ttf";

const DEFAULT_SORT_BY:
  ProductSortBy =
  "name";

const DEFAULT_SORT_DIRECTION:
  ProductSortDirection =
  "asc";

const ALLOWED_SORT_FIELDS =
  new Set<ProductSortBy>([
    "name",
    "sku",
    "amount_qty",
    "created_at",
    "updated_at",
  ]);

const TABLE_COLUMNS:
  PdfColumn[] = [
    {
      key: "sku",
      label: "SKU",
      width: 92,
    },
    {
      key: "name",
      label: "Product",
      width: 190,
    },
    {
      key: "category",
      label: "Category",
      width: 150,
    },
    {
      key: "amountQty",
      label: "Quantity",
      width: 85,
      align: "right",
    },
    {
      key: "uom",
      label: "UOM",
      width: 55,
    },
    {
      key: "packagingSizeAmount",
      label: "Pack Size",
      width: 90,
      align: "right",
    },
    {
      key: "packagingUom",
      label: "Packaging",
      width: 85,
    },
  ];

// =========================================================
// QUERY HELPERS
// =========================================================

function normalizeSearch(
  value:
    | string
    | null
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

function normalizeCategoryId(
  value:
    | string
    | null
): string {
  if (!value) {
    return "";
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
    return "";
  }

  return normalized;
}

function normalizeSortBy(
  value:
    | string
    | null
): ProductSortBy {
  const normalized =
    value as ProductSortBy;

  if (
    ALLOWED_SORT_FIELDS.has(
      normalized
    )
  ) {
    return normalized;
  }

  return DEFAULT_SORT_BY;
}

function normalizeSortDirection(
  value:
    | string
    | null
): ProductSortDirection {
  if (
    value
      ?.trim()
      .toLowerCase() ===
    "desc"
  ) {
    return "desc";
  }

  return DEFAULT_SORT_DIRECTION;
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
// PDF TEXT
// =========================================================
//
// Preserve Unicode text exactly.
//
// No Cyrillic-to-Latin conversion.
// No accent stripping.
// No language translation.
//
// Only invalid control characters are removed.
// =========================================================

function pdfText(
  value:
    | string
    | number
    | null
    | undefined
): string {
  return String(
    value ??
    ""
  )
    .replace(
      /\r\n?/g,
      "\n"
    )
    .replace(
      /\t/g,
      " "
    )
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
      ""
    );
}

// =========================================================
// UNICODE FONT LOADER
// =========================================================

async function loadUnicodeFontBytes(
  requestUrl: string
): Promise<{
  regular: ArrayBuffer;
  bold: ArrayBuffer;
}> {
  const regularUrl =
    new URL(
      UNICODE_FONT_REGULAR_PATH,
      requestUrl
    );

  const boldUrl =
    new URL(
      UNICODE_FONT_BOLD_PATH,
      requestUrl
    );

  const [
    regularResponse,
    boldResponse,
  ] =
    await Promise.all([
      fetch(
        regularUrl,
        {
          cache: "force-cache",
        }
      ),
      fetch(
        boldUrl,
        {
          cache: "force-cache",
        }
      ),
    ]);

  if (
    !regularResponse.ok
  ) {
    throw new Error(
      `Unable to load Unicode regular font (${regularResponse.status}).`
    );
  }

  if (
    !boldResponse.ok
  ) {
    throw new Error(
      `Unable to load Unicode bold font (${boldResponse.status}).`
    );
  }

  const [
    regular,
    bold,
  ] =
    await Promise.all([
      regularResponse.arrayBuffer(),
      boldResponse.arrayBuffer(),
    ]);

  return {
    regular,
    bold,
  };
}

// =========================================================
// FORMATTERS
// =========================================================

function formatQuantity(
  value:
    | number
    | null
    | undefined
): string {
  const numericValue =
    Number(value);

  if (
    !Number.isFinite(
      numericValue
    )
  ) {
    return "0";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits: 4,
    }
  ).format(
    numericValue
  );
}

function formatDate(
  value: string
): string {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }
  ).format(
    date
  );
}

function formatGeneratedAt():
  string {
  return new Intl.DateTimeFormat(
    "en",
    {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date()
  );
}

// =========================================================
// TEXT WRAPPING
// =========================================================

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const safeText =
    pdfText(
      text
    );

  if (
    !safeText
  ) {
    return [""];
  }

  const words =
    safeText.split(
      /\s+/
    );

  const lines:
    string[] = [];

  let currentLine = "";

  for (
    const word of
    words
  ) {
    const candidate =
      currentLine
        ? `${currentLine} ${word}`
        : word;

    const candidateWidth =
      font.widthOfTextAtSize(
        candidate,
        fontSize
      );

    if (
      candidateWidth <=
      maxWidth
    ) {
      currentLine =
        candidate;

      continue;
    }

    if (
      currentLine
    ) {
      lines.push(
        currentLine
      );
    }

    if (
      font.widthOfTextAtSize(
        word,
        fontSize
      ) <=
      maxWidth
    ) {
      currentLine =
        word;

      continue;
    }

    let chunk = "";

    for (
      const character of
      word
    ) {
      const nextChunk =
        `${chunk}${character}`;

      if (
        font.widthOfTextAtSize(
          nextChunk,
          fontSize
        ) <=
        maxWidth
      ) {
        chunk =
          nextChunk;
      } else {
        if (
          chunk
        ) {
          lines.push(
            chunk
          );
        }

        chunk =
          character;
      }
    }

    currentLine =
      chunk;
  }

  if (
    currentLine
  ) {
    lines.push(
      currentLine
    );
  }

  return (
    lines.length >
      0
      ? lines
      : [""]
  );
}

// =========================================================
// DATABASE LOADERS
// =========================================================

async function loadAllProducts(
  locationId: string,
  search: string,
  categoryId: string,
  sortBy: ProductSortBy,
  sortDirection:
    ProductSortDirection
): Promise<ProductDatabaseRow[]> {
  const supabase =
    createAdminClient();

  const allProducts:
    ProductDatabaseRow[] =
    [];

  let from = 0;

  while (true) {
    let query =
      supabase
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
          "location_id",
          locationId
        );

    if (
      categoryId
    ) {
      query =
        query.eq(
          "category_id",
          categoryId
        );
    }

    if (
      search
    ) {
      const escapedSearch =
        escapePostgrestQuotedValue(
          search
        );

      query =
        query.or(
          `name.ilike."%${escapedSearch}%",sku.ilike."%${escapedSearch}%"`
        );
    }

    const to =
      from +
      QUERY_BATCH_SIZE -
      1;

    const {
      data,
      error,
    } =
      await query
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

    if (
      error
    ) {
      console.error(
        "Order Me Product List PDF product query failed:",
        error.message
      );

      throw new Error(
        "Unable to load products for PDF export."
      );
    }

    const rows =
      (data ??
        []) as ProductDatabaseRow[];

    allProducts.push(
      ...rows
    );

    if (
      rows.length <
      QUERY_BATCH_SIZE
    ) {
      break;
    }

    from +=
      QUERY_BATCH_SIZE;
  }

  return allProducts;
}

async function loadCategories(
  locationId: string
): Promise<
  Map<string, string>
> {
  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } =
    await supabase
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
        locationId
      );

  if (
    error
  ) {
    console.error(
      "Order Me Product List PDF category query failed:",
      error.message
    );

    throw new Error(
      "Unable to load Product categories for PDF export."
    );
  }

  const categoryMap =
    new Map<
      string,
      string
    >();

  for (
    const category of
    (data ??
      []) as CategoryDatabaseRow[]
  ) {
    categoryMap.set(
      category.id,
      category.name
    );
  }

  return categoryMap;
}

// =========================================================
// MAP PDF ROWS
// =========================================================

function createPdfRows(
  products:
    ProductDatabaseRow[],
  categoryMap:
    Map<string, string>
): ProductPdfRow[] {
  return products.map(
    (
      product
    ) => ({
      sku:
        product.sku,

      name:
        product.name,

      category:
        categoryMap.get(
          product.category_id
        ) ??
        "Unknown Category",

      amountQty:
        Number(
          product.amount_qty
        ),

      uom:
        product.uom,

      packagingSizeAmount:
        Number(
          product.packaging_size_amount
        ),

      packagingUom:
        product.packaging_uom,

      updatedAt:
        product.updated_at,
    })
  );
}

// =========================================================
// CELL VALUES
// =========================================================

function getCellValue(
  row: ProductPdfRow,
  key:
    PdfColumn["key"]
): string {
  switch (
    key
  ) {
    case "sku":
      return row.sku;

    case "name":
      return row.name;

    case "category":
      return row.category;

    case "amountQty":
      return formatQuantity(
        row.amountQty
      );

    case "uom":
      return row.uom;

    case "packagingSizeAmount":
      return formatQuantity(
        row.packagingSizeAmount
      );

    case "packagingUom":
      return row.packagingUom;

    default:
      return "";
  }
}

// =========================================================
// ROW HEIGHT
// =========================================================

function calculateRowHeight(
  row: ProductPdfRow,
  font: PDFFont
): number {
  let maxLines = 1;

  for (
    const column of
    TABLE_COLUMNS
  ) {
    const lines =
      wrapText(
        getCellValue(
          row,
          column.key
        ),
        font,
        TABLE_FONT_SIZE,
        column.width -
          CELL_PADDING_X * 2
      );

    maxLines =
      Math.max(
        maxLines,
        lines.length
      );
  }

  return Math.max(
    TABLE_ROW_MIN_HEIGHT,
    maxLines *
      TABLE_LINE_HEIGHT +
      CELL_PADDING_Y * 2
  );
}

// =========================================================
// DRAW HELPERS
// =========================================================

function drawRightAlignedText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  fontSize: number,
  rightX: number,
  y: number
) {
  const safeText =
    pdfText(
      text
    );

  const width =
    font.widthOfTextAtSize(
      safeText,
      fontSize
    );

  page.drawText(
    safeText,
    {
      x:
        rightX -
        width,

      y,

      size:
        fontSize,

      font,

      color:
        rgb(
          0.24,
          0.24,
          0.27
        ),
    }
  );
}

// =========================================================
// PAGE HEADER
// =========================================================

function drawPageHeader(
  page: PDFPage,
  fonts: PdfFonts,
  locationName: string,
  locationCode: string,
  totalProducts: number,
  search: string,
  categoryName: string,
  continuation: boolean
): number {
  const titleY =
    PAGE_HEIGHT -
    PAGE_MARGIN_TOP;

  page.drawText(
    "ORDER ME SYSTEM BY FORZA",
    {
      x:
        PAGE_MARGIN_X,

      y:
        titleY,

      size: 8,

      font:
        fonts.bold,

      color:
        rgb(
          0.71,
          0.38,
          0.02
        ),
    }
  );

  page.drawText(
    continuation
      ? "Product List - Continued"
      : "Product List",
    {
      x:
        PAGE_MARGIN_X,

      y:
        titleY -
        24,

      size: 19,

      font:
        fonts.bold,

      color:
        rgb(
          0.06,
          0.06,
          0.07
        ),
    }
  );

  const safeLocation =
    pdfText(
      `${locationName} (${locationCode})`
    );

  page.drawText(
    safeLocation,
    {
      x:
        PAGE_MARGIN_X,

      y:
        titleY -
        43,

      size: 8.5,

      font:
        fonts.regular,

      color:
        rgb(
          0.39,
          0.39,
          0.42
        ),
    }
  );

  drawRightAlignedText(
    page,
    `Total Products: ${totalProducts}`,
    fonts.bold,
    8.5,
    PAGE_WIDTH -
      PAGE_MARGIN_X,
    titleY -
      24
  );

  drawRightAlignedText(
    page,
    `Generated: ${formatGeneratedAt()}`,
    fonts.regular,
    7.5,
    PAGE_WIDTH -
      PAGE_MARGIN_X,
    titleY -
      42
  );

  const filterParts:
    string[] = [];

  if (
    search
  ) {
    filterParts.push(
      `Search: ${search}`
    );
  }

  if (
    categoryName
  ) {
    filterParts.push(
      `Category: ${categoryName}`
    );
  }

  if (
    filterParts.length >
    0
  ) {
    const filterText =
      pdfText(
        filterParts.join(
          " | "
        )
      );

    page.drawText(
      filterText,
      {
        x:
          PAGE_MARGIN_X,

        y:
          titleY -
          62,

        size: 7.5,

        font:
          fonts.regular,

        color:
          rgb(
            0.45,
            0.45,
            0.48
          ),

        maxWidth:
          CONTENT_WIDTH,
      }
    );
  }

  page.drawLine({
    start: {
      x:
        PAGE_MARGIN_X,

      y:
        titleY -
        HEADER_HEIGHT +
        18,
    },

    end: {
      x:
        PAGE_WIDTH -
        PAGE_MARGIN_X,

      y:
        titleY -
        HEADER_HEIGHT +
        18,
    },

    thickness: 0.7,

    color:
      rgb(
        0.88,
        0.88,
        0.9
      ),
  });

  return (
    titleY -
    HEADER_HEIGHT
  );
}

// =========================================================
// TABLE HEADER
// =========================================================

function drawTableHeader(
  page: PDFPage,
  fonts: PdfFonts,
  y: number
): number {
  page.drawRectangle({
    x:
      PAGE_MARGIN_X,

    y:
      y -
      TABLE_HEADER_HEIGHT,

    width:
      CONTENT_WIDTH,

    height:
      TABLE_HEADER_HEIGHT,

    color:
      rgb(
        0.96,
        0.96,
        0.97
      ),
  });

  let x =
    PAGE_MARGIN_X;

  for (
    const column of
    TABLE_COLUMNS
  ) {
    const label =
      pdfText(
        column.label
      );

    const textWidth =
      fonts.bold
        .widthOfTextAtSize(
          label,
          7
        );

    const textX =
      column.align ===
      "right"
        ? x +
          column.width -
          CELL_PADDING_X -
          textWidth
        : x +
          CELL_PADDING_X;

    page.drawText(
      label,
      {
        x:
          textX,

        y:
          y -
          17,

        size: 7,

        font:
          fonts.bold,

        color:
          rgb(
            0.35,
            0.35,
            0.38
          ),
      }
    );

    x +=
      column.width;
  }

  page.drawLine({
    start: {
      x:
        PAGE_MARGIN_X,

      y:
        y -
        TABLE_HEADER_HEIGHT,
    },

    end: {
      x:
        PAGE_WIDTH -
        PAGE_MARGIN_X,

      y:
        y -
        TABLE_HEADER_HEIGHT,
    },

    thickness: 0.6,

    color:
      rgb(
        0.84,
        0.84,
        0.86
      ),
  });

  return (
    y -
    TABLE_HEADER_HEIGHT
  );
}

// =========================================================
// TABLE ROW
// =========================================================

function drawTableRow(
  page: PDFPage,
  fonts: PdfFonts,
  row: ProductPdfRow,
  y: number,
  rowHeight: number,
  rowIndex: number
): number {
  if (
    rowIndex %
      2 ===
    1
  ) {
    page.drawRectangle({
      x:
        PAGE_MARGIN_X,

      y:
        y -
        rowHeight,

      width:
        CONTENT_WIDTH,

      height:
        rowHeight,

      color:
        rgb(
          0.992,
          0.992,
          0.994
        ),
    });
  }

  let x =
    PAGE_MARGIN_X;

  for (
    const column of
    TABLE_COLUMNS
  ) {
    const value =
      getCellValue(
        row,
        column.key
      );

    const lines =
      wrapText(
        value,
        fonts.regular,
        TABLE_FONT_SIZE,
        column.width -
          CELL_PADDING_X * 2
      );

    for (
      let lineIndex = 0;
      lineIndex <
      lines.length;
      lineIndex += 1
    ) {
      const line =
        lines[
          lineIndex
        ];

      const textWidth =
        fonts.regular
          .widthOfTextAtSize(
            line,
            TABLE_FONT_SIZE
          );

      const textX =
        column.align ===
        "right"
          ? x +
            column.width -
            CELL_PADDING_X -
            textWidth
          : x +
            CELL_PADDING_X;

      page.drawText(
        line,
        {
          x:
            textX,

          y:
            y -
            CELL_PADDING_Y -
            TABLE_FONT_SIZE -
            lineIndex *
              TABLE_LINE_HEIGHT,

          size:
            TABLE_FONT_SIZE,

          font:
            fonts.regular,

          color:
            rgb(
              0.16,
              0.16,
              0.18
            ),
        }
      );
    }

    x +=
      column.width;
  }

  page.drawLine({
    start: {
      x:
        PAGE_MARGIN_X,

      y:
        y -
        rowHeight,
    },

    end: {
      x:
        PAGE_WIDTH -
        PAGE_MARGIN_X,

      y:
        y -
        rowHeight,
    },

    thickness: 0.35,

    color:
      rgb(
        0.91,
        0.91,
        0.92
      ),
  });

  return (
    y -
    rowHeight
  );
}

// =========================================================
// EMPTY STATE
// =========================================================

function drawEmptyState(
  page: PDFPage,
  fonts: PdfFonts,
  y: number
) {
  page.drawRectangle({
    x:
      PAGE_MARGIN_X,

    y:
      y -
      70,

    width:
      CONTENT_WIDTH,

    height: 70,

    borderWidth: 0.7,

    borderColor:
      rgb(
        0.87,
        0.87,
        0.89
      ),

    color:
      rgb(
        0.985,
        0.985,
        0.988
      ),
  });

  const message =
    "No products match the selected Product List filters.";

  const safeMessage =
    pdfText(
      message
    );

  const messageWidth =
    fonts.regular
      .widthOfTextAtSize(
        safeMessage,
        9
      );

  page.drawText(
    safeMessage,
    {
      x:
        PAGE_WIDTH /
          2 -
        messageWidth /
          2,

      y:
        y -
        40,

      size: 9,

      font:
        fonts.regular,

      color:
        rgb(
          0.42,
          0.42,
          0.45
        ),
    }
  );
}

// =========================================================
// FOOTERS
// =========================================================

function drawFooters(
  pages:
    PDFPage[],
  fonts: PdfFonts
) {
  const totalPages =
    pages.length;

  pages.forEach(
    (
      page,
      index
    ) => {
      const footerY = 18;

      page.drawLine({
        start: {
          x:
            PAGE_MARGIN_X,

          y:
            footerY +
            10,
        },

        end: {
          x:
            PAGE_WIDTH -
            PAGE_MARGIN_X,

          y:
            footerY +
            10,
        },

        thickness: 0.4,

        color:
          rgb(
            0.9,
            0.9,
            0.91
          ),
      });

      page.drawText(
        "Human and Technology System | Developed by Chef Alex",
        {
          x:
            PAGE_MARGIN_X,

          y:
            footerY,

          size: 6.5,

          font:
            fonts.regular,

          color:
            rgb(
              0.5,
              0.5,
              0.53
            ),
        }
      );

      drawRightAlignedText(
        page,
        `Page ${index + 1} of ${totalPages}`,
        fonts.regular,
        6.5,
        PAGE_WIDTH -
          PAGE_MARGIN_X,
        footerY
      );
    }
  );
}

// =========================================================
// GENERATE PDF
// =========================================================

async function generateProductListPdf(
  rows:
    ProductPdfRow[],
  locationName: string,
  locationCode: string,
  search: string,
  categoryName: string,
  fontBaseUrl: string
): Promise<Uint8Array> {
  const pdfDocument =
    await PDFDocument.create();

  pdfDocument.setTitle(
    pdfText(
      `Product List - ${locationName}`
    )
  );

  pdfDocument.setAuthor(
    "Order Me System by Forza"
  );

  pdfDocument.setSubject(
    "Operational Product List"
  );

  pdfDocument.setCreator(
    "Order Me System by Forza"
  );

  // =======================================================
  // REGISTER CUSTOM UNICODE FONT SUPPORT
  // =======================================================

  pdfDocument.registerFontkit(
    fontkit
  );

  // =======================================================
  // LOAD NOTO SANS
  // =======================================================

  const unicodeFontBytes =
    await loadUnicodeFontBytes(
      fontBaseUrl
    );

  const fonts:
    PdfFonts = {
    regular:
      await pdfDocument.embedFont(
        unicodeFontBytes.regular
      ),

    bold:
      await pdfDocument.embedFont(
        unicodeFontBytes.bold
      ),
  };

  const pages:
    PDFPage[] =
    [];

  function createPage(
    continuation:
      boolean
  ) {
    const page =
      pdfDocument.addPage([
        PAGE_WIDTH,
        PAGE_HEIGHT,
      ]);

    pages.push(
      page
    );

    let y =
      drawPageHeader(
        page,
        fonts,
        locationName,
        locationCode,
        rows.length,
        search,
        categoryName,
        continuation
      );

    y =
      drawTableHeader(
        page,
        fonts,
        y
      );

    return {
      page,
      y,
    };
  }

  let {
    page,
    y,
  } =
    createPage(
      false
    );

  if (
    rows.length ===
    0
  ) {
    drawEmptyState(
      page,
      fonts,
      y -
        10
    );

    drawFooters(
      pages,
      fonts
    );

    return pdfDocument.save();
  }

  for (
    let index = 0;
    index <
    rows.length;
    index += 1
  ) {
    const row =
      rows[index];

    const rowHeight =
      calculateRowHeight(
        row,
        fonts.regular
      );

    if (
      y -
        rowHeight <
      PAGE_MARGIN_BOTTOM +
        12
    ) {
      const nextPage =
        createPage(
          true
        );

      page =
        nextPage.page;

      y =
        nextPage.y;
    }

    y =
      drawTableRow(
        page,
        fonts,
        row,
        y,
        rowHeight,
        index
      );
  }

  drawFooters(
    pages,
    fonts
  );

  return pdfDocument.save();
}

// =========================================================
// RESPONSE BODY
// =========================================================
//
// Keep an explicit ArrayBuffer copy so the Next.js Response
// body does not hit Uint8Array<ArrayBufferLike> typing issues.
// =========================================================

function createPdfResponseBody(
  pdfBytes:
    Uint8Array
): ArrayBuffer {
  const responseBytes =
    new Uint8Array(
      pdfBytes.byteLength
    );

  responseBytes.set(
    pdfBytes
  );

  return responseBytes.buffer;
}

// =========================================================
// SAFE FILE NAME
// =========================================================

function createSafeFileName(
  locationCode: string
): string {
  const safeLocation =
    String(
      locationCode
    )
      .replace(
        /[^a-zA-Z0-9_-]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );

  return safeLocation
    ? `product-list-${safeLocation}`
    : "product-list";
}

// =========================================================
// GET
// =========================================================

export async function GET(
  request: Request
) {
  try {
    // =====================================================
    // TRUSTED ACTIVE LOCATION
    // =====================================================

    const location =
      await requireDatabaseLocation();

    // =====================================================
    // QUERY PARAMETERS
    // =====================================================

    const url =
      new URL(
        request.url
      );

    const search =
      normalizeSearch(
        url.searchParams.get(
          "q"
        )
      );

    const categoryId =
      normalizeCategoryId(
        url.searchParams.get(
          "category"
        )
      );

    const sortBy =
      normalizeSortBy(
        url.searchParams.get(
          "sort"
        )
      );

    const sortDirection =
      normalizeSortDirection(
        url.searchParams.get(
          "direction"
        )
      );

    // =====================================================
    // LOAD LOCATION-SCOPED DATA
    // =====================================================

    const [
      products,
      categoryMap,
    ] =
      await Promise.all([
        loadAllProducts(
          location.id,
          search,
          categoryId,
          sortBy,
          sortDirection
        ),

        loadCategories(
          location.id
        ),
      ]);

    // =====================================================
    // FILTER LABEL
    // =====================================================

    const categoryName =
      categoryId
        ? categoryMap.get(
            categoryId
          ) ??
          ""
        : "";

    // =====================================================
    // PDF ROWS
    // =====================================================

    const rows =
      createPdfRows(
        products,
        categoryMap
      );

    // =====================================================
    // GENERATE PDF
    // =====================================================

    const pdfBytes =
      await generateProductListPdf(
        rows,
        location.name,
        location.code,
        search,
        categoryName,
        request.url
      );

    const responseBody =
      createPdfResponseBody(
        pdfBytes
      );

    const safeFileName =
      createSafeFileName(
        location.code
      );

    return new Response(
      responseBody,
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename="${safeFileName}.pdf"`,

          "Cache-Control":
            "private, no-store, max-age=0",

          "X-Content-Type-Options":
            "nosniff",
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Order Me Product List PDF generation failed:",
      error instanceof Error
        ? error.message
        : "Unknown Product List PDF generation error"
    );

    return new Response(
      "Unable to generate Product List PDF.",
      {
        status: 500,

        headers: {
          "Content-Type":
            "text/plain; charset=utf-8",

          "Cache-Control":
            "private, no-store",
        },
      }
    );
  }
}