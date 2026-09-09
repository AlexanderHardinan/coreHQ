import fontkit from "@pdf-lib/fontkit";

import {
  PDFDocument,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import {
  getWasteReportRows,
  type WasteReason,
  type WasteRecord,
  type WasteUom,
} from "@/app/waste/actions";

import {
  requireDatabaseLocation,
} from "@/lib/location/database-location";

// =========================================================
// RUNTIME
// =========================================================

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

// =========================================================
// TYPES
// =========================================================

type PdfFonts = {
  regular:
    PDFFont;

  bold:
    PDFFont;
};

type PdfColumn = {
  key:
    | "date"
    | "sku"
    | "product"
    | "category"
    | "qty"
    | "uom"
    | "reason";

  label:
    string;

  width:
    number;

  align?:
    | "left"
    | "right"
    | "center";
};

type WasteReportFilters = {
  search:
    string;

  reason:
    | WasteReason
    | "all";

  dateFrom:
    string;

  dateTo:
    string;
};

type QuantityTotals = {
  ml:
    number;

  gram:
    number;

  pc:
    number;
};

// =========================================================
// PAGE CONSTANTS
// =========================================================
//
// A4 landscape PDF points.
// =========================================================

const PAGE_WIDTH =
  841.89;

const PAGE_HEIGHT =
  595.28;

const MARGIN_X =
  36;

const TOP_MARGIN =
  34;

const FOOTER_HEIGHT =
  34;

const CONTENT_BOTTOM =
  FOOTER_HEIGHT +
  18;

const TABLE_HEADER_HEIGHT =
  28;

const TABLE_CELL_PADDING_X =
  6;

const TABLE_CELL_PADDING_Y =
  6;

const TABLE_ROW_MIN_HEIGHT =
  25;

const BODY_FONT_SIZE =
  8;

const BODY_LINE_HEIGHT =
  10;

const MAX_SEARCH_LENGTH =
  100;

// =========================================================
// UNICODE FONTS
// =========================================================

const UNICODE_FONT_REGULAR_PATH =
  "/fonts/NotoSans-Regular.ttf";

const UNICODE_FONT_BOLD_PATH =
  "/fonts/NotoSans-Bold.ttf";

// =========================================================
// COLORS
// =========================================================

const COLOR_BLACK =
  rgb(
    0.08,
    0.08,
    0.09
  );

const COLOR_DARK =
  rgb(
    0.18,
    0.18,
    0.2
  );

const COLOR_MUTED =
  rgb(
    0.42,
    0.42,
    0.45
  );

const COLOR_LIGHT_MUTED =
  rgb(
    0.62,
    0.62,
    0.65
  );

const COLOR_BORDER =
  rgb(
    0.87,
    0.87,
    0.89
  );

const COLOR_HEADER_BG =
  rgb(
    0.96,
    0.96,
    0.97
  );

const COLOR_ROW_ALT =
  rgb(
    0.985,
    0.985,
    0.99
  );

const COLOR_BRAND =
  rgb(
    0.73,
    0.43,
    0.05
  );

const COLOR_WHITE =
  rgb(
    1,
    1,
    1
  );

// =========================================================
// TABLE
// =========================================================

const TABLE_COLUMNS:
  PdfColumn[] = [
    {
      key:
        "date",

      label:
        "Date",

      width:
        78,
    },
    {
      key:
        "sku",

      label:
        "SKU",

      width:
        92,
    },
    {
      key:
        "product",

      label:
        "Product",

      width:
        182,
    },
    {
      key:
        "category",

      label:
        "Category",

      width:
        145,
    },
    {
      key:
        "qty",

      label:
        "Qty",

      width:
        82,

      align:
        "right",
    },
    {
      key:
        "uom",

      label:
        "UOM",

      width:
        55,

      align:
        "center",
    },
    {
      key:
        "reason",

      label:
        "Reason",

      width:
        130,
    },
  ];

const TABLE_WIDTH =
  TABLE_COLUMNS.reduce(
    (
      total,
      column
    ) =>
      total +
      column.width,
    0
  );

const TABLE_X =
  MARGIN_X +
  (
    PAGE_WIDTH -
    MARGIN_X *
      2 -
    TABLE_WIDTH
  ) /
    2;

// =========================================================
// PDF TEXT
// =========================================================
//
// Preserve Unicode.
//
// Only invalid PDF control characters are removed.
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
// FONT LOADER
// =========================================================

async function loadUnicodeFontBytes(
  requestUrl:
    string
): Promise<{
  regular:
    ArrayBuffer;

  bold:
    ArrayBuffer;
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
          cache:
            "force-cache",
        }
      ),

      fetch(
        boldUrl,
        {
          cache:
            "force-cache",
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
// SEARCH
// =========================================================

function normalizeSearch(
  value:
    string |
    null
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
// DATE
// =========================================================

function normalizeDate(
  value:
    string |
    null
): string {
  if (!value) {
    return "";
  }

  const normalized =
    value.trim();

  const match =
    normalized.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    return "";
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
    year <
      2000 ||
    year >
      9999
  ) {
    return "";
  }

  const date =
    new Date(
      Date.UTC(
        year,
        month -
          1,
        day
      )
    );

  if (
    date.getUTCFullYear() !==
      year ||
    date.getUTCMonth() !==
      month -
        1 ||
    date.getUTCDate() !==
      day
  ) {
    return "";
  }

  return normalized;
}

// =========================================================
// REASON
// =========================================================

function normalizeReason(
  value:
    string |
    null
):
  | WasteReason
  | "all" {
  switch (
    value
  ) {
    case "spoiled":
      return "spoiled";

    case "expired":
      return "expired";

    case "bad_quality":
      return "bad_quality";

    case "guest_complaint":
      return "guest_complaint";

    default:
      return "all";
  }
}

// =========================================================
// FILTERS
// =========================================================

function getReportFilters(
  url:
    URL
): WasteReportFilters {
  const search =
    normalizeSearch(
      url.searchParams.get(
        "search"
      )
    );

  const reason =
    normalizeReason(
      url.searchParams.get(
        "reason"
      )
    );

  let dateFrom =
    normalizeDate(
      url.searchParams.get(
        "dateFrom"
      )
    );

  let dateTo =
    normalizeDate(
      url.searchParams.get(
        "dateTo"
      )
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
    search,
    reason,
    dateFrom,
    dateTo,
  };
}

// =========================================================
// QUANTITY
// =========================================================

function formatQuantity(
  value:
    number
): string {
  if (
    !Number.isFinite(
      value
    )
  ) {
    return "0";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits:
        0,

      maximumFractionDigits:
        4,
    }
  ).format(value);
}

// =========================================================
// DATE DISPLAY
// =========================================================

function formatDate(
  value:
    string
): string {
  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    return value;
  }

  const date =
    new Date(
      Date.UTC(
        Number(
          match[1]
        ),
        Number(
          match[2]
        ) -
          1,
        Number(
          match[3]
        )
      )
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      year:
        "numeric",

      month:
        "short",

      day:
        "2-digit",

      timeZone:
        "UTC",
    }
  ).format(date);
}

// =========================================================
// GENERATED DATE
// =========================================================

function formatGeneratedDate(
  date:
    Date
): string {
  return new Intl.DateTimeFormat(
    "en",
    {
      year:
        "numeric",

      month:
        "long",

      day:
        "2-digit",

      hour:
        "2-digit",

      minute:
        "2-digit",

      timeZone:
        "Europe/Skopje",
    }
  ).format(date);
}

// =========================================================
// REASON LABEL
// =========================================================

function getReasonLabel(
  reason:
    | WasteReason
    | "all"
): string {
  switch (
    reason
  ) {
    case "spoiled":
      return "Spoiled";

    case "expired":
      return "Expired";

    case "bad_quality":
      return "Bad quality";

    case "guest_complaint":
      return "Guest Complaint";

    case "all":
    default:
      return "All Reasons";
  }
}

// =========================================================
// DATE RANGE LABEL
// =========================================================

function getDateRangeLabel(
  dateFrom:
    string,

  dateTo:
    string
): string {
  if (
    dateFrom &&
    dateTo
  ) {
    return `${formatDate(
      dateFrom
    )} - ${formatDate(
      dateTo
    )}`;
  }

  if (dateFrom) {
    return `From ${formatDate(
      dateFrom
    )}`;
  }

  if (dateTo) {
    return `Through ${formatDate(
      dateTo
    )}`;
  }

  return "All Dates";
}

// =========================================================
// QUANTITY TOTALS
// =========================================================
//
// Never combine ml + gram + pc.
// =========================================================

function calculateQuantityTotals(
  rows:
    WasteRecord[]
): QuantityTotals {
  const totals:
    QuantityTotals = {
    ml:
      0,

    gram:
      0,

    pc:
      0,
  };

  for (
    const row of
    rows
  ) {
    const uom:
      WasteUom =
      row.uom_snapshot;

    totals[
      uom
    ] +=
      Number.isFinite(
        row.qty
      )
        ? row.qty
        : 0;
  }

  return totals;
}

// =========================================================
// FILTER TEXT
// =========================================================

function compactText(
  value:
    string,

  maxLength =
    60
): string {
  const normalized =
    pdfText(
      value
    )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  if (
    normalized.length <=
    maxLength
  ) {
    return normalized;
  }

  return `${normalized.slice(
    0,
    Math.max(
      0,
      maxLength -
        3
    )
  )}...`;
}

// =========================================================
// CELL VALUE
// =========================================================

function getCellValue(
  row:
    WasteRecord,

  key:
    PdfColumn["key"]
): string {
  switch (
    key
  ) {
    case "date":
      return formatDate(
        row.waste_date
      );

    case "sku":
      return row.sku_snapshot;

    case "product":
      return row.product_name_snapshot;

    case "category":
      return row.category_name_snapshot;

    case "qty":
      return formatQuantity(
        row.qty
      );

    case "uom":
      return row.uom_snapshot;

    case "reason":
      return getReasonLabel(
        row.reason
      );

    default:
      return "";
  }
}

// =========================================================
// WRAP TEXT
// =========================================================

function wrapText(
  text:
    string,

  font:
    PDFFont,

  fontSize:
    number,

  maxWidth:
    number
): string[] {
  const normalized =
    pdfText(
      text
    )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  if (!normalized) {
    return [
      "",
    ];
  }

  const words =
    normalized.split(
      " "
    );

  const lines:
    string[] =
    [];

  let currentLine =
    "";

  function pushLongWord(
    word:
      string
  ): string {
    let segment =
      "";

    for (
      const character of
      word
    ) {
      const candidate =
        `${segment}${character}`;

      if (
        font.widthOfTextAtSize(
          candidate,
          fontSize
        ) >
          maxWidth &&
        segment
      ) {
        lines.push(
          segment
        );

        segment =
          character;
      } else {
        segment =
          candidate;
      }
    }

    return segment;
  }

  for (
    const word of
    words
  ) {
    const candidate =
      currentLine
        ? `${currentLine} ${word}`
        : word;

    if (
      font.widthOfTextAtSize(
        candidate,
        fontSize
      ) <=
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

      currentLine =
        "";
    }

    if (
      font.widthOfTextAtSize(
        word,
        fontSize
      ) >
      maxWidth
    ) {
      currentLine =
        pushLongWord(
          word
        );
    } else {
      currentLine =
        word;
    }
  }

  if (
    currentLine
  ) {
    lines.push(
      currentLine
    );
  }

  return lines.length >
    0
    ? lines
    : [
        "",
      ];
}

// =========================================================
// ROW LAYOUT
// =========================================================

function calculateRowLayout(
  row:
    WasteRecord,

  fonts:
    PdfFonts
): {
  linesByColumn:
    string[][];

  rowHeight:
    number;
} {
  const linesByColumn =
    TABLE_COLUMNS.map(
      (
        column
      ) =>
        wrapText(
          getCellValue(
            row,
            column.key
          ),
          fonts.regular,
          BODY_FONT_SIZE,
          column.width -
            TABLE_CELL_PADDING_X *
              2
        )
    );

  const maximumLines =
    Math.max(
      1,
      ...linesByColumn.map(
        (
          lines
        ) =>
          lines.length
      )
    );

  const rowHeight =
    Math.max(
      TABLE_ROW_MIN_HEIGHT,
      maximumLines *
        BODY_LINE_HEIGHT +
        TABLE_CELL_PADDING_Y *
          2
    );

  return {
    linesByColumn,
    rowHeight,
  };
}

// =========================================================
// ALIGNED TEXT
// =========================================================

function drawAlignedText(
  page:
    PDFPage,

  text:
    string,

  font:
    PDFFont,

  fontSize:
    number,

  x:
    number,

  y:
    number,

  width:
    number,

  align:
    | "left"
    | "right"
    | "center" =
    "left"
) {
  const safeText =
    pdfText(
      text
    );

  const textWidth =
    font.widthOfTextAtSize(
      safeText,
      fontSize
    );

  let drawX =
    x;

  if (
    align ===
    "right"
  ) {
    drawX =
      x +
      Math.max(
        0,
        width -
          textWidth
      );
  }

  if (
    align ===
    "center"
  ) {
    drawX =
      x +
      Math.max(
        0,
        (
          width -
          textWidth
        ) /
          2
      );
  }

  page.drawText(
    safeText,
    {
      x:
        drawX,

      y,

      size:
        fontSize,

      font,

      color:
        COLOR_DARK,
    }
  );
}

// =========================================================
// LABEL / VALUE
// =========================================================

function drawMetaField(
  page:
    PDFPage,

  fonts:
    PdfFonts,

  label:
    string,

  value:
    string,

  x:
    number,

  y:
    number,

  width:
    number
) {
  page.drawText(
    pdfText(
      label
    ),
    {
      x,

      y,

      size:
        7,

      font:
        fonts.bold,

      color:
        COLOR_LIGHT_MUTED,
    }
  );

  const lines =
    wrapText(
      value,
      fonts.regular,
      8.5,
      width
    );

  lines
    .slice(
      0,
      2
    )
    .forEach(
      (
        line,
        index
      ) => {
        page.drawText(
          line,
          {
            x,

            y:
              y -
              12 -
              index *
                10,

            size:
              8.5,

            font:
              fonts.regular,

            color:
              COLOR_DARK,
          }
        );
      }
    );
}

// =========================================================
// REPORT HEADER
// =========================================================

function drawReportHeader(
  page:
    PDFPage,

  fonts:
    PdfFonts,

  locationName:
    string,

  locationCode:
    string,

  filters:
    WasteReportFilters,

  totalEntries:
    number,

  totals:
    QuantityTotals,

  generatedAt:
    Date
): number {
  const top =
    PAGE_HEIGHT -
    TOP_MARGIN;

  // =======================================================
  // BRAND
  // =======================================================

  page.drawText(
    "ORDER ME SYSTEM BY FORZA",
    {
      x:
        MARGIN_X,

      y:
        top,

      size:
        8,

      font:
        fonts.bold,

      color:
        COLOR_BRAND,
    }
  );

  // =======================================================
  // TITLE
  // =======================================================

  page.drawText(
    "WASTE REPORT",
    {
      x:
        MARGIN_X,

      y:
        top -
        28,

      size:
        22,

      font:
        fonts.bold,

      color:
        COLOR_BLACK,
    }
  );

  page.drawText(
    "Operational Waste Control",
    {
      x:
        MARGIN_X,

      y:
        top -
        45,

      size:
        8.5,

      font:
        fonts.regular,

      color:
        COLOR_MUTED,
    }
  );

  // =======================================================
  // LOCATION
  // =======================================================

  const locationText =
    `${locationName} (${locationCode})`;

  const locationWidth =
    fonts.bold.widthOfTextAtSize(
      locationText,
      9
    );

  page.drawText(
    locationText,
    {
      x:
        PAGE_WIDTH -
        MARGIN_X -
        locationWidth,

      y:
        top -
        18,

      size:
        9,

      font:
        fonts.bold,

      color:
        COLOR_DARK,
    }
  );

  page.drawText(
    "Current Operational Location",
    {
      x:
        PAGE_WIDTH -
        MARGIN_X -
        fonts.regular.widthOfTextAtSize(
          "Current Operational Location",
          7
        ),

      y:
        top -
        31,

      size:
        7,

      font:
        fonts.regular,

      color:
        COLOR_LIGHT_MUTED,
    }
  );

  // =======================================================
  // DIVIDER
  // =======================================================

  const dividerY =
    top -
    62;

  page.drawLine({
    start: {
      x:
        MARGIN_X,

      y:
        dividerY,
    },

    end: {
      x:
        PAGE_WIDTH -
        MARGIN_X,

      y:
        dividerY,
    },

    thickness:
      0.7,

    color:
      COLOR_BORDER,
  });

  // =======================================================
  // META FIELDS
  // =======================================================

  const metaTop =
    dividerY -
    18;

  const columnWidth =
    (
      PAGE_WIDTH -
      MARGIN_X *
        2 -
      36
    ) /
    3;

  const x1 =
    MARGIN_X;

  const x2 =
    MARGIN_X +
    columnWidth +
    18;

  const x3 =
    MARGIN_X +
    (
      columnWidth +
      18
    ) *
      2;

  drawMetaField(
    page,
    fonts,
    "DATE RANGE",
    getDateRangeLabel(
      filters.dateFrom,
      filters.dateTo
    ),
    x1,
    metaTop,
    columnWidth
  );

  drawMetaField(
    page,
    fonts,
    "REASON",
    getReasonLabel(
      filters.reason
    ),
    x2,
    metaTop,
    columnWidth
  );

  drawMetaField(
    page,
    fonts,
    "GENERATED",
    formatGeneratedDate(
      generatedAt
    ),
    x3,
    metaTop,
    columnWidth
  );

  const secondRowY =
    metaTop -
    46;

  drawMetaField(
    page,
    fonts,
    "PRODUCT SEARCH",
    filters.search
      ? compactText(
          filters.search,
          70
        )
      : "All Products",
    x1,
    secondRowY,
    columnWidth
  );

  drawMetaField(
    page,
    fonts,
    "TOTAL WASTE ENTRIES",
    new Intl.NumberFormat(
      "en-US"
    ).format(
      totalEntries
    ),
    x2,
    secondRowY,
    columnWidth
  );

  drawMetaField(
    page,
    fonts,
    "QUANTITY TOTALS BY UOM",
    `ml: ${formatQuantity(
      totals.ml
    )} | gram: ${formatQuantity(
      totals.gram
    )} | pc: ${formatQuantity(
      totals.pc
    )}`,
    x3,
    secondRowY,
    columnWidth
  );

  return secondRowY -
    42;
}

// =========================================================
// CONTINUATION HEADER
// =========================================================

function drawContinuationHeader(
  page:
    PDFPage,

  fonts:
    PdfFonts,

  locationName:
    string,

  locationCode:
    string
): number {
  const top =
    PAGE_HEIGHT -
    TOP_MARGIN;

  page.drawText(
    "ORDER ME SYSTEM BY FORZA",
    {
      x:
        MARGIN_X,

      y:
        top,

      size:
        8,

      font:
        fonts.bold,

      color:
        COLOR_BRAND,
    }
  );

  page.drawText(
    "WASTE REPORT - CONTINUED",
    {
      x:
        MARGIN_X,

      y:
        top -
        25,

      size:
        15,

      font:
        fonts.bold,

      color:
        COLOR_BLACK,
    }
  );

  const locationText =
    `${locationName} (${locationCode})`;

  const locationWidth =
    fonts.regular.widthOfTextAtSize(
      locationText,
      8
    );

  page.drawText(
    locationText,
    {
      x:
        PAGE_WIDTH -
        MARGIN_X -
        locationWidth,

      y:
        top -
        20,

      size:
        8,

      font:
        fonts.regular,

      color:
        COLOR_MUTED,
    }
  );

  const dividerY =
    top -
    43;

  page.drawLine({
    start: {
      x:
        MARGIN_X,

      y:
        dividerY,
    },

    end: {
      x:
        PAGE_WIDTH -
        MARGIN_X,

      y:
        dividerY,
    },

    thickness:
      0.7,

    color:
      COLOR_BORDER,
  });

  return dividerY -
    16;
}

// =========================================================
// TABLE HEADER
// =========================================================

function drawTableHeader(
  page:
    PDFPage,

  fonts:
    PdfFonts,

  y:
    number
): number {
  page.drawRectangle({
    x:
      TABLE_X,

    y:
      y -
      TABLE_HEADER_HEIGHT,

    width:
      TABLE_WIDTH,

    height:
      TABLE_HEADER_HEIGHT,

    color:
      COLOR_HEADER_BG,

    borderColor:
      COLOR_BORDER,

    borderWidth:
      0.7,
  });

  let x =
    TABLE_X;

  for (
    const column of
    TABLE_COLUMNS
  ) {
    drawAlignedText(
      page,
      column.label,
      fonts.bold,
      7.5,
      x +
        TABLE_CELL_PADDING_X,
      y -
        18,
      column.width -
        TABLE_CELL_PADDING_X *
          2,
      column.align ??
        "left"
    );

    x +=
      column.width;

    if (
      x <
      TABLE_X +
        TABLE_WIDTH
    ) {
      page.drawLine({
        start: {
          x,

          y,
        },

        end: {
          x,

          y:
            y -
            TABLE_HEADER_HEIGHT,
        },

        thickness:
          0.45,

        color:
          COLOR_BORDER,
      });
    }
  }

  return y -
    TABLE_HEADER_HEIGHT;
}

// =========================================================
// TABLE ROW
// =========================================================

function drawTableRow(
  page:
    PDFPage,

  fonts:
    PdfFonts,

  row:
    WasteRecord,

  rowIndex:
    number,

  y:
    number
): number {
  const {
    linesByColumn,
    rowHeight,
  } =
    calculateRowLayout(
      row,
      fonts
    );

  page.drawRectangle({
    x:
      TABLE_X,

    y:
      y -
      rowHeight,

    width:
      TABLE_WIDTH,

    height:
      rowHeight,

    color:
      rowIndex %
        2 ===
      1
        ? COLOR_ROW_ALT
        : COLOR_WHITE,

    borderColor:
      COLOR_BORDER,

    borderWidth:
      0.45,
  });

  let x =
    TABLE_X;

  TABLE_COLUMNS.forEach(
    (
      column,
      columnIndex
    ) => {
      const lines =
        linesByColumn[
          columnIndex
        ];

      lines.forEach(
        (
          line,
          lineIndex
        ) => {
          drawAlignedText(
            page,
            line,
            column.key ===
              "qty"
              ? fonts.bold
              : fonts.regular,
            BODY_FONT_SIZE,
            x +
              TABLE_CELL_PADDING_X,
            y -
              TABLE_CELL_PADDING_Y -
              BODY_FONT_SIZE -
              lineIndex *
                BODY_LINE_HEIGHT,
            column.width -
              TABLE_CELL_PADDING_X *
                2,
            column.align ??
              "left"
          );
        }
      );

      x +=
        column.width;

      if (
        x <
        TABLE_X +
          TABLE_WIDTH
      ) {
        page.drawLine({
          start: {
            x,

            y,
          },

          end: {
            x,

            y:
              y -
              rowHeight,
          },

          thickness:
            0.45,

          color:
            COLOR_BORDER,
        });
      }
    }
  );

  return y -
    rowHeight;
}

// =========================================================
// EMPTY TABLE
// =========================================================

function drawEmptyState(
  page:
    PDFPage,

  fonts:
    PdfFonts,

  y:
    number
): number {
  const height =
    58;

  page.drawRectangle({
    x:
      TABLE_X,

    y:
      y -
      height,

    width:
      TABLE_WIDTH,

    height,

    color:
      COLOR_WHITE,

    borderColor:
      COLOR_BORDER,

    borderWidth:
      0.7,
  });

  const message =
    "No Waste records were found for the selected report filters.";

  const messageWidth =
    fonts.regular.widthOfTextAtSize(
      message,
      9
    );

  page.drawText(
    message,
    {
      x:
        TABLE_X +
        Math.max(
          0,
          (
            TABLE_WIDTH -
            messageWidth
          ) /
            2
        ),

      y:
        y -
        33,

      size:
        9,

      font:
        fonts.regular,

      color:
        COLOR_MUTED,
    }
  );

  return y -
    height;
}

// =========================================================
// FOOTERS
// =========================================================

function drawFooters(
  pages:
    PDFPage[],

  fonts:
    PdfFonts
) {
  const totalPages =
    pages.length;

  pages.forEach(
    (
      page,
      index
    ) => {
      page.drawLine({
        start: {
          x:
            MARGIN_X,

          y:
            28,
        },

        end: {
          x:
            PAGE_WIDTH -
            MARGIN_X,

          y:
            28,
        },

        thickness:
          0.6,

        color:
          COLOR_BORDER,
      });

      const footerText =
        "Human and Technology System | Developed by Chef Alex";

      page.drawText(
        footerText,
        {
          x:
            MARGIN_X,

          y:
            14,

          size:
            7.5,

          font:
            fonts.regular,

          color:
            COLOR_LIGHT_MUTED,
        }
      );

      const pageText =
        `Page ${index + 1} of ${totalPages}`;

      const pageTextWidth =
        fonts.regular.widthOfTextAtSize(
          pageText,
          7.5
        );

      page.drawText(
        pageText,
        {
          x:
            PAGE_WIDTH -
            MARGIN_X -
            pageTextWidth,

          y:
            14,

          size:
            7.5,

          font:
            fonts.regular,

          color:
            COLOR_LIGHT_MUTED,
        }
      );
    }
  );
}

// =========================================================
// GENERATE PDF
// =========================================================

async function generateWastePdf(
  rows:
    WasteRecord[],

  locationName:
    string,

  locationCode:
    string,

  filters:
    WasteReportFilters,

  requestUrl:
    string
): Promise<
  Uint8Array
> {
  const pdfDocument =
    await PDFDocument.create();

  pdfDocument.setTitle(
    `Waste Report - ${locationName}`
  );

  pdfDocument.setSubject(
    "Order Me System by Forza - Waste Report"
  );

  pdfDocument.setAuthor(
    "Chef Alex"
  );

  pdfDocument.setCreator(
    "Order Me System by Forza"
  );

  pdfDocument.setProducer(
    "Order Me System by Forza"
  );

  // =======================================================
  // UNICODE
  // =======================================================

  pdfDocument.registerFontkit(
    fontkit
  );

  const fontBytes =
    await loadUnicodeFontBytes(
      requestUrl
    );

  const fonts:
    PdfFonts = {
    regular:
      await pdfDocument.embedFont(
        fontBytes.regular
      ),

    bold:
      await pdfDocument.embedFont(
        fontBytes.bold
      ),
  };

  // =======================================================
  // SUMMARY
  // =======================================================

  const quantityTotals =
    calculateQuantityTotals(
      rows
    );

  const generatedAt =
    new Date();

  // =======================================================
  // FIRST PAGE
  // =======================================================

  let page =
    pdfDocument.addPage([
      PAGE_WIDTH,
      PAGE_HEIGHT,
    ]);

  let y =
    drawReportHeader(
      page,
      fonts,
      locationName,
      locationCode,
      filters,
      rows.length,
      quantityTotals,
      generatedAt
    );

  y =
    drawTableHeader(
      page,
      fonts,
      y
    );

  // =======================================================
  // ROWS
  // =======================================================

  if (
    rows.length ===
    0
  ) {
    drawEmptyState(
      page,
      fonts,
      y
    );
  } else {
    for (
      let index =
        0;
      index <
      rows.length;
      index +=
        1
    ) {
      const row =
        rows[
          index
        ];

      const {
        rowHeight,
      } =
        calculateRowLayout(
          row,
          fonts
        );

      if (
        y -
          rowHeight <
        CONTENT_BOTTOM
      ) {
        page =
          pdfDocument.addPage([
            PAGE_WIDTH,
            PAGE_HEIGHT,
          ]);

        y =
          drawContinuationHeader(
            page,
            fonts,
            locationName,
            locationCode
          );

        y =
          drawTableHeader(
            page,
            fonts,
            y
          );
      }

      y =
        drawTableRow(
          page,
          fonts,
          row,
          index,
          y
        );
    }
  }

  // =======================================================
  // FOOTERS
  // =======================================================

  drawFooters(
    pdfDocument.getPages(),
    fonts
  );

  return pdfDocument.save();
}

// =========================================================
// RESPONSE BODY
// =========================================================
//
// Keeps Next.js / TypeScript BodyInit compatibility.
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
// FILE NAME
// =========================================================

function createFileName(
  locationCode:
    string,

  filters:
    WasteReportFilters
): string {
  const safeLocation =
    locationCode
      .replace(
        /[^A-Za-z0-9_-]/g,
        ""
      )
      .toUpperCase() ||
    "LOCATION";

  if (
    filters.dateFrom &&
    filters.dateTo
  ) {
    return `waste-report-${safeLocation}-${filters.dateFrom}-to-${filters.dateTo}`;
  }

  if (
    filters.dateFrom
  ) {
    return `waste-report-${safeLocation}-from-${filters.dateFrom}`;
  }

  if (
    filters.dateTo
  ) {
    return `waste-report-${safeLocation}-to-${filters.dateTo}`;
  }

  return `waste-report-${safeLocation}`;
}

// =========================================================
// GET
// =========================================================

export async function GET(
  request:
    Request
) {
  try {
    // =====================================================
    // TRUSTED LOCATION
    // =====================================================

    const location =
      await requireDatabaseLocation();

    // =====================================================
    // FILTERS
    // =====================================================

    const url =
      new URL(
        request.url
      );

    const filters =
      getReportFilters(
        url
      );

    // =====================================================
    // LOCATION-SCOPED WASTE DATA
    // =====================================================

    const rows =
      await getWasteReportRows({
        search:
          filters.search,

        reason:
          filters.reason,

        dateFrom:
          filters.dateFrom,

        dateTo:
          filters.dateTo,
      });

    // =====================================================
    // PDF
    // =====================================================

    const pdfBytes =
      await generateWastePdf(
        rows,
        location.name,
        location.code,
        filters,
        request.url
      );

    const responseBody =
      createPdfResponseBody(
        pdfBytes
      );

    const safeFileName =
      createFileName(
        location.code,
        filters
      );

    return new Response(
      responseBody,
      {
        status:
          200,

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
      "Order Me Waste PDF generation failed:",
      error instanceof Error
        ? error.message
        : "Unknown Waste PDF generation error"
    );

    return new Response(
      "Unable to generate Waste Report PDF.",
      {
        status:
          500,

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