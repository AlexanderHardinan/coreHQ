"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Download,
  Edit3,
  FileText,
  PieChart,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  DashboardShell,
  type DashboardBrand,
} from "@/components/layout/dashboard-shell";
import { getAllowedModules, type UserRole } from "@/lib/auth/permissions";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type PayrollUnit = {
  id: string;
  brand_id: string | null;
  name: string;
  code: string;
  is_active: boolean;
};

type PayrollDepartmentValue =
  | "kitchen"
  | "bar"
  | "service"
  | "admin"
  | "management"
  | "stewarding"
  | "security"
  | "housekeeping"
  | "maintenance"
  | "custom";

type PayrollBudget = {
  id: string;
  brand_id: string;
  brand_unit_id: string | null;
  budget_month: string;
  department: PayrollDepartmentValue;
  custom_department: string | null;
  revenue_base: number;
  payroll_percent: number;
  payroll_budget_amount: number;
  actual_payroll_amount: number;
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

type SoldRevenueRecord = {
  id: string;
  brand_id: string | null;
  brand_unit_id: string;
  total_sales: number;
  sold_date: string;
};

type PayrollFormState = {
  id: string;
  brandUnitId: string;
  budgetMonth: string;
  department: PayrollDepartmentValue;
  customDepartment: string;
  payrollPercent: string;
  actualPayrollAmount: string;
  notes: string;
};

const payrollDepartments: {
  value: PayrollDepartmentValue;
  label: string;
}[] = [
  { value: "kitchen", label: "Kitchen" },
  { value: "bar", label: "Bar" },
  { value: "service", label: "Service" },
  { value: "admin", label: "Admin" },
  { value: "management", label: "Management" },
  { value: "stewarding", label: "Stewarding" },
  { value: "security", label: "Security" },
  { value: "housekeeping", label: "Housekeeping" },
  { value: "maintenance", label: "Maintenance" },
  { value: "custom", label: "Custom" },
];

function normalizeBrandCode(value: string | null | undefined) {
  const brand = String(value || "FORZA").trim().toUpperCase();
  return brand === "FUSION" ? "FUSION" : "FORZA";
}

function currentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

function monthToDate(value: string) {
  return `${value || currentMonthValue()}-01`;
}

function dateToMonth(value: string) {
  return String(value || "").slice(0, 7) || currentMonthValue();
}

function monthStartEnd(month: string) {
  const safeMonth = month || currentMonthValue();
  const startDate = `${safeMonth}-01`;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);

  return {
    startDate,
    endDate: end.toISOString().slice(0, 10),
  };
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getDepartmentLabel(
  value: PayrollDepartmentValue,
  customDepartment?: string | null,
) {
  if (value === "custom") {
    return customDepartment?.trim() || "Custom";
  }

  return (
    payrollDepartments.find((department) => department.value === value)?.label ||
    value
  );
}

function calculatePayrollBudgetValue(
  revenueBase: number,
  payrollPercent: number,
) {
  return (Number(revenueBase || 0) * Number(payrollPercent || 0)) / 100;
}

function calculateActualPayrollPercent(
  actualPayrollAmount: number,
  revenueBase: number,
) {
  if (Number(revenueBase || 0) <= 0) {
    return 0;
  }

  return (Number(actualPayrollAmount || 0) / Number(revenueBase || 0)) * 100;
}

function getEmptyForm(month: string): PayrollFormState {
  return {
    id: "",
    brandUnitId: "all",
    budgetMonth: month,
    department: "kitchen",
    customDepartment: "",
    payrollPercent: "0",
    actualPayrollAmount: "0",
    notes: "",
  };
}

export default function PayrollBudgetPage() {
  return (
    <Suspense fallback={<PayrollBudgetLoading />}>
      <PayrollBudgetClient />
    </Suspense>
  );
}

function PayrollBudgetClient() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
  const requestedBrandCode = normalizeBrandCode(searchParams.get("brand"));

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<ProfileRecord | null>(null);

  const [brands, setBrands] = useState<DashboardBrand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<DashboardBrand | null>(
    null,
  );
  const [units, setUnits] = useState<PayrollUnit[]>([]);
  const [payrollBudgets, setPayrollBudgets] = useState<PayrollBudget[]>([]);
  const [soldRevenue, setSoldRevenue] = useState<SoldRevenueRecord[]>([]);

  const [selectedUnitId, setSelectedUnitId] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue());
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<PayrollFormState>(() =>
    getEmptyForm(currentMonthValue()),
  );

  const role = profile?.role || "manager";
  const modules = getAllowedModules(role);

  function getRevenueForUnit(unitId: string) {
    return soldRevenue
      .filter((sale) => unitId === "all" || sale.brand_unit_id === unitId)
      .reduce((total, sale) => total + Number(sale.total_sales || 0), 0);
  }

  const selectedUnitRevenue = useMemo(
    () => getRevenueForUnit(selectedUnitId),
    [selectedUnitId, soldRevenue],
  );

  const formRevenueBase = useMemo(
    () => getRevenueForUnit(form.brandUnitId),
    [form.brandUnitId, soldRevenue],
  );

  const formPayrollPercent = Number(form.payrollPercent || 0);
  const formActualPayrollAmount = Number(form.actualPayrollAmount || 0);
  const formPayrollBudgetAmount = calculatePayrollBudgetValue(
    formRevenueBase,
    formPayrollPercent,
  );
  const formActualPayrollPercent = calculateActualPayrollPercent(
    formActualPayrollAmount,
    formRevenueBase,
  );
  const formPercentVariance = formPayrollPercent - formActualPayrollPercent;
  const formValueVariance = formPayrollBudgetAmount - formActualPayrollAmount;

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/auth/sign-in";
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || "");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, role, is_active")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profileData || profileData.is_active === false) {
        window.location.href = "/auth/sign-in";
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

      setUnits((unitsData || []) as PayrollUnit[]);

      const { startDate, endDate } = monthStartEnd(selectedMonth);

      const { data: revenueData, error: revenueError } = await supabase
        .from("sold_items")
        .select("id, brand_id, brand_unit_id, total_sales, sold_date")
        .eq("brand_id", selectedBrandId)
        .gte("sold_date", startDate)
        .lte("sold_date", endDate);

      if (revenueError) {
        toast.error(revenueError.message);
        setIsLoading(false);
        return;
      }

      setSoldRevenue((revenueData || []) as SoldRevenueRecord[]);

      const { data: payrollData, error: payrollError } = await supabase
        .from("payroll_budgets")
        .select(
          "id, brand_id, brand_unit_id, budget_month, department, custom_department, revenue_base, payroll_percent, payroll_budget_amount, actual_payroll_amount, notes, is_active, created_by, created_at, updated_at",
        )
        .eq("brand_id", selectedBrandId)
        .eq("budget_month", monthToDate(selectedMonth))
        .eq("is_active", true)
        .order("department", { ascending: true });

      if (payrollError) {
        toast.error(payrollError.message);
        setIsLoading(false);
        return;
      }

      setPayrollBudgets((payrollData || []) as PayrollBudget[]);
      setForm(getEmptyForm(selectedMonth));
      setSelectedUnitId("all");
      setIsLoading(false);
    }

    loadData();
  }, [requestedBrandCode, selectedMonth, supabase]);

  const filteredPayrollBudgets = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payrollBudgets.filter((budget) => {
      const matchesUnit =
        selectedUnitId === "all" || budget.brand_unit_id === selectedUnitId;

      const departmentLabel = getDepartmentLabel(
        budget.department,
        budget.custom_department,
      ).toLowerCase();

      const notes = String(budget.notes || "").toLowerCase();

      const matchesSearch =
        !query || departmentLabel.includes(query) || notes.includes(query);

      return matchesUnit && matchesSearch;
    });
  }, [payrollBudgets, search, selectedUnitId]);

  const departmentPerformance = useMemo(
    () =>
      [...filteredPayrollBudgets]
        .map((budget) => {
          const revenueBase = getRevenueForUnit(budget.brand_unit_id || "all");
          const payrollPercent = Number(budget.payroll_percent || 0);
          const payrollBudgetAmount = calculatePayrollBudgetValue(
            revenueBase,
            payrollPercent,
          );
          const actualPayrollAmount = Number(
            budget.actual_payroll_amount || 0,
          );
          const actualPayrollPercent = calculateActualPayrollPercent(
            actualPayrollAmount,
            revenueBase,
          );
          const valueVariance = payrollBudgetAmount - actualPayrollAmount;
          const percentVariance = payrollPercent - actualPayrollPercent;
          const usagePercent =
            payrollBudgetAmount > 0
              ? (actualPayrollAmount / payrollBudgetAmount) * 100
              : 0;

          return {
            ...budget,
            label: getDepartmentLabel(
              budget.department,
              budget.custom_department,
            ),
            revenueBase,
            payrollPercent,
            payrollBudgetAmount,
            actualPayrollAmount,
            actualPayrollPercent,
            valueVariance,
            percentVariance,
            usagePercent,
          };
        })
        .sort((a, b) => b.payrollBudgetAmount - a.payrollBudgetAmount),
    [filteredPayrollBudgets, soldRevenue],
  );

  const totals = useMemo(() => {
    const payrollPercentTotal = departmentPerformance.reduce(
      (total, budget) => total + Number(budget.payrollPercent || 0),
      0,
    );

    const payrollBudgetTotal = departmentPerformance.reduce(
      (total, budget) => total + Number(budget.payrollBudgetAmount || 0),
      0,
    );

    const actualPayrollTotal = departmentPerformance.reduce(
      (total, budget) => total + Number(budget.actualPayrollAmount || 0),
      0,
    );

    const variance = payrollBudgetTotal - actualPayrollTotal;
    const actualPayrollPercent =
      selectedUnitRevenue > 0
        ? (actualPayrollTotal / selectedUnitRevenue) * 100
        : 0;
    const usagePercent =
      payrollBudgetTotal > 0
        ? (actualPayrollTotal / payrollBudgetTotal) * 100
        : 0;
    const overBudgetCount = departmentPerformance.filter(
      (budget) => budget.valueVariance < 0,
    ).length;

    return {
      payrollPercentTotal,
      payrollBudgetTotal,
      actualPayrollTotal,
      variance,
      actualPayrollPercent,
      usagePercent,
      overBudgetCount,
      itemCount: departmentPerformance.length,
    };
  }, [departmentPerformance, selectedUnitRevenue]);

  function updateForm(key: keyof PayrollFormState, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleUnitChange(value: string) {
    setForm((current) => ({
      ...current,
      brandUnitId: value,
    }));
  }

  function resetForm() {
    setForm(getEmptyForm(selectedMonth));
  }

  async function refreshPayrollBudgets() {
    if (!selectedBrand?.id) {
      return;
    }

    const { data, error } = await supabase
      .from("payroll_budgets")
      .select(
        "id, brand_id, brand_unit_id, budget_month, department, custom_department, revenue_base, payroll_percent, payroll_budget_amount, actual_payroll_amount, notes, is_active, created_by, created_at, updated_at",
      )
      .eq("brand_id", selectedBrand.id)
      .eq("budget_month", monthToDate(selectedMonth))
      .eq("is_active", true)
      .order("department", { ascending: true });

    if (error) {
      toast.error(error.message);
      return;
    }

    setPayrollBudgets((data || []) as PayrollBudget[]);
  }

  async function handleSavePayrollBudget(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedBrand?.id) {
      toast.error("Selected brand is required.");
      return;
    }

    const revenueBase = getRevenueForUnit(form.brandUnitId);
    const payrollPercent = Number(form.payrollPercent || 0);
    const actualPayrollAmount = Number(form.actualPayrollAmount || 0);
    const payrollBudgetAmount = calculatePayrollBudgetValue(
      revenueBase,
      payrollPercent,
    );

    if (payrollPercent < 0 || actualPayrollAmount < 0) {
      toast.error("Payroll percentage and actual payroll cannot be negative.");
      return;
    }

    if (form.department === "custom" && !form.customDepartment.trim()) {
      toast.error("Custom department name is required.");
      return;
    }

    setIsSaving(true);

    const payload = {
      brand_id: selectedBrand.id,
      brand_unit_id: form.brandUnitId === "all" ? null : form.brandUnitId,
      budget_month: monthToDate(form.budgetMonth),
      department: form.department,
      custom_department:
        form.department === "custom" ? form.customDepartment.trim() : null,
      revenue_base: revenueBase,
      payroll_percent: payrollPercent,
      payroll_budget_amount: payrollBudgetAmount,
      actual_payroll_amount: actualPayrollAmount,
      notes: form.notes.trim() || null,
      is_active: true,
      created_by: userId,
    };

    const { error } = form.id
      ? await supabase
          .from("payroll_budgets")
          .update({
            brand_unit_id: payload.brand_unit_id,
            budget_month: payload.budget_month,
            department: payload.department,
            custom_department: payload.custom_department,
            revenue_base: payload.revenue_base,
            payroll_percent: payload.payroll_percent,
            payroll_budget_amount: payload.payroll_budget_amount,
            actual_payroll_amount: payload.actual_payroll_amount,
            notes: payload.notes,
          })
          .eq("id", form.id)
      : await supabase.from("payroll_budgets").insert(payload);

    setIsSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(
      form.id
        ? "Payroll budget updated successfully."
        : "Payroll budget saved successfully.",
    );
    resetForm();
    await refreshPayrollBudgets();
  }

  function handleEditPayrollBudget(budget: PayrollBudget) {
    setForm({
      id: budget.id,
      brandUnitId: budget.brand_unit_id || "all",
      budgetMonth: dateToMonth(budget.budget_month),
      department: budget.department,
      customDepartment: budget.custom_department || "",
      payrollPercent: String(Number(budget.payroll_percent || 0)),
      actualPayrollAmount: String(
        Number(budget.actual_payroll_amount || 0),
      ),
      notes: budget.notes || "",
    });

    toast.success("Payroll budget loaded for editing.");
  }

  async function handleDeletePayrollBudget(id: string) {
    const { error } = await supabase
      .from("payroll_budgets")
      .update({
        is_active: false,
      })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Payroll budget removed.");
    await refreshPayrollBudgets();
  }

  function downloadPayrollBudgetPdf() {
    if (departmentPerformance.length === 0) {
      toast.error("No payroll budget data available for PDF.");
      return;
    }

    const selectedUnit =
      selectedUnitId === "all"
        ? null
        : units.find((unit) => unit.id === selectedUnitId) || null;

    const rows = departmentPerformance
      .map((budget) => {
        const varianceStatus =
          budget.valueVariance < 0
            ? "Over Budget"
            : budget.valueVariance > 0
              ? "Under Budget"
              : "On Target";

        return `
          <tr>
            <td>${escapeHtml(budget.label)}</td>
            <td>${escapeHtml(
              budget.brand_unit_id
                ? units.find((unit) => unit.id === budget.brand_unit_id)
                    ?.name || "Selected Unit"
                : "All Units",
            )}</td>
            <td>${formatCurrency(budget.revenueBase)}</td>
            <td>${formatPercent(budget.payrollPercent)}</td>
            <td>${formatCurrency(budget.payrollBudgetAmount)}</td>
            <td>${formatCurrency(budget.actualPayrollAmount)}</td>
            <td>${formatPercent(budget.actualPayrollPercent)}</td>
            <td>${formatCurrency(budget.valueVariance)}</td>
            <td>${formatPercent(budget.percentVariance)}</td>
            <td>${escapeHtml(varianceStatus)}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Departmental Payroll Budget Report</title>
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
              <div class="brand">👥 Forza Unified System</div>
              <h1>Departmental Payroll Budget Report</h1>
            </section>

            <section class="content">
              <div class="grid">
                <div class="card"><div class="label">Brand</div><div class="value">${escapeHtml(selectedBrand?.name || "Selected Brand")}</div></div>
                <div class="card"><div class="label">Branch</div><div class="value">${escapeHtml(selectedUnit?.name || "All Units")}</div></div>
                <div class="card"><div class="label">Month</div><div class="value">${escapeHtml(selectedMonth)}</div></div>
                <div class="card"><div class="label">Sales Net Revenue</div><div class="value">${formatCurrency(selectedUnitRevenue)}</div></div>
                <div class="card"><div class="label">Payroll %</div><div class="value">${formatPercent(totals.payrollPercentTotal)}</div></div>
                <div class="card"><div class="label">Payroll Budget</div><div class="value">${formatCurrency(totals.payrollBudgetTotal)}</div></div>
                <div class="card"><div class="label">Actual Payroll</div><div class="value">${formatCurrency(totals.actualPayrollTotal)}</div></div>
                <div class="card"><div class="label">Variance</div><div class="value">${formatCurrency(totals.variance)}</div></div>
              </div>

              <h2>📊 Department Payroll Weight of Scale</h2>
              <table>
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Branch</th>
                    <th>Sales Net Revenue</th>
                    <th>Payroll %</th>
                    <th>Budget Value</th>
                    <th>Actual Payroll</th>
                    <th>Actual %</th>
                    <th>Value Variance</th>
                    <th>% Variance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows || `<tr><td colspan="10">No payroll budget data found.</td></tr>`}
                </tbody>
              </table>

              <div class="footer">
                <div>Departmental Payroll Budget Report</div>
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
      toast.error("Allow popups to download the payroll budget PDF.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  if (isLoading || !profile) {
    return <PayrollBudgetLoading />;
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
        <div className="absolute -bottom-24 -left-20 h-72 w-72 animate-pulse rounded-full bg-amber-200/50 blur-3xl" />
        <div className="absolute left-1/2 top-10 h-48 w-48 -translate-x-1/2 animate-ping rounded-full bg-slate-200/20" />

        <div className="relative z-10 grid gap-6 xl:grid-cols-[1fr_390px] xl:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
              <Sparkles size={16} />
              Auto-linked Sales Revenue
            </div>

            <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-400">
              Payroll Budget
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
              {selectedBrand?.name || "Selected Brand"} Department Payroll
              Matrix
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              Payroll Budget is now linked directly to Sales Performance net
              revenue. No manual revenue input is needed. Formula: Sales Net
              Revenue × Department Payroll % = Payroll Budget Value.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl">
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
              Payroll Month
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

            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Sales Net Revenue
              </p>
              <p className="mt-1 text-xl font-black text-slate-950">
                {formatCurrency(selectedUnitRevenue)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Sales Net Revenue"
          value={formatCurrency(selectedUnitRevenue)}
          icon={<CircleDollarSign size={22} />}
          tone="dark"
        />
        <MetricCard
          label="Payroll % Weight"
          value={formatPercent(totals.payrollPercentTotal)}
          icon={<PieChart size={22} />}
          tone={totals.payrollPercentTotal > 100 ? "danger" : "stable"}
        />
        <MetricCard
          label="Payroll Budget"
          value={formatCurrency(totals.payrollBudgetTotal)}
          icon={<WalletCards size={22} />}
          tone="stable"
        />
        <MetricCard
          label="Actual Payroll"
          value={formatCurrency(totals.actualPayrollTotal)}
          icon={<Users size={22} />}
          tone={
            totals.actualPayrollTotal > totals.payrollBudgetTotal
              ? "danger"
              : "stable"
          }
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Value Variance"
          value={formatCurrency(totals.variance)}
          icon={
            totals.variance < 0 ? (
              <TrendingDown size={22} />
            ) : (
              <CheckCircle2 size={22} />
            )
          }
          tone={totals.variance < 0 ? "danger" : "stable"}
        />
        <MetricCard
          label="Actual Payroll %"
          value={formatPercent(totals.actualPayrollPercent)}
          icon={<BarChart3 size={22} />}
          tone={
            totals.actualPayrollPercent > totals.payrollPercentTotal
              ? "danger"
              : "stable"
          }
        />
        <MetricCard
          label="Budget Usage"
          value={formatPercent(totals.usagePercent)}
          icon={<CalendarDays size={22} />}
          tone={
            totals.usagePercent > 100
              ? "danger"
              : totals.usagePercent > 85
                ? "warning"
                : "stable"
          }
        />
        <MetricCard
          label="Over Budget"
          value={String(totals.overBudgetCount)}
          icon={<AlertTriangle size={22} />}
          tone={totals.overBudgetCount > 0 ? "danger" : "stable"}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[430px_1fr]">
        <section className="glass-panel rounded-[2.25rem] p-6">
          <div className="mb-5">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">
              Payroll Entry
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              {form.id
                ? "Edit Department Payroll Budget"
                : "Create Department Payroll Budget"}
            </h2>
          </div>

          <form onSubmit={handleSavePayrollBudget} className="space-y-4">
            <div>
              <label className="text-sm font-bold text-slate-700">
                Branch Unit
              </label>
              <select
                value={form.brandUnitId}
                onChange={(event) => handleUnitChange(event.target.value)}
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
                Payroll Month
              </label>
              <input
                type="month"
                value={form.budgetMonth}
                onChange={(event) =>
                  updateForm("budgetMonth", event.target.value)
                }
                className="forza-input mt-2"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Department
              </label>
              <select
                value={form.department}
                onChange={(event) =>
                  updateForm(
                    "department",
                    event.target.value as PayrollDepartmentValue,
                  )
                }
                className="forza-input mt-2"
              >
                {payrollDepartments.map((department) => (
                  <option key={department.value} value={department.value}>
                    {department.label}
                  </option>
                ))}
              </select>
            </div>

            {form.department === "custom" ? (
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Custom Department
                </label>
                <input
                  value={form.customDepartment}
                  onChange={(event) =>
                    updateForm("customDepartment", event.target.value)
                  }
                  className="forza-input mt-2"
                  placeholder="Custom department name"
                />
              </div>
            ) : null}

            <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Auto-linked Revenue Base
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {formatCurrency(formRevenueBase)}
              </p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                This value comes from Sales Performance net revenue for the
                selected brand, branch, and month.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Payroll % Weight
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.payrollPercent}
                  onChange={(event) =>
                    updateForm("payrollPercent", event.target.value)
                  }
                  className="forza-input mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Actual Payroll (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.actualPayrollAmount}
                  onChange={(event) =>
                    updateForm("actualPayrollAmount", event.target.value)
                  }
                  className="forza-input mt-2"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Auto Conversion
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <SmallValue
                  label="Payroll Budget"
                  value={formatCurrency(formPayrollBudgetAmount)}
                />
                <SmallValue
                  label="Actual Payroll %"
                  value={formatPercent(formActualPayrollPercent)}
                />
                <SmallValue
                  label="Value Variance"
                  value={formatCurrency(formValueVariance)}
                />
                <SmallValue
                  label="% Variance"
                  value={formatPercent(formPercentVariance)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">Notes</label>
              <textarea
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                className="forza-input mt-2 min-h-[100px] resize-none"
                placeholder="Payroll budget notes, assumptions, manpower remarks..."
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
                    ? "Update Payroll"
                    : "Save Payroll"}
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
                Payroll Matrix
              </p>
              <h2 className="text-2xl font-black text-slate-950">
                Department Weight of Scale
              </h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="forza-input pl-11 sm:min-w-[260px]"
                  placeholder="Search department or notes..."
                />
              </div>

              <button
                type="button"
                onClick={downloadPayrollBudgetPdf}
                className="forza-button-hover inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl"
              >
                <Download size={18} />
                PDF
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {departmentPerformance.map((budget) => {
              const isOverBudget = budget.valueVariance < 0;
              const isNearLimit =
                budget.usagePercent >= 85 && budget.usagePercent <= 100;

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
                        · Budget: {formatPercent(budget.payrollPercent)} ·
                        Actual: {formatPercent(budget.actualPayrollPercent)}
                      </p>
                      {budget.notes ? (
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {budget.notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid min-w-[340px] grid-cols-2 gap-3">
                      <SmallValue
                        label="Sales Revenue"
                        value={formatCurrency(budget.revenueBase)}
                      />
                      <SmallValue
                        label="Payroll Budget"
                        value={formatCurrency(budget.payrollBudgetAmount)}
                      />
                      <SmallValue
                        label="Actual Payroll"
                        value={formatCurrency(budget.actualPayrollAmount)}
                      />
                      <SmallValue
                        label="Variance"
                        value={formatCurrency(budget.valueVariance)}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-wide text-slate-500">
                      <span>Actual payroll weight of revenue</span>
                      <span>{formatPercent(budget.actualPayrollPercent)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/80">
                      <div
                        className={`h-full rounded-full ${
                          isOverBudget
                            ? "bg-red-500"
                            : isNearLimit
                              ? "bg-amber-500"
                              : "bg-emerald-600"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, budget.actualPayrollPercent),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditPayrollBudget(budget)}
                      className="forza-button-hover inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-950 shadow-sm"
                    >
                      <Edit3 size={15} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePayrollBudget(budget.id)}
                      className="forza-button-hover inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-xs font-black text-white shadow-sm"
                    >
                      <Trash2 size={15} />
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}

            {departmentPerformance.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white/80 p-8 text-center">
                <FileText className="mx-auto text-slate-300" size={36} />
                <h3 className="mt-4 text-lg font-black text-slate-950">
                  No departmental payroll budget found
                </h3>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  Create the first departmental payroll budget for this month.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </DashboardShell>
  );
}

function PayrollBudgetLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="glass-panel relative w-full max-w-lg overflow-hidden rounded-[2rem] p-8 text-center">
        <div className="absolute -right-16 -top-16 h-40 w-40 animate-pulse rounded-full bg-blue-200/50 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 animate-pulse rounded-full bg-amber-200/50 blur-3xl" />
        <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl">
          <Users className="animate-pulse" size={24} />
        </div>
        <h1 className="relative z-10 mt-5 text-2xl font-black text-slate-950">
          Loading Payroll Budget
        </h1>
        <p className="relative z-10 mt-2 text-sm font-bold text-slate-500">
          Preparing auto-linked departmental payroll budget workspace...
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