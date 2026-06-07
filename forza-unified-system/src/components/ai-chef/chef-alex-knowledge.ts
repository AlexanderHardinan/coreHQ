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

const settingsQuickQuestions = [
  "How do Settings work?",
  "What are alert thresholds?",
  "How should system preferences work?",
  "How do settings affect reports?",
  "How do settings affect alerts?",
  "Who should update settings?",
];

const profileQuickQuestions = [
  "How does Profile work?",
  "How do I update my avatar?",
  "How does profile sync?",
  "Why is my avatar not showing?",
  "What profile details are used?",
  "How does profile connect to the shell?",
];

export const chefAlexKnowledge: ChefAlexKnowledgeItem[] = [
  {
    title: "Forza complete system overview",
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
      "complete guide",
      "full guide",
      "whole platform",
    ],
    answer:
      "Forza is a commercial-grade hospitality operations platform. It connects Main Panel, Dashboard, Inventory, Kitchen Ops, Bar Ops, Recipe Maker, Sales Performance, Payroll Budget, Operational Budget, Reports, Users, Brand Management, Settings, and Profile into one operational flow. The commercial rule is simple: every calculation must come from trusted source data, must respect UOM, must update in realtime, and must not leave disconnected records. Product setup, stock movement, recipe costing, sales, budget variance, reports, and alerts must all agree with each other.",
  },
  {
    title: "Commercial data flow",
    module: "System",
    keywords: [
      "commercial flow",
      "data flow",
      "one system",
      "one source",
      "source of truth",
      "linked system",
      "everything together",
      "system flow",
    ],
    answer:
      "The correct commercial flow is: Brand and Branch define the workspace, Inventory creates the product master, Product In creates stock, Kitchen Ops and Bar Ops consume or adjust stock through movements, Recipe Maker defines ingredient costing, Sales Performance records revenue, sold consumption deducts ingredients, Dashboard summarizes live performance, Main Panel shows live alerts, and Reports export the same source data. If one module changes data, related modules should reflect it without manual refresh.",
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
      "The Main Panel is the multi-outlet command radar for Forza and Fusion. It appears before Dashboard in the sidebar for Super Admin and Manager users. It shows both outlets in one executive radar view, with live alert monitoring for Kitchen, Bar, and Global areas. It reads live product and movement data, then highlights low stock, overstock, expired products, expiring soon products, discrepancies, waste, shrinkage, negative stock, and operational alert status.",
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
      "The Dashboard is the operational summary page. It summarizes live data from active products, inventory movements, and valid linked sales records. It should show inventory value, stock in, stock out, waste, shrinkage, sold quantity, revenue indicators, alerts, top consumed ingredients, top sold items, and latest stock movements. It should not rely on stale disconnected data.",
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
    title: "Dashboard sold quantity",
    module: "Dashboard",
    keywords: [
      "sold qty",
      "sold quantity",
      "dashboard sold",
      "sold consumption",
      "deleted product sold qty",
      "stale sold qty",
    ],
    answer:
      "Dashboard Sold Qty should come from active product-linked sold_consumption inventory movements. If a product was deleted or made inactive, Dashboard should not keep counting its old sold quantity. Commercial logic must filter against valid active products and avoid stale rows that no longer belong to the current operation.",
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
    title: "Inventory product creation",
    module: "Inventory",
    keywords: [
      "create product",
      "edit product",
      "product creation",
      "new product",
      "product setup",
      "master data",
      "stock should not calculate",
    ],
    answer:
      "Create/Edit Product should only create or update product master data. It should not calculate stock immediately. A product becomes part of stock value only after a real movement is entered, such as Product In. This prevents false inventory value from appearing before the product is actually received, counted, or moved.",
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
    title: "Inventory UOM rules",
    module: "Inventory",
    keywords: [
      "uom",
      "unit",
      "gram",
      "ml",
      "pc",
      "bottle",
      "calculate by uom",
      "movement uom",
    ],
    answer:
      "Forza standardizes product UOM to gram, ml, pc, and bottle. Movements must be entered in the product UOM. If the product is gram, Product In, consumption, waste, and stock count are calculated in gram. If the product is ml, movements are calculated in ml. This keeps Inventory, Kitchen Ops, Bar Ops, Dashboard, Main Panel, and Reports aligned.",
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
    title: "Inventory stock in",
    module: "Inventory",
    keywords: [
      "product in",
      "stock in",
      "delivery",
      "receive stock",
      "supplier delivery",
      "purchase",
      "add stock",
    ],
    answer:
      "Product In is the standard movement for receiving stock. It increases the calculated stock balance using the product UOM and computed unit cost. Example: if flour is 0.02 per gram and Product In is 1000 gram, stock value increases by 20. Product In should be the first movement that creates stock quantity and value for a newly created product.",
  },
  {
    title: "Inventory stock out",
    module: "Inventory",
    keywords: [
      "stock out",
      "consume",
      "deduct",
      "waste",
      "shrinkage",
      "transfer out",
      "adjustment out",
      "production consumption",
      "sold consumption",
    ],
    answer:
      "Stock-out movements deduct from the calculated balance. Production Consumption, Sold Consumption, Waste, Shrinkage, Transfer Out, and Adjustment Out all reduce stock. Each deduction uses the product UOM and unit cost. For example, if a product costs 0.02 per gram and 200 gram is consumed, the stock quantity drops by 200 gram and stock value drops by 4.",
  },
  {
    title: "Physical count and discrepancy",
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
      "Discrepancy is calculated by comparing physical count against calculated system balance. Physical Count minus System Balance equals Discrepancy. If the physical count is lower, the result is missing stock. If it is higher, the result is over stock. If both match, it is on track. A physical count should reset the system balance to the counted quantity going forward.",
  },
  {
    title: "Expiry tracking",
    module: "Inventory",
    keywords: [
      "expiry",
      "expired",
      "expiring",
      "expiry date",
      "expiry alert",
      "expired item",
      "expiring soon",
    ],
    answer:
      "Expiry tracking uses the product expiry date. Expired products become Critical alerts. Products expiring soon become Warning alerts. Main Panel, Dashboard, Inventory, and Reports should all read the same expiry data so expired and expiring items are visible to operations before they become waste or risk.",
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
      "Kitchen Ops reads kitchen products and kitchen inventory movements. It shows kitchen stock health, production consumption, sold consumption, waste, shrinkage, discrepancy, and calculated movement balance. The ledger calculation runs oldest to newest per product. Product In, Transfer In, and Adjustment In increase balance. Production Consumption, Sold Consumption, Waste, Shrinkage, Transfer Out, and Adjustment Out deduct balance. Physical Count resets the system balance to the counted quantity.",
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
    title: "Kitchen production consumption",
    module: "Kitchen Ops",
    keywords: [
      "production consumption",
      "kitchen consumption",
      "boh consumption",
      "deduct kitchen stock",
      "production deduct",
    ],
    answer:
      "Production Consumption deducts kitchen stock when ingredients are used for preparation, batch production, mise en place, or recipe production. It should always deduct by the product UOM and should create a movement in inventory_movements so Inventory, Kitchen Ops, Dashboard, Main Panel, and Reports all see the same deduction.",
  },
  {
    title: "Kitchen waste",
    module: "Kitchen Ops",
    keywords: [
      "kitchen waste",
      "waste kitchen",
      "spoiled",
      "discard",
      "kitchen wastage",
    ],
    answer:
      "Kitchen Waste deducts stock because the product is no longer usable. Waste should be recorded as a movement with product, quantity, UOM, date, and notes. Waste affects Inventory value, Kitchen Ops balance, Dashboard waste metrics, Main Panel warning alerts, and Reports.",
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
    title: "Bottle and ml bar logic",
    module: "Bar Ops",
    keywords: [
      "bottle",
      "ml",
      "bar bottle",
      "bottle stock",
      "liquor",
      "wine bottle",
      "beer bottle",
    ],
    answer:
      "Bar products can use ml, bottle, pc, or other standardized UOM depending on setup. For accurate beverage costing, bottle products should be converted consistently when needed. If a product is tracked by ml, all consumption must be in ml. If it is tracked by bottle, movements must be in bottle unless a conversion feature is explicitly used.",
  },
  {
    title: "Bar waste and shrinkage",
    module: "Bar Ops",
    keywords: [
      "bar waste",
      "bar shrinkage",
      "spillage",
      "broken bottle",
      "lost bottle",
      "missing liquor",
    ],
    answer:
      "Bar Waste deducts stock for unusable beverage items, while Shrinkage records unexplained loss or missing stock. Both must create inventory movements so the loss appears in Bar Ops, Inventory, Dashboard, Main Panel, and Reports. These movements should be monitored because they directly affect beverage cost and margins.",
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
    title: "Recipe ingredient costing",
    module: "Recipe Maker",
    keywords: [
      "ingredient cost",
      "recipe ingredients",
      "recipe item",
      "cost per ingredient",
      "uom snapshot",
      "ingredient uom",
    ],
    answer:
      "Recipe ingredient cost should use the product unit cost per UOM at the time of calculation. Each ingredient quantity should match or convert correctly to the product UOM. For commercial accuracy, recipes should store enough product snapshot data to keep historical recipe costs stable even if product prices later change.",
  },
  {
    title: "Recipe selling price",
    module: "Recipe Maker",
    keywords: [
      "selling price",
      "suggested selling price",
      "food cost percentage",
      "target food cost",
      "margin",
      "recipe margin",
    ],
    answer:
      "Suggested selling price is calculated from recipe cost and target food cost percentage. For example, if the recipe cost is 5 and the target food cost is 25%, suggested selling price is 20. This gives managers a practical price guide while still allowing manual pricing decisions.",
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
      "Sales Performance represents revenue from POS or controlled manual sales entries when POS integration is not available. It should handle gross sales, discounts, net sales, and sales adjustments. Sold items may affect inventory consumption, but revenue should stay aligned with POS or the official Sales Performance source.",
  },
  {
    title: "Sales gross net discount",
    module: "Sales Performance",
    keywords: [
      "gross sales",
      "net sales",
      "discount",
      "sales discount",
      "revenue after discount",
      "sales calculation",
    ],
    answer:
      "Gross sales are the sales amount before discount. Discounts reduce gross sales. Net sales are the final revenue after discount and adjustments. Payroll Budget and Operational Budget should use net sales when calculating cost percentages and budget variance.",
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
    title: "POS integration",
    module: "Sales Performance",
    keywords: [
      "pos",
      "pos integration",
      "external sales",
      "import sales",
      "pos connect",
      "manual sales",
    ],
    answer:
      "If POS integration is available, Sales Performance should use POS as the trusted sales source. If POS is not available, controlled manual entries can be used, but they must be linked properly to recipes, sold items, and inventory movements where applicable. The system should avoid disconnected manual revenue that does not link to operations.",
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
    title: "Payroll budget variance",
    module: "Payroll Budget",
    keywords: [
      "payroll variance",
      "labor variance",
      "payroll percentage",
      "labor percentage",
      "actual payroll",
      "budget payroll",
    ],
    answer:
      "Payroll variance compares budgeted payroll against actual payroll. Labor percentage compares payroll cost against net sales. If net sales increase or decrease, payroll budget performance should update from linked Sales Performance data. This allows managers to control labor cost realistically.",
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
    title: "Operational budget variance",
    module: "Operational Budget",
    keywords: [
      "operational variance",
      "expense variance",
      "budget variance",
      "actual expense",
      "budget expense",
      "opex variance",
    ],
    answer:
      "Operational Budget variance compares budgeted expenses against actual expenses. If actual cost exceeds budget, the system should flag the variance. For commercial accuracy, expense categories should remain consistent and reports should show monthly performance clearly.",
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
    title: "Report export",
    module: "Reports",
    keywords: [
      "pdf export",
      "csv export",
      "download report",
      "print report",
      "executive report",
      "report export",
    ],
    answer:
      "PDF export is best for printable executive summaries, ownership review, and formal reporting. CSV export is best for spreadsheet analysis, accounting review, and deeper filtering. A commercial report should include filters, source data consistency, generated date, and clear totals.",
  },
  {
    title: "Reports realtime accuracy",
    module: "Reports",
    keywords: [
      "reports realtime",
      "report not matching",
      "report mismatch",
      "report wrong",
      "report total wrong",
    ],
    answer:
      "Reports must match the source modules. If Inventory says one stock value but Reports show another, check whether Reports use the same products and inventory_movements calculation. Reports should not duplicate calculation logic differently from Inventory, Dashboard, or Main Panel.",
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
    title: "BOH Staff access",
    module: "Users",
    keywords: [
      "boh staff",
      "boh access",
      "kitchen staff",
      "back of house",
      "boh permission",
    ],
    answer:
      "BOH Staff should focus on Kitchen Ops, Inventory, Recipe Maker, and Profile. They should not access executive control areas such as Main Panel, Users, or Brand Management unless a future restricted BOH-specific view is created.",
  },
  {
    title: "FOH Staff access",
    module: "Users",
    keywords: [
      "foh staff",
      "foh access",
      "bar staff",
      "front of house",
      "foh permission",
    ],
    answer:
      "FOH Staff should focus on Bar Ops, Inventory, Sales Performance, and Profile. They should not access executive control areas such as Main Panel, Users, or Brand Management unless a future restricted FOH-specific view is created.",
  },
  {
    title: "Manager access",
    module: "Users",
    keywords: [
      "manager access",
      "manager permission",
      "manager role",
      "manager can access",
    ],
    answer:
      "Managers can access operational modules such as Main Panel, Dashboard, Inventory, Kitchen Ops, Bar Ops, Recipe Maker, Sales Performance, Reports, Settings, and Profile. Managers should not access Super Admin-only controls such as Users and Brand Management.",
  },
  {
    title: "Super Admin access",
    module: "Users",
    keywords: [
      "super admin",
      "super admin access",
      "admin permission",
      "admin role",
      "all modules",
    ],
    answer:
      "Super Admin can access all modules, including Main Panel, Dashboard, Inventory, Kitchen Ops, Bar Ops, Recipe Maker, Sales Performance, Payroll Budget, Operational Budget, Reports, Users, Brand Management, Settings, and Profile.",
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
    title: "Forza and Fusion",
    module: "Brand Management",
    keywords: [
      "forza and fusion",
      "forza outlet",
      "fusion outlet",
      "two outlets",
      "brand switcher",
      "active brand",
    ],
    answer:
      "Forza and Fusion are separate brand/outlet workspaces in the system. The brand switcher controls which brand is active in operational modules. Main Panel can monitor both outlets together, while other modules usually work inside the selected brand context.",
  },
  {
    title: "Branch units",
    module: "Brand Management",
    keywords: [
      "branch unit",
      "brand unit",
      "unit",
      "branch",
      "outlet unit",
      "location",
    ],
    answer:
      "Branch units represent outlet locations under a brand. Products and movements should be connected to the correct brand_unit_id so calculations stay separated by outlet. If a product or movement is attached to the wrong branch unit, reports and module views can look incorrect.",
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
    title: "Alert thresholds",
    module: "Settings",
    keywords: [
      "alert threshold",
      "low stock threshold",
      "minimum stock",
      "maximum stock",
      "overstock threshold",
      "expiry threshold",
    ],
    answer:
      "Alert thresholds control when the system warns the user. Minimum stock creates Low Stock alerts when calculated stock is at or below the minimum. Maximum stock creates Overstock warnings when calculated stock is above maximum. Expiry thresholds help flag expired and expiring soon products.",
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
    title: "Profile avatar sync",
    module: "Profile",
    keywords: [
      "avatar not showing",
      "profile image",
      "profile picture",
      "avatar sync",
      "user image",
    ],
    answer:
      "If an avatar is not showing, confirm the profile avatar_url is saved correctly, storage access is valid, and the DashboardShell is loading the latest profile image. Avatar updates should appear across the shell without requiring unrelated code changes.",
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
    title: "Realtime source tables",
    module: "Realtime",
    keywords: [
      "source tables",
      "realtime tables",
      "products table",
      "inventory movements table",
      "sold items table",
      "recipe sales table",
    ],
    answer:
      "Common realtime source tables include products, inventory_movements, brands, brand_units, sold_items, recipe_sales, recipes, and main_panel_alert_actions. The correct tables depend on the page. Inventory, Kitchen Ops, and Bar Ops usually need products and inventory_movements. Main Panel also needs brands, brand_units, and alert actions. Dashboard may need products, inventory_movements, sold_items, and recipe_sales.",
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
  {
    title: "Deleted product cleanup",
    module: "Troubleshooting",
    keywords: [
      "deleted product",
      "deleted item",
      "still showing",
      "stale item",
      "deleted but still counted",
      "inactive product",
    ],
    answer:
      "If a deleted or inactive product is still counted, check whether the module is filtering only active products and valid product IDs. Old movements, sold items, or manual revenue rows can remain in the database. Commercial logic should either reverse linked records or exclude invalid inactive/deleted links from calculations.",
  },
  {
    title: "Disconnected sales cleanup",
    module: "Troubleshooting",
    keywords: [
      "disconnected sales",
      "manual sold item",
      "recipe_id null",
      "orphan sale",
      "orphan sold item",
      "delete stale revenue",
    ],
    answer:
      "Disconnected sold_items rows with recipe_id null can cause revenue to remain after an item is deleted. To keep the system commercial-grade, sales should be linked to a valid recipe or official sales source. Dashboard and Reports should avoid counting disconnected manual rows unless the system intentionally supports manual revenue entries.",
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

  if (pathname.startsWith("/settings")) {
    return settingsQuickQuestions;
  }

  if (pathname.startsWith("/profile")) {
    return profileQuickQuestions;
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
    return "The current user role is BOH Staff. BOH Staff should focus on Kitchen Ops, Inventory, Recipe Maker, and Profile. They should not expect access to unauthorized pages such as Main Panel, Users, or Brand Management.";
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
    return `Chef Alex guidance — System:\n\n${pageContext}\n\n${roleContext}\n\nAsk me about a specific Forza module, complete platform guide, Main Panel radar, alert actions, PDF/CSV export, Dashboard calculation, Inventory movement, UOM costing, Kitchen Ops, Bar Ops, Recipe Maker, Sales Performance, Budget, Reports, realtime sync, or role permission workflow.`;
  }

  return `Chef Alex guidance — ${bestItem.module}:\n\n${bestItem.answer}\n\nPage context: ${pageContext}\n\nRole context: ${roleContext}`;
}