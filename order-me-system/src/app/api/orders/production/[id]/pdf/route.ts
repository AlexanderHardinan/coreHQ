import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import {
  getProductionOrderById,
  type ProductionOrderItemRecord,
  type ProductionOrderRecipeRecord,
  type ProductionOrderRecord,
} from "@/app/orders/production/actions";

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

type ProductionOrderPdfRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

type PdfFonts = {
  regular: PDFFont;
  bold: PDFFont;
};

type TextAlignment =
  | "left"
  | "right"
  | "center";

type RecipeTableColumn = {
  key:
    | "number"
    | "recipe"
    | "baseYield"
    | "requiredYield"
    | "multiplier";

  label: string;
  width: number;
  align?: TextAlignment;
};

type IngredientTableColumn = {
  key:
    | "number"
    | "sku"
    | "ingredient"
    | "required"
    | "onHand"
    | "requested"
    | "uom";

  label: string;
  width: number;
  align?: TextAlignment;
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
  8.25;

const BODY_LINE_HEIGHT =
  10.25;

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

const COLOR_SECTION_BG =
  rgb(
    0.985,
    0.985,
    0.988
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
// PRODUCTION SUMMARY TABLE
// =========================================================

const RECIPE_COLUMNS:
  RecipeTableColumn[] = [
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
        "recipe",

      label:
        "Recipe",

      width:
        300,
    },

    {
      key:
        "baseYield",

      label:
        "Base Yield",

      width:
        150,

      align:
        "right",
    },

    {
      key:
        "requiredYield",

      label:
        "Required Yield",

      width:
        150,

      align:
        "right",
    },

    {
      key:
        "multiplier",

      label:
        "Multiplier",

      width:
        139,

      align:
        "right",
    },
  ];

const RECIPE_TABLE_WIDTH =
  RECIPE_COLUMNS.reduce(
    (
      total,
      column
    ) =>
      total +
      column.width,
    0
  );

// =========================================================
// INGREDIENT TABLE
// =========================================================

const INGREDIENT_COLUMNS:
  IngredientTableColumn[] = [
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
        90,
    },

    {
      key:
        "ingredient",

      label:
        "Ingredient",

      width:
        254,
    },

    {
      key:
        "required",

      label:
        "Required Qty",

      width:
        105,

      align:
        "right",
    },

    {
      key:
        "onHand",

      label:
        "On Hand Qty",

      width:
        100,

      align:
        "right",
    },

    {
      key:
        "requested",

      label:
        "Order Request Qty",

      width:
        120,

      align:
        "right",
    },

    {
      key:
        "uom",

      label:
        "UOM",

      width:
        70,

      align:
        "center",
    },
  ];

const INGREDIENT_TABLE_WIDTH =
  INGREDIENT_COLUMNS.reduce(
    (
      total,
      column
    ) =>
      total +
      column.width,
    0
  );

// =========================================================
// PDF SAFE TEXT
// =========================================================
//
// Keep the same safe-text behavior as the current working
// Normal Order PDF implementation.
//
// Standard Helvetica does not contain full Unicode coverage,
// so unsupported Cyrillic characters are transliterated.
// =========================================================

function pdfSafeText(
  value:
    | string
    | number
    | null
    | undefined
): string {
  const normalized =
    String(
      value ??
      ""
    )
      .replace(
        /[\u2018\u2019]/g,
        "'"
      )
      .replace(
        /[\u201C\u201D]/g,
        '"'
      )
      .replace(
        /[\u2013\u2014]/g,
        "-"
      )
      .replace(
        /\u2026/g,
        "..."
      )
      .replace(
        /\u00a0/g,
        " "
      )
      .replace(
        /\u20ac/g,
        "EUR"
      )
      .replace(
        /\u00d7/g,
        "x"
      )
      .replace(
        /\u00b0/g,
        " deg"
      )
      .normalize(
        "NFKD"
      )
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,
        ""
      );

  const cyrillicToLatin:
    Record<string, string> = {
      А: "A",
      Б: "B",
      В: "V",
      Г: "G",
      Д: "D",
      Ѓ: "Gj",
      Е: "E",
      Ж: "Zh",
      З: "Z",
      Ѕ: "Dz",
      И: "I",
      Ј: "J",
      К: "K",
      Л: "L",
      Љ: "Lj",
      М: "M",
      Н: "N",
      Њ: "Nj",
      О: "O",
      П: "P",
      Р: "R",
      С: "S",
      Т: "T",
      Ќ: "Kj",
      У: "U",
      Ф: "F",
      Х: "H",
      Ц: "C",
      Ч: "Ch",
      Џ: "Dzh",
      Ш: "Sh",
      Ђ: "Dj",
      Ћ: "C",
      Ї: "Yi",
      І: "I",
      Є: "Ye",
      Ґ: "G",
      Ё: "Yo",
      Й: "Y",
      Щ: "Shch",
      Ъ: "",
      Ы: "Y",
      Ь: "",
      Э: "E",
      Ю: "Yu",
      Я: "Ya",

      а: "a",
      б: "b",
      в: "v",
      г: "g",
      д: "d",
      ѓ: "gj",
      е: "e",
      ж: "zh",
      з: "z",
      ѕ: "dz",
      и: "i",
      ј: "j",
      к: "k",
      л: "l",
      љ: "lj",
      м: "m",
      н: "n",
      њ: "nj",
      о: "o",
      п: "p",
      р: "r",
      с: "s",
      т: "t",
      ќ: "kj",
      у: "u",
      ф: "f",
      х: "h",
      ц: "c",
      ч: "ch",
      џ: "dzh",
      ш: "sh",
      ђ: "dj",
      ћ: "c",
      ї: "yi",
      і: "i",
      є: "ye",
      ґ: "g",
      ё: "yo",
      й: "y",
      щ: "shch",
      ъ: "",
      ы: "y",
      ь: "",
      э: "e",
      ю: "yu",
      я: "ya",
    };

  let safeText =
    "";

  for (
    const character of
    normalized
  ) {
    const transliterated =
      cyrillicToLatin[
        character
      ];

    if (
      transliterated !==
      undefined
    ) {
      safeText +=
        transliterated;

      continue;
    }

    const codePoint =
      character.codePointAt(
        0
      ) ??
      0;

    if (
      codePoint >=
        32 &&
      codePoint <=
        126
    ) {
      safeText +=
        character;

      continue;
    }

    safeText +=
      "?";
  }

  return safeText;
}

// =========================================================
// FORMAT DECIMAL
// =========================================================
//
// Production Order NUMERIC values are represented as strings.
// Format them without converting the database value through
// floating-point arithmetic.
// =========================================================

function formatDecimal(
  value:
    | string
    | number
    | null
    | undefined,
  maximumFractionDigits:
    number = 4
): string {
  const raw =
    String(
      value ??
      ""
    ).trim();

  if (
    !/^-?\d+(?:\.\d+)?$/.test(
      raw
    )
  ) {
    return "0";
  }

  const negative =
    raw.startsWith(
      "-"
    );

  const unsigned =
    negative
      ? raw.slice(
          1
        )
      : raw;

  const [
    wholeRaw,
    fractionRaw = "",
  ] =
    unsigned.split(
      "."
    );

  const normalizedWhole =
    wholeRaw.replace(
      /^0+(?=\d)/,
      ""
    ) ||
    "0";

  const groupedWhole =
    normalizedWhole.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      ","
    );

  const fraction =
    fractionRaw
      .slice(
        0,
        Math.max(
          0,
          maximumFractionDigits
        )
      )
      .replace(
        /0+$/,
        ""
      );

  const result =
    fraction
      ? `${groupedWhole}.${fraction}`
      : groupedWhole;

  return negative
    ? `-${result}`
    : result;
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

  if (
    !match
  ) {
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
        month -
          1,
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
  ).format(
    date
  );
}

// =========================================================
// STATUS LABEL
// =========================================================

function formatStatus(
  value: string
): string {
  if (
    !value
  ) {
    return "Draft";
  }

  return (
    value
      .charAt(
        0
      )
      .toUpperCase() +
    value.slice(
      1
    )
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
    pdfSafeText(
      text
    )
      .trim()
      .replace(
        /\s+/g,
        " "
      );

  if (
    !normalized
  ) {
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
// DRAW ALIGNED TEXT
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
    TextAlignment =
      "left",
  color =
    COLOR_DARK
) {
  const safeText =
    pdfSafeText(
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
  order:
    ProductionOrderRecord,
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
    "BATCH PRODUCTION ORDER",
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
    112;

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
      pdfSafeText(
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
    "Production Order:",
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
    "Recipes / Ingredients:",
    `${order.recipes.length} / ${order.items.length}`,
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
    "BATCH PRODUCTION ORDER - CONTINUED",
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
    `Production Order: ${pdfSafeText(
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
// DRAW SECTION TITLE
// =========================================================

function drawSectionTitle(
  page: PDFPage,
  fonts: PdfFonts,
  title: string,
  subtitle: string,
  y: number
): number {
  const sectionHeight =
    38;

  page.drawRectangle({
    x:
      MARGIN_X,

    y:
      y -
      sectionHeight,

    width:
      PAGE_WIDTH -
      MARGIN_X *
        2,

    height:
      sectionHeight,

    color:
      COLOR_SECTION_BG,

    borderColor:
      COLOR_BORDER,

    borderWidth:
      0.6,
  });

  page.drawText(
    pdfSafeText(
      title
    ),
    {
      x:
        MARGIN_X +
        10,

      y:
        y -
        15,

      size:
        10,

      font:
        fonts.bold,

      color:
        COLOR_BLACK,
    }
  );

  page.drawText(
    pdfSafeText(
      subtitle
    ),
    {
      x:
        MARGIN_X +
        10,

      y:
        y -
        29,

      size:
        7.5,

      font:
        fonts.regular,

      color:
        COLOR_MUTED,
    }
  );

  return (
    y -
    sectionHeight
  );
}

// =========================================================
// DRAW GENERIC TABLE HEADER
// =========================================================

function drawTableHeader<
  T extends {
    label: string;
    width: number;
    align?: TextAlignment;
  },
>(
  page: PDFPage,
  fonts: PdfFonts,
  y: number,
  columns: T[],
  tableWidth: number
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
      tableWidth,

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
    columns
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
        tableWidth
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
// RECIPE CELL VALUE
// =========================================================

function getRecipeCellValue(
  recipe:
    ProductionOrderRecipeRecord,
  index: number,
  key:
    RecipeTableColumn["key"]
): string {
  switch (
    key
  ) {
    case "number":
      return String(
        index +
        1
      );

    case "recipe":
      return recipe.recipe_name_snapshot;

    case "baseYield":
      return `${formatDecimal(
        recipe.base_yield_qty_snapshot
      )} ${recipe.yield_uom_snapshot}`;

    case "requiredYield":
      return `${formatDecimal(
        recipe.required_yield_qty
      )} ${recipe.yield_uom_snapshot}`;

    case "multiplier":
      return `${formatDecimal(
        recipe.yield_multiplier,
        10
      )}x`;

    default:
      return "";
  }
}

// =========================================================
// CALCULATE RECIPE ROW
// =========================================================

function calculateRecipeRow(
  recipe:
    ProductionOrderRecipeRecord,
  index: number,
  fonts: PdfFonts
): {
  linesByColumn:
    string[][];

  rowHeight:
    number;
} {
  const linesByColumn =
    RECIPE_COLUMNS.map(
      (
        column
      ) => {
        const text =
          getRecipeCellValue(
            recipe,
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
// DRAW RECIPE ROW
// =========================================================

function drawRecipeRow(
  page: PDFPage,
  fonts: PdfFonts,
  recipe:
    ProductionOrderRecipeRecord,
  index: number,
  y: number
): number {
  const {
    linesByColumn,
    rowHeight,
  } =
    calculateRecipeRow(
      recipe,
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
      RECIPE_TABLE_WIDTH,

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

  RECIPE_COLUMNS.forEach(
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
          const bold =
            column.key ===
              "recipe" ||
            column.key ===
              "requiredYield";

          drawAlignedText(
            page,
            line,
            bold
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
            bold
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
          RECIPE_TABLE_WIDTH
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
// INGREDIENT CELL VALUE
// =========================================================

function getIngredientCellValue(
  item:
    ProductionOrderItemRecord,
  index: number,
  key:
    IngredientTableColumn["key"]
): string {
  switch (
    key
  ) {
    case "number":
      return String(
        index +
        1
      );

    case "sku":
      return item.sku_snapshot;

    case "ingredient":
      return item.product_name_snapshot;

    case "required":
      return formatDecimal(
        item.required_qty
      );

    case "onHand":
      return formatDecimal(
        item.on_hand_qty
      );

    case "requested":
      return formatDecimal(
        item.requested_qty
      );

    case "uom":
      return item.uom;

    default:
      return "";
  }
}

// =========================================================
// CALCULATE INGREDIENT ROW
// =========================================================

function calculateIngredientRow(
  item:
    ProductionOrderItemRecord,
  index: number,
  fonts: PdfFonts
): {
  linesByColumn:
    string[][];

  rowHeight:
    number;
} {
  const linesByColumn =
    INGREDIENT_COLUMNS.map(
      (
        column
      ) => {
        const text =
          getIngredientCellValue(
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
// DRAW INGREDIENT ROW
// =========================================================

function drawIngredientRow(
  page: PDFPage,
  fonts: PdfFonts,
  item:
    ProductionOrderItemRecord,
  index: number,
  y: number
): number {
  const {
    linesByColumn,
    rowHeight,
  } =
    calculateIngredientRow(
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
      INGREDIENT_TABLE_WIDTH,

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

  INGREDIENT_COLUMNS.forEach(
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
          const bold =
            column.key ===
              "ingredient" ||
            column.key ===
              "requested";

          drawAlignedText(
            page,
            line,
            bold
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
            bold
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
          INGREDIENT_TABLE_WIDTH
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
// EMPTY SECTION MESSAGE
// =========================================================

function drawEmptyMessage(
  page: PDFPage,
  fonts: PdfFonts,
  message: string,
  y: number
): number {
  const rowHeight =
    34;

  page.drawRectangle({
    x:
      MARGIN_X,

    y:
      y -
      rowHeight,

    width:
      PAGE_WIDTH -
      MARGIN_X *
        2,

    height:
      rowHeight,

    color:
      COLOR_WHITE,

    borderColor:
      COLOR_BORDER,

    borderWidth:
      0.55,
  });

  page.drawText(
    pdfSafeText(
      message
    ),
    {
      x:
        MARGIN_X +
        8,

      y:
        y -
        21,

      size:
        8.5,

      font:
        fonts.regular,

      color:
        COLOR_MUTED,
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
// CREATE CONTINUATION PAGE
// =========================================================

function createContinuationPage(
  pdfDocument:
    PDFDocument,
  fonts:
    PdfFonts,
  orderNumber:
    string
): {
  page: PDFPage;
  y: number;
} {
  const page =
    pdfDocument.addPage([
      PAGE_WIDTH,
      PAGE_HEIGHT,
    ]);

  const y =
    drawContinuationHeader(
      page,
      fonts,
      orderNumber
    );

  return {
    page,
    y,
  };
}

// =========================================================
// GENERATE PRODUCTION ORDER PDF
// =========================================================

async function generateProductionOrderPdf(
  order:
    ProductionOrderRecord,
  locationName: string,
  locationCode: string
): Promise<Uint8Array> {
  const pdfDocument =
    await PDFDocument.create();

  pdfDocument.setTitle(
    `Batch Production Order ${order.order_number}`
  );

  pdfDocument.setSubject(
    "Order Me System by Forza - Batch Production Order"
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

  const fonts:
    PdfFonts = {
    regular:
      await pdfDocument.embedFont(
        StandardFonts.Helvetica
      ),

    bold:
      await pdfDocument.embedFont(
        StandardFonts.HelveticaBold
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

  // =======================================================
  // PRODUCTION SUMMARY
  // =======================================================

  y =
    drawSectionTitle(
      page,
      fonts,
      "PRODUCTION SUMMARY",
      "Saved Production Recipes and calculated yield requirements.",
      y
    );

  y =
    drawTableHeader(
      page,
      fonts,
      y,
      RECIPE_COLUMNS,
      RECIPE_TABLE_WIDTH
    );

  if (
    order.recipes.length ===
    0
  ) {
    y =
      drawEmptyMessage(
        page,
        fonts,
        "No Production Recipe rows are available for this Production Order.",
        y
      );
  } else {
    for (
      let index = 0;
      index <
      order.recipes.length;
      index +=
        1
    ) {
      const recipe =
        order.recipes[
          index
        ];

      const {
        rowHeight,
      } =
        calculateRecipeRow(
          recipe,
          index,
          fonts
        );

      if (
        y -
          rowHeight <
        CONTENT_BOTTOM
      ) {
        const continuation =
          createContinuationPage(
            pdfDocument,
            fonts,
            order.order_number
          );

        page =
          continuation.page;

        y =
          continuation.y;

        y =
          drawSectionTitle(
            page,
            fonts,
            "PRODUCTION SUMMARY",
            "Continued Production Recipe requirements.",
            y
          );

        y =
          drawTableHeader(
            page,
            fonts,
            y,
            RECIPE_COLUMNS,
            RECIPE_TABLE_WIDTH
          );
      }

      y =
        drawRecipeRow(
          page,
          fonts,
          recipe,
          index,
          y
        );
    }
  }

  // =======================================================
  // SPACE BEFORE INGREDIENT SECTION
  // =======================================================

  y -=
    20;

  const ingredientMinimumHeight =
    38 +
    TABLE_HEADER_HEIGHT +
    32;

  if (
    y -
      ingredientMinimumHeight <
    CONTENT_BOTTOM
  ) {
    const continuation =
      createContinuationPage(
        pdfDocument,
        fonts,
        order.order_number
      );

    page =
      continuation.page;

    y =
      continuation.y;
  }

  // =======================================================
  // INGREDIENT REQUIREMENT
  // =======================================================

  y =
    drawSectionTitle(
      page,
      fonts,
      "INGREDIENT REQUIREMENT",
      "Consolidated ingredient quantities after recipe scaling and physical On Hand entry.",
      y
    );

  y =
    drawTableHeader(
      page,
      fonts,
      y,
      INGREDIENT_COLUMNS,
      INGREDIENT_TABLE_WIDTH
    );

  if (
    order.items.length ===
    0
  ) {
    y =
      drawEmptyMessage(
        page,
        fonts,
        "No consolidated Ingredient rows are available for this Production Order.",
        y
      );
  } else {
    for (
      let index = 0;
      index <
      order.items.length;
      index +=
        1
    ) {
      const item =
        order.items[
          index
        ];

      const {
        rowHeight,
      } =
        calculateIngredientRow(
          item,
          index,
          fonts
        );

      if (
        y -
          rowHeight <
        CONTENT_BOTTOM
      ) {
        const continuation =
          createContinuationPage(
            pdfDocument,
            fonts,
            order.order_number
          );

        page =
          continuation.page;

        y =
          continuation.y;

        y =
          drawSectionTitle(
            page,
            fonts,
            "INGREDIENT REQUIREMENT",
            "Continued consolidated ingredient requirements.",
            y
          );

        y =
          drawTableHeader(
            page,
            fonts,
            y,
            INGREDIENT_COLUMNS,
            INGREDIENT_TABLE_WIDTH
          );
      }

      y =
        drawIngredientRow(
          page,
          fonts,
          item,
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
// CONVERT PDF BYTES TO RESPONSE ARRAYBUFFER
// =========================================================
//
// pdf-lib returns Uint8Array<ArrayBufferLike>.
//
// Copying the bytes into a new Uint8Array guarantees a
// standard ArrayBuffer accepted by newer Next.js / DOM
// BodyInit typings.
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
// GET
// =========================================================

export async function GET(
  _request:
    Request,
  {
    params,
  }:
    ProductionOrderPdfRouteProps
) {
  // =======================================================
  // TRUSTED LOCATION
  // =======================================================

  const location =
    await requireDatabaseLocation();

  const {
    id,
  } =
    await params;

  // =======================================================
  // LOCATION-SCOPED PRODUCTION ORDER
  // =======================================================

  const order =
    await getProductionOrderById(
      id
    );

  if (
    !order ||
    order.location_id !==
      location.id
  ) {
    return new Response(
      "Batch Production Order not found.",
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
      await generateProductionOrderPdf(
        order,
        location.name,
        location.code
      );

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
  } catch (
    error
  ) {
    console.error(
      "Order Me Production Order PDF generation failed:",
      error instanceof Error
        ? error.message
        : "Unknown PDF generation error"
    );

    return new Response(
      "Unable to generate Batch Production Order PDF.",
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