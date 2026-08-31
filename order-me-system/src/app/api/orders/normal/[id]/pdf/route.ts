import fontkit from "@pdf-lib/fontkit";

import {
  PDFDocument,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import {
  getNormalOrderById,
  type NormalOrderItemRecord,
  type NormalOrderRecord,
} from "@/app/orders/normal/actions";

import {
  requireDatabaseLocation,
} from "@/lib/location/database-location";

// =========================================================
// RUNTIME
// =========================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =========================================================
// TYPES
// =========================================================

type NormalOrderPdfRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

type PdfFonts = {
  regular: PDFFont;
  bold: PDFFont;
};

type TableColumn = {
  key:
    | "number"
    | "sku"
    | "product"
    | "category"
    | "onHand"
    | "requested"
    | "uom";

  label: string;

  width: number;

  align?:
    | "left"
    | "right"
    | "center";
};

// =========================================================
// PAGE CONSTANTS
// =========================================================
//
// A4 landscape in PDF points.
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

const BODY_FONT_SIZE =
  8.5;

const BODY_LINE_HEIGHT =
  10.5;

// =========================================================
// UNICODE FONT
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
  TableColumn[] = [
    {
      key:
        "number",

      label:
        "#",

      width:
        30,

      align:
        "center",
    },

    {
      key:
        "sku",

      label:
        "SKU",

      width:
        100,
    },

    {
      key:
        "product",

      label:
        "Product",

      width:
        180,
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
        "onHand",

      label:
        "On Hand Qty",

      width:
        92,

      align:
        "right",
    },

    {
      key:
        "requested",

      label:
        "Order Request Qty",

      width:
        108,

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

// =========================================================
// PDF TEXT
// =========================================================
//
// Preserve Unicode characters exactly.
//
// No Cyrillic transliteration.
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
// FORMAT QUANTITY
// =========================================================

function formatQuantity(
  value: number
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
// FORMAT ORDER DATE
// =========================================================

function formatOrderDate(
  value: string
): string {
  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    return value;
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

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
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
        "long",

      day:
        "2-digit",

      timeZone:
        "UTC",
    }
  ).format(date);
}

// =========================================================
// STATUS LABEL
// =========================================================

function formatStatus(
  value: string
): string {
  if (!value) {
    return "Draft";
  }

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

// =========================================================
// WRAP TEXT
// =========================================================

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const normalized =
    pdfText(
      text
    )
      .trim()
      .replace(
        /\s+/g,
        " "
      );

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
    string[] = [];

  let currentLine =
    "";

  function pushLongWord(
    word: string
  ) {
    let segment =
      "";

    for (
      const character of
      word
    ) {
      const testSegment =
        `${segment}${character}`;

      const width =
        font.widthOfTextAtSize(
          testSegment,
          fontSize
        );

      if (
        width >
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
          testSegment;
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

      currentLine =
        "";
    }

    const wordWidth =
      font.widthOfTextAtSize(
        word,
        fontSize
      );

    if (
      wordWidth >
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
// DRAW TEXT ALIGNED
// =========================================================

function drawAlignedText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  fontSize: number,
  x: number,
  y: number,
  width: number,
  align:
    | "left"
    | "right"
    | "center" =
    "left",
  color =
    COLOR_DARK
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

      color,
    }
  );
}

// =========================================================
// DRAW PAGE BRAND HEADER
// =========================================================

function drawPageBrandHeader(
  page: PDFPage,
  fonts: PdfFonts
) {
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
        15,

      font:
        fonts.bold,

      color:
        COLOR_BLACK,
    }
  );

  page.drawText(
    "Human and Technology System",
    {
      x:
        MARGIN_X,

      y:
        top -
        16,

      size:
        8.5,

      font:
        fonts.regular,

      color:
        COLOR_MUTED,
    }
  );

  page.drawLine({
    start: {
      x:
        MARGIN_X,

      y:
        top -
        28,
    },

    end: {
      x:
        PAGE_WIDTH -
        MARGIN_X,

      y:
        top -
        28,
    },

    thickness:
      1.2,

    color:
      COLOR_BRAND,
  });
}

// =========================================================
// DRAW ORDER HEADER
// =========================================================

function drawOrderHeader(
  page: PDFPage,
  fonts: PdfFonts,
  order: NormalOrderRecord,
  locationName: string,
  locationCode: string
): number {
  drawPageBrandHeader(
    page,
    fonts
  );

  let y =
    PAGE_HEIGHT -
    TOP_MARGIN -
    54;

  page.drawText(
    "NORMAL ORDER",
    {
      x:
        MARGIN_X,

      y,

      size:
        22,

      font:
        fonts.bold,

      color:
        COLOR_BLACK,
    }
  );

  y -=
    27;

  const labelWidth =
    90;

  const firstColumnX =
    MARGIN_X;

  const secondColumnX =
    MARGIN_X +
    370;

  const drawDetail = (
    label: string,
    value: string,
    x: number,
    detailY: number
  ) => {
    page.drawText(
      label,
      {
        x,

        y:
          detailY,

        size:
          8,

        font:
          fonts.bold,

        color:
          COLOR_MUTED,
      }
    );

    page.drawText(
      pdfText(
        value
      ),
      {
        x:
          x +
          labelWidth,

        y:
          detailY,

        size:
          9.5,

        font:
          fonts.bold,

        color:
          COLOR_DARK,
      }
    );
  };

  drawDetail(
    "Location:",
    `${locationName} (${locationCode})`,
    firstColumnX,
    y
  );

  drawDetail(
    "Order Number:",
    order.order_number,
    secondColumnX,
    y
  );

  y -=
    18;

  drawDetail(
    "Date:",
    formatOrderDate(
      order.order_date
    ),
    firstColumnX,
    y
  );

  drawDetail(
    "Status:",
    formatStatus(
      order.status
    ),
    secondColumnX,
    y
  );

  y -=
    18;

  drawDetail(
    "Ordered By:",
    order.ordered_by,
    firstColumnX,
    y
  );

  drawDetail(
    "Products:",
    String(
      order.items.length
    ),
    secondColumnX,
    y
  );

  y -=
    24;

  return y;
}

// =========================================================
// DRAW CONTINUATION HEADER
// =========================================================

function drawContinuationHeader(
  page: PDFPage,
  fonts: PdfFonts,
  orderNumber: string
): number {
  drawPageBrandHeader(
    page,
    fonts
  );

  let y =
    PAGE_HEIGHT -
    TOP_MARGIN -
    54;

  page.drawText(
    "NORMAL ORDER - CONTINUED",
    {
      x:
        MARGIN_X,

      y,

      size:
        14,

      font:
        fonts.bold,

      color:
        COLOR_BLACK,
    }
  );

  const orderText =
    `Order Number: ${pdfText(
      orderNumber
    )}`;

  const orderWidth =
    fonts.bold.widthOfTextAtSize(
      orderText,
      9
    );

  page.drawText(
    orderText,
    {
      x:
        PAGE_WIDTH -
        MARGIN_X -
        orderWidth,

      y:
        y +
        1,

      size:
        9,

      font:
        fonts.bold,

      color:
        COLOR_MUTED,
    }
  );

  y -=
    24;

  return y;
}

// =========================================================
// DRAW TABLE HEADER
// =========================================================

function drawTableHeader(
  page: PDFPage,
  fonts: PdfFonts,
  y: number
): number {
  const tableX =
    MARGIN_X;

  page.drawRectangle({
    x:
      tableX,

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
      0.8,
  });

  let x =
    tableX;

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
        "left",
      COLOR_DARK
    );

    x +=
      column.width;

    if (
      x <
      tableX +
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
          0.5,

        color:
          COLOR_BORDER,
      });
    }
  }

  return (
    y -
    TABLE_HEADER_HEIGHT
  );
}

// =========================================================
// CELL VALUE
// =========================================================

function getItemCellValue(
  item: NormalOrderItemRecord,
  index: number,
  key: TableColumn["key"]
): string {
  switch (key) {
    case "number":
      return String(
        index + 1
      );

    case "sku":
      return item.sku_snapshot;

    case "product":
      return item.product_name_snapshot;

    case "category":
      return item.category_name_snapshot;

    case "onHand":
      return formatQuantity(
        item.on_hand_qty
      );

    case "requested":
      return formatQuantity(
        item.requested_qty
      );

    case "uom":
      return item.uom;

    default:
      return "";
  }
}

// =========================================================
// CALCULATE ROW LAYOUT
// =========================================================

function calculateRowLines(
  item: NormalOrderItemRecord,
  index: number,
  fonts: PdfFonts
): {
  linesByColumn: string[][];
  rowHeight: number;
} {
  const linesByColumn =
    TABLE_COLUMNS.map(
      (
        column
      ) => {
        const text =
          getItemCellValue(
            item,
            index,
            column.key
          );

        return wrapText(
          text,
          fonts.regular,
          BODY_FONT_SIZE,
          column.width -
            TABLE_CELL_PADDING_X *
              2
        );
      }
    );

  const maximumLines =
    Math.max(
      ...linesByColumn.map(
        (
          lines
        ) =>
          lines.length
      )
    );

  const rowHeight =
    Math.max(
      26,
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
// DRAW TABLE ROW
// =========================================================

function drawTableRow(
  page: PDFPage,
  fonts: PdfFonts,
  item: NormalOrderItemRecord,
  index: number,
  y: number
): number {
  const {
    linesByColumn,
    rowHeight,
  } =
    calculateRowLines(
      item,
      index,
      fonts
    );

  const tableX =
    MARGIN_X;

  page.drawRectangle({
    x:
      tableX,

    y:
      y -
      rowHeight,

    width:
      TABLE_WIDTH,

    height:
      rowHeight,

    color:
      COLOR_WHITE,

    borderColor:
      COLOR_BORDER,

    borderWidth:
      0.55,
  });

  let x =
    tableX;

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
              "requested"
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
              "left",
            column.key ===
              "requested"
              ? COLOR_BLACK
              : COLOR_DARK
          );
        }
      );

      x +=
        column.width;

      if (
        x <
        tableX +
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

  return (
    y -
    rowHeight
  );
}

// =========================================================
// FOOTERS
// =========================================================

function drawFooters(
  pages: PDFPage[],
  fonts: PdfFonts
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
// GENERATE NORMAL ORDER PDF
// =========================================================

async function generateNormalOrderPdf(
  order: NormalOrderRecord,
  locationName: string,
  locationCode: string,
  fontBaseUrl: string
): Promise<Uint8Array> {
  const pdfDocument =
    await PDFDocument.create();

  pdfDocument.setTitle(
    `Normal Order ${order.order_number}`
  );

  pdfDocument.setSubject(
    "Order Me System by Forza - Normal Order"
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
  // REGISTER UNICODE FONTKIT
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

  let page =
    pdfDocument.addPage([
      PAGE_WIDTH,
      PAGE_HEIGHT,
    ]);

  let y =
    drawOrderHeader(
      page,
      fonts,
      order,
      locationName,
      locationCode
    );

  y =
    drawTableHeader(
      page,
      fonts,
      y
    );

  // =======================================================
  // PRODUCT ROWS
  // =======================================================

  for (
    let index = 0;
    index <
    order.items.length;
    index += 1
  ) {
    const item =
      order.items[
        index
      ];

    const {
      rowHeight,
    } =
      calculateRowLines(
        item,
        index,
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
          order.order_number
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
        item,
        index,
        y
      );
  }

  // =======================================================
  // EMPTY ITEM SAFETY
  // =======================================================

  if (
    order.items.length ===
    0
  ) {
    page.drawText(
      "No Product rows are available for this Normal Order.",
      {
        x:
          MARGIN_X +
          8,

        y:
          y -
          24,

        size:
          9,

        font:
          fonts.regular,

        color:
          COLOR_MUTED,
      }
    );
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
// CONVERT PDF BYTES TO RESPONSE ARRAYBUFFER
// =========================================================
//
// pdf-lib returns:
//
// Uint8Array<ArrayBufferLike>
//
// Newer TypeScript / Next.js DOM typings do not accept that
// generic directly as BodyInit because ArrayBufferLike may
// theoretically also represent SharedArrayBuffer.
//
// Copying the PDF bytes into a fresh Uint8Array guarantees
// that its backing buffer is a standard ArrayBuffer.
//
// No PDF data or content is altered.
// =========================================================

function createPdfResponseBody(
  pdfBytes: Uint8Array
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
// GET
// =========================================================

export async function GET(
  request: Request,
  {
    params,
  }: NormalOrderPdfRouteProps
) {
  // =======================================================
  // TRUSTED LOCATION
  // =======================================================

  const location =
    await requireDatabaseLocation();

  const {
    id,
  } = await params;

  // =======================================================
  // LOCATION-SCOPED ORDER
  // =======================================================

  const order =
    await getNormalOrderById(
      id
    );

  if (
    !order ||
    order.location_id !==
      location.id
  ) {
    return new Response(
      "Normal Order not found.",
      {
        status:
          404,

        headers: {
          "Content-Type":
            "text/plain; charset=utf-8",

          "Cache-Control":
            "private, no-store",
        },
      }
    );
  }

  // =======================================================
  // PDF
  // =======================================================

  try {
    const pdfBytes =
      await generateNormalOrderPdf(
        order,
        location.name,
        location.code,
        request.url
      );

    // =====================================================
    // NEXT.JS / TYPESCRIPT BODYINIT COMPATIBILITY
    // =====================================================

    const responseBody =
      createPdfResponseBody(
        pdfBytes
      );

    const safeFileName =
      order.order_number.replace(
        /[^A-Za-z0-9_-]/g,
        "_"
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
  } catch (error) {
    console.error(
      "Order Me Normal Order PDF generation failed:",
      error instanceof Error
        ? error.message
        : "Unknown PDF generation error"
    );

    return new Response(
      "Unable to generate Normal Order PDF.",
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