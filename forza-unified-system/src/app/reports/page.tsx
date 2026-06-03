"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  Download,
  FileText,
  LineChart,
  PieChart,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import {
  DashboardShell,
  type DashboardBrand,
} from "@/components/layout/dashboard-shell";
import { getAllowedModules, type UserRole } from "@/lib/auth/permissions";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type ProfileRecord = {
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
};

type ReportUnit = {
  id: string;
  brand_id: string | null;
  name: string;
  code: string;
  is_active: boolean;
};

type SalesRevenueRecord = {
  id: string;
  brand_id: string | null;
  brand_unit_id: string | null;
  revenue_date: string;
  sales_channel: string;
  category: string;
  product_name: string;
  gross_sales: number;
  discount_amount: number;
  service_charge: number;
  tax_amount: number;
  net_revenue: number;
  is_active: boolean;
};

type OperationalBudgetRecord = {
  id: string;
  brand_id: string;
  brand_unit_id: string | null;
  budget_month: string;
  category: string;
  custom_category: string | null;
  budget_percent: number;
  budget_amount: number;
  actual_amount: number;
  is_active: boolean;
};

type PayrollBudgetRecord = {
  id: string;
  brand_id: string;
  brand_unit_id: string | null;
  budget_month: string;
  department: string;
  custom_department: string | null;
  payroll_percent: number;
  payroll_budget_amount: number;
  actual_payroll_amount: number;
  is_active: boolean;
};

type ProductRecord = {
  id: string;
  brand_id: string;
  brand_unit_id: string | null;
  ops_area: string | null;
  product_name: string;
  sku: string | null;
  unit: string | null;
  current_stock: number;
  minimum_stock: number | null;
  maximum_stock: number | null;
  unit_cost: number | null;
  expiry_date: string | null;
  is_active: boolean;
};

type MovementRecord = {
  id: string;
  brand_id: string | null;
  brand_unit_id: string | null;
  product_id: string | null;
  ops_area: string | null;
  movement_type: string;
  quantity: number;
  unit_cost: number | null;
  movement_date: string;
  reference_code: string | null;
  notes: string | null;
  created_at: string;
};

type ReportTab =
  | "summary"
  | "sales"
  | "inventory"
  | "movements"
  | "operational"
  | "payroll";

function normalizeBrandCode(value: string | null | undefined) {
  const brand = String(value || "FORZA").trim().toUpperCase();

  if (brand === "FUSION") {
    return "FUSION";
  }

  return "FORZA";
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth() {
  const today = new Date();

  return new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function monthFromDate(value: string) {
  return `${String(value || todayDate()).slice(0, 7)}-01`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("mk-MK", {
    style: "currency",
    currency: "EUR",
    currencyDisplay: "symbol",
  }).format(value || 0);
}

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(2)}%`;
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

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function csvEscape(value: string | number | null | undefined) {
  const safeValue = String(value ?? "");

  if (
    safeValue.includes(",") ||
    safeValue.includes('"') ||
    safeValue.includes("\n")
  ) {
    return `"${safeValue.replaceAll('"', '""')}"`;
  }

  return safeValue;
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<ReportsLoading />}>
      <ReportsClient />
    </Suspense>
  );
}

function ReportsClient() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
  const requestedBrandCode = normalizeBrandCode(searchParams.get("brand"));

  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<ProfileRecord | null>(null);

  const [brands, setBrands] = useState<DashboardBrand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<DashboardBrand | null>(
    null,
  );
  const [units, setUnits] = useState<ReportUnit[]>([]);

  const [salesRevenue, setSalesRevenue] = useState<SalesRevenueRecord[]>([]);
  const [operationalBudgets, setOperationalBudgets] = useState<
    OperationalBudgetRecord[]
  >([]);
  const [payrollBudgets, setPayrollBudgets] = useState<PayrollBudgetRecord[]>(
    [],
  );
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [movements, setMovements] = useState<MovementRecord[]>([]);

  const [selectedUnitId, setSelectedUnitId] = useState("all");
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth());
  const [dateTo, setDateTo] = useState(todayDate());
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<ReportTab>("summary");

  const role = profile?.role || "manager";
  const modules = getAllowedModules(role);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/sign-in";
        return;
      }

      setUserEmail(user.email || "");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, role, is_active")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profileData || profileData.is_active === false) {
        window.location.href = "/sign-in";
        return;
      }

      setProfile(profileData as ProfileRecord);

      const { data: brandsData, error: brandsError } = await supabase
        .from("brands")
        .select("id, name, code, description, icon")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (brandsError) {
        toast.error(brandsError.message);
        setIsLoading(false);
        return;
      }

      const sortedBrands = ((brandsData || []) as DashboardBrand[]).sort(
        (a, b) => {
          const order = ["FORZA", "FUSION"];
          const aIndex = order.indexOf(a.code);
          const bIndex = order.indexOf(b.code);

          if (aIndex === -1 && bIndex === -1) {
            return a.name.localeCompare(b.name);
          }

          if (aIndex === -1) {
            return 1;
          }

          if (bIndex === -1) {
            return -1;
          }

          return aIndex - bIndex;
        },
      );

      setBrands(sortedBrands);

      const nextSelectedBrand =
        sortedBrands.find((brand) => brand.code === requestedBrandCode) ||
        sortedBrands.find((brand) => brand.code === "FORZA") ||
        sortedBrands[0] ||
        null;

      setSelectedBrand(nextSelectedBrand);

      const selectedBrandId = nextSelectedBrand?.id || "";
      const budgetMonth = monthFromDate(dateFrom);

      const [
        unitsResult,
        salesResult,
        operationalResult,
        payrollResult,
        productsResult,
        movementsResult,
      ] = await Promise.all([
        supabase
          .from("brand_units")
          .select("id, brand_id, name, code, is_active")
          .eq("brand_id", selectedBrandId)
          .eq("is_active", true)
          .order("name", { ascending: true }),

        supabase
          .from("sales_revenue")
          .select(
            "id, brand_id, brand_unit_id, revenue_date, sales_channel, category, product_name, gross_sales, discount_amount, service_charge, tax_amount, net_revenue, is_active",
          )
          .eq("brand_id", selectedBrandId)
          .eq("is_active", true)
          .gte("revenue_date", dateFrom)
          .lte("revenue_date", dateTo)
          .order("revenue_date", { ascending: false }),

        supabase
          .from("operational_budgets")
          .select(
            "id, brand_id, brand_unit_id, budget_month, category, custom_category, budget_percent, budget_amount, actual_amount, is_active",
          )
          .eq("brand_id", selectedBrandId)
          .eq("budget_month", budgetMonth)
          .eq("is_active", true)
          .order("category", { ascending: true }),

        supabase
          .from("payroll_budgets")
          .select(
            "id, brand_id, brand_unit_id, budget_month, department, custom_department, payroll_percent, payroll_budget_amount, actual_payroll_amount, is_active",
          )
          .eq("brand_id", selectedBrandId)
          .eq("budget_month", budgetMonth)
          .eq("is_active", true)
          .order("department", { ascending: true }),

        supabase
          .from("products")
          .select(
            "id, brand_id, brand_unit_id, ops_area, product_name, sku, unit, current_stock, minimum_stock, maximum_stock, unit_cost, expiry_date, is_active",
          )
          .eq("brand_id", selectedBrandId)
          .eq("is_active", true)
          .order("product_name", { ascending: true }),

        supabase
          .from("inventory_movements")
          .select(
            "id, brand_id, brand_unit_id, product_id, ops_area, movement_type, quantity, unit_cost, movement_date, reference_code, notes, created_at",
          )
          .eq("brand_id", selectedBrandId)
          .gte("movement_date", dateFrom)
          .lte("movement_date", dateTo)
          .order("movement_date", { ascending: false })
          .limit(500),
      ]);

      if (unitsResult.error) {
        toast.error(unitsResult.error.message);
        setIsLoading(false);
        return;
      }

      if (salesResult.error) {
        toast.error(salesResult.error.message);
        setIsLoading(false);
        return;
      }

      if (operationalResult.error) {
        toast.error(operationalResult.error.message);
        setIsLoading(false);
        return;
      }

      if (payrollResult.error) {
        toast.error(payrollResult.error.message);
        setIsLoading(false);
        return;
      }

      if (productsResult.error) {
        toast.error(productsResult.error.message);
        setIsLoading(false);
        return;
      }

      if (movementsResult.error) {
        toast.error(movementsResult.error.message);
        setIsLoading(false);
        return;
      }

      setUnits((unitsResult.data || []) as ReportUnit[]);
      setSalesRevenue((salesResult.data || []) as SalesRevenueRecord[]);
      setOperationalBudgets(
        (operationalResult.data || []) as OperationalBudgetRecord[],
      );
      setPayrollBudgets((payrollResult.data || []) as PayrollBudgetRecord[]);
      setProducts((productsResult.data || []) as ProductRecord[]);
      setMovements((movementsResult.data || []) as MovementRecord[]);
      setSelectedUnitId("all");
      setIsLoading(false);
    }

    loadData();
  }, [dateFrom, dateTo, requestedBrandCode, supabase]);

  const filteredSales = useMemo(() => {
    const query = search.trim().toLowerCase();

    return salesRevenue.filter((record) => {
      const matchesUnit =
        selectedUnitId === "all" || record.brand_unit_id === selectedUnitId;
      const matchesSearch =
        !query ||
        record.category.toLowerCase().includes(query) ||
        record.product_name.toLowerCase().includes(query) ||
        record.sales_channel.toLowerCase().includes(query);

      return matchesUnit && matchesSearch;
    });
  }, [salesRevenue, search, selectedUnitId]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesUnit =
        selectedUnitId === "all" || product.brand_unit_id === selectedUnitId;
      const matchesSearch =
        !query ||
        product.product_name.toLowerCase().includes(query) ||
        String(product.sku || "").toLowerCase().includes(query) ||
        String(product.ops_area || "").toLowerCase().includes(query);

      return matchesUnit && matchesSearch;
    });
  }, [products, search, selectedUnitId]);

  const filteredMovements = useMemo(() => {
    const query = search.trim().toLowerCase();

    return movements.filter((movement) => {
      const matchesUnit =
        selectedUnitId === "all" || movement.brand_unit_id === selectedUnitId;
      const product = products.find((item) => item.id === movement.product_id);
      const matchesSearch =
        !query ||
        movement.movement_type.toLowerCase().includes(query) ||
        String(movement.reference_code || "").toLowerCase().includes(query) ||
        String(movement.notes || "").toLowerCase().includes(query) ||
        String(product?.product_name || "").toLowerCase().includes(query);

      return matchesUnit && matchesSearch;
    });
  }, [movements, products, search, selectedUnitId]);

  const filteredOperationalBudgets = useMemo(() => {
    return operationalBudgets.filter(
      (budget) =>
        selectedUnitId === "all" || budget.brand_unit_id === selectedUnitId,
    );
  }, [operationalBudgets, selectedUnitId]);

  const filteredPayrollBudgets = useMemo(() => {
    return payrollBudgets.filter(
      (budget) =>
        selectedUnitId === "all" || budget.brand_unit_id === selectedUnitId,
    );
  }, [payrollBudgets, selectedUnitId]);

  const salesStats = useMemo(() => {
    const grossSales = filteredSales.reduce(
      (total, record) => total + Number(record.gross_sales || 0),
      0,
    );
    const discount = filteredSales.reduce(
      (total, record) => total + Number(record.discount_amount || 0),
      0,
    );
    const serviceCharge = filteredSales.reduce(
      (total, record) => total + Number(record.service_charge || 0),
      0,
    );
    const tax = filteredSales.reduce(
      (total, record) => total + Number(record.tax_amount || 0),
      0,
    );
    const netRevenue = filteredSales.reduce(
      (total, record) => total + Number(record.net_revenue || 0),
      0,
    );

    return {
      grossSales,
      discount,
      serviceCharge,
      tax,
      netRevenue,
      entryCount: filteredSales.length,
    };
  }, [filteredSales]);

  const inventoryStats = useMemo(() => {
    const inventoryValue = filteredProducts.reduce(
      (total, product) =>
        total +
        Number(product.current_stock || 0) * Number(product.unit_cost || 0),
      0,
    );

    const lowStockCount = filteredProducts.filter(
      (product) =>
        Number(product.minimum_stock || 0) > 0 &&
        Number(product.current_stock || 0) <= Number(product.minimum_stock || 0),
    ).length;

    const overStockCount = filteredProducts.filter(
      (product) =>
        Number(product.maximum_stock || 0) > 0 &&
        Number(product.current_stock || 0) >= Number(product.maximum_stock || 0),
    ).length;

    const expiredCount = filteredProducts.filter(
      (product) =>
        product.expiry_date && product.expiry_date <= todayDate(),
    ).length;

    return {
      inventoryValue,
      productCount: filteredProducts.length,
      lowStockCount,
      overStockCount,
      expiredCount,
    };
  }, [filteredProducts]);

  const movementStats = useMemo(() => {
    const totalMovementQty = filteredMovements.reduce(
      (total, movement) => total + Number(movement.quantity || 0),
      0,
    );

    const movementValue = filteredMovements.reduce(
      (total, movement) =>
        total +
        Number(movement.quantity || 0) * Number(movement.unit_cost || 0),
      0,
    );

    const wasteQty = filteredMovements
      .filter((movement) => movement.movement_type.toLowerCase().includes("waste"))
      .reduce((total, movement) => total + Number(movement.quantity || 0), 0);

    return {
      totalMovementQty,
      movementValue,
      movementCount: filteredMovements.length,
      wasteQty,
    };
  }, [filteredMovements]);

  const budgetStats = useMemo(() => {
    const operationalBudget = filteredOperationalBudgets.reduce(
      (total, budget) => total + Number(budget.budget_amount || 0),
      0,
    );
    const operationalActual = filteredOperationalBudgets.reduce(
      (total, budget) => total + Number(budget.actual_amount || 0),
      0,
    );
    const payrollBudget = filteredPayrollBudgets.reduce(
      (total, budget) => total + Number(budget.payroll_budget_amount || 0),
      0,
    );
    const payrollActual = filteredPayrollBudgets.reduce(
      (total, budget) => total + Number(budget.actual_payroll_amount || 0),
      0,
    );

    return {
      operationalBudget,
      operationalActual,
      operationalVariance: operationalBudget - operationalActual,
      payrollBudget,
      payrollActual,
      payrollVariance: payrollBudget - payrollActual,
    };
  }, [filteredOperationalBudgets, filteredPayrollBudgets]);

  const salesByCategory = useMemo(() => {
    const result = new Map<string, number>();

    filteredSales.forEach((record) => {
      result.set(
        record.category,
        (result.get(record.category) || 0) + Number(record.net_revenue || 0),
      );
    });

    return Array.from(result.entries())
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredSales]);

  const reportRows = useMemo(() => {
    return [
      ["Net Revenue", formatCurrency(salesStats.netRevenue)],
      ["Gross Sales", formatCurrency(salesStats.grossSales)],
      ["Discount", formatCurrency(salesStats.discount)],
      ["Inventory Value", formatCurrency(inventoryStats.inventoryValue)],
      ["Products", inventoryStats.productCount],
      ["Low Stock", inventoryStats.lowStockCount],
      ["Expired", inventoryStats.expiredCount],
      ["Operational Budget", formatCurrency(budgetStats.operationalBudget)],
      ["Operational Actual", formatCurrency(budgetStats.operationalActual)],
      ["Payroll Budget", formatCurrency(budgetStats.payrollBudget)],
      ["Payroll Actual", formatCurrency(budgetStats.payrollActual)],
    ];
  }, [budgetStats, inventoryStats, salesStats]);

  function downloadCsv() {
    const rows = [
      ["Report", "Value"],
      ...reportRows.map(([label, value]) => [label, value]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => csvEscape(cell)).join(","))
      .join("\n");

    downloadTextFile(
      `forza-reports-${selectedBrand?.code || "brand"}-${dateFrom}-${dateTo}.csv`,
      csv,
      "text/csv;charset=utf-8",
    );
  }

  function downloadPdf() {
    const categoryRows = salesByCategory
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.category)}</td>
            <td>${formatCurrency(item.value)}</td>
          </tr>
        `,
      )
      .join("");

    const productRows = filteredProducts
      .slice(0, 80)
      .map(
        (product) => `
          <tr>
            <td>${escapeHtml(product.product_name)}</td>
            <td>${escapeHtml(product.ops_area || "-")}</td>
            <td>${formatQty(Number(product.current_stock || 0))} ${escapeHtml(product.unit || "")}</td>
            <td>${formatCurrency(Number(product.unit_cost || 0))}</td>
            <td>${formatCurrency(Number(product.current_stock || 0) * Number(product.unit_cost || 0))}</td>
          </tr>
        `,
      )
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Forza Reports</title>
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
              font-size: 10px;
            }
            th {
              text-align: left;
              background: #0f172a;
              color: #ffffff;
              padding: 8px;
              font-size: 8px;
              text-transform: uppercase;
              letter-spacing: .7px;
            }
            td {
              border-bottom: 1px solid #e2e8f0;
              padding: 8px;
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
              <div class="brand">📊 Forza Unified System</div>
              <h1>Complete Analytical Reports</h1>
            </section>

            <section class="content">
              <div class="grid">
                <div class="card"><div class="label">Brand</div><div class="value">${escapeHtml(selectedBrand?.name || "Selected Brand")}</div></div>
                <div class="card"><div class="label">Date Range</div><div class="value">${escapeHtml(dateFrom)} to ${escapeHtml(dateTo)}</div></div>
                <div class="card"><div class="label">Net Revenue</div><div class="value">${formatCurrency(salesStats.netRevenue)}</div></div>
                <div class="card"><div class="label">Inventory Value</div><div class="value">${formatCurrency(inventoryStats.inventoryValue)}</div></div>
                <div class="card"><div class="label">Operational Budget</div><div class="value">${formatCurrency(budgetStats.operationalBudget)}</div></div>
                <div class="card"><div class="label">Operational Actual</div><div class="value">${formatCurrency(budgetStats.operationalActual)}</div></div>
                <div class="card"><div class="label">Payroll Budget</div><div class="value">${formatCurrency(budgetStats.payrollBudget)}</div></div>
                <div class="card"><div class="label">Payroll Actual</div><div class="value">${formatCurrency(budgetStats.payrollActual)}</div></div>
              </div>

              <h2>💶 Sales by Category</h2>
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Net Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  ${categoryRows || `<tr><td colspan="2">No sales data found.</td></tr>`}
                </tbody>
              </table>

              <h2>📦 Inventory Valuation</h2>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Area</th>
                    <th>Stock</th>
                    <th>Unit Cost</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  ${productRows || `<tr><td colspan="5">No product data found.</td></tr>`}
                </tbody>
              </table>

              <div class="footer">
                <div>Complete Analytical Reports</div>
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
      toast.error("Allow popups to download the reports PDF.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  if (isLoading || !profile) {
    return <ReportsLoading />;
  }

  return (
    <DashboardShell
      fullName={profile.full_name || userEmail || "Forza User"}
      avatarUrl={profile.avatar_url || null}
      role={role}
      modules={modules}
      brands={brands}
      selectedBrand={selectedBrand}
    >
      <section className="glass-panel relative overflow-hidden rounded-[2.25rem] p-6 md:p-8">
        <div className="absolute -right-24 -top-24 h-72 w-72 animate-pulse rounded-full bg-blue-200/50 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-72 w-72 animate-pulse rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="absolute left-1/2 top-10 h-48 w-48 -translate-x-1/2 animate-ping rounded-full bg-slate-200/20" />

        <div className="relative z-10 grid gap-6 xl:grid-cols-[1fr_420px] xl:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
              <Sparkles size={16} />
              Complete Analytical Reports
            </div>

            <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-400">
              Reports
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
              {selectedBrand?.name || "Selected Brand"} Reporting Matrix
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              Central reporting for sales revenue, inventory valuation,
              movement activity, operational budget, and payroll budget.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl">
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
              Branch Filter
            </label>
            <select
              value={selectedUnitId}
              onChange={(event) => setSelectedUnitId(event.target.value)}
              className="forza-input"
            >
              <option value="all">All Units</option>
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
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Net Revenue"
          value={formatCurrency(salesStats.netRevenue)}
          icon={<CircleDollarSign size={22} />}
          tone="dark"
        />
        <MetricCard
          label="Gross Sales"
          value={formatCurrency(salesStats.grossSales)}
          icon={<TrendingUp size={22} />}
          tone="stable"
        />
        <MetricCard
          label="Inventory Value"
          value={formatCurrency(inventoryStats.inventoryValue)}
          icon={<Boxes size={22} />}
          tone="dark"
        />
        <MetricCard
          label="Movement Value"
          value={formatCurrency(movementStats.movementValue)}
          icon={<LineChart size={22} />}
          tone="stable"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Low Stock"
          value={String(inventoryStats.lowStockCount)}
          icon={<AlertTriangle size={22} />}
          tone={inventoryStats.lowStockCount > 0 ? "danger" : "stable"}
        />
        <MetricCard
          label="Expired"
          value={String(inventoryStats.expiredCount)}
          icon={<AlertTriangle size={22} />}
          tone={inventoryStats.expiredCount > 0 ? "danger" : "stable"}
        />
        <MetricCard
          label="Operational Variance"
          value={formatCurrency(budgetStats.operationalVariance)}
          icon={
            budgetStats.operationalVariance < 0 ? (
              <TrendingDown size={22} />
            ) : (
              <CheckCircle2 size={22} />
            )
          }
          tone={budgetStats.operationalVariance < 0 ? "danger" : "stable"}
        />
        <MetricCard
          label="Payroll Variance"
          value={formatCurrency(budgetStats.payrollVariance)}
          icon={
            budgetStats.payrollVariance < 0 ? (
              <TrendingDown size={22} />
            ) : (
              <WalletCards size={22} />
            )
          }
          tone={budgetStats.payrollVariance < 0 ? "danger" : "stable"}
        />
      </section>

      <section className="glass-panel rounded-[2rem] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              ["summary", "Summary"],
              ["sales", "Sales"],
              ["inventory", "Inventory"],
              ["movements", "Movements"],
              ["operational", "Operational Budget"],
              ["payroll", "Payroll Budget"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value as ReportTab)}
                className={`forza-button-hover rounded-2xl px-4 py-3 text-sm font-black transition ${
                  activeTab === value
                    ? "bg-slate-950 text-white shadow-xl"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="forza-input pl-11 sm:min-w-[260px]"
                placeholder="Search reports..."
              />
            </div>

            <button
              type="button"
              onClick={downloadCsv}
              className="forza-button-hover inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-sm"
            >
              <Download size={18} />
              CSV
            </button>

            <button
              type="button"
              onClick={downloadPdf}
              className="forza-button-hover inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl"
            >
              <Download size={18} />
              PDF
            </button>
          </div>
        </div>
      </section>

      {activeTab === "summary" ? (
        <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <section className="glass-panel rounded-[2rem] p-6">
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Executive Summary
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Performance Overview
            </h2>

            <div className="mt-5 space-y-3">
              {reportRows.map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm"
                >
                  <span className="text-sm font-bold text-slate-500">
                    {label}
                  </span>
                  <span className="text-sm font-black text-slate-950">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-panel rounded-[2rem] p-6">
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Sales Mix
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Category Net Revenue
            </h2>

            <div className="mt-5 space-y-4">
              {salesByCategory.map((item) => {
                const percent =
                  salesStats.netRevenue > 0
                    ? (item.value / salesStats.netRevenue) * 100
                    : 0;

                return (
                  <div key={item.category}>
                    <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-600">
                      <span>{item.category}</span>
                      <span>{formatCurrency(item.value)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-950"
                        style={{
                          width: `${Math.min(100, Math.max(0, percent))}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {salesByCategory.length === 0 ? (
                <EmptyState message="No sales category data found." />
              ) : null}
            </div>
          </section>
        </section>
      ) : null}

      {activeTab === "sales" ? (
        <ReportTable
          title="Sales Revenue Report"
          subtitle="Gross sales, discount, service charge, tax, and net revenue."
          headers={[
            "Date",
            "Channel",
            "Category",
            "Product / Item",
            "Gross",
            "Discount",
            "Service",
            "Tax",
            "Net Revenue",
          ]}
          rows={filteredSales.map((record) => [
            record.revenue_date,
            record.sales_channel,
            record.category,
            record.product_name,
            formatCurrency(record.gross_sales),
            formatCurrency(record.discount_amount),
            formatCurrency(record.service_charge),
            formatCurrency(record.tax_amount),
            formatCurrency(record.net_revenue),
          ])}
        />
      ) : null}

      {activeTab === "inventory" ? (
        <ReportTable
          title="Inventory Valuation Report"
          subtitle="Current stock, unit cost, value, stock risk, and expiry."
          headers={[
            "Product",
            "SKU",
            "Area",
            "Stock",
            "Unit Cost",
            "Value",
            "Expiry",
          ]}
          rows={filteredProducts.map((product) => [
            product.product_name,
            product.sku || "-",
            product.ops_area || "-",
            `${formatQty(Number(product.current_stock || 0))} ${product.unit || ""}`,
            formatCurrency(Number(product.unit_cost || 0)),
            formatCurrency(
              Number(product.current_stock || 0) * Number(product.unit_cost || 0),
            ),
            product.expiry_date || "-",
          ])}
        />
      ) : null}

      {activeTab === "movements" ? (
        <ReportTable
          title="Stock Movement Report"
          subtitle="Inventory movement activity within the selected date range."
          headers={[
            "Date",
            "Product",
            "Type",
            "Area",
            "Quantity",
            "Unit Cost",
            "Value",
            "Reference",
          ]}
          rows={filteredMovements.map((movement) => {
            const product = products.find((item) => item.id === movement.product_id);

            return [
              movement.movement_date,
              product?.product_name || "Unknown Product",
              movement.movement_type,
              movement.ops_area || "-",
              formatQty(Number(movement.quantity || 0)),
              formatCurrency(Number(movement.unit_cost || 0)),
              formatCurrency(
                Number(movement.quantity || 0) *
                  Number(movement.unit_cost || 0),
              ),
              movement.reference_code || "-",
            ];
          })}
        />
      ) : null}

      {activeTab === "operational" ? (
        <ReportTable
          title="Operational Budget Report"
          subtitle="Operational budget vs actual spend."
          headers={["Category", "Budget %", "Budget", "Actual", "Variance"]}
          rows={filteredOperationalBudgets.map((budget) => {
            const label =
              budget.category === "custom"
                ? budget.custom_category || "Custom"
                : budget.category;

            return [
              label,
              formatPercent(Number(budget.budget_percent || 0)),
              formatCurrency(Number(budget.budget_amount || 0)),
              formatCurrency(Number(budget.actual_amount || 0)),
              formatCurrency(
                Number(budget.budget_amount || 0) -
                  Number(budget.actual_amount || 0),
              ),
            ];
          })}
        />
      ) : null}

      {activeTab === "payroll" ? (
        <ReportTable
          title="Payroll Budget Report"
          subtitle="Department payroll budget vs actual payroll."
          headers={["Department", "Payroll %", "Budget", "Actual", "Variance"]}
          rows={filteredPayrollBudgets.map((budget) => {
            const label =
              budget.department === "custom"
                ? budget.custom_department || "Custom"
                : budget.department;

            return [
              label,
              formatPercent(Number(budget.payroll_percent || 0)),
              formatCurrency(Number(budget.payroll_budget_amount || 0)),
              formatCurrency(Number(budget.actual_payroll_amount || 0)),
              formatCurrency(
                Number(budget.payroll_budget_amount || 0) -
                  Number(budget.actual_payroll_amount || 0),
              ),
            ];
          })}
        />
      ) : null}
    </DashboardShell>
  );
}

function ReportsLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="glass-panel relative w-full max-w-lg overflow-hidden rounded-[2rem] p-8 text-center">
        <div className="absolute -right-16 -top-16 h-40 w-40 animate-pulse rounded-full bg-blue-200/50 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 animate-pulse rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl">
          <FileText className="animate-pulse" size={24} />
        </div>
        <h1 className="relative z-10 mt-5 text-2xl font-black text-slate-950">
          Loading Reports
        </h1>
        <p className="relative z-10 mt-2 text-sm font-bold text-slate-500">
          Preparing analytical report workspace...
        </p>
      </section>
    </main>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "dark" | "stable" | "warning" | "danger";
};

function MetricCard({ label, value, icon, tone }: MetricCardProps) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "stable"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white/80 text-slate-950";

  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl ${toneClass}`}
    >
      <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/40 blur-2xl" />
      {tone === "danger" ? (
        <div className="absolute right-5 top-5 h-3 w-3 rounded-full bg-red-500">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
        </div>
      ) : null}
      <div className="relative z-10 mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl">
        {icon}
      </div>
      <p className="relative z-10 text-sm font-bold text-slate-500">{label}</p>
      <p className="relative z-10 mt-2 text-2xl font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

type ReportTableProps = {
  title: string;
  subtitle: string;
  headers: string[];
  rows: string[][];
};

function ReportTable({ title, subtitle, headers, rows }: ReportTableProps) {
  return (
    <section className="glass-panel rounded-[2rem] p-6">
      <div className="mb-5">
        <p className="text-sm font-black uppercase tracking-wide text-slate-400">
          Report Table
        </p>
        <h2 className="text-2xl font-black text-slate-950">{title}</h2>
        <p className="mt-2 text-sm font-bold text-slate-500">{subtitle}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-separate border-spacing-y-3">
          <thead>
            <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-400">
              {headers.map((header) => (
                <th key={header} className="px-4">
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={`${row.join("-")}-${rowIndex}`}
                className="rounded-2xl bg-white shadow-sm"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${cell}-${cellIndex}`}
                    className={`px-4 py-4 text-sm font-bold text-slate-700 ${
                      cellIndex === 0 ? "rounded-l-2xl font-black text-slate-950" : ""
                    } ${
                      cellIndex === row.length - 1 ? "rounded-r-2xl" : ""
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}

            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="rounded-2xl bg-white px-4 py-8 text-center text-sm font-bold text-slate-500"
                >
                  No report data found for the selected filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-8 text-center">
      <FileText className="mx-auto text-slate-300" size={36} />
      <p className="mt-4 text-sm font-bold text-slate-500">{message}</p>
    </div>
  );
}