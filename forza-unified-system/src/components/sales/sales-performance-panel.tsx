"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Download,
  PackageSearch,
  PieChart,
  ReceiptText,
  Search,
  Sparkles,
  TrendingUp,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import type { UserRole } from "@/lib/auth/permissions";

export type OpsArea = "kitchen" | "bar" | "global";

export type SalesUnit = {
  id: string;
  brand_id: string | null;
  name: string;
  code: string;
  is_active: boolean;
};

export type SalesRecipe = {
  id: string;
  brand_id: string | null;
  brand_unit_id: string;
  ops_area: OpsArea;
  recipe_name: string;
  recipe_category: string | null;
  selling_price: number;
  cost_per_portion: number;
  is_active: boolean;
};

export type SoldItemRecord = {
  id: string;
  sale_id: string | null;
  brand_id: string | null;
  brand_unit_id: string;
  recipe_id: string | null;
  product_id: string | null;
  ops_area: OpsArea;
  item_name: string;
  quantity: number;
  selling_price: number;
  total_sales: number;
  sold_date: string;
  created_by: string | null;
  created_at: string | null;
};

type SalesPerformancePanelProps = {
  userId: string;
  role: UserRole;
  selectedBrand: {
    id: string;
    name: string;
    code: string;
  } | null;
  units: SalesUnit[];
  recipes: SalesRecipe[];
  soldItems: SoldItemRecord[];
};

type CategoryPerformance = {
  category: string;
  quantity: number;
  grossSales: number;
  netRevenue: number;
  itemCount: number;
};

type ProductPerformance = {
  itemName: string;
  category: string;
  opsArea: OpsArea;
  quantity: number;
  grossSales: number;
  netRevenue: number;
  averageSellingPrice: number;
  itemCount: number;
};

const opsAreaLabels: Record<OpsArea, string> = {
  kitchen: "Kitchen",
  bar: "Bar",
  global: "Global",
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("mk-MK", {
    style: "currency",
    currency: "EUR",
    currencyDisplay: "symbol",
  }).format(value || 0);
}

function formatQty(value: number) {
  const safeValue = Number(value || 0);

  if (Number.isInteger(safeValue)) {
    return String(safeValue);
  }

  return String(Number(safeValue.toFixed(3)));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getAllowedOpsAreas(role: UserRole): OpsArea[] {
  if (role === "boh_staff") {
    return ["kitchen"];
  }

  if (role === "foh_staff") {
    return ["bar"];
  }

  return ["kitchen", "bar", "global"];
}

function getRecipeCategory(item: SoldItemRecord, recipes: SalesRecipe[]) {
  if (!item.recipe_id) {
    return item.ops_area === "bar" ? "Bar Product" : "Direct Product";
  }

  const recipe = recipes.find((recipeItem) => recipeItem.id === item.recipe_id);

  return recipe?.recipe_category || "Uncategorized";
}

export function SalesPerformancePanel({
  role,
  selectedBrand,
  units,
  recipes,
  soldItems,
}: SalesPerformancePanelProps) {
  const allowedOpsAreas = getAllowedOpsAreas(role);

  const [selectedUnitId, setSelectedUnitId] = useState(units[0]?.id || "");
  const [selectedOpsArea, setSelectedOpsArea] = useState<OpsArea | "all">("all");
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth());
  const [dateTo, setDateTo] = useState(todayDate());
  const [search, setSearch] = useState("");

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === selectedUnitId) || null,
    [selectedUnitId, units],
  );

  const filteredSoldItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return soldItems.filter((item) => {
      const matchesUnit = item.brand_unit_id === selectedUnitId;
      const matchesArea =
        selectedOpsArea === "all" || item.ops_area === selectedOpsArea;
      const allowedArea = allowedOpsAreas.includes(item.ops_area);
      const matchesDateFrom = !dateFrom || item.sold_date >= dateFrom;
      const matchesDateTo = !dateTo || item.sold_date <= dateTo;
      const matchesSearch =
        !query ||
        item.item_name.toLowerCase().includes(query) ||
        getRecipeCategory(item, recipes).toLowerCase().includes(query);

      return (
        matchesUnit &&
        matchesArea &&
        allowedArea &&
        matchesDateFrom &&
        matchesDateTo &&
        matchesSearch
      );
    });
  }, [
    allowedOpsAreas,
    dateFrom,
    dateTo,
    recipes,
    search,
    selectedOpsArea,
    selectedUnitId,
    soldItems,
  ]);

  const stats = useMemo(() => {
    const totalQuantity = filteredSoldItems.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0,
    );

    const grossSales = filteredSoldItems.reduce(
      (total, item) => total + Number(item.total_sales || 0),
      0,
    );

    const discounts = 0;
    const serviceCharge = 0;
    const tax = 0;
    const netRevenue = grossSales - discounts + serviceCharge - tax;

    const averageTransaction =
      filteredSoldItems.length > 0 ? netRevenue / filteredSoldItems.length : 0;

    const averageSellingPrice =
      totalQuantity > 0 ? netRevenue / totalQuantity : 0;

    return {
      soldLineCount: filteredSoldItems.length,
      totalQuantity,
      grossSales,
      discounts,
      serviceCharge,
      tax,
      netRevenue,
      averageTransaction,
      averageSellingPrice,
    };
  }, [filteredSoldItems]);

  const categoryPerformance = useMemo(() => {
    const categoryMap = new Map<string, CategoryPerformance>();

    filteredSoldItems.forEach((item) => {
      const category = getRecipeCategory(item, recipes);
      const current = categoryMap.get(category) || {
        category,
        quantity: 0,
        grossSales: 0,
        netRevenue: 0,
        itemCount: 0,
      };

      const itemSales = Number(item.total_sales || 0);

      categoryMap.set(category, {
        category,
        quantity: current.quantity + Number(item.quantity || 0),
        grossSales: current.grossSales + itemSales,
        netRevenue: current.netRevenue + itemSales,
        itemCount: current.itemCount + 1,
      });
    });

    return Array.from(categoryMap.values()).sort(
      (a, b) => b.netRevenue - a.netRevenue,
    );
  }, [filteredSoldItems, recipes]);

  const productPerformance = useMemo(() => {
    const productMap = new Map<string, ProductPerformance>();

    filteredSoldItems.forEach((item) => {
      const key = `${item.item_name}-${item.ops_area}`;
      const category = getRecipeCategory(item, recipes);
      const current = productMap.get(key) || {
        itemName: item.item_name,
        category,
        opsArea: item.ops_area,
        quantity: 0,
        grossSales: 0,
        netRevenue: 0,
        averageSellingPrice: 0,
        itemCount: 0,
      };

      const nextQuantity = current.quantity + Number(item.quantity || 0);
      const nextGrossSales = current.grossSales + Number(item.total_sales || 0);
      const nextNetRevenue = current.netRevenue + Number(item.total_sales || 0);

      productMap.set(key, {
        itemName: item.item_name,
        category,
        opsArea: item.ops_area,
        quantity: nextQuantity,
        grossSales: nextGrossSales,
        netRevenue: nextNetRevenue,
        averageSellingPrice:
          nextQuantity > 0 ? nextNetRevenue / nextQuantity : 0,
        itemCount: current.itemCount + 1,
      });
    });

    return Array.from(productMap.values()).sort(
      (a, b) => b.netRevenue - a.netRevenue,
    );
  }, [filteredSoldItems, recipes]);

  const dailyPerformance = useMemo(() => {
    const dayMap = new Map<
      string,
      {
        date: string;
        quantity: number;
        netRevenue: number;
        itemCount: number;
      }
    >();

    filteredSoldItems.forEach((item) => {
      const current = dayMap.get(item.sold_date) || {
        date: item.sold_date,
        quantity: 0,
        netRevenue: 0,
        itemCount: 0,
      };

      dayMap.set(item.sold_date, {
        date: item.sold_date,
        quantity: current.quantity + Number(item.quantity || 0),
        netRevenue: current.netRevenue + Number(item.total_sales || 0),
        itemCount: current.itemCount + 1,
      });
    });

    return Array.from(dayMap.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    );
  }, [filteredSoldItems]);

  function downloadSalesPdf() {
    if (filteredSoldItems.length === 0) {
      toast.error("No sales performance data available for PDF.");
      return;
    }

    const categoryRows = categoryPerformance
      .map(
        (category) => `
          <tr>
            <td>${escapeHtml(category.category)}</td>
            <td>${formatQty(category.quantity)}</td>
            <td>${category.itemCount}</td>
            <td>${formatCurrency(category.grossSales)}</td>
            <td>${formatCurrency(category.netRevenue)}</td>
          </tr>
        `,
      )
      .join("");

    const productRows = productPerformance
      .map(
        (product) => `
          <tr>
            <td>${escapeHtml(product.itemName)}</td>
            <td>${escapeHtml(product.category)}</td>
            <td>${escapeHtml(opsAreaLabels[product.opsArea])}</td>
            <td>${formatQty(product.quantity)}</td>
            <td>${formatCurrency(product.averageSellingPrice)}</td>
            <td>${formatCurrency(product.netRevenue)}</td>
          </tr>
        `,
      )
      .join("");

    const dailyRows = dailyPerformance
      .map(
        (day) => `
          <tr>
            <td>${escapeHtml(day.date)}</td>
            <td>${formatQty(day.quantity)}</td>
            <td>${day.itemCount}</td>
            <td>${formatCurrency(day.netRevenue)}</td>
          </tr>
        `,
      )
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Sales Performance Report</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 32px;
              color: #0f172a;
              font-family: Arial, Helvetica, sans-serif;
              background: #ffffff;
            }
            .sheet {
              max-width: 1180px;
              margin: 0 auto;
              border: 1px solid #e2e8f0;
              border-radius: 24px;
              overflow: hidden;
            }
            .header {
              padding: 28px;
              background: linear-gradient(135deg, #0f172a, #1e293b);
              color: #ffffff;
            }
            .brand {
              font-size: 12px;
              letter-spacing: 1.4px;
              text-transform: uppercase;
              font-weight: 900;
              color: #d4af37;
            }
            h1 {
              margin: 10px 0 0;
              font-size: 30px;
              line-height: 1.1;
            }
            .content { padding: 28px; }
            .grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 24px;
            }
            .card {
              border: 1px solid #e2e8f0;
              border-radius: 18px;
              padding: 14px;
              background: #f8fafc;
            }
            .label {
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: .8px;
              color: #64748b;
              font-weight: 900;
            }
            .value {
              margin-top: 6px;
              font-size: 15px;
              color: #0f172a;
              font-weight: 900;
            }
            h2 {
              margin: 26px 0 12px;
              font-size: 18px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            th {
              text-align: left;
              background: #0f172a;
              color: #ffffff;
              padding: 9px;
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: .7px;
            }
            td {
              border-bottom: 1px solid #e2e8f0;
              padding: 9px;
              vertical-align: top;
            }
            .footer {
              margin-top: 28px;
              padding-top: 18px;
              border-top: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              gap: 18px;
              font-size: 11px;
              color: #64748b;
              font-weight: 700;
            }
            @media print {
              body { padding: 0; }
              .sheet { border: 0; border-radius: 0; }
            }
          </style>
        </head>
        <body>
          <main class="sheet">
            <section class="header">
              <div class="brand">💶 Forza Unified System</div>
              <h1>Sales Performance Report</h1>
            </section>

            <section class="content">
              <div class="grid">
                <div class="card"><div class="label">Brand</div><div class="value">${escapeHtml(selectedBrand?.name || "Selected Brand")}</div></div>
                <div class="card"><div class="label">Branch</div><div class="value">${escapeHtml(selectedUnit?.name || "Selected Branch")}</div></div>
                <div class="card"><div class="label">Date Range</div><div class="value">${escapeHtml(dateFrom || "Start")} to ${escapeHtml(dateTo || "Today")}</div></div>
                <div class="card"><div class="label">Net Revenue</div><div class="value">${formatCurrency(stats.netRevenue)}</div></div>
                <div class="card"><div class="label">Gross Sales</div><div class="value">${formatCurrency(stats.grossSales)}</div></div>
                <div class="card"><div class="label">Sold Qty</div><div class="value">${formatQty(stats.totalQuantity)}</div></div>
                <div class="card"><div class="label">Sold Lines</div><div class="value">${stats.soldLineCount}</div></div>
                <div class="card"><div class="label">Avg Price</div><div class="value">${formatCurrency(stats.averageSellingPrice)}</div></div>
              </div>

              <h2>📊 Category Performance</h2>
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Lines</th>
                    <th>Gross Sales</th>
                    <th>Net Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  ${categoryRows || `<tr><td colspan="5">No category data found.</td></tr>`}
                </tbody>
              </table>

              <h2>📦 Product / Item Performance</h2>
              <table>
                <thead>
                  <tr>
                    <th>Product / Item</th>
                    <th>Category</th>
                    <th>Area</th>
                    <th>Qty</th>
                    <th>Avg Price</th>
                    <th>Net Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  ${productRows || `<tr><td colspan="6">No product data found.</td></tr>`}
                </tbody>
              </table>

              <h2>📅 Daily Revenue</h2>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Qty</th>
                    <th>Lines</th>
                    <th>Net Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  ${dailyRows || `<tr><td colspan="4">No daily data found.</td></tr>`}
                </tbody>
              </table>

              <div class="footer">
                <div>Sales Performance Dashboard Report</div>
                <div>Developer Rights Chef Alex @FORZA 2026</div>
              </div>
            </section>
          </main>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1200,height=900");

    if (!printWindow) {
      toast.error("Allow popups to download the sales PDF.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel overflow-hidden rounded-[2rem] p-6">
        <div className="relative">
          <div className="absolute -right-16 -top-20 h-52 w-52 animate-pulse rounded-full bg-emerald-100/80 blur-3xl" />
          <div className="absolute -bottom-24 -left-14 h-56 w-56 animate-pulse rounded-full bg-amber-100/80 blur-3xl" />

          <div className="relative z-10 grid gap-5 xl:grid-cols-[1fr_380px] xl:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
                <Sparkles size={16} />
                Revenue performance only
              </div>

              <p className="text-sm font-black uppercase tracking-wide text-slate-400">
                Sales Performance Dashboard
              </p>
              <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-5xl">
                {selectedBrand?.name || "Selected Brand"} Net Revenue
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                Sales Performance is for revenue, net sales, category
                performance, product performance, and budget comparison
                preparation. Stock consumption and sold consumption are handled
                only in Inventory.
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-sm">
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                Branch Unit
              </label>
              <select
                value={selectedUnitId}
                onChange={(event) => setSelectedUnitId(event.target.value)}
                className="forza-input"
              >
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                    Date From
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                    className="forza-input"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                    Date To
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    className="forza-input"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Net Revenue"
          value={formatCurrency(stats.netRevenue)}
          icon={<CircleDollarSign size={22} />}
        />
        <MetricCard
          label="Gross Sales"
          value={formatCurrency(stats.grossSales)}
          icon={<ReceiptText size={22} />}
        />
        <MetricCard
          label="Sold Qty"
          value={formatQty(stats.totalQuantity)}
          icon={<PackageSearch size={22} />}
        />
        <MetricCard
          label="Average Selling Price"
          value={formatCurrency(stats.averageSellingPrice)}
          icon={<TrendingUp size={22} />}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Discounts"
          value={formatCurrency(stats.discounts)}
          icon={<PieChart size={22} />}
        />
        <MetricCard
          label="Service Charge"
          value={formatCurrency(stats.serviceCharge)}
          icon={<ReceiptText size={22} />}
        />
        <MetricCard
          label="Tax"
          value={formatCurrency(stats.tax)}
          icon={<CalendarDays size={22} />}
        />
        <MetricCard
          label="Sales Lines"
          value={String(stats.soldLineCount)}
          icon={<BarChart3 size={22} />}
        />
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Filters
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              Revenue Performance View
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedOpsArea}
              onChange={(event) =>
                setSelectedOpsArea(event.target.value as OpsArea | "all")
              }
              className="forza-input sm:min-w-[180px]"
            >
              <option value="all">All Areas</option>
              {allowedOpsAreas.map((area) => (
                <option key={area} value={area}>
                  {opsAreaLabels[area]}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="forza-input pl-11 xl:min-w-[300px]"
                placeholder="Search item or category..."
              />
            </div>

            <button
              type="button"
              onClick={downloadSalesPdf}
              className="forza-button-hover inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl"
            >
              <Download size={18} />
              PDF
            </button>
          </div>
        </div>

        <p className="text-sm font-bold leading-6 text-slate-500">
          This page does not create sold dishes, recipes, or inventory
          consumption. It only reads completed sales data and summarizes revenue
          performance.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="glass-panel rounded-[2rem] p-6">
          <div className="mb-5">
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Category Performance
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              Revenue by Category
            </h2>
          </div>

          <div className="space-y-3">
            {categoryPerformance.slice(0, 10).map((category) => (
              <div
                key={category.category}
                className="forza-transition forza-hover rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-black text-slate-950">
                      {category.category}
                    </h3>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      Qty: {formatQty(category.quantity)} · Lines:{" "}
                      {category.itemCount}
                    </p>
                  </div>
                  <p className="text-sm font-black text-slate-950">
                    {formatCurrency(category.netRevenue)}
                  </p>
                </div>
              </div>
            ))}

            {categoryPerformance.length === 0 ? (
              <div className="rounded-3xl bg-white/80 p-5 text-sm font-bold text-slate-500">
                No category revenue found.
              </div>
            ) : null}
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-6">
          <div className="mb-5">
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Product Performance
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              Revenue by Product / Item
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-400">
                  <th className="px-4">Product / Item</th>
                  <th className="px-4">Category</th>
                  <th className="px-4">Area</th>
                  <th className="px-4">Qty</th>
                  <th className="px-4">Avg Price</th>
                  <th className="px-4">Net Revenue</th>
                </tr>
              </thead>

              <tbody>
                {productPerformance.map((product) => (
                  <tr
                    key={`${product.itemName}-${product.opsArea}`}
                    className="rounded-2xl bg-white shadow-sm"
                  >
                    <td className="rounded-l-2xl px-4 py-4 text-sm font-black text-slate-950">
                      {product.itemName}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">
                      {product.category}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">
                      {opsAreaLabels[product.opsArea]}
                    </td>
                    <td className="px-4 py-4 text-sm font-black text-slate-950">
                      {formatQty(product.quantity)}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">
                      {formatCurrency(product.averageSellingPrice)}
                    </td>
                    <td className="rounded-r-2xl px-4 py-4 text-sm font-black text-slate-950">
                      {formatCurrency(product.netRevenue)}
                    </td>
                  </tr>
                ))}

                {productPerformance.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="rounded-2xl bg-white px-4 py-8 text-center text-sm font-bold text-slate-500"
                    >
                      No product revenue found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="mb-5">
          <p className="text-sm font-black uppercase tracking-wide text-slate-400">
            Daily Revenue
          </p>
          <h2 className="text-2xl font-black text-slate-950">
            Revenue by Date
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-400">
                <th className="px-4">Date</th>
                <th className="px-4">Qty</th>
                <th className="px-4">Lines</th>
                <th className="px-4">Net Revenue</th>
              </tr>
            </thead>

            <tbody>
              {dailyPerformance.map((day) => (
                <tr key={day.date} className="rounded-2xl bg-white shadow-sm">
                  <td className="rounded-l-2xl px-4 py-4 text-sm font-black text-slate-950">
                    {day.date}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-700">
                    {formatQty(day.quantity)}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-700">
                    {day.itemCount}
                  </td>
                  <td className="rounded-r-2xl px-4 py-4 text-sm font-black text-slate-950">
                    {formatCurrency(day.netRevenue)}
                  </td>
                </tr>
              ))}

              {dailyPerformance.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="rounded-2xl bg-white px-4 py-8 text-center text-sm font-bold text-slate-500"
                  >
                    No daily revenue found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  icon: React.ReactNode;
};

function MetricCard({ label, value, icon }: MetricCardProps) {
  return (
    <div className="glass-panel forza-transition forza-hover rounded-[2rem] p-5">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
        {icon}
      </div>
      <p className="text-sm font-bold text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}