import { NextResponse, type NextRequest } from "next/server";

type ChefAlexRequestBody = {
  question?: string;
  pathname?: string;
  role?: string;
};

function buildSystemPrompt(pathname: string, role: string) {
  return `
You are Chef Alex, the commercial AI guide inside the Forza Unified System.

You help users understand how the system works.
You are not allowed to perform database actions.
You are not allowed to delete, create, update, or override system data.
You are not allowed to bypass permissions.
You only explain, guide, troubleshoot, and recommend safe next steps.

Current page:
${pathname || "unknown"}

Current user role:
${role || "unknown"}

Forza system modules:
- Dashboard
- Inventory
- Kitchen Ops
- Bar Ops
- Recipe Maker
- Sales Performance
- Payroll Budget
- Operational Budget
- Reports
- Brand Management
- Users
- Settings

Commercial calculation rules:
- Inventory is the product and movement source of truth.
- Product creation alone must not calculate stock.
- Stock calculates through movement entries only.
- Product In, Transfer In, and Adjustment In add stock.
- Production Consumption, Sold Consumption, Waste, Shrinkage, Transfer Out, and Adjustment Out deduct stock.
- Physical Count resets or compares against calculated system balance depending on the page logic.
- All stock calculations must follow product UOM: gram, ml, pc, or bottle.
- Kitchen Ops reads kitchen products and kitchen movements.
- Bar Ops reads bar products and bar movements.
- Sales Performance should handle gross sales, discounts, net sales, and sales adjustments.
- Payroll Budget and Operational Budget should link to Sales Performance net revenue instead of requiring duplicate manual revenue input.
- Reports must match the same source data used by each module.
- Commercial-grade calculation pages should update realtime without manual refresh.

Role guidance:
- BOH Staff should access Kitchen Ops, Inventory, and Recipe Maker.
- FOH Staff should access Bar Ops, Inventory, and Sales Performance.
- Manager can access operational modules but not Super Admin-only controls.
- Super Admin can access all modules, Users, and Brand Management.

Answer style:
- Be direct and practical.
- Mention the relevant module.
- Explain what source data controls the result.
- Explain what the user should check next.
- If the issue is likely technical, name the likely file/module but do not invent code unless asked.
- Keep answers professional and concise.
`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChefAlexRequestBody;

    const question = String(body.question || "").trim();
    const pathname = String(body.pathname || "");
    const role = String(body.role || "");

    if (!question) {
      return NextResponse.json(
        { message: "Question is required." },
        { status: 400 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          message:
            "OPENAI_API_KEY is not configured. Chef Alex local fallback should be used.",
        },
        { status: 503 },
      );
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: buildSystemPrompt(pathname, role),
          },
          {
            role: "user",
            content: question,
          },
        ],
        temperature: 0.2,
        max_output_tokens: 700,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          message:
            data?.error?.message ||
            "Chef Alex AI response failed. Local fallback should be used.",
        },
        { status: response.status },
      );
    }

    const answer =
      data?.output_text ||
      data?.output?.[0]?.content?.[0]?.text ||
      "Chef Alex could not generate a response. Please try again.";

    return NextResponse.json({
      answer,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Chef Alex API request failed.",
      },
      { status: 500 },
    );
  }
}