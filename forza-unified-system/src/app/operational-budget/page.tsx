"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { redirect, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Download,
  Edit3,
  FileText,
  PieChart,
  Plus,
  Save,
  Sparkles,
  Trash2,
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

type BudgetUnit = {
  id: string;
  brand_id: string | null;
  name: string;
  code: string;
  is_active: boolean;
};

type OperationalBudget = {
  id: string;
  brand_id: string;
  brand_unit_id: string | null;
  budget_month: string;
  category: BudgetCategoryValue;
  custom_category: string | null;
  budget_amount: number;
  actual_amount: number;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type ProfileRecord = {
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
};

type BudgetCategoryValue =
  | "food"
  | "beverage"
  | "cleaning"
  | "utilities"
  | "maintenance"
  | "packaging"
  | "marketing"
  | "rent"
  | "subscriptions"
  | "custom";

type BudgetFormState = {
  id: string;
  brandUnitId: string;
  budgetMonth: string;
  category: BudgetCategoryValue;
  customCategory: string;
  budgetAmount: string;
  actualAmount: string;
  notes: string;
};

const budgetCategories: {
  value: BudgetCategoryValue;
  label: string;
  description: string;
}[] = [
  {
    value: "food",
    label: "Food",
    description: "Food purchasing, ingredients, and kitchen operation cost.",
  },
  {
    value: "beverage",
    label: "Beverage",
    description: "Bar stock, beverages, bottles, mixers, and beverage cost.",
  },
  {
    value: "cleaning",
    label: "Cleaning",
    description: "Cleaning materials, chemicals, hygiene, and sanitation.",
  },
  {
    value: "utilities",
    label: "Utilities",
    description: "Electricity, water, gas, internet, and utility expenses.",
  },
  {
    value: "maintenance",
    label: "Maintenance",
    description: "Equipment repair, facility maintenance, and service cost.",
  },
  {
    value: "packaging",
    label: "Packaging",
    description: "Takeaway packaging, labels, bags, and containers.",
  },
  {
    value: "marketing",
    label: "Marketing",
    description: "Promotions, content, advertising, and campaign budget.",
  },
  {
    value: "rent",
    label: "Rent",
    description: "Rent, lease, and property-related fixed cost.",
  },
  {
    value: "subscriptions",
    label: "Subscriptions",
    description: "Software, digital tools, licenses, and recurring systems.",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Any other operational budget category.",
  },
];

function normalizeBrandCode(value: string | null | undefined) {
  const brand = String(value || "FORZA").trim().toUpperCase();

  if (brand === "FUSION") {
    return "FUSION";
  }

  return "FORZA";
}

function currentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

function monthToDate(value: string) {
  const month = value || currentMonthValue();
  return `${month}-01`;
}

function dateToMonth(value: string) {
  return String(value || "").slice(0, 7) || currentMonthValue();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("mk-MK", {
    style: "currency",
    currency: "EUR",
    currencyDisplay: "symbol",
  }).format(value || 0);
}

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatQty(value: number) {
  const safeValue = Number(value || 0);

  if (Number.isInteger(safeValue)) {
    return String(safeValue);
  }

  return String(Number(safeValue.toFixed(3)));
}

function getCategoryLabel(value: BudgetCategoryValue, customCategory?: string | null) {
  if (value === "custom") {
    return customCategory?.trim() || "Custom";
  }

  return budgetCategories.find((category) => category.value === value)?.label || value;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getEmptyForm(month: string): BudgetFormState {
  return {
    id: "",
    brandUnitId: "all",
    budgetMonth: month,
    category: "food",
    customCategory: "",
    budgetAmount: "0",
    actualAmount: "0",
    notes: "",
  };
}

export default function OperationalBudgetPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();

  const requestedBrandCode = normalizeBrandCode(searchParams.get("brand"));

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<ProfileRecord | null>(null);

  const [brands, setBrands] = useState<DashboardBrand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<DashboardBrand | null>(null);
  const [units, setUnits] = useState<BudgetUnit[]>([]);
  const [budgets, setBudgets] = useState<OperationalBudget[]>([]);

  const [selectedUnitId, setSelectedUnitId] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue());
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<BudgetFormState>(() =>
    getEmptyForm(currentMonthValue()),
  );

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        redirect("/auth/sign-in");
      }

      setUserId(user.id);
      setUserEmail(user.email || "");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, role, is_active")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profileData || profileData.is_active === false) {
        redirect("/auth/sign-in");
      }

      const nextProfile = profileData as ProfileRecord;
      setProfile(nextProfile);

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

      const sortedBrands = ((brandsData || []) as DashboardBrand[]).sort((a, b) => {
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
      });

      setBrands(sortedBrands);

      const nextSelectedBrand =
        sortedBrands.find((brand) => brand.code === requestedBrandCode) ||
        sortedBrands.find((brand) => brand.code === "FORZA") ||
        sortedBrands[0] ||
        null;

      setSelectedBrand(nextSelectedBrand);

      const selectedBrandId = nextSelectedBrand?.id || "";

      const { data: unitsData, error: unitsError } = await supabase
        .from("brand_units")
        .select("id, brand_id, name, code, is_active")
        .eq("brand_id", selectedBrandId)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (unitsError) {
        toast.error(unitsError.message);
        setIsLoading(false);
        return;
      }

      const nextUnits = (unitsData || []) as BudgetUnit[];
      setUnits(nextUnits);

      const { data: budgetsData, error: budgetsError } = await supabase
        .from("operational_budgets")
        .select(
          "id, brand_id, brand_unit_id, budget_month, category, custom_category, budget_amount, actual_amount, notes, is_active, created_by, created_at, updated_at",
        )
        .eq("brand_id", selectedBrandId)
        .eq("budget_month", monthToDate(selectedMonth))
        .eq("is_active", true)
        .order("category", { ascending: true });

      if (budgetsError) {
        toast.error(budgetsError.message);
        setIsLoading(false);
        return;
      }

      setBudgets((budgetsData || []) as OperationalBudget[]);
      setForm(getEmptyForm(selectedMonth));
      setSelectedUnitId("all");
      setIsLoading(false);
    }

    loadData();
  }, [requestedBrandCode, selectedMonth, supabase]);

  const role = profile?.role || "manager";
  const modules = getAllowedModules(role);

  const filteredBudgets = useMemo(() => {
    const query = search.trim().toLowerCase();

    return budgets.filter((budget) => {
      const matchesUnit =
        selectedUnitId === "all" || budget.brand_unit_id === selectedUnitId;

      const categoryLabel = getCategoryLabel(
        budget.category,
        budget.custom_category,
      ).toLowerCase();

      const notes = String(budget.notes || "").toLowerCase();

      const matchesSearch =
        !query || categoryLabel.includes(query) || notes.includes(query);

      return matchesUnit && matchesSearch;
    });
  }, [budgets, search, selectedUnitId]);

  const totals = useMemo(() => {
    const budgetTotal = filteredBudgets.reduce(
      (total, budget) => total + Number(budget.budget_amount || 0),
      0,
    );

    const actualTotal = filteredBudgets.reduce(
      (total, budget) => total + Number(budget.actual_amount || 0),
      0,
    );

    const variance = budgetTotal - actualTotal;
    const usagePercent = budgetTotal > 0 ? (actualTotal / budgetTotal) * 100 : 0;
    const remainingPercent =
      budgetTotal > 0 ? Math.max(0, (variance / budgetTotal) * 100) : 0;

    const overBudgetCount = filteredBudgets.filter(
      (budget) =>
        Number(budget.actual_amount || 0) > Number(budget.budget_amount || 0),
    ).length;

    return {
      budgetTotal,
      actualTotal,
      variance,
      usagePercent,
      remainingPercent,
      overBudgetCount,
      itemCount: filteredBudgets.length,
    };
  }, [filteredBudgets]);

  const categoryPerformance = useMemo(
    () =>
      [...filteredBudgets]
        .map((budget) => {
          const budgetAmount = Number(budget.budget_amount || 0);
          const actualAmount = Number(budget.actual_amount || 0);
          const variance = budgetAmount - actualAmount;
          const usagePercent =
            budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0;

          return {
            ...budget,
            label: getCategoryLabel(budget.category, budget.custom_category),
            variance,
            usagePercent,
          };
        })
        .sort((a, b) => Number(b.budget_amount || 0) - Number(a.budget_amount || 0)),
    [filteredBudgets],
  );

  function updateForm(key: keyof BudgetFormState, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetForm() {
    setForm(getEmptyForm(selectedMonth));
  }

  async function refreshBudgets() {
    if (!selectedBrand?.id) {
      return;
    }

    const { data, error } = await supabase
      .from("operational_budgets")
      .select(
        "id, brand_id, brand_unit_id, budget_month, category, custom_category, budget_amount, actual_amount, notes, is_active, created_by, created_at, updated_at",
      )
      .eq("brand_id", selectedBrand.id)
      .eq("budget_month", monthToDate(selectedMonth))
      .eq("is_active", true)
      .order("category", { ascending: true });

    if (error) {
      toast.error(error.message);
      return;
    }

    setBudgets((data || []) as OperationalBudget[]);
  }

  async function handleSaveBudget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedBrand?.id) {
      toast.error("Selected brand is required.");
      return;
    }

    const budgetAmount = Number(form.budgetAmount || 0);
    const actualAmount = Number(form.actualAmount || 0);

    if (budgetAmount < 0 || actualAmount < 0) {
      toast.error("Budget and actual amount cannot be negative.");
      return;
    }

    if (form.category === "custom" && !form.customCategory.trim()) {
      toast.error("Custom category name is required.");
      return;
    }

    setIsSaving(true);

    const payload = {
      brand_id: selectedBrand.id,
      brand_unit_id: form.brandUnitId === "all" ? null : form.brandUnitId,
      budget_month: monthToDate(form.budgetMonth),
      category: form.category,
      custom_category:
        form.category === "custom" ? form.customCategory.trim() : null,
      budget_amount: budgetAmount,
      actual_amount: actualAmount,
      notes: form.notes.trim() || null,
      is_active: true,
      created_by: userId,
    };

    const { error } = form.id
      ? await supabase
          .from("operational_budgets")
          .update({
            brand_unit_id: payload.brand_unit_id,
            budget_month: payload.budget_month,
            category: payload.category,
            custom_category: payload.custom_category,
            budget_amount: payload.budget_amount,
            actual_amount: payload.actual_amount,
            notes: payload.notes,
          })
          .eq("id", form.id)
      : await supabase.from("operational_budgets").insert(payload);

    setIsSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(form.id ? "Budget updated successfully." : "Budget saved successfully.");
    resetForm();
    await refreshBudgets();
  }

  function handleEditBudget(budget: OperationalBudget) {
    setForm({
      id: budget.id,
      brandUnitId: budget.brand_unit_id || "all",
      budgetMonth: dateToMonth(budget.budget_month),
      category: budget.category,
      customCategory: budget.custom_category || "",
      budgetAmount: String(Number(budget.budget_amount || 0)),
      actualAmount: String(Number(budget.actual_amount || 0)),
      notes: budget.notes || "",
    });

    toast.success("Budget loaded for editing.");
  }

  async function handleDeleteBudget(id: string) {
    const { error } = await supabase
      .from("operational_budgets")
      .update({
        is_active: false,
      })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Budget removed.");
    await refreshBudgets();
  }

  function downloadOperationalBudgetPdf() {
    if (filteredBudgets.length === 0) {
      toast.error("No operational budget data available for PDF.");
      return;
    }

    const selectedUnit =
      selectedUnitId === "all"
        ? null
        : units.find((unit) => unit.id === selectedUnitId) || null;

    const rows = categoryPerformance
      .map((budget) => {
        const varianceStatus =
          budget.variance < 0
            ? "Over Budget"
            : budget.variance > 0
              ? "Under Budget"
              : "On Target";

        return `
          <tr>
            <td>${escapeHtml(budget.label)}</td>
            <td>${escapeHtml(
              budget.brand_unit_id
                ? units.find((unit) => unit.id === budget.brand_unit_id)?.name ||
                    "Selected Unit"
                : "All Units",
            )}</td>
            <td>${formatCurrency(Number(budget.budget_amount || 0))}</td>
            <td>${formatCurrency(Number(budget.actual_amount || 0))}</td>
            <td>${formatCurrency(budget.variance)}</td>
            <td>${formatPercent(budget.usagePercent)}</td>
            <td>${escapeHtml(varianceStatus)}</td>
            <td>${escapeHtml(budget.notes || "-")}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Operational Budget Report</title>
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
              <h1>Operational Budget Report</h1>
            </section>

            <section class="content">
              <div class="grid">
                <div class="card"><div class="label">Brand</div><div class="value">${escapeHtml(selectedBrand?.name || "Selected Brand")}</div></div>
                <div class="card"><div class="label">Branch</div><div class="value">${escapeHtml(selectedUnit?.name || "All Units")}</div></div>
                <div class="card"><div class="label">Month</div><div class="value">${escapeHtml(selectedMonth)}</div></div>
                <div class="card"><div class="label">Categories</div><div class="value">${filteredBudgets.length}</div></div>
                <div class="card"><div class="label">Budget</div><div class="value">${formatCurrency(totals.budgetTotal)}</div></div>
                <div class="card"><div class="label">Actual</div><div class="value">${formatCurrency(totals.actualTotal)}</div></div>
                <div class="card"><div class="label">Variance</div><div class="value">${formatCurrency(totals.variance)}</div></div>
                <div class="card"><div class="label">Usage</div><div class="value">${formatPercent(totals.usagePercent)}</div></div>
              </div>

              <h2>📊 Budget Category Performance</h2>
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Branch</th>
                    <th>Budget</th>
                    <th>Actual</th>
                    <th>Variance</th>
                    <th>Usage</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows || `<tr><td colspan="8">No budget data found.</td></tr>`}
                </tbody>
              </table>

              <div class="footer">
                <div>Operational Budget Report</div>
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
      toast.error("Allow popups to download the operational budget PDF.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  if (isLoading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <section className="glass-panel relative w-full max-w-lg overflow-hidden rounded-[2rem] p-8 text-center">
          <div className="absolute -right-16 -top-16 h-40 w-40 animate-pulse rounded-full bg-emerald-200/50 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-40 w-40 animate-pulse rounded-full bg-amber-200/50 blur-3xl" />
          <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl">
            <WalletCards className="animate-pulse" size={24} />
          </div>
          <h1 className="relative z-10 mt-5 text-2xl font-black text-slate-950">
            Loading Operational Budget
          </h1>
          <p className="relative z-10 mt-2 text-sm font-bold text-slate-500">
            Preparing brand budget workspace...
          </p>
        </section>
      </main>
    );
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
        <div className="absolute -right-24 -top-24 h-72 w-72 animate-pulse rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-72 w-72 animate-pulse rounded-full bg-amber-200/50 blur-3xl" />
        <div className="absolute left-1/2 top-10 h-48 w-48 -translate-x-1/2 animate-ping rounded-full bg-slate-200/20" />

        <div className="relative z-10 grid gap-6 xl:grid-cols-[1fr_390px] xl:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
              <Sparkles size={16} />
              Premium Budget Control
            </div>

            <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-400">
              Operational Budget
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
              {selectedBrand?.name || "Selected Brand"} Cost Control Matrix
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              Monthly operational budget setup for food, beverage, cleaning,
              utilities, maintenance, packaging, marketing, rent,
              subscriptions, and custom categories.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl">
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
              Budget Month
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="forza-input"
            />

            <label className="mb-2 mt-4 block text-xs font-black uppercase tracking-wide text-slate-400">
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
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Budget Total"
          value={formatCurrency(totals.budgetTotal)}
          icon={<CircleDollarSign size={22} />}
          tone="dark"
        />
        <MetricCard
          label="Actual Total"
          value={formatCurrency(totals.actualTotal)}
          icon={<TrendingUp size={22} />}
          tone={totals.actualTotal > totals.budgetTotal ? "danger" : "stable"}
        />
        <MetricCard
          label="Variance"
          value={formatCurrency(totals.variance)}
          icon={totals.variance < 0 ? <TrendingDown size={22} /> : <CheckCircle2 size={22} />}
          tone={totals.variance < 0 ? "danger" : "stable"}
        />
        <MetricCard
          label="Budget Usage"
          value={formatPercent(totals.usagePercent)}
          icon={<PieChart size={22} />}
          tone={totals.usagePercent > 100 ? "danger" : totals.usagePercent > 85 ? "warning" : "stable"}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Categories"
          value={String(totals.itemCount)}
          icon={<BarChart3 size={22} />}
          tone="dark"
        />
        <MetricCard
          label="Over Budget"
          value={String(totals.overBudgetCount)}
          icon={<AlertTriangle size={22} />}
          tone={totals.overBudgetCount > 0 ? "danger" : "stable"}
        />
        <MetricCard
          label="Remaining"
          value={formatCurrency(Math.max(0, totals.variance))}
          icon={<WalletCards size={22} />}
          tone="stable"
        />
        <MetricCard
          label="Remaining %"
          value={formatPercent(totals.remainingPercent)}
          icon={<CalendarDays size={22} />}
          tone="dark"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[430px_1fr]">
        <section className="glass-panel rounded-[2.25rem] p-6">
          <div className="mb-5">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">
              Budget Entry
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              {form.id ? "Edit Budget Category" : "Create Budget Category"}
            </h2>
          </div>

          <form onSubmit={handleSaveBudget} className="space-y-4">
            <div>
              <label className="text-sm font-bold text-slate-700">
                Branch Unit
              </label>
              <select
                value={form.brandUnitId}
                onChange={(event) => updateForm("brandUnitId", event.target.value)}
                className="forza-input mt-2"
              >
                <option value="all">All Units</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Budget Month
              </label>
              <input
                type="month"
                value={form.budgetMonth}
                onChange={(event) => updateForm("budgetMonth", event.target.value)}
                className="forza-input mt-2"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Category
              </label>
              <select
                value={form.category}
                onChange={(event) =>
                  updateForm("category", event.target.value as BudgetCategoryValue)
                }
                className="forza-input mt-2"
              >
                {budgetCategories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            {form.category === "custom" ? (
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Custom Category
                </label>
                <input
                  value={form.customCategory}
                  onChange={(event) =>
                    updateForm("customCategory", event.target.value)
                  }
                  className="forza-input mt-2"
                  placeholder="Custom category name"
                />
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Budget Amount (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.budgetAmount}
                  onChange={(event) =>
                    updateForm("budgetAmount", event.target.value)
                  }
                  className="forza-input mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Actual Amount (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.actualAmount}
                  onChange={(event) =>
                    updateForm("actualAmount", event.target.value)
                  }
                  className="forza-input mt-2"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">Notes</label>
              <textarea
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                className="forza-input mt-2 min-h-[100px] resize-none"
                placeholder="Budget notes, assumptions, or control remarks..."
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="submit"
                disabled={isSaving}
                className="forza-button-hover flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={18} />
                {isSaving ? "Saving..." : form.id ? "Update Budget" : "Save Budget"}
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

        <section className="glass-panel rounded-[2.25rem] p-6">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">
                Budget Matrix
              </p>
              <h2 className="text-2xl font-black text-slate-950">
                Category Performance
              </h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="forza-input sm:min-w-[260px]"
                placeholder="Search category or notes..."
              />

              <button
                type="button"
                onClick={downloadOperationalBudgetPdf}
                className="forza-button-hover inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl"
              >
                <Download size={18} />
                PDF
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {categoryPerformance.map((budget) => {
              const isOverBudget = budget.variance < 0;
              const isNearLimit = budget.usagePercent >= 85 && budget.usagePercent <= 100;

              return (
                <div
                  key={budget.id}
                  className={`relative overflow-hidden rounded-3xl border p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    isOverBudget
                      ? "border-red-200 bg-red-50"
                      : isNearLimit
                        ? "border-amber-200 bg-amber-50"
                        : "border-emerald-100 bg-emerald-50/70"
                  }`}
                >
                  {isOverBudget ? (
                    <div className="absolute right-5 top-5 h-3 w-3 rounded-full bg-red-500">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-950">
                        {budget.label}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        {budget.brand_unit_id
                          ? units.find((unit) => unit.id === budget.brand_unit_id)
                              ?.name || "Selected Unit"
                          : "All Units"}{" "}
                        · Usage: {formatPercent(budget.usagePercent)}
                      </p>
                      {budget.notes ? (
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {budget.notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid min-w-[280px] grid-cols-3 gap-3">
                      <SmallValue label="Budget" value={formatCurrency(Number(budget.budget_amount || 0))} />
                      <SmallValue label="Actual" value={formatCurrency(Number(budget.actual_amount || 0))} />
                      <SmallValue label="Variance" value={formatCurrency(budget.variance)} />
                    </div>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80">
                    <div
                      className={`h-full rounded-full ${
                        isOverBudget
                          ? "bg-red-500"
                          : isNearLimit
                            ? "bg-amber-500"
                            : "bg-emerald-600"
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(0, budget.usagePercent))}%`,
                      }}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditBudget(budget)}
                      className="forza-button-hover inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-950 shadow-sm"
                    >
                      <Edit3 size={15} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteBudget(budget.id)}
                      className="forza-button-hover inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-xs font-black text-white shadow-sm"
                    >
                      <Trash2 size={15} />
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}

            {categoryPerformance.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white/80 p-8 text-center">
                <FileText className="mx-auto text-slate-300" size={36} />
                <h3 className="mt-4 text-lg font-black text-slate-950">
                  No budget categories found
                </h3>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  Create the first operational budget category for this month.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </DashboardShell>
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

type SmallValueProps = {
  label: string;
  value: string;
};

function SmallValue({ label, value }: SmallValueProps) {
  return (
    <div className="rounded-2xl bg-white/80 p-3 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}