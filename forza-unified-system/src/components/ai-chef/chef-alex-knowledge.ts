// File name: src/components/ai-chef/chef-alex-knowledge.ts

import type { UserRole } from "@/lib/auth/permissions";

export type ChefAlexKnowledgeModule =
  | "System"
  | "Main Panel"
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
  | "Profile"
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
  "How does Forza work?",
  "What is the Main Panel?",
  "How does Inventory work?",
  "How does Kitchen Ops calculate stock?",
  "How does Bar Ops sync with Inventory?",
  "How do user roles work?",
];

const mainPanelQuickQuestions = [
  "What is the Main Panel?",
  "How does the command radar work?",
  "How do I acknowledge an alert?",
  "What is Critical vs Warning?",
  "How do I export PDF or CSV?",
  "How does Main Panel sync live?",
];

const dashboardQuickQuestions = [
  "How does Dashboard work?",
  "Why is Dashboard not updating live?",
  "How does Sold Qty calculate?",
  "Why is revenue still showing?",
  "How does Dashboard connect to Inventory?",
  "How does Dashboard read active products?",
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

const recipeQuickQuestions = [
  "How does Recipe Maker work?",
  "How does recipe costing calculate?",
  "How does batch yield work?",
  "How does selling price calculate?",
  "How does recipe consumption affect stock?",
  "Why must recipes follow UOM?",
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
  "How does CSV export work?",
  "Why should reports be realtime?",
  "How do reports match Inventory?",
  "How do reports match Sales Performance?",
];

const usersQuickQuestions = [
  "How do user roles work?",
  "What can BOH Staff access?",
  "What can FOH Staff access?",
  "What can Manager access?",
  "What can Super Admin access?",
  "Why can I not access a page?",
];

const brandManagementQuickQuestions = [
  "How does Brand Management work?",
  "How do Forza and Fusion work?",
  "How do branch units work?",
  "How do categories work?",
  "Who can manage brands?",
  "Why is brand access restricted?",
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
      "commercial grade",
      "workflow",
      "connected",
      "one flow",
      "unified",
    ],
    answer:
      "Forza is a commercial-grade hospitality operations system. It connects Main Panel, Dashboard, Inventory, Kitchen Ops, Bar Ops, Recipe Maker, Sales Performance, Payroll Budget, Operational Budget, Reports, Users, Brand Management, Settings, and Profile into one unified workflow. The core rule is that every calculation should come from trusted source tables, update in realtime, and avoid disconnected manual values. Inventory movements, product UOM, product activity status, recipe costing, sales, reports, budgets, and alert tracking should work together as one operational flow.",
  },
  {
    title: "Main Panel overview",
    module: "Main Panel",
    keywords: [
      "main panel",
      "command radar",
      "radar",
      "map",
      "multi outlet",
      "multi-outlet",
      "forza fusion",
      "forza and fusion",
      "outlet monitoring",
      "alert system",
      "executive panel",
      "command center",
    ],
    answer:
      "The Main Panel is the multi-outlet command radar for Forza and Fusion. It appears before Dashboard in the sidebar for Super Admin and Manager users. It shows both outlets in one executive radar view, with live alert monitoring for Kitchen, Bar, and Global areas. The Main Panel reads live product and movement data, then highlights low stock, overstock, expired products, expiring soon products, discrepancies, waste, shrinkage, negative stock, and operational alert status.",
  },
  {
    title: "Main Panel area filters",
    module: "Main Panel",
    keywords: [
      "main panel filter",
      "area filter",
      "all areas",
      "kitchen filter",
      "bar filter",
      "global filter",
      "filter alerts",
      "filter radar",
    ],
    answer:
      "Main Panel filters control which operational alerts are shown. All Areas shows every alert across Forza and Fusion. Kitchen focuses on kitchen and BOH stock risks. Bar focuses on beverage and FOH bar risks. Global focuses on general products and cross-area operational issues. The radar metrics, alert feed, PDF export, and CSV export follow the selected filter.",
  },
  {
    title: "Main Panel alert priority",
    module: "Main Panel",
    keywords: [
      "critical",
      "warning",
      "stable",
      "priority",
      "alert priority",
      "red alert",
      "watch mode",
      "main panel status",
      "negative stock",
    ],
    answer:
      "Main Panel uses three alert priority levels. Critical means immediate attention is needed, such as expired products, low stock, inventory discrepancy, or negative calculated stock. Warning means the team should monitor the issue, such as overstock, expiring soon, waste, or shrinkage. Stable means no active issue is detected for that outlet or operational area.",
  },
  {
    title: "Main Panel alert actions",
    module: "Main Panel",
    keywords: [
      "acknowledge",
      "acknowledged",
      "investigating",
      "resolved",
      "resolve",
      "alert action",
      "alert status",
      "action note",
      "notes",
      "main panel alert actions",
    ],
    answer:
      "Main Panel alerts support operational action tracking. A user can mark an alert as Acknowledged when the team has seen it, Investigating when someone is checking the issue, or Resolved when the issue has been handled. Users can also add an action note. These alert actions are saved in main_panel_alert_actions and remain after refresh.",
  },
  {
    title: "Main Panel PDF and CSV export",
    module: "Main Panel",
    keywords: [
      "main panel export",
      "pdf",
      "csv",
      "download",
      "executive report",
      "alert report",
      "export alerts",
      "spreadsheet",
    ],
    answer:
      "Main Panel can export executive alert reports as PDF or CSV. The export respects the active filter, so All Areas, Kitchen, Bar, or Global will export only the current alert view. The export includes Product or Issue, Outlet, Area, Alert Status, Meta, Priority, Action Status, Action Note, and Action Updated At. PDF is for printable executive review. CSV is for spreadsheet analysis.",
  },
  {
    title: "Main Panel realtime sync",
    module: "Main Panel",
    keywords: [
      "main panel realtime",
      "main panel sync",
      "main panel not updating",
      "radar not updating",
      "alert not updating",
      "action sync",
      "auto refresh",
    ],
    answer:
      "Main Panel is designed to react live. It listens to brands, brand_units, products, inventory_movements, and main_panel_alert_actions. When products, movements, outlet data, or alert actions change, the Main Panel should refresh automatically. A fallback refresh protects commercial accuracy if realtime is delayed.",
  },
  {
    title: "Dashboard overview",
    module: "Dashboard",
    keywords: [
      "dashboard",
      "command center",
      "overview",
      "summary",
      "home",
      "live dashboard",
      "performance dashboard",
    ],
    answer:
      "The Dashboard is the operational summary page. It should summarize live data from active products, inventory movements, and valid linked sales records. It should not rely on stale disconnected data. The Dashboard should show inventory value, stock in, stock out, waste, shrinkage, sold quantity, revenue indicators, alerts, top consumed ingredients, top sold items, and latest stock movements.",
  },
  {
    title: "Dashboard realtime",
    module: "Dashboard",
    keywords: [
      "dashboard realtime",
      "dashboard not updating",
      "dashboard refresh",
      "manual refresh",
      "dashboard sync",
      "dashboard live",
    ],
    answer:
      "Dashboard is a server-rendered page, so realtime behavior should be supported by a client realtime refresher. When products, inventory_movements, sold_items, or recipe_sales change, the dashboard should refresh automatically. Sold Qty should calculate from active product-linked sold_consumption movements, not stale deleted product data.",
  },
  {
    title: "Dashboard stale revenue",
    module: "Dashboard",
    keywords: [
      "revenue still showing",
      "deleted item revenue",
      "sold item still showing",
      "stale revenue",
      "recipe_id null",
      "disconnected sold item",
      "orphan sold",
    ],
    answer:
      "If revenue remains after deleting an item, check sold_items for disconnected rows. Rows with recipe_id null can remain as manual sold records and still be counted if Dashboard sums all sold_items. Commercial logic should count only valid linked sales or exclude disconnected sold_items. Deleting or reversing a sale should also reverse the revenue and related inventory movement to keep the system in one flow.",
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
      "product master",
    ],
    answer:
      "Inventory is the product master and stock movement center. Creating or editing a product creates master data only. It should not calculate stock by itself. Stock calculates only when there is a movement such as Product In, Transfer In, Adjustment In, Production Consumption, Sold Consumption, Waste, Shrinkage, Transfer Out, Adjustment Out, or Physical Count. Every movement follows the product UOM: gram, ml, pc, or bottle.",
  },
  {
    title: "Inventory commercial costing",
    module: "Inventory",
    keywords: [
      "packaging amount",
      "packaging cost",
      "unit cost",
      "cost per uom",
      "auto unit cost",
      "product cost",
      "1000 gram",
      "20 cost",
      "0.02",
    ],
    answer:
      "Commercial inventory costing uses Packaging Amount, Packaging UOM, and Packaging Cost. The user enters the package amount, such as 1000, the UOM, such as gram, and the packaging cost, such as 20. The system automatically calculates Unit Cost per UOM as Packaging Cost divided by Packaging Amount. Example: 20 divided by 1000 gram equals 0.02 per gram. Product In and consumption then use that UOM-based unit cost.",
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
      "seafood",
      "meat",
      "dairy",
      "beer",
      "wine",
    ],
    answer:
      "Inventory classification follows the selected area. Kitchen uses Food category with groups such as Seafood, Meat, Dairy, Dry Goods, Vegetables, and Fruits. Bar uses Beverage category with groups such as Beer, Wine, Softdrink, Water, Dry Good, Fruit, and Vegetable. Global uses Others category with groups such as Cleaning, Utilities, Maintenance, Packaging, Office Supplies, and Others. Category and group rules should not be used for duplicate product validation; duplicate checks should be by active product name within brand, branch, and area.",
  },
  {
    title: "SKU rules",
    module: "Inventory",
    keywords: [
      "sku",
      "automatic sku",
      "system generated sku",
      "duplicate sku",
      "duplicate product",
      "no duplicate",
      "product duplicate",
    ],
    answer:
      "SKU should be automatically system-generated from brand, branch unit, area, and product name. Duplicate prevention should focus on active product identity within the correct brand, branch, and area. Category and group should not be treated as duplicate blockers. A product should not fail just because another item uses the same category or group.",
  },
  {
    title: "Inventory movement calculation",
    module: "Inventory",
    keywords: [
      "ledger",
      "movement ledger",
      "calculated balance",
      "system balance",
      "balance",
      "stock calculation",
      "oldest to newest",
    ],
    answer:
      "Inventory movement balance should calculate from the ledger, oldest to newest, per product. Stock-in movements increase the balance. Stock-out movements deduct the balance. Physical Count resets the balance to the counted quantity. Product creation alone should not create calculated stock. This prevents false stock value before the product is actually received or moved.",
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
      "variance",
    ],
    answer:
      "Discrepancy is calculated by comparing physical count against calculated system balance. Physical Count minus System Balance equals Discrepancy. If the physical count is lower, the result is missing stock. If it is higher, the result is over stock. If both match, it is on track.",
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
      "Kitchen Ops reads kitchen products and kitchen inventory movements. It shows kitchen stock health, production consumption, waste, shrinkage, discrepancy, and calculated movement balance. The correct ledger calculation runs oldest to newest per product. Product In, Transfer In, and Adjustment In increase balance. Production Consumption, Sold Consumption, Waste, Shrinkage, Transfer Out, and Adjustment Out deduct balance. Physical Count resets the system balance to the counted quantity.",
  },
  {
    title: "Kitchen Ops realtime",
    module: "Kitchen Ops",
    keywords: [
      "kitchen realtime",
      "kitchen sync",
      "kitchen not updating",
      "kitchen refresh",
      "kitchen inventory sync",
    ],
    answer:
      "Kitchen Ops should sync with Inventory in realtime. If Inventory adds, edits, deletes, or moves a kitchen product, Kitchen Ops should reflect the update without manual refresh. It should listen to products and inventory_movements and calculate balances from the same ledger rules as Inventory.",
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
      "Bar Ops mirrors Kitchen Ops structure and calculation, but filters for Bar products and Bar movements. It reads products where ops_area is Bar and inventory movements where ops_area is Bar. Product In increases stock. Sold Consumption, Waste, Shrinkage, Transfer Out, and Adjustment Out deduct stock. Calculated balance must be based on the movement ledger, not stale stored values.",
  },
  {
    title: "Bar Ops realtime",
    module: "Bar Ops",
    keywords: [
      "bar realtime",
      "bar sync",
      "bar not updating",
      "bar refresh",
      "bar inventory sync",
      "whatever changes in inventory",
    ],
    answer:
      "Bar Ops should react to whatever changes in Inventory. Product changes, Product In, waste, shrinkage, consumption, and product deletion should update Bar Ops without manual refresh. The commercial rule is that Bar Ops and Inventory must use the same source tables and the same UOM-based movement calculation.",
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
      "ingredients",
      "margin",
    ],
    answer:
      "Recipe Maker handles recipe costing, ingredients, batch yield, cost per portion, selling price, and margin analysis. Recipe items should align with Inventory UOM to keep consumption accurate. Batch yield can use gram, ml, pc, or bottle logic where applicable. Recipe selling price should be based on cost and target food cost percentage.",
  },
  {
    title: "Recipe consumption",
    module: "Recipe Maker",
    keywords: [
      "recipe consumption",
      "consume recipe",
      "sold consumption",
      "deduct ingredients",
      "recipe stock",
      "recipe movement",
    ],
    answer:
      "Recipe consumption should deduct inventory through sold_consumption or production_consumption movements linked to active products. It should not create disconnected stock deductions. If a recipe sale is deleted or reversed, linked sold items and inventory movements should also be deleted or reversed so Dashboard, Inventory, Kitchen Ops, Bar Ops, and Reports stay aligned.",
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
      "selling price",
    ],
    answer:
      "Sales Performance should represent revenue from POS or controlled manual sales entries when POS integration is not available. It should handle gross sales, discounts, net sales, and sales adjustments. Sold items may affect inventory consumption, but revenue should stay aligned with POS or the official Sales Performance source.",
  },
  {
    title: "Sales and inventory connection",
    module: "Sales Performance",
    keywords: [
      "sales inventory",
      "sold item affect inventory",
      "sale deduct stock",
      "sold qty",
      "sold consumption",
      "sales flow",
    ],
    answer:
      "The correct commercial sales flow is: create sale, create valid linked revenue record, create sold_consumption inventory movement, update Dashboard and Reports. If a sale is deleted or reversed, the revenue record and inventory movement should also be deleted or reversed. This prevents stale sold quantity and stale revenue.",
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
      "labor cost",
    ],
    answer:
      "Payroll Budget tracks departmental payroll planning and compares payroll cost against Sales Performance net revenue. If Sales Performance already stores net revenue, Payroll Budget should link to it instead of asking the user to manually type revenue again. This keeps budget variance consistent and commercial-grade.",
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
      "food cost",
      "beverage cost",
    ],
    answer:
      "Operational Budget tracks operating costs such as food, beverage, utilities, maintenance, support, admin, and other expenses. Revenue should link from Sales Performance net sales when available, so budget variance remains uniform and accurate.",
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
      "statement",
    ],
    answer:
      "Reports summarize live system data into analytical views, tables, charts, PDF exports, and CSV exports. Commercial reports should read from the same source tables as each module, so report totals match Inventory, Kitchen Ops, Bar Ops, Sales Performance, Payroll Budget, Operational Budget, Dashboard, and Main Panel.",
  },
  {
    title: "Users and roles",
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
      "users",
    ],
    answer:
      "User access is controlled by role. BOH Staff should see BOH-authorized modules such as Kitchen Ops, Inventory, Recipe Maker, and Profile. FOH Staff should see FOH-authorized modules such as Bar Ops, Inventory, Sales Performance, and Profile. Managers can access operational modules including Main Panel but not Super Admin-only controls. Super Admin can access everything, including Users and Brand Management.",
  },
  {
    title: "Main Panel role access",
    module: "Users",
    keywords: [
      "who can see main panel",
      "main panel permission",
      "main panel access",
      "manager main panel",
      "super admin main panel",
      "boh main panel",
      "foh main panel",
    ],
    answer:
      "Main Panel is intended for Super Admin and Manager users because it is an executive command radar. BOH Staff and FOH Staff should not see Main Panel unless a future limited role-specific view is created. This keeps operational command controls restricted to authorized leaders.",
  },
  {
    title: "Brand Management",
    module: "Brand Management",
    keywords: [
      "brand",
      "brand management",
      "forza",
      "fusion",
      "branch",
      "unit",
      "outlet",
      "category control",
      "super admin brand",
    ],
    answer:
      "Brand Management controls brands, branch units, groups, and category setup. Forza and Fusion are separate brand workspaces. Super Admin manages brand-level configuration, while operational pages read the selected brand and branch data. Brand and unit IDs are important because products and movements must be connected to the correct outlet.",
  },
  {
    title: "Settings",
    module: "Settings",
    keywords: [
      "settings",
      "threshold",
      "preferences",
      "system settings",
      "alert settings",
      "configuration",
    ],
    answer:
      "Settings should manage system preferences, thresholds, and operational configuration. Alert thresholds, report preferences, and system behavior should be controlled carefully because they affect operational accuracy across Dashboard, Main Panel, Inventory, and Reports.",
  },
  {
    title: "Profile",
    module: "Profile",
    keywords: [
      "profile",
      "avatar",
      "account",
      "user profile",
      "my account",
      "upload avatar",
    ],
    answer:
      "Profile is where the user manages personal account details and avatar information. Profile changes should update the dashboard shell and user identity display consistently across the system.",
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
      "auto update",
    ],
    answer:
      "Forza is commercial-grade and calculation-focused, so Inventory, Kitchen Ops, Bar Ops, Dashboard, Main Panel, Reports, Budgets, and calculation pages should react live when source data changes. If a page requires manual refresh, it needs Supabase realtime listeners for affected tables such as products, inventory_movements, sold_items, recipe_sales, brands, brand_units, and alert action tables, plus fallback refresh protection.",
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
      "not working",
    ],
    answer:
      "When data looks stuck, check the source first. Confirm the product has the correct brand, branch unit, ops_area, UOM, active status, packaging amount, packaging cost, and computed unit cost. Then confirm the movement exists in inventory_movements with the correct product_id and ops_area. If data only appears after refresh, the page needs realtime subscription or fallback refresh protection.",
  },
  {
    title: "Commercial calculation rule",
    module: "Troubleshooting",
    keywords: [
      "calculation wrong",
      "wrong calculation",
      "by uom",
      "calculate by uom",
      "commercial calculation",
      "accurate calculation",
      "stock value wrong",
    ],
    answer:
      "All Forza calculation modules must calculate by UOM. A product has a packaging amount, packaging UOM, packaging cost, and computed unit cost. Movements are entered in the product UOM. Stock value equals calculated quantity left multiplied by unit cost per UOM. This rule must be consistent across Inventory, Kitchen Ops, Bar Ops, Dashboard, Main Panel, and Reports.",
  },
];

export function getChefAlexQuickQuestions(pathname: string) {
  if (pathname.startsWith("/main-panel")) {
    return mainPanelQuickQuestions;
  }

  if (pathname.startsWith("/dashboard")) {
    return dashboardQuickQuestions;
  }

  if (pathname.startsWith("/inventory")) {
    return inventoryQuickQuestions;
  }

  if (pathname.startsWith("/kitchen-ops")) {
    return kitchenQuickQuestions;
  }

  if (pathname.startsWith("/bar-ops")) {
    return barQuickQuestions;
  }

  if (pathname.startsWith("/recipe-maker")) {
    return recipeQuickQuestions;
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

  if (pathname.startsWith("/users")) {
    return usersQuickQuestions;
  }

  if (pathname.startsWith("/brand-management")) {
    return brandManagementQuickQuestions;
  }

  return defaultQuickQuestions;
}

export function getChefAlexPageContext(pathname: string) {
  if (pathname.startsWith("/main-panel")) {
    return "You are currently on Main Panel. Prioritize multi-outlet radar monitoring, Forza and Fusion alert status, Kitchen / Bar / Global filters, Critical / Warning / Stable priority, Acknowledge / Investigating / Resolved actions, action notes, realtime alert sync, and PDF/CSV executive alert exports.";
  }

  if (pathname.startsWith("/dashboard")) {
    return "You are currently on Dashboard. Prioritize high-level operational summaries, active product-linked calculations, live inventory value, sold quantity, revenue, alerts, and system navigation.";
  }

  if (pathname.startsWith("/inventory")) {
    return "You are currently on Inventory. Prioritize product setup, packaging amount, packaging UOM, packaging cost, auto unit cost, movement entries, UOM, stock value, and realtime inventory sync.";
  }

  if (pathname.startsWith("/kitchen-ops")) {
    return "You are currently on Kitchen Ops. Prioritize kitchen stock, production consumption, sold consumption, waste, discrepancy, calculated balance, UOM calculation, and Inventory sync.";
  }

  if (pathname.startsWith("/bar-ops")) {
    return "You are currently on Bar Ops. Prioritize bar stock, beverage movements, bottle/ml/pc UOM, waste, shrinkage, calculated balance, and realtime Inventory sync.";
  }

  if (pathname.startsWith("/recipe-maker")) {
    return "You are currently on Recipe Maker. Prioritize recipe costing, batch yield, ingredients, cost per portion, selling price, food cost percentage, and UOM-aligned consumption.";
  }

  if (pathname.startsWith("/sales-performance")) {
    return "You are currently on Sales Performance. Prioritize POS revenue, gross sales, discounts, net sales, manual fallback entries, sold item lifecycle, and budget linkage.";
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

  if (pathname.startsWith("/brand-management")) {
    return "You are currently on Brand Management. Prioritize brands, Forza and Fusion workspaces, branch units, groups, categories, and Super Admin controls.";
  }

  if (pathname.startsWith("/settings")) {
    return "You are currently on Settings. Prioritize system configuration, thresholds, preferences, and operational behavior.";
  }

  if (pathname.startsWith("/profile")) {
    return "You are currently on Profile. Prioritize account details, avatar, user identity, and profile updates.";
  }

  return "You are inside Forza. Prioritize module guidance, permissions, calculations, realtime sync, UOM accuracy, and commercial operational flow.";
}

export function getChefAlexRoleContext(role?: UserRole) {
  if (role === "boh_staff") {
    return "The current user role is BOH Staff. BOH Staff should focus on Kitchen Ops, Inventory, Recipe Maker, and Profile. They should not expect access to unauthorized pages such as Main Panel, Dashboard executive controls, Users, or Brand Management.";
  }

  if (role === "foh_staff") {
    return "The current user role is FOH Staff. FOH Staff should focus on Bar Ops, Inventory, Sales Performance, and Profile. They should not expect access to unauthorized pages such as Main Panel, Users, or Brand Management.";
  }

  if (role === "manager") {
    return "The current user role is Manager. Managers can access operational modules including Main Panel, Dashboard, Inventory, Kitchen Ops, Bar Ops, Recipe Maker, Sales Performance, Reports, Settings, and Profile, but should not access Super Admin-only controls such as Users and Brand Management.";
  }

  if (role === "super_admin") {
    return "The current user role is Super Admin. Super Admin can access all modules, including Main Panel, Dashboard, Users, Brand Management, Settings, all operational modules, reports, and system controls.";
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
    return `Chef Alex guidance — System:\n\n${pageContext}\n\n${roleContext}\n\nAsk me about a specific Forza module, Main Panel radar, alert actions, PDF/CSV export, Dashboard calculation, Inventory movement, UOM costing, Kitchen Ops, Bar Ops, Recipe Maker, Sales Performance, Budget, Reports, realtime sync, or role permission workflow.`;
  }

  return `Chef Alex guidance — ${bestItem.module}:\n\n${bestItem.answer}\n\nPage context: ${pageContext}\n\nRole context: ${roleContext}`;
}