import "server-only";

import OpenAI from "openai";

// =========================================================
// TYPES
// =========================================================

export type NormalOrderAiOperation =
  | "add"
  | "update"
  | "remove"
  | "clear";

export type NormalOrderAiRequestedItem = {
  operation: NormalOrderAiOperation;

  productName: string;

  quantity: number | null;

  unit: string | null;
};

export type NormalOrderAiContextItem = {
  productName: string;

  quantity: number;

  unit: string | null;
};

export type NormalOrderAiContext = {
  items: NormalOrderAiContextItem[];
};

export type NormalOrderAiIntent = {
  items: NormalOrderAiRequestedItem[];

  clearOrder: boolean;

  message: string;
};

export type NormalOrderAiResult =
  | {
      success: true;
      intent: NormalOrderAiIntent;
    }
  | {
      success: false;
      message: string;
    };

// =========================================================
// CONSTANTS
// =========================================================

const MODEL =
  "gpt-6-luna";

const MAX_COMMAND_LENGTH =
  2000;

const MAX_ITEMS =
  50;

const MAX_CONTEXT_ITEMS =
  50;

// =========================================================
// OPENAI CLIENT
// =========================================================

let openAiClient:
  OpenAI | null = null;

function getOpenAiClient(): OpenAI {
  const apiKey =
    process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured."
    );
  }

  if (!openAiClient) {
    openAiClient =
      new OpenAI({
        apiKey,
      });
  }

  return openAiClient;
}

// =========================================================
// NORMALIZE COMMAND
// =========================================================

function normalizeCommand(
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
    normalized.length ===
      0 ||
    normalized.length >
      MAX_COMMAND_LENGTH
  ) {
    return null;
  }

  return normalized;
}

// =========================================================
// SAFE NUMBER
// =========================================================

function normalizeQuantity(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    typeof value !==
    "number"
  ) {
    return null;
  }

  if (
    !Number.isFinite(
      value
    ) ||
    value < 0
  ) {
    return null;
  }

  return value;
}

// =========================================================
// SAFE TEXT
// =========================================================

function normalizeText(
  value: unknown,
  maxLength: number
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
      maxLength
    );
}

// =========================================================
// OPERATION
// =========================================================

function normalizeOperation(
  value: unknown
): NormalOrderAiOperation | null {
  if (
    value === "add" ||
    value === "update" ||
    value === "remove" ||
    value === "clear"
  ) {
    return value;
  }

  return null;
}

// =========================================================
// PARSE RESPONSE
// =========================================================

function parseAiResponse(
  value: string
): NormalOrderAiIntent | null {
  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(
        value
      );
  } catch {
    return null;
  }

  if (
    typeof parsed !==
      "object" ||
    parsed === null
  ) {
    return null;
  }

  const candidate =
    parsed as {
      items?: unknown;
      clearOrder?: unknown;
      message?: unknown;
    };

  if (
    !Array.isArray(
      candidate.items
    )
  ) {
    return null;
  }

  if (
    candidate.items.length >
    MAX_ITEMS
  ) {
    return null;
  }

  const items:
    NormalOrderAiRequestedItem[] =
    [];

  for (
    const rawItem of
    candidate.items
  ) {
    if (
      typeof rawItem !==
        "object" ||
      rawItem === null
    ) {
      return null;
    }

    const item =
      rawItem as {
        operation?: unknown;
        productName?: unknown;
        quantity?: unknown;
        unit?: unknown;
      };

    const operation =
      normalizeOperation(
        item.operation
      );

    if (!operation) {
      return null;
    }

    const productName =
      normalizeText(
        item.productName,
        200
      );

    const quantity =
      normalizeQuantity(
        item.quantity
      );

    const unit =
      item.unit === null
        ? null
        : normalizeText(
            item.unit,
            50
          ) || null;

    if (
      operation !==
        "clear" &&
      !productName
    ) {
      return null;
    }

    if (
      (
        operation ===
          "add" ||
        operation ===
          "update"
      ) &&
      quantity === null
    ) {
      return null;
    }

    items.push({
      operation,
      productName,
      quantity,
      unit,
    });
  }

  return {
    items,

    clearOrder:
      candidate.clearOrder ===
      true,

    message:
      normalizeText(
        candidate.message,
        500
      ),
  };
}

// =========================================================
// CURRENT ORDER CONTEXT
// =========================================================

function normalizeContext(
  value:
    | NormalOrderAiContext
    | undefined
): NormalOrderAiContext {
  if (
    !value ||
    !Array.isArray(
      value.items
    )
  ) {
    return {
      items: [],
    };
  }

  const items:
    NormalOrderAiContextItem[] =
    [];

  for (
    const rawItem of
    value.items.slice(
      0,
      MAX_CONTEXT_ITEMS
    )
  ) {
    const productName =
      normalizeText(
        rawItem.productName,
        200
      );

    const quantity =
      normalizeQuantity(
        rawItem.quantity
      );

    const unit =
      rawItem.unit === null
        ? null
        : normalizeText(
            rawItem.unit,
            50
          ) || null;

    if (
      !productName ||
      quantity === null
    ) {
      continue;
    }

    items.push({
      productName,
      quantity,
      unit,
    });
  }

  return {
    items,
  };
}

function buildParserInput(
  command: string,
  context: NormalOrderAiContext
): string {
  if (
    context.items.length ===
    0
  ) {
    return command;
  }

  return JSON.stringify({
    currentOrder: context.items,
    command,
  });
}

// =========================================================
// SYSTEM INSTRUCTIONS
// =========================================================

const SYSTEM_INSTRUCTIONS = `
You are the natural-language command parser for a commercial
hospitality ordering system.

Your only responsibility is to interpret the user's order command.

You DO NOT:
- create orders
- save orders
- access databases
- invent product IDs
- invent SKUs
- invent suppliers
- invent prices
- invent packaging information
- decide which database product matches a requested product

The application will resolve product names against its trusted
database after your response.

Return only information explicitly requested or reasonably
extractable from the user's command.

Supported operations:

add
- Add a product to the current order.

update
- Change the requested quantity of a product already in the order.

remove
- Remove a product from the current order.

clear
- Clear the entire current order.

Examples:

"Order 10 kg chicken breast and 5 boxes avocado"

means:

- add chicken breast, quantity 10, unit kg
- add avocado, quantity 5, unit box

"Make chicken breast 15 kg"

means:

- update chicken breast, quantity 15, unit kg

"Remove avocado"

means:

- remove avocado

"Clear the order"

means:

- clear the current order

Quantity rules:

- Preserve the quantity requested by the user.
- Never calculate packaging conversions.
- Never convert kilograms to grams.
- Never convert liters to milliliters.
- Never convert boxes, bottles, packs, cans, trays, or pieces.
- The application will perform all database and packaging resolution.

Unit rules:

Normalize obvious spoken or written aliases when possible:

kilogram / kilograms / kilo / kilos / kg -> kg
gram / grams / g -> gram
liter / liters / litre / litres / l -> liter
milliliter / milliliters / millilitre / millilitres / ml -> ml
piece / pieces / pc / pcs -> pc
box / boxes -> box
bottle / bottles -> bottle
pack / packs -> pack
can / cans -> can
tray / trays -> tray

If the user does not specify a unit, return null for unit.

If the user requests a product but gives no quantity for an add
or update instruction, do not invent a quantity.

The input may be either a plain user command or a JSON object with:
- currentOrder: products already present in the current draft order
- command: the user's newest spoken or typed instruction

When currentOrder is supplied, use it only to understand conversational
references and follow-up corrections.

Examples:

Current order contains chicken breast and avocado.
"Make chicken 15 kilos"

means:
- update chicken breast, quantity 15, unit kg

Current order contains only chicken breast.
"Make that 15 kilos"

means:
- update chicken breast, quantity 15, unit kg

Current order contains chicken breast and salmon.
"Make that 15 kilos"

is ambiguous because more than one product could be referenced. Do not
invent a product. Return no item and explain briefly that the product
needs to be named.

If the user says "remove it", "change that", "add another", or uses
another pronoun, resolve it only when the current order context makes the
reference unambiguous. Never guess between multiple possible products.

The productName in a resolved update or remove operation should use the
actual product name supplied in currentOrder whenever context resolved the
reference. This allows the application to match the trusted database item.

Current order context is reference-only. Never return every current-order
product as a new add operation merely because it appears in the context.
Only return changes requested by the newest command.

Database matching still happens elsewhere.

Do not treat greetings, questions, or unrelated conversation as
order items.
`;

// =========================================================
// JSON SCHEMA
// =========================================================

const ORDER_INTENT_SCHEMA = {
  type:
    "object",

  additionalProperties:
    false,

  properties: {
    items: {
      type:
        "array",

      maxItems:
        MAX_ITEMS,

      items: {
        type:
          "object",

        additionalProperties:
          false,

        properties: {
          operation: {
            type:
              "string",

            enum: [
              "add",
              "update",
              "remove",
              "clear",
            ],
          },

          productName: {
            type:
              "string",
          },

          quantity: {
            anyOf: [
              {
                type:
                  "number",
              },
              {
                type:
                  "null",
              },
            ],
          },

          unit: {
            anyOf: [
              {
                type:
                  "string",
              },
              {
                type:
                  "null",
              },
            ],
          },
        },

        required: [
          "operation",
          "productName",
          "quantity",
          "unit",
        ],
      },
    },

    clearOrder: {
      type:
        "boolean",
    },

    message: {
      type:
        "string",
    },
  },

  required: [
    "items",
    "clearOrder",
    "message",
  ],
} as const;

// =========================================================
// PARSE NORMAL ORDER COMMAND
// =========================================================

export async function parseNormalOrderCommand(
  command: string,
  context?: NormalOrderAiContext
): Promise<NormalOrderAiResult> {
  const normalizedCommand =
    normalizeCommand(
      command
    );

  if (!normalizedCommand) {
    return {
      success:
        false,

      message:
        `Enter an order instruction between 1 and ${MAX_COMMAND_LENGTH} characters.`,
    };
  }

  try {
    const openai =
      getOpenAiClient();

    const normalizedContext =
      normalizeContext(
        context
      );

    const parserInput =
      buildParserInput(
        normalizedCommand,
        normalizedContext
      );

    const response =
      await openai.responses.create({
        model:
          MODEL,

        instructions:
          SYSTEM_INSTRUCTIONS,

        input:
          parserInput,

        text: {
          format: {
            type:
              "json_schema",

            name:
              "normal_order_intent",

            strict:
              true,

            schema:
              ORDER_INTENT_SCHEMA,
          },
        },
      });

    const output =
      response.output_text?.trim();

    if (!output) {
      return {
        success:
          false,

        message:
          "The AI Order Assistant did not return an order instruction.",
      };
    }

    const intent =
      parseAiResponse(
        output
      );

    if (!intent) {
      return {
        success:
          false,

        message:
          "The AI Order Assistant returned an invalid order instruction.",
      };
    }

    if (
      intent.items.length ===
        0 &&
      !intent.clearOrder
    ) {
      return {
        success:
          false,

        message:
          intent.message ||
          "No products were identified in that instruction.",
      };
    }

    return {
      success:
        true,

      intent,
    };
  } catch (error) {
    console.error(
      "Normal Order AI parsing failed:",
      error instanceof Error
        ? error.message
        : "Unknown AI parsing error"
    );

    return {
      success:
        false,

      message:
        "Unable to process the order instruction. Please try again.",
    };
  }
}