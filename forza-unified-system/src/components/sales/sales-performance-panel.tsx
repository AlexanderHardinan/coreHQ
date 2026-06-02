"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Download,
  Edit3,
  FileText,
  PackageSearch,
  PieChart,
  Plus,
  ReceiptText,
  Save,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import type { UserRole } from "@/lib/auth/permissions";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export type SalesUnit = {
  id: string;
  brand_id: string | null;
  name: string;
  code: string;
  is_active: boolean;
};

export type SalesChannel = "manual" | "pos" | "imported";

export type SalesRevenueRecord = {
  id: string;
  brand_id: string;
  brand_unit_id: string | null;
  revenue_date: string;
  revenue_month: string;
  sales_channel: SalesChannel;
  category: string;
  product_name: string;
  gross_sales: number;
  discount_amount: number;
  service_charge: number;
  tax_amount: number;
  net_revenue: number;
  notes: string | null;
  source_reference: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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
  salesRevenue: SalesRevenueRecord[];
};

type SalesFormState = {
  id: string;
  brandUnitId: string;
  revenueDate: string;
  salesChannel: SalesChannel;
  category: string;
  productName: string;
  grossSales: string;
  discountAmount: string;
  serviceCharge: string;
  taxAmount: string;
  notes: string;
  sourceReference: string;
};

type CategoryPerformance = {
  category: string;
  grossSales: number;
  discountAmount: number;
  serviceCharge: number;
  taxAmount: number;
  netRevenue: number;
  entryCount: number;
};

type ProductPerformance = {
  productName: string;
  category: string;
  grossSales: number;
  discountAmount: number;
  serviceCharge: number;
  taxAmount: number;
  netRevenue: number;
  entryCount: number;
};

const salesChannelLabels: Record<SalesChannel, string> = {
  manual: "Manual",
  pos: "POS",
  imported: "Imported",
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

function calculateNetRevenue(
  grossSales: number,
  discountAmount: number,
  serviceCharge: number,
  taxAmount: number,
) {
  return Math.max(
    0,
    Number(grossSales || 0) -
      Number(discountAmount || 0) +
      Number(serviceCharge || 0) -
      Number(taxAmount || 0),
  );
}

function getEmptyForm(unitId: string): SalesFormState {
  return {
    id: "",
    brandUnitId: unitId || "",
    revenueDate: todayDate(),
    salesChannel: "manual",
    category: "General",
    productName: "General Sales",
    grossSales: "0",
    discountAmount: "0",
    serviceCharge: "0",
    taxAmount: "0",
    notes: "",
    sourceReference: "",
  };
}

export function SalesPerformancePanel({
  userId,
  role,
  selectedBrand,
  units,
  salesRevenue,
}: SalesPerformancePanelProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const defaultUnitId = units[0]?.id || "";

  const [records, setRecords] = useState<SalesRevenueRecord[]>(salesRevenue);
  const [selectedUnitId, setSelectedUnitId] = useState(defaultUnitId);
  const [selectedChannel, setSelectedChannel] = useState<SalesChannel | "all">(
    "all",
  );
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth());
  const [dateTo, setDateTo] = useState(todayDate());
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<SalesFormState>(() =>
    getEmptyForm(defaultUnitId),
  );

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === selectedUnitId) || null,
    [selectedUnitId, units],
  );

  const formGrossSales = Number(form.grossSales || 0);
  const formDiscountAmount = Number(form.discountAmount || 0);
  const formServiceCharge = Number(form.serviceCharge || 0);
  const formTaxAmount = Number(form.taxAmount || 0);
  const formNetRevenue = calculateNetRevenue(
    formGrossSales,
    formDiscountAmount,
    formServiceCharge,
    formTaxAmount,
  );

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesUnit =
        !selectedUnitId || record.brand_unit_id === selectedUnitId;
      const matchesChannel =
        selectedChannel === "all" || record.sales_channel === selectedChannel;
      const matchesDateFrom = !dateFrom || record.revenue_date >= dateFrom;
      const matchesDateTo = !dateTo || record.revenue_date <= dateTo;
      const matchesSearch =
        !query ||
        record.product_name.toLowerCase().includes(query) ||
        record.category.toLowerCase().includes(query) ||
        String(record.notes || "").toLowerCase().includes(query) ||
        String(record.source_reference || "").toLowerCase().includes(query);

      return (
        matchesUnit &&
        matchesChannel &&
        matchesDateFrom &&
        matchesDateTo &&
        matchesSearch
      );
    });
  }, [dateFrom, dateTo, records, search, selectedChannel, selectedUnitId]);

  const stats = useMemo(() => {
    const grossSales = filteredRecords.reduce(
      (total, record) => total + Number(record.gross_sales || 0),
      0,
    );

    const discounts = filteredRecords.reduce(
      (total, record) => total + Number(record.discount_amount || 0),
      0,
    );

    const serviceCharge = filteredRecords.reduce(
      (total, record) => total + Number(record.service_charge || 0),
      0,
    );

    const tax = filteredRecords.reduce(
      (total, record) => total + Number(record.tax_amount || 0),
      0,
    );

    const netRevenue = filteredRecords.reduce(
      (total, record) => total + Number(record.net_revenue || 0),
      0,
    );

    const averageEntry =
      filteredRecords.length > 0 ? netRevenue / filteredRecords.length : 0;

    return {
      entryCount: filteredRecords.length,
      grossSales,
      discounts,
      serviceCharge,
      tax,
      netRevenue,
      averageEntry,
    };
  }, [filteredRecords]);

  const categoryPerformance = useMemo(() => {
    const categoryMap = new Map<string, CategoryPerformance>();

    filteredRecords.forEach((record) => {
      const category = record.category || "General";
      const current = categoryMap.get(category) || {
        category,
        grossSales: 0,
        discountAmount: 0,
        serviceCharge: 0,
        taxAmount: 0,
        netRevenue: 0,
        entryCount: 0,
      };

      categoryMap.set(category, {
        category,
        grossSales: current.grossSales + Number(record.gross_sales || 0),
        discountAmount:
          current.discountAmount + Number(record.discount_amount || 0),
        serviceCharge:
          current.serviceCharge + Number(record.service_charge || 0),
        taxAmount: current.taxAmount + Number(record.tax_amount || 0),
        netRevenue: current.netRevenue + Number(record.net_revenue || 0),
        entryCount: current.entryCount + 1,
      });
    });

    return Array.from(categoryMap.values()).sort(
      (a, b) => b.netRevenue - a.netRevenue,
    );
  }, [filteredRecords]);

  const productPerformance = useMemo(() => {
    const productMap = new Map<string, ProductPerformance>();

    filteredRecords.forEach((record) => {
      const key = `${record.product_name}-${record.category}`;
      const current = productMap.get(key) || {
        productName: record.product_name || "General Sales",
        category: record.category || "General",
        grossSales: 0,
        discountAmount: 0,
        serviceCharge: 0,
        taxAmount: 0,
        netRevenue: 0,
        entryCount: 0,
      };

      productMap.set(key, {
        productName: current.productName,
        category: current.category,
        grossSales: current.grossSales + Number(record.gross_sales || 0),
        discountAmount:
          current.discountAmount + Number(record.discount_amount || 0),
        serviceCharge:
          current.serviceCharge + Number(record.service_charge || 0),
        taxAmount: current.taxAmount + Number(record.tax_amount || 0),
        netRevenue: current.netRevenue + Number(record.net_revenue || 0),
        entryCount: current.entryCount + 1,
      });
    });

    return Array.from(productMap.values()).sort(
      (a, b) => b.netRevenue - a.netRevenue,
    );
  }, [filteredRecords]);

  const dailyPerformance = useMemo(() => {
    const dayMap = new Map<
      string,
      {
        date: string;
        grossSales: number;
        discounts: number;
        serviceCharge: number;
        tax: number;
        netRevenue: number;
        entryCount: number;
      }
    >();

    filteredRecords.forEach((record) => {
      const current = dayMap.get(record.revenue_date) || {
        date: record.revenue_date,
        grossSales: 0,
        discounts: 0,
        serviceCharge: 0,
        tax: 0,
        netRevenue: 0,
        entryCount: 0,
      };

      dayMap.set(record.revenue_date, {
        date: record.revenue_date,
        grossSales: current.grossSales + Number(record.gross_sales || 0),
        discounts: current.discounts + Number(record.discount_amount || 0),
        serviceCharge:
          current.serviceCharge + Number(record.service_charge || 0),
        tax: current.tax + Number(record.tax_amount || 0),
        netRevenue: current.netRevenue + Number(record.net_revenue || 0),
        entryCount: current.entryCount + 1,
      });
    });

    return Array.from(dayMap.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    );
  }, [filteredRecords]);

  function updateForm(key: keyof SalesFormState, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetForm() {
    setForm(getEmptyForm(selectedUnitId || defaultUnitId));
  }

  async function handleSaveRevenue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedBrand?.id) {
      toast.error("Selected brand is required.");
      return;
    }

    if (!form.brandUnitId) {
      toast.error("Branch unit is required.");
      return;
    }

    if (!form.revenueDate) {
      toast.error("Revenue date is required.");
      return;
    }

    const grossSales = Number(form.grossSales || 0);
    const discountAmount = Number(form.discountAmount || 0);
    const serviceCharge = Number(form.serviceCharge || 0);
    const taxAmount = Number(form.taxAmount || 0);
    const netRevenue = calculateNetRevenue(
      grossSales,
      discountAmount,
      serviceCharge,
      taxAmount,
    );

    if (
      grossSales < 0 ||
      discountAmount < 0 ||
      serviceCharge < 0 ||
      taxAmount < 0
    ) {
      toast.error("Sales values cannot be negative.");
      return;
    }

    setIsSaving(true);

    const payload = {
      brand_id: selectedBrand.id,
      brand_unit_id: form.brandUnitId,
      revenue_date: form.revenueDate,
      revenue_month: `${form.revenueDate.slice(0, 7)}-01`,
      sales_channel: form.salesChannel,
      category: form.category.trim() || "General",
      product_name: form.productName.trim() || "General Sales",
      gross_sales: grossSales,
      discount_amount: discountAmount,
      service_charge: serviceCharge,
      tax_amount: taxAmount,
      net_revenue: netRevenue,
      notes: form.notes.trim() || null,
      source_reference: form.sourceReference.trim() || null,
      is_active: true,
      created_by: userId,
    };

    const { data, error } = form.id
      ? await supabase
          .from("sales_revenue")
          .update({
            brand_unit_id: payload.brand_unit_id,
            revenue_date: payload.revenue_date,
            revenue_month: payload.revenue_month,
            sales_channel: payload.sales_channel,
            category: payload.category,
            product_name: payload.product_name,
            gross_sales: payload.gross_sales,
            discount_amount: payload.discount_amount,
            service_charge: payload.service_charge,
            tax_amount: payload.tax_amount,
            net_revenue: payload.net_revenue,
            notes: payload.notes,
            source_reference: payload.source_reference,
          })
          .eq("id", form.id)
          .select(
            "id, brand_id, brand_unit_id, revenue_date, revenue_month, sales_channel, category, product_name, gross_sales, discount_amount, service_charge, tax_amount, net_revenue, notes, source_reference, is_active, created_by, created_at, updated_at",
          )
          .single()
      : await supabase
          .from("sales_revenue")
          .insert(payload)
          .select(
            "id, brand_id, brand_unit_id, revenue_date, revenue_month, sales_channel, category, product_name, gross_sales, discount_amount, service_charge, tax_amount, net_revenue, notes, source_reference, is_active, created_by, created_at, updated_at",
          )
          .single();

    setIsSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    const savedRecord = data as SalesRevenueRecord;

    setRecords((current) => {
      if (form.id) {
        return current.map((record) =>
          record.id === savedRecord.id ? savedRecord : record,
        );
      }

      return [savedRecord, ...current];
    });

    toast.success(
      form.id ? "Sales revenue updated." : "Sales revenue saved.",
    );
    resetForm();
  }

  function handleEditRevenue(record: SalesRevenueRecord) {
    setForm({
      id: record.id,
      brandUnitId: record.brand_unit_id || defaultUnitId,
      revenueDate: record.revenue_date,
      salesChannel: record.sales_channel,
      category: record.category || "General",
      productName: record.product_name || "General Sales",
      grossSales: String(Number(record.gross_sales || 0)),
      discountAmount: String(Number(record.discount_amount || 0)),
      serviceCharge: String(Number(record.service_charge || 0)),
      taxAmount: String(Number(record.tax_amount || 0)),
      notes: record.notes || "",
      sourceReference: record.source_reference || "",
    });

    toast.success("Sales revenue loaded for editing.");
  }

  async function handleDeleteRevenue(id: string) {
    const { error } = await supabase
      .from("sales_revenue")
      .update({
        is_active: false,
      })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setRecords((current) => current.filter((record) => record.id !== id));
    toast.success("Sales revenue removed.");
  }

  function downloadSalesPdf() {
    if (filteredRecords.length === 0) {
      toast.error("No sales revenue data available for PDF.");
      return;
    }

    const categoryRows = categoryPerformance
      .map(
        (category) => `
          <tr>
            <td>${escapeHtml(category.category)}</td>
            <td>${category.entryCount}</td>
            <td>${formatCurrency(category.grossSales)}</td>
            <td>${formatCurrency(category.discountAmount)}</td>
            <td>${formatCurrency(category.serviceCharge)}</td>
            <td>${formatCurrency(category.taxAmount)}</td>
            <td>${formatCurrency(category.netRevenue)}</td>
          </tr>
        `,
      )
      .join("");

    const productRows = productPerformance
      .map(
        (product) => `
          <tr>
            <td>${escapeHtml(product.productName)}</td>
            <td>${escapeHtml(product.category)}</td>
            <td>${product.entryCount}</td>
            <td>${formatCurrency(product.grossSales)}</td>
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
            <td>${day.entryCount}</td>
            <td>${formatCurrency(day.grossSales)}</td>
            <td>${formatCurrency(day.discounts)}</td>
            <td>${formatCurrency(day.serviceCharge)}</td>
            <td>${formatCurrency(day.tax)}</td>
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
                <div class="card"><div class="label">Discount</div><div class="value">${formatCurrency(stats.discounts)}</div></div>
                <div class="card"><div class="label">Service Charge</div><div class="value">${formatCurrency(stats.serviceCharge)}</div></div>
                <div class="card"><div class="label">Tax</div><div class="value">${formatCurrency(stats.tax)}</div></div>
              </div>

              <h2>📊 Category Performance</h2>
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Entries</th>
                    <th>Gross</th>
                    <th>Discount</th>
                    <th>Service</th>
                    <th>Tax</th>
                    <th>Net Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  ${categoryRows || `<tr><td colspan="7">No category data found.</td></tr>`}
                </tbody>
              </table>

              <h2>📦 Product / Item Performance</h2>
              <table>
                <thead>
                  <tr>
                    <th>Product / Item</th>
                    <th>Category</th>
                    <th>Entries</th>
                    <th>Gross</th>
                    <th>Net Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  ${productRows || `<tr><td colspan="5">No product data found.</td></tr>`}
                </tbody>
              </table>

              <h2>📅 Daily Revenue</h2>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Entries</th>
                    <th>Gross</th>
                    <th>Discount</th>
                    <th>Service</th>
                    <th>Tax</th>
                    <th>Net Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  ${dailyRows || `<tr><td colspan="7">No daily data found.</td></tr>`}
                </tbody>
              </table>

              <div class="footer">
                <div>Sales Performance Report</div>
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

          <div className="relative z-10 grid gap-5 xl:grid-cols-[1fr_390px] xl:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
                <Sparkles size={16} />
                Official Revenue Source
              </div>

              <p className="text-sm font-black uppercase tracking-wide text-slate-400">
                Sales Performance Dashboard
              </p>
              <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-5xl">
                {selectedBrand?.name || "Selected Brand"} Net Revenue
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                Sales Performance is the official revenue source for manual
                entry now and POS integration later. Inventory sold consumption
                remains separate for stock deduction.
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-sm">
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                Branch Unit
              </label>
              <select
                value={selectedUnitId}
                onChange={(event) => {
                  setSelectedUnitId(event.target.value);
                  setForm((current) => ({
                    ...current,
                    brandUnitId: event.target.value,
                  }));
                }}
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
          label="Discount"
          value={formatCurrency(stats.discounts)}
          icon={<PieChart size={22} />}
        />
        <MetricCard
          label="Average Entry"
          value={formatCurrency(stats.averageEntry)}
          icon={<TrendingUp size={22} />}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          label="Revenue Entries"
          value={String(stats.entryCount)}
          icon={<BarChart3 size={22} />}
        />
        <MetricCard
          label="Current Net Preview"
          value={formatCurrency(formNetRevenue)}
          icon={<PackageSearch size={22} />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[430px_1fr]">
        <section className="glass-panel rounded-[2rem] p-6">
          <div className="mb-5">
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Revenue Entry
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              {form.id ? "Edit Sales Revenue" : "Create Sales Revenue"}
            </h2>
          </div>

          <form onSubmit={handleSaveRevenue} className="space-y-4">
            <div>
              <label className="text-sm font-bold text-slate-700">
                Branch Unit
              </label>
              <select
                value={form.brandUnitId}
                onChange={(event) => updateForm("brandUnitId", event.target.value)}
                className="forza-input mt-2"
              >
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Revenue Date
                </label>
                <input
                  type="date"
                  value={form.revenueDate}
                  onChange={(event) =>
                    updateForm("revenueDate", event.target.value)
                  }
                  className="forza-input mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Sales Channel
                </label>
                <select
                  value={form.salesChannel}
                  onChange={(event) =>
                    updateForm("salesChannel", event.target.value as SalesChannel)
                  }
                  className="forza-input mt-2"
                >
                  <option value="manual">Manual</option>
                  <option value="pos">POS</option>
                  <option value="imported">Imported</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Category
                </label>
                <input
                  value={form.category}
                  onChange={(event) => updateForm("category", event.target.value)}
                  className="forza-input mt-2"
                  placeholder="Food, Beverage, Delivery..."
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Product / Revenue Item
                </label>
                <input
                  value={form.productName}
                  onChange={(event) =>
                    updateForm("productName", event.target.value)
                  }
                  className="forza-input mt-2"
                  placeholder="General Sales, Food Sales..."
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <NumberField
                label="Gross Sales (€)"
                value={form.grossSales}
                onChange={(value) => updateForm("grossSales", value)}
              />
              <NumberField
                label="Discount (€)"
                value={form.discountAmount}
                onChange={(value) => updateForm("discountAmount", value)}
              />
              <NumberField
                label="Service Charge (€)"
                value={form.serviceCharge}
                onChange={(value) => updateForm("serviceCharge", value)}
              />
              <NumberField
                label="Tax / VAT (€)"
                value={form.taxAmount}
                onChange={(value) => updateForm("taxAmount", value)}
              />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Net Revenue Formula
              </p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
                Gross Sales - Discount + Service Charge - Tax = Net Revenue
              </p>
              <p className="mt-3 text-3xl font-black text-slate-950">
                {formatCurrency(formNetRevenue)}
              </p>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Source Reference
              </label>
              <input
                value={form.sourceReference}
                onChange={(event) =>
                  updateForm("sourceReference", event.target.value)
                }
                className="forza-input mt-2"
                placeholder="POS batch ID, receipt range, manual ref..."
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">Notes</label>
              <textarea
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                className="forza-input mt-2 min-h-[100px] resize-none"
                placeholder="Revenue notes, discount reason, POS remarks..."
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="submit"
                disabled={isSaving}
                className="forza-button-hover flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={18} />
                {isSaving
                  ? "Saving..."
                  : form.id
                    ? "Update Revenue"
                    : "Save Revenue"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="forza-button-hover flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-950 shadow-sm"
              >
                <Plus size={18} />
                New Entry
              </button>
            </div>
          </form>
        </section>

        <section className="glass-panel rounded-[2rem] p-6">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-slate-400">
                Revenue Matrix
              </p>
              <h2 className="text-2xl font-black text-slate-950">
                Category & Product Performance
              </h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={selectedChannel}
                onChange={(event) =>
                  setSelectedChannel(event.target.value as SalesChannel | "all")
                }
                className="forza-input sm:min-w-[160px]"
              >
                <option value="all">All Channels</option>
                <option value="manual">Manual</option>
                <option value="pos">POS</option>
                <option value="imported">Imported</option>
              </select>

              <div className="relative">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="forza-input pl-11 xl:min-w-[260px]"
                  placeholder="Search revenue..."
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

          <div className="space-y-3">
            {categoryPerformance.map((category) => (
              <div
                key={category.category}
                className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-black text-slate-950">
                      {category.category}
                    </h3>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      Entries: {category.entryCount} · Gross:{" "}
                      {formatCurrency(category.grossSales)}
                    </p>
                  </div>
                  <p className="text-sm font-black text-slate-950">
                    {formatCurrency(category.netRevenue)}
                  </p>
                </div>
              </div>
            ))}

            {categoryPerformance.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white/80 p-8 text-center">
                <FileText className="mx-auto text-slate-300" size={36} />
                <h3 className="mt-4 text-lg font-black text-slate-950">
                  No sales revenue found
                </h3>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  Create manual revenue entries or connect POS later.
                </p>
              </div>
            ) : null}
          </div>
        </section>
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
                <th className="px-4">Entries</th>
                <th className="px-4">Gross</th>
                <th className="px-4">Discount</th>
                <th className="px-4">Net Revenue</th>
              </tr>
            </thead>

            <tbody>
              {productPerformance.map((product) => (
                <tr
                  key={`${product.productName}-${product.category}`}
                  className="rounded-2xl bg-white shadow-sm"
                >
                  <td className="rounded-l-2xl px-4 py-4 text-sm font-black text-slate-950">
                    {product.productName}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-700">
                    {product.category}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-700">
                    {formatQty(product.entryCount)}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-700">
                    {formatCurrency(product.grossSales)}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-700">
                    {formatCurrency(product.discountAmount)}
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

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="mb-5">
          <p className="text-sm font-black uppercase tracking-wide text-slate-400">
            Revenue Entries
          </p>
          <h2 className="text-2xl font-black text-slate-950">
            Manual / POS-ready Revenue Records
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-400">
                <th className="px-4">Date</th>
                <th className="px-4">Channel</th>
                <th className="px-4">Category</th>
                <th className="px-4">Product / Item</th>
                <th className="px-4">Gross</th>
                <th className="px-4">Discount</th>
                <th className="px-4">Service</th>
                <th className="px-4">Tax</th>
                <th className="px-4">Net</th>
                <th className="px-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id} className="rounded-2xl bg-white shadow-sm">
                  <td className="rounded-l-2xl px-4 py-4 text-sm font-black text-slate-950">
                    {record.revenue_date}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-700">
                    {salesChannelLabels[record.sales_channel]}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-700">
                    {record.category}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-700">
                    {record.product_name}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-700">
                    {formatCurrency(record.gross_sales)}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-700">
                    {formatCurrency(record.discount_amount)}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-700">
                    {formatCurrency(record.service_charge)}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-700">
                    {formatCurrency(record.tax_amount)}
                  </td>
                  <td className="px-4 py-4 text-sm font-black text-slate-950">
                    {formatCurrency(record.net_revenue)}
                  </td>
                  <td className="rounded-r-2xl px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditRevenue(record)}
                        className="forza-button-hover inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-3 py-2 text-xs font-black text-white"
                      >
                        <Edit3 size={14} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRevenue(record.id)}
                        className="forza-button-hover inline-flex items-center gap-2 rounded-2xl bg-red-600 px-3 py-2 text-xs font-black text-white"
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="rounded-2xl bg-white px-4 py-8 text-center text-sm font-bold text-slate-500"
                  >
                    No revenue records found.
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

type NumberFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function NumberField({ label, value, onChange }: NumberFieldProps) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="forza-input mt-2"
      />
    </div>
  );
}