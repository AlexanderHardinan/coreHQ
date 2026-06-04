import type { UserRole } from "@/lib/auth/permissions";

export type ChefAlexKnowledgeModule =
  | "System"
  | "Dashboard"
  | "Inventory"
  | "Kitchen Ops"
  | "Bar Ops"
  | "Recipe Maker"
  | "Sales Performance"
  | "Payroll Budget"
  | "Operational Budget"
  | "Reports"
  | "Users"
  | "Brand Management"
  | "Settings"
  | "Realtime"
  | "Troubleshooting";

export type ChefAlexKnowledgeItem = {
  title: string;
  module: ChefAlexKnowledgeModule;
  keywords: string[];
  answer: string;
};

export type ChefAlexAnswerContext = {
  pathname: string;
  role?: UserRole;
};

const defaultQuickQuestions = [
  "How does Inventory work?",
  "How does Kitchen Ops calculate stock?",
  "How does Bar Ops sync with Inventory?",
  "How do user roles work?",
  "Why is stock not updating?",
  "How do reports work?",
];

const inventoryQuickQuestions = [
  "How do I create a product?",
  "Why does product creation not calculate stock?",
  "How does Product In work?",
  "How does UOM affect calculation?",
  "How does physical count calculate discrepancy?",
  "Why is Inventory not updating live?",
];

const kitchenQuickQuestions = [
  "How does Kitchen Ops calculate stock?",
  "How does production consumption deduct stock?",
  "Why is Kitchen Ops balance different?",
  "How does Kitchen Ops sync with Inventory?",
  "How does UOM affect kitchen movement?",
  "What does calculated balance mean?",
];

const barQuickQuestions = [
  "How does Bar Ops sync with Inventory?",
  "Why is Bar Ops not realtime?",
  "How does bottle stock calculate?",
  "How does bar waste deduct stock?",
  "How does shrinkage work?",
  "What does calculated balance mean?",
];

const salesQuickQuestions = [
  "How should Sales Performance work?",
  "How does POS connect to sales?",
  "What is net sales?",
  "How do discounts affect revenue?",
  "How does sales connect to budgets?",
  "How does sold item affect inventory?",
];

const budgetQuickQuestions = [
  "How does budget variance work?",
  "How should revenue link to budgets?",
  "How does payroll budget use sales net?",
  "How does operational budget use sales net?",
  "Why should revenue not be manual?",
  "How do budget reports calculate?",
];

const reportsQuickQuestions = [
  "How do reports work?",
  "How does PDF export work?",
  "Why should reports be realtime?",
  "How do reports match Inventory?",
  "How do reports match Sales Performance?",
  "How do reports match Budgets?",
];

export const chefAlexKnowledge: ChefAlexKnowledgeItem[] = [
  {
    title: "Forza system overview",
    module: "System",
    keywords: [
      "forza",
      "system",
      "platform",
      "how it works",
      "overview",
      "modules",
      "commercial",
    ],
    answer:
      "Forza is a commercial-grade operations system. It connects Inventory, Kitchen Ops, Bar Ops, Recipe Maker, Sales Performance, Budgets, Reports, Users, and Brand Management into one unified workflow. The most important rule is that calculation pages should read from the same source data, update in realtime, and avoid duplicate manual inputs when a trusted module already stores the value.",
  },
  {
    title: "Dashboard overview",
    module: "Dashboard",
    keywords: ["dashboard", "command center", "overview", "summary", "home"],
    answer:
      "The Dashboard is the command center. It should summarize live operational data from the system instead of using disconnected values. A commercial dashboard should show accurate stock, sales, budget, report, and performance indicators based on the same source tables used by each module.",
  },
  {
    title: "Inventory overview",
    module: "Inventory",
    keywords: [
      "inventory",
      "product",
      "stock",
      "uom",
      "movement",
      "product in",
      "stock in",
      "stock out",
      "create product",
      "edit product",
    ],
    answer:
      "Inventory is the product master and stock movement center. Creating or editing a product creates master data only. It should not calculate stock by itself. Stock calculates only when there is a movement such as Product In, Transfer In, Adjustment In, Production Consumption, Sold Consumption, Waste, Shrinkage, Transfer Out, Adjustment Out, or Physical Count. Every movement follows the product UOM: gram, ml, pc, or bottle.",
  },
  {
    title: "Area-based inventory categories",
    module: "Inventory",
    keywords: [
      "category",
      "group",
      "food",
      "beverage",
      "others",
      "kitchen category",
      "bar category",
      "global category",
    ],
    answer:
      "Inventory classification should follow the selected area. Kitchen uses Food category with groups such as Seafood, Meat, Dairy, Dry Goods, Vegetables, and Fruits. Bar uses Beverage category with groups such as Beer, Wine, Softdrink, Water, Dry Good, Fruit, and Vegetable. Global uses Others category with groups such as Cleaning, Utilities, Maintenance, Packaging, Office Supplies, and Others.",
  },
  {
    title: "Kitchen Ops calculation",
    module: "Kitchen Ops",
    keywords: [
      "kitchen",
      "boh",
      "production",
      "kitchen ops",
      "production consumption",
      "recipe",
      "kitchen calculation",
      "kitchen balance",
    ],
    answer:
      "Kitchen Ops reads kitchen products and kitchen inventory movements. It shows kitchen stock health, production consumption, waste, shrinkage, discrepancy, and calculated movement balance. The correct ledger calculation runs oldest to newest per product. Stock-in movements increase balance. Stock-out movements deduct balance. Physical Count resets the system balance to the counted quantity.",
  },
  {
    title: "Bar Ops calculation",
    module: "Bar Ops",
    keywords: [
      "bar",
      "beverage",
      "bar ops",
      "bottle",
      "wine",
      "beer",
      "bar calculation",
      "bar balance",
      "shrinkage",
    ],
    answer:
      "Bar Ops should mirror Kitchen Ops structure and calculation, but it filters for Bar products and Bar movements. It reads products where ops_area is Bar and inventory movements where ops_area is Bar. Product In increases stock. Sold Consumption, Waste, Shrinkage, Transfer Out, and Adjustment Out deduct stock. Calculated balance must be based on the movement ledger, not stale stored values.",
  },
  {
    title: "Realtime commercial sync",
    module: "Realtime",
    keywords: [
      "realtime",
      "real time",
      "live",
      "refresh",
      "sync",
      "not updating",
      "stuck",
      "manual refresh",
      "commercial",
    ],
    answer:
      "Forza is commercial-grade and calculation-focused, so Inventory, Kitchen Ops, Bar Ops, Reports, Budgets, and calculation pages should react live when source data changes. If a page requires manual refresh, the page needs Supabase realtime listeners for the affected tables, usually products and inventory_movements, plus a safe fallback refresh for accuracy.",
  },
  {
    title: "User roles",
    module: "Users",
    keywords: [
      "role",
      "permission",
      "boh",
      "foh",
      "manager",
      "super admin",
      "access",
      "authorized",
      "not authorized",
      "hide",
    ],
    answer:
      "User access is controlled by role. BOH Staff should only see BOH-authorized modules such as Kitchen Ops, Inventory, and Recipe Maker. FOH Staff should only see FOH-authorized modules such as Bar Ops, Inventory, and Sales Performance. Managers see operational modules but not Super Admin-only pages. Super Admin can access everything, including Users and Brand Management.",
  },
  {
    title: "Sales Performance",
    module: "Sales Performance",
    keywords: [
      "sales",
      "performance",
      "pos",
      "discount",
      "net",
      "gross",
      "revenue",
      "sold item",
      "sales net",
    ],
    answer:
      "Sales Performance should represent revenue from POS or controlled manual sales entries when POS integration is not available. It should handle gross sales, discounts, net sales, and sales adjustments. Sold items may affect inventory consumption, but revenue should stay aligned with POS or the official Sales Performance source.",
  },
  {
    title: "Payroll Budget",
    module: "Payroll Budget",
    keywords: [
      "payroll",
      "labor",
      "salary",
      "staff cost",
      "departmental",
      "payroll budget",
    ],
    answer:
      "Payroll Budget should track departmental payroll planning and compare payroll cost against Sales Performance net revenue. If Sales Performance already has net revenue, Payroll Budget should link to it instead of asking the user to manually type revenue again.",
  },
  {
    title: "Operational Budget",
    module: "Operational Budget",
    keywords: [
      "operational",
      "budget",
      "opex",
      "cost",
      "utilities",
      "maintenance",
      "operational budget",
    ],
    answer:
      "Operational Budget should track operating costs such as food, beverage, utilities, maintenance, support, admin, and other expenses. Revenue should link from Sales Performance net sales when available, so budget variance remains uniform and accurate.",
  },
  {
    title: "Reports",
    module: "Reports",
    keywords: [
      "report",
      "pdf",
      "csv",
      "export",
      "analytics",
      "chart",
      "table",
      "reports",
    ],
    answer:
      "Reports should summarize live system data into analytical views, tables, charts, PDF exports, and CSV exports. Commercial reports should read from the same source tables as each module, so report totals match Inventory, Kitchen Ops, Bar Ops, Sales Performance, Payroll Budget, and Operational Budget.",
  },
  {
    title: "Discrepancy",
    module: "Inventory",
    keywords: [
      "discrepancy",
      "physical count",
      "missing",
      "over",
      "stock count",
      "count",
    ],
    answer:
      "Discrepancy is calculated by comparing the physical count against the calculated system balance. If the physical count is lower than the system balance, the result is missing stock. If it is higher, the result is over stock. If both match, it is on track.",
  },
  {
    title: "Recipe Maker",
    module: "Recipe Maker",
    keywords: [
      "recipe",
      "recipe maker",
      "costing",
      "food cost",
      "selling price",
      "batch yield",
      "portion",
    ],
    answer:
      "Recipe Maker should handle recipe costing, ingredients, batch yield, cost per portion, selling price, and margin analysis. For commercial accuracy, recipe consumption should align with Inventory UOM and should not create disconnected stock values.",
  },
  {
    title: "Troubleshooting stuck data",
    module: "Troubleshooting",
    keywords: [
      "stuck",
      "not showing",
      "not loading",
      "not calculating",
      "wrong",
      "issue",
      "problem",
      "bug",
    ],
    answer:
      "When data looks stuck, check the source first. Confirm the product has the correct brand, branch unit, ops_area, UOM, and active status. Then confirm the movement exists in inventory_movements with the correct product_id and ops_area. If data only appears after refresh, the page needs realtime subscription or fallback refresh protection.",
  },
];

export function getChefAlexQuickQuestions(pathname: string) {
  if (pathname.startsWith("/inventory")) {
    return inventoryQuickQuestions;
  }

  if (pathname.startsWith("/kitchen-ops")) {
    return kitchenQuickQuestions;
  }

  if (pathname.startsWith("/bar-ops")) {
    return barQuickQuestions;
  }

  if (pathname.startsWith("/sales-performance")) {
    return salesQuickQuestions;
  }

  if (
    pathname.startsWith("/payroll-budget") ||
    pathname.startsWith("/operational-budget")
  ) {
    return budgetQuickQuestions;
  }

  if (pathname.startsWith("/reports")) {
    return reportsQuickQuestions;
  }

  return defaultQuickQuestions;
}

export function getChefAlexPageContext(pathname: string) {
  if (pathname.startsWith("/inventory")) {
    return "You are currently on Inventory. Prioritize product setup, movement entries, UOM, stock value, and realtime inventory sync.";
  }

  if (pathname.startsWith("/kitchen-ops")) {
    return "You are currently on Kitchen Ops. Prioritize kitchen stock, production consumption, waste, discrepancy, calculated balance, and Inventory sync.";
  }

  if (pathname.startsWith("/bar-ops")) {
    return "You are currently on Bar Ops. Prioritize bar stock, beverage movements, bottle/ml/pc UOM, waste, shrinkage, calculated balance, and realtime Inventory sync.";
  }

  if (pathname.startsWith("/sales-performance")) {
    return "You are currently on Sales Performance. Prioritize POS revenue, gross sales, discounts, net sales, manual fallback entries, and budget linkage.";
  }

  if (pathname.startsWith("/payroll-budget")) {
    return "You are currently on Payroll Budget. Prioritize departmental payroll planning and linked Sales Performance net revenue.";
  }

  if (pathname.startsWith("/operational-budget")) {
    return "You are currently on Operational Budget. Prioritize operating expenses and linked Sales Performance net revenue.";
  }

  if (pathname.startsWith("/reports")) {
    return "You are currently on Reports. Prioritize live analytics, tables, PDF, CSV, and alignment with source modules.";
  }

  if (pathname.startsWith("/users")) {
    return "You are currently on Users. Prioritize account creation, role access, branch access, and authorization.";
  }

  if (pathname.startsWith("/dashboard")) {
    return "You are currently on Dashboard. Prioritize high-level operational summaries and system navigation.";
  }

  return "You are inside Forza. Prioritize module guidance, permissions, calculations, and realtime commercial accuracy.";
}

export function getChefAlexRoleContext(role?: UserRole) {
  if (role === "boh_staff") {
    return "The current user role is BOH Staff. BOH Staff should focus on Kitchen Ops, Inventory, and Recipe Maker. They should not expect access to unauthorized pages.";
  }

  if (role === "foh_staff") {
    return "The current user role is FOH Staff. FOH Staff should focus on Bar Ops, Inventory, and Sales Performance. They should not expect access to unauthorized pages.";
  }

  if (role === "manager") {
    return "The current user role is Manager. Managers can access operational modules but should not access Super Admin-only controls such as Users and Brand Management.";
  }

  if (role === "super_admin") {
    return "The current user role is Super Admin. Super Admin can access all modules, user management, brand management, and system settings.";
  }

  return "The current user role is not provided to Chef Alex yet. Give general guidance and explain role rules when asked.";
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function scoreKnowledgeItem(question: string, item: ChefAlexKnowledgeItem) {
  const normalizedQuestion = normalizeText(question);

  return item.keywords.reduce((total, keyword) => {
    return normalizedQuestion.includes(normalizeText(keyword))
      ? total + 1
      : total;
  }, 0);
}

function findBestKnowledgeItem(question: string) {
  const scoredAnswers = chefAlexKnowledge
    .map((item) => ({
      item,
      score: scoreKnowledgeItem(question, item),
    }))
    .sort((a, b) => b.score - a.score);

  const best = scoredAnswers[0];

  if (!best || best.score === 0) {
    return null;
  }

  return best.item;
}

export function buildChefAlexAnswer(
  question: string,
  context: ChefAlexAnswerContext,
) {
  const bestItem = findBestKnowledgeItem(question);
  const pageContext = getChefAlexPageContext(context.pathname);
  const roleContext = getChefAlexRoleContext(context.role);

  if (!bestItem) {
    return `Chef Alex guidance — System:\n\n${pageContext}\n\n${roleContext}\n\nAsk me about a specific Forza module, calculation, realtime sync, role permission, Inventory movement, Kitchen Ops, Bar Ops, Sales Performance, Budget, or Report workflow.`;
  }

  return `Chef Alex guidance — ${bestItem.module}:\n\n${bestItem.answer}\n\nPage context: ${pageContext}\n\nRole context: ${roleContext}`;
}