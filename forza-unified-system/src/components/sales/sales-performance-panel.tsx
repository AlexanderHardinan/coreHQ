// File name: src/components/sales/sales-performance-panel.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ChefHat,
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

export type SalesOpsArea = "kitchen" | "bar" | "global";

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

export type SalesRecipe = {
  id: string;
  brand_id: string | null;
  brand_unit_id: string;
  ops_area: SalesOpsArea;
  recipe_name: string;
  recipe_category: string | null;
  batch_yield: number;
  portion_yield: number;
  selling_price: number;
  food_cost_percent: number;
  total_recipe_cost: number;
  cost_per_portion: number;
  is_active: boolean;
};

export type SalesRecipeItem = {
  id: string;
  recipe_id: string;
  product_id: string;
  quantity: number;
  unit: string;
  unit_cost_snapshot: number;
  total_cost: number;
};

export type SalesProduct = {
  id: string;
  brand_id: string | null;
  brand_unit_id: string;
  ops_area: SalesOpsArea;
  product_name: string;
  sku: string;
  unit: string;
  unit_cost: number;
  current_stock: number;
  is_active: boolean;
};

export type RecipeSaleRecord = {
  id: string;
  brand_id: string;
  brand_unit_id: string;
  recipe_id: string;
  ops_area: SalesOpsArea;
  quantity: number;
  selling_price: number;
  gross_sales: number;
  discount_amount: number;
  net_sales: number;
  sold_date: string;
  source: string;
  source_reference: string | null;
  notes: string | null;
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
  recipes?: SalesRecipe[];
  recipeItems?: SalesRecipeItem[];
  products?: SalesProduct[];
  recipeSales?: RecipeSaleRecord[];
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

type SoldDishFormState = {
  recipeId: string;
  brandUnitId: string;
  soldDate: string;
  quantity: string;
  sellingPrice: string;
  discountAmount: string;
  notes: string;
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

const roleLabels: Record<UserRole, string> = {
  boh_staff: "BOH Staff",
  foh_staff: "FOH Staff",
  manager: "Manager",
  super_admin: "Super Admin",
};

const opsAreaLabels: Record<SalesOpsArea, string> = {
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

function escapeCsvValue(value: string | number | null | undefined) {
  const stringValue = String(value ?? "");
  const escapedValue = stringValue.replaceAll('"', '""');

  return `"${escapedValue}"`;
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

function getEmptySoldDishForm(unitId: string): SoldDishFormState {
  return {
    recipeId: "",
    brandUnitId: unitId || "",
    soldDate: todayDate(),
    quantity: "1",
    sellingPrice: "0",
    discountAmount: "0",
    notes: "",
  };
}

function getRecipeIngredientDeductionQty(
  recipe: SalesRecipe,
  item: SalesRecipeItem,
  soldQuantity: number,
) {
  const itemQuantity = Number(item.quantity || 0);
  const portionYield = Number(recipe.portion_yield || 0);

  if (portionYield > 0) {
    return (itemQuantity / portionYield) * soldQuantity;
  }

  return itemQuantity * soldQuantity;
}

export function SalesPerformancePanel({
  userId,
  role,
  selectedBrand,
  units,
  salesRevenue,
  recipes = [],
  recipeItems = [],
  products = [],
  recipeSales = [],
}: SalesPerformancePanelProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const defaultUnitId = units[0]?.id || "";

  const [records, setRecords] = useState<SalesRevenueRecord[]>(salesRevenue);
  const [soldDishRecords, setSoldDishRecords] =
    useState<RecipeSaleRecord[]>(recipeSales);
  const [selectedUnitId, setSelectedUnitId] = useState(defaultUnitId);
  const [selectedChannel, setSelectedChannel] = useState<SalesChannel | "all">(
    "all",
  );
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth());
  const [dateTo, setDateTo] = useState(todayDate());
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSoldDish, setIsSavingSoldDish] = useState(false);
  const [deletingSaleId, setDeletingSaleId] = useState("");
  const [form, setForm] = useState<SalesFormState>(() =>
    getEmptyForm(defaultUnitId),
  );
  const [soldDishForm, setSoldDishForm] = useState<SoldDishFormState>(() =>
    getEmptySoldDishForm(defaultUnitId),
  );

  useEffect(() => {
    setRecords(salesRevenue);
  }, [salesRevenue]);

  useEffect(() => {
    setSoldDishRecords(recipeSales);
  }, [recipeSales]);

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === selectedUnitId) || null,
    [selectedUnitId, units],
  );

  const selectedRecipe = useMemo(
    () =>
      recipes.find((recipe) => recipe.id === soldDishForm.recipeId) || null,
    [recipes, soldDishForm.recipeId],
  );

  const selectedRecipeItems = useMemo(() => {
    if (!selectedRecipe) {
      return [];
    }

    return recipeItems.filter((item) => item.recipe_id === selectedRecipe.id);
  }, [recipeItems, selectedRecipe]);

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

  const soldDishQuantity = Number(soldDishForm.quantity || 0);
  const soldDishSellingPrice = Number(soldDishForm.sellingPrice || 0);
  const soldDishDiscount = Number(soldDishForm.discountAmount || 0);
  const soldDishGrossSales = soldDishQuantity * soldDishSellingPrice;
  const soldDishNetSales = Math.max(0, soldDishGrossSales - soldDishDiscount);

  const soldDishIngredientPreview = useMemo(() => {
    if (!selectedRecipe) {
      return [];
    }

    return selectedRecipeItems.map((item) => {
      const product = products.find((entry) => entry.id === item.product_id);
      const deductionQty = getRecipeIngredientDeductionQty(
        selectedRecipe,
        item,
        soldDishQuantity,
      );
      const unitCost = Number(
        product?.unit_cost ?? item.unit_cost_snapshot ?? 0,
      );

      return {
        item,
        product,
        deductionQty,
        unitCost,
        totalCost: deductionQty * unitCost,
      };
    });
  }, [products, selectedRecipe, selectedRecipeItems, soldDishQuantity]);

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

  const filteredSoldDishRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return soldDishRecords.filter((sale) => {
      const recipe = recipes.find((entry) => entry.id === sale.recipe_id);
      const unit = units.find((entry) => entry.id === sale.brand_unit_id);
      const matchesUnit =
        !selectedUnitId || sale.brand_unit_id === selectedUnitId;
      const matchesDateFrom = !dateFrom || sale.sold_date >= dateFrom;
      const matchesDateTo = !dateTo || sale.sold_date <= dateTo;
      const matchesSearch =
        !query ||
        String(recipe?.recipe_name || "").toLowerCase().includes(query) ||
        String(unit?.name || "").toLowerCase().includes(query) ||
        String(sale.notes || "").toLowerCase().includes(query) ||
        String(sale.source_reference || "").toLowerCase().includes(query);

      return matchesUnit && matchesDateFrom && matchesDateTo && matchesSearch;
    });
  }, [
    dateFrom,
    dateTo,
    recipes,
    search,
    selectedUnitId,
    soldDishRecords,
    units,
  ]);

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

    const soldDishNetSales = filteredSoldDishRecords.reduce(
      (total, sale) => total + Number(sale.net_sales || 0),
      0,
    );

    const soldDishQty = filteredSoldDishRecords.reduce(
      (total, sale) => total + Number(sale.quantity || 0),
      0,
    );

    const averageEntry =
      filteredRecords.length > 0 ? netRevenue / filteredRecords.length : 0;

    return {
      entryCount: filteredRecords.length,
      dishSaleCount: filteredSoldDishRecords.length,
      soldDishQty,
      grossSales,
      discounts,
      serviceCharge,
      tax,
      netRevenue,
      soldDishNetSales,
      averageEntry,
    };
  }, [filteredRecords, filteredSoldDishRecords]);

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

  const recipeSalesByRecipe = useMemo(() => {
    const saleMap = new Map<
      string,
      {
        recipeId: string;
        recipeName: string;
        quantity: number;
        netSales: number;
        saleCount: number;
      }
    >();

    filteredSoldDishRecords.forEach((sale) => {
      const recipe = recipes.find((entry) => entry.id === sale.recipe_id);
      const current = saleMap.get(sale.recipe_id) || {
        recipeId: sale.recipe_id,
        recipeName: recipe?.recipe_name || "Unknown Recipe",
        quantity: 0,
        netSales: 0,
        saleCount: 0,
      };

      saleMap.set(sale.recipe_id, {
        ...current,
        quantity: current.quantity + Number(sale.quantity || 0),
        netSales: current.netSales + Number(sale.net_sales || 0),
        saleCount: current.saleCount + 1,
      });
    });

    return Array.from(saleMap.values()).sort(
      (a, b) => b.netSales - a.netSales,
    );
  }, [filteredSoldDishRecords, recipes]);

  function updateForm(key: keyof SalesFormState, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateSoldDishForm(key: keyof SoldDishFormState, value: string) {
    setSoldDishForm((current) => ({
      ...current,
      [key]: value,
    }));

    if (key === "recipeId") {
      const recipe = recipes.find((entry) => entry.id === value);

      if (recipe) {
        setSoldDishForm((current) => ({
          ...current,
          recipeId: value,
          brandUnitId: recipe.brand_unit_id || current.brandUnitId,
          sellingPrice: String(Number(recipe.selling_price || 0)),
        }));
      }
    }
  }

  function resetForm() {
    setForm(getEmptyForm(selectedUnitId || defaultUnitId));
  }

  function resetSoldDishForm() {
    setSoldDishForm(getEmptySoldDishForm(selectedUnitId || defaultUnitId));
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
    router.refresh();
  }

  async function handleSaveSoldDish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedBrand?.id) {
      toast.error("Selected brand is required.");
      return;
    }

    if (!selectedRecipe) {
      toast.error("Recipe is required.");
      return;
    }

    if (!soldDishForm.brandUnitId) {
      toast.error("Branch unit is required.");
      return;
    }

    if (!soldDishForm.soldDate) {
      toast.error("Sold date is required.");
      return;
    }

    if (soldDishQuantity <= 0) {
      toast.error("Sold quantity must be greater than zero.");
      return;
    }

    if (soldDishSellingPrice < 0 || soldDishDiscount < 0) {
      toast.error("Selling price and discount cannot be negative.");
      return;
    }

    if (selectedRecipeItems.length === 0) {
      toast.error("This recipe has no ingredients to deduct.");
      return;
    }

    const missingProducts = selectedRecipeItems.filter(
      (item) => !products.some((product) => product.id === item.product_id),
    );

    if (missingProducts.length > 0) {
      toast.error("Some recipe ingredients are missing active products.");
      return;
    }

    setIsSavingSoldDish(true);

    const recipeSalePayload = {
      brand_id: selectedBrand.id,
      brand_unit_id: soldDishForm.brandUnitId,
      recipe_id: selectedRecipe.id,
      ops_area: selectedRecipe.ops_area,
      quantity: soldDishQuantity,
      selling_price: soldDishSellingPrice,
      gross_sales: soldDishGrossSales,
      discount_amount: soldDishDiscount,
      net_sales: soldDishNetSales,
      sold_date: soldDishForm.soldDate,
      source: "manual",
      source_reference: null,
      notes: soldDishForm.notes.trim() || null,
      is_active: true,
      created_by: userId,
    };

    const { data: recipeSaleData, error: recipeSaleError } = await supabase
      .from("recipe_sales")
      .insert(recipeSalePayload)
      .select(
        "id, brand_id, brand_unit_id, recipe_id, ops_area, quantity, selling_price, gross_sales, discount_amount, net_sales, sold_date, source, source_reference, notes, is_active, created_by, created_at, updated_at",
      )
      .single();

    if (recipeSaleError || !recipeSaleData) {
      setIsSavingSoldDish(false);
      toast.error(recipeSaleError?.message || "Unable to save sold dish.");
      return;
    }

    const savedRecipeSale = recipeSaleData as RecipeSaleRecord;
    const referenceCode = `SALE:${savedRecipeSale.id}`;

    const movementRows = soldDishIngredientPreview.map((entry) => {
      const product = entry.product as SalesProduct;

      return {
        brand_id: selectedBrand.id,
        brand_unit_id: product.brand_unit_id || soldDishForm.brandUnitId,
        product_id: product.id,
        ops_area: product.ops_area,
        movement_type: "sold_consumption",
        quantity: entry.deductionQty,
        unit_cost: entry.unitCost,
        reference_code: referenceCode,
        notes: `Manual sold dish: ${selectedRecipe.recipe_name} × ${formatQty(
          soldDishQuantity,
        )}`,
        movement_date: soldDishForm.soldDate,
        created_by: userId,
        balance_direction: -1,
      };
    });

    const { error: movementError } = await supabase
      .from("inventory_movements")
      .insert(movementRows);

    if (movementError) {
      await supabase
        .from("recipe_sales")
        .update({
          is_active: false,
          source_reference: `${referenceCode}:FAILED_MOVEMENT`,
        })
        .eq("id", savedRecipeSale.id);

      setIsSavingSoldDish(false);
      toast.error(movementError.message);
      return;
    }

    const revenuePayload = {
      brand_id: selectedBrand.id,
      brand_unit_id: soldDishForm.brandUnitId,
      revenue_date: soldDishForm.soldDate,
      revenue_month: `${soldDishForm.soldDate.slice(0, 7)}-01`,
      sales_channel: "manual" as SalesChannel,
      category: selectedRecipe.recipe_category || "Recipe Sale",
      product_name: selectedRecipe.recipe_name,
      gross_sales: soldDishGrossSales,
      discount_amount: soldDishDiscount,
      service_charge: 0,
      tax_amount: 0,
      net_revenue: soldDishNetSales,
      notes: soldDishForm.notes.trim() || null,
      source_reference: referenceCode,
      is_active: true,
      created_by: userId,
    };

    const { data: revenueData, error: revenueError } = await supabase
      .from("sales_revenue")
      .insert(revenuePayload)
      .select(
        "id, brand_id, brand_unit_id, revenue_date, revenue_month, sales_channel, category, product_name, gross_sales, discount_amount, service_charge, tax_amount, net_revenue, notes, source_reference, is_active, created_by, created_at, updated_at",
      )
      .single();

    await supabase
      .from("recipe_sales")
      .update({
        source_reference: referenceCode,
      })
      .eq("id", savedRecipeSale.id);

    setIsSavingSoldDish(false);

    if (revenueError) {
      toast.warning(
        "Dish sale saved and ingredients deducted, but revenue mirror failed.",
      );
    }

    setSoldDishRecords((current) => [
      {
        ...savedRecipeSale,
        source_reference: referenceCode,
      },
      ...current,
    ]);

    if (revenueData) {
      setRecords((current) => [revenueData as SalesRevenueRecord, ...current]);
    }

    toast.success("Sold dish saved and ingredients deducted.");
    resetSoldDishForm();
    router.refresh();
  }

  function handleEditRevenue(record: SalesRevenueRecord) {
    setForm({
      id: record.id,
      brandUnitId: record.brand_unit_id || "",
      revenueDate: record.revenue_date,
      salesChannel: record.sales_channel,
      category: record.category,
      productName: record.product_name,
      grossSales: String(Number(record.gross_sales || 0)),
      discountAmount: String(Number(record.discount_amount || 0)),
      serviceCharge: String(Number(record.service_charge || 0)),
      taxAmount: String(Number(record.tax_amount || 0)),
      notes: record.notes || "",
      sourceReference: record.source_reference || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleDeleteRevenue(recordId: string) {
    const confirmed = window.confirm(
      "Delete this revenue record from Sales Performance?",
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("sales_revenue")
      .update({
        is_active: false,
      })
      .eq("id", recordId);

    if (error) {
      toast.error(error.message);
      return;
    }

    setRecords((current) => current.filter((record) => record.id !== recordId));
    toast.success("Sales revenue deleted.");
    router.refresh();
  }

  async function handleDeleteRecipeSale(sale: RecipeSaleRecord) {
    const recipe = recipes.find((entry) => entry.id === sale.recipe_id);
    const confirmed = window.confirm(
      `Delete this sold dish entry${
        recipe ? ` for ${recipe.recipe_name}` : ""
      } and reverse linked ingredient deductions?`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingSaleId(sale.id);

    const referenceCode = sale.source_reference || `SALE:${sale.id}`;

    const { error: movementError } = await supabase
      .from("inventory_movements")
      .delete()
      .eq("reference_code", referenceCode);

    if (movementError) {
      setDeletingSaleId("");
      toast.error(movementError.message);
      return;
    }

    const { error: revenueError } = await supabase
      .from("sales_revenue")
      .update({
        is_active: false,
      })
      .eq("source_reference", referenceCode);

    if (revenueError) {
      setDeletingSaleId("");
      toast.error(revenueError.message);
      return;
    }

    const { error: saleError } = await supabase
      .from("recipe_sales")
      .update({
        is_active: false,
      })
      .eq("id", sale.id);

    setDeletingSaleId("");

    if (saleError) {
      toast.error(saleError.message);
      return;
    }

    setSoldDishRecords((current) =>
      current.filter((record) => record.id !== sale.id),
    );
    setRecords((current) =>
      current.filter((record) => record.source_reference !== referenceCode),
    );

    toast.success("Sold dish entry deleted and ingredient deductions reversed.");
    router.refresh();
  }

  function exportCsv() {
    const headers = [
      "Date",
      "Unit",
      "Channel",
      "Category",
      "Product",
      "Gross Sales",
      "Discount",
      "Service Charge",
      "Tax",
      "Net Revenue",
      "Reference",
      "Notes",
    ];

    const rows = filteredRecords.map((record) => {
      const unit = units.find((entry) => entry.id === record.brand_unit_id);

      return [
        record.revenue_date,
        unit?.name || "",
        salesChannelLabels[record.sales_channel] || record.sales_channel,
        record.category,
        record.product_name,
        Number(record.gross_sales || 0),
        Number(record.discount_amount || 0),
        Number(record.service_charge || 0),
        Number(record.tax_amount || 0),
        Number(record.net_revenue || 0),
        record.source_reference || "",
        record.notes || "",
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `sales-performance-${selectedBrand?.code || "brand"}-${todayDate()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const rowsHtml = filteredRecords
      .map((record) => {
        const unit = units.find((entry) => entry.id === record.brand_unit_id);

        return `
          <tr>
            <td>${escapeHtml(record.revenue_date)}</td>
            <td>${escapeHtml(unit?.name || "")}</td>
            <td>${escapeHtml(salesChannelLabels[record.sales_channel])}</td>
            <td>${escapeHtml(record.category)}</td>
            <td>${escapeHtml(record.product_name)}</td>
            <td>${escapeHtml(formatCurrency(Number(record.gross_sales || 0)))}</td>
            <td>${escapeHtml(formatCurrency(Number(record.discount_amount || 0)))}</td>
            <td>${escapeHtml(formatCurrency(Number(record.net_revenue || 0)))}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Sales Performance Report</title>
          <style>
            body {
              margin: 0;
              padding: 32px;
              color: #0f172a;
              font-family: Arial, Helvetica, sans-serif;
              background: #ffffff;
            }
            .sheet {
              max-width: 1100px;
              margin: 0 auto;
              border: 1px solid #e2e8f0;
              border-radius: 24px;
              overflow: hidden;
            }
            .header {
              padding: 28px;
              background: #0f172a;
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
            }
            .content {
              padding: 28px;
            }
            .stats {
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
              <div class="brand">Forza Unified System</div>
              <h1>Sales Performance Report</h1>
            </section>
            <section class="content">
              <div class="stats">
                <div class="card"><div class="label">Brand</div><div class="value">${escapeHtml(selectedBrand?.name || "N/A")}</div></div>
                <div class="card"><div class="label">Unit</div><div class="value">${escapeHtml(selectedUnit?.name || "All")}</div></div>
                <div class="card"><div class="label">Entries</div><div class="value">${stats.entryCount}</div></div>
                <div class="card"><div class="label">Net Revenue</div><div class="value">${escapeHtml(formatCurrency(stats.netRevenue))}</div></div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Unit</th>
                    <th>Channel</th>
                    <th>Category</th>
                    <th>Product</th>
                    <th>Gross</th>
                    <th>Discount</th>
                    <th>Net</th>
                  </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
              </table>
              <div class="footer">
                <div>Sales Performance Export</div>
                <div>Developer Rights Chef Alex @FORZA 2026</div>
              </div>
            </section>
          </main>
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1200,height=900");

    if (!printWindow) {
      toast.error("Allow popups to export PDF.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel relative overflow-hidden rounded-[2.35rem] p-6 md:p-8">
        <div className="absolute -right-28 -top-28 h-80 w-80 animate-pulse rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-80 w-80 animate-pulse rounded-full bg-amber-200/50 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
              <TrendingUp size={17} />
              Sales Performance
            </div>

            <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-400">
              Manual Sales Now · POS Ready Later
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
              Revenue, Sold Dishes, and Ingredient Deduction
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              Record manual sold dishes from Recipe Maker, generate sales
              revenue, and deduct all recipe ingredients through
              sold_consumption inventory movements. The structure is ready for
              POS integration later.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Active Brand
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {selectedBrand?.name || "No Brand"}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-500">
              {roleLabels[role]} · {selectedUnit?.name || "All Units"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Net Revenue"
          value={formatCurrency(stats.netRevenue)}
          sub="Filtered revenue records"
          icon={<CircleDollarSign size={22} />}
        />
        <MetricCard
          label="Gross Sales"
          value={formatCurrency(stats.grossSales)}
          sub="Before discount and tax"
          icon={<BarChart3 size={22} />}
        />
        <MetricCard
          label="Sold Dish Qty"
          value={formatQty(stats.soldDishQty)}
          sub="Manual recipe sales"
          icon={<ChefHat size={22} />}
        />
        <MetricCard
          label="Dish Sale Revenue"
          value={formatCurrency(stats.soldDishNetSales)}
          sub="From recipe_sales"
          icon={<ReceiptText size={22} />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="glass-panel rounded-[2.35rem] p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">
                Sold Dish Entry
              </p>
              <h2 className="mt-1 text-3xl font-black text-slate-950">
                Deduct Recipe Ingredients
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                Select a recipe and enter sold quantity. The system deducts all
                recipe ingredients from inventory by UOM.
              </p>
            </div>
            <Sparkles className="text-slate-400" size={26} />
          </div>

          <form onSubmit={handleSaveSoldDish} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Branch Unit">
                <select
                  value={soldDishForm.brandUnitId}
                  onChange={(event) =>
                    updateSoldDishForm("brandUnitId", event.target.value)
                  }
                  className="input"
                >
                  <option value="">Select unit</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Sold Date">
                <input
                  type="date"
                  value={soldDishForm.soldDate}
                  onChange={(event) =>
                    updateSoldDishForm("soldDate", event.target.value)
                  }
                  className="input"
                />
              </FormField>
            </div>

            <FormField label="Recipe / Dish">
              <select
                value={soldDishForm.recipeId}
                onChange={(event) =>
                  updateSoldDishForm("recipeId", event.target.value)
                }
                className="input"
              >
                <option value="">Select recipe</option>
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.recipe_name} · {opsAreaLabels[recipe.ops_area]}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid gap-4 md:grid-cols-3">
              <FormField label="Sold Qty">
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={soldDishForm.quantity}
                  onChange={(event) =>
                    updateSoldDishForm("quantity", event.target.value)
                  }
                  className="input"
                />
              </FormField>

              <FormField label="Selling Price">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={soldDishForm.sellingPrice}
                  onChange={(event) =>
                    updateSoldDishForm("sellingPrice", event.target.value)
                  }
                  className="input"
                />
              </FormField>

              <FormField label="Discount">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={soldDishForm.discountAmount}
                  onChange={(event) =>
                    updateSoldDishForm("discountAmount", event.target.value)
                  }
                  className="input"
                />
              </FormField>
            </div>

            <FormField label="Notes">
              <textarea
                value={soldDishForm.notes}
                onChange={(event) =>
                  updateSoldDishForm("notes", event.target.value)
                }
                className="input min-h-[88px] resize-none"
                placeholder="Optional sale note"
              />
            </FormField>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 md:grid-cols-3">
                <MiniStat label="Gross Sales" value={formatCurrency(soldDishGrossSales)} />
                <MiniStat label="Discount" value={formatCurrency(soldDishDiscount)} />
                <MiniStat label="Net Sales" value={formatCurrency(soldDishNetSales)} />
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">
                  Ingredient deduction preview
                </p>

                <div className="space-y-2">
                  {soldDishIngredientPreview.map((entry) => (
                    <div
                      key={entry.item.id}
                      className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3 text-sm shadow-sm"
                    >
                      <div>
                        <p className="font-black text-slate-950">
                          {entry.product?.product_name || "Missing Product"}
                        </p>
                        <p className="text-xs font-bold text-slate-400">
                          {entry.product?.sku || "No SKU"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-950">
                          -{formatQty(entry.deductionQty)}{" "}
                          {entry.product?.unit || entry.item.unit}
                        </p>
                        <p className="text-xs font-bold text-slate-400">
                          {formatCurrency(entry.totalCost)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {soldDishIngredientPreview.length === 0 ? (
                    <div className="rounded-2xl bg-white px-4 py-4 text-sm font-bold text-slate-500">
                      Select a recipe to preview ingredient deductions.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSavingSoldDish}
                className="forza-button-hover inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={18} />
                {isSavingSoldDish ? "Saving..." : "Save Sold Dish"}
              </button>

              <button
                type="button"
                onClick={resetSoldDishForm}
                className="forza-button-hover inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm"
              >
                Reset
              </button>
            </div>
          </form>
        </section>

        <section className="glass-panel rounded-[2.35rem] p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">
                Revenue Entry
              </p>
              <h2 className="mt-1 text-3xl font-black text-slate-950">
                Manual Revenue Record
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                Keep this for general sales, POS fallback, imported revenue, or
                manual revenue entries not linked to recipe deduction.
              </p>
            </div>
            <Plus className="text-slate-400" size={26} />
          </div>

          <form onSubmit={handleSaveRevenue} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Branch Unit">
                <select
                  value={form.brandUnitId}
                  onChange={(event) =>
                    updateForm("brandUnitId", event.target.value)
                  }
                  className="input"
                >
                  <option value="">Select unit</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Revenue Date">
                <input
                  type="date"
                  value={form.revenueDate}
                  onChange={(event) =>
                    updateForm("revenueDate", event.target.value)
                  }
                  className="input"
                />
              </FormField>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FormField label="Channel">
                <select
                  value={form.salesChannel}
                  onChange={(event) =>
                    updateForm("salesChannel", event.target.value)
                  }
                  className="input"
                >
                  <option value="manual">Manual</option>
                  <option value="pos">POS</option>
                  <option value="imported">Imported</option>
                </select>
              </FormField>

              <FormField label="Category">
                <input
                  value={form.category}
                  onChange={(event) => updateForm("category", event.target.value)}
                  className="input"
                />
              </FormField>

              <FormField label="Product / Revenue Name">
                <input
                  value={form.productName}
                  onChange={(event) =>
                    updateForm("productName", event.target.value)
                  }
                  className="input"
                />
              </FormField>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <FormField label="Gross Sales">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.grossSales}
                  onChange={(event) =>
                    updateForm("grossSales", event.target.value)
                  }
                  className="input"
                />
              </FormField>

              <FormField label="Discount">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discountAmount}
                  onChange={(event) =>
                    updateForm("discountAmount", event.target.value)
                  }
                  className="input"
                />
              </FormField>

              <FormField label="Service Charge">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.serviceCharge}
                  onChange={(event) =>
                    updateForm("serviceCharge", event.target.value)
                  }
                  className="input"
                />
              </FormField>

              <FormField label="Tax">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.taxAmount}
                  onChange={(event) =>
                    updateForm("taxAmount", event.target.value)
                  }
                  className="input"
                />
              </FormField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Source Reference">
                <input
                  value={form.sourceReference}
                  onChange={(event) =>
                    updateForm("sourceReference", event.target.value)
                  }
                  className="input"
                  placeholder="POS ticket, invoice, or manual reference"
                />
              </FormField>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Net Revenue
                </p>
                <p className="mt-2 text-2xl font-black text-slate-950">
                  {formatCurrency(formNetRevenue)}
                </p>
              </div>
            </div>

            <FormField label="Notes">
              <textarea
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                className="input min-h-[88px] resize-none"
              />
            </FormField>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="forza-button-hover inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={18} />
                {isSaving ? "Saving..." : form.id ? "Update Revenue" : "Save Revenue"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="forza-button-hover inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm"
              >
                Reset
              </button>
            </div>
          </form>
        </section>
      </section>

      <section className="glass-panel rounded-[2.35rem] p-6">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">
              Filters & Exports
            </p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">
              Sales Analysis
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportPdf}
              className="forza-button-hover inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700 shadow-sm"
            >
              <FileText size={15} />
              PDF
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="forza-button-hover inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700 shadow-sm"
            >
              <Download size={15} />
              CSV
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <FormField label="Unit Filter">
            <select
              value={selectedUnitId}
              onChange={(event) => {
                setSelectedUnitId(event.target.value);
                setForm((current) => ({
                  ...current,
                  brandUnitId: event.target.value,
                }));
                setSoldDishForm((current) => ({
                  ...current,
                  brandUnitId: event.target.value,
                }));
              }}
              className="input"
            >
              <option value="">All Units</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Channel">
            <select
              value={selectedChannel}
              onChange={(event) =>
                setSelectedChannel(event.target.value as SalesChannel | "all")
              }
              className="input"
            >
              <option value="all">All Channels</option>
              <option value="manual">Manual</option>
              <option value="pos">POS</option>
              <option value="imported">Imported</option>
            </select>
          </FormField>

          <FormField label="From">
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="input"
            />
          </FormField>

          <FormField label="To">
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="input"
            />
          </FormField>

          <FormField label="Search">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="input pl-10"
                placeholder="Search sales"
              />
            </div>
          </FormField>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <AnalysisCard
          title="Category Performance"
          icon={<PieChart size={24} />}
          emptyText="No category revenue found."
        >
          {categoryPerformance.slice(0, 8).map((item) => (
            <ListRow
              key={item.category}
              title={item.category}
              subtitle={`${item.entryCount} entries · Gross ${formatCurrency(
                item.grossSales,
              )}`}
              value={formatCurrency(item.netRevenue)}
            />
          ))}
        </AnalysisCard>

        <AnalysisCard
          title="Product Performance"
          icon={<PackageSearch size={24} />}
          emptyText="No product revenue found."
        >
          {productPerformance.slice(0, 8).map((item) => (
            <ListRow
              key={`${item.productName}-${item.category}`}
              title={item.productName}
              subtitle={`${item.category} · ${item.entryCount} entries`}
              value={formatCurrency(item.netRevenue)}
            />
          ))}
        </AnalysisCard>

        <AnalysisCard
          title="Top Sold Recipes"
          icon={<ChefHat size={24} />}
          emptyText="No sold dish records yet."
        >
          {recipeSalesByRecipe.slice(0, 8).map((item) => (
            <ListRow
              key={item.recipeId}
              title={item.recipeName}
              subtitle={`${formatQty(item.quantity)} sold · ${item.saleCount} entries`}
              value={formatCurrency(item.netSales)}
            />
          ))}
        </AnalysisCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="glass-panel rounded-[2.35rem] p-6">
          <div className="mb-5">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">
              Sold Dish History
            </p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">
              Recipe Sales & Ingredient Deduction
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-400">
                  <th className="px-4">Date</th>
                  <th className="px-4">Recipe</th>
                  <th className="px-4">Qty</th>
                  <th className="px-4">Net Sales</th>
                  <th className="px-4">Reference</th>
                  <th className="px-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredSoldDishRecords.map((sale) => {
                  const recipe = recipes.find(
                    (entry) => entry.id === sale.recipe_id,
                  );

                  return (
                    <tr key={sale.id} className="rounded-2xl bg-white shadow-sm">
                      <td className="rounded-l-2xl px-4 py-4 text-sm font-bold text-slate-600">
                        {sale.sold_date}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-black text-slate-950">
                          {recipe?.recipe_name || "Unknown Recipe"}
                        </p>
                        <p className="text-xs font-bold text-slate-400">
                          {opsAreaLabels[sale.ops_area]} · {sale.source}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm font-black text-slate-950">
                        {formatQty(Number(sale.quantity || 0))}
                      </td>
                      <td className="px-4 py-4 text-sm font-black text-slate-950">
                        {formatCurrency(Number(sale.net_sales || 0))}
                      </td>
                      <td className="px-4 py-4 text-xs font-bold text-slate-500">
                        {sale.source_reference || `SALE:${sale.id}`}
                      </td>
                      <td className="rounded-r-2xl px-4 py-4">
                        <button
                          type="button"
                          disabled={deletingSaleId === sale.id}
                          onClick={() => handleDeleteRecipeSale(sale)}
                          className="forza-button-hover inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-2 text-xs font-black text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 size={14} />
                          {deletingSaleId === sale.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredSoldDishRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="rounded-2xl bg-white px-4 py-8 text-center text-sm font-black text-slate-500"
                    >
                      No sold dish entries found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="glass-panel rounded-[2.35rem] p-6">
          <div className="mb-5">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">
              Daily Performance
            </p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">
              Revenue by Day
            </h2>
          </div>

          <div className="space-y-3">
            {dailyPerformance.slice(0, 10).map((item) => (
              <div
                key={item.date}
                className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      {item.date}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      {item.entryCount} entries · Gross{" "}
                      {formatCurrency(item.grossSales)}
                    </p>
                  </div>
                  <p className="text-sm font-black text-slate-950">
                    {formatCurrency(item.netRevenue)}
                  </p>
                </div>
              </div>
            ))}

            {dailyPerformance.length === 0 ? (
              <div className="rounded-3xl bg-white/75 p-5 text-sm font-bold text-slate-500">
                No daily revenue found.
              </div>
            ) : null}
          </div>
        </section>
      </section>

      <section className="glass-panel rounded-[2.35rem] p-6">
        <div className="mb-5">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">
            Revenue Records
          </p>
          <h2 className="mt-1 text-3xl font-black text-slate-950">
            Sales Revenue Ledger
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-400">
                <th className="px-4">Date</th>
                <th className="px-4">Unit</th>
                <th className="px-4">Channel</th>
                <th className="px-4">Category</th>
                <th className="px-4">Product / Revenue</th>
                <th className="px-4">Gross</th>
                <th className="px-4">Discount</th>
                <th className="px-4">Net</th>
                <th className="px-4">Reference</th>
                <th className="px-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.map((record) => {
                const unit = units.find(
                  (entry) => entry.id === record.brand_unit_id,
                );

                return (
                  <tr key={record.id} className="rounded-2xl bg-white shadow-sm">
                    <td className="rounded-l-2xl px-4 py-4 text-sm font-bold text-slate-600">
                      {record.revenue_date}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-600">
                      {unit?.name || "No Unit"}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600">
                        {salesChannelLabels[record.sales_channel] ||
                          record.sales_channel}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-600">
                      {record.category}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-black text-slate-950">
                        {record.product_name}
                      </p>
                      {record.notes ? (
                        <p className="mt-1 max-w-[260px] text-xs font-bold text-slate-400">
                          {record.notes}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-sm font-black text-slate-950">
                      {formatCurrency(Number(record.gross_sales || 0))}
                    </td>
                    <td className="px-4 py-4 text-sm font-black text-slate-950">
                      {formatCurrency(Number(record.discount_amount || 0))}
                    </td>
                    <td className="px-4 py-4 text-sm font-black text-slate-950">
                      {formatCurrency(Number(record.net_revenue || 0))}
                    </td>
                    <td className="px-4 py-4 text-xs font-bold text-slate-500">
                      {record.source_reference || "-"}
                    </td>
                    <td className="rounded-r-2xl px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditRevenue(record)}
                          className="forza-button-hover inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"
                        >
                          <Edit3 size={14} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRevenue(record.id)}
                          className="forza-button-hover inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-2 text-xs font-black text-red-700"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="rounded-2xl bg-white px-4 py-8 text-center text-sm font-black text-slate-500"
                  >
                    No revenue records found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(226 232 240);
          background: rgba(255, 255, 255, 0.9);
          padding: 0.85rem 1rem;
          font-size: 0.875rem;
          font-weight: 800;
          color: rgb(15 23 42);
          outline: none;
          transition:
            border-color 150ms ease,
            background 150ms ease,
            box-shadow 150ms ease;
        }

        .input:focus {
          border-color: rgb(15 23 42);
          background: white;
          box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.08);
        }
      `}</style>
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
};

function MetricCard({ label, value, sub, icon }: MetricCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.9),transparent_35%)]" />
      <div className="relative z-10 mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl">
        {icon}
      </div>
      <p className="relative z-10 text-sm font-bold text-slate-500">{label}</p>
      <p className="relative z-10 mt-2 text-3xl font-black text-slate-950">
        {value}
      </p>
      <p className="relative z-10 mt-1 text-xs font-black uppercase tracking-wide text-slate-400">
        {sub}
      </p>
    </div>
  );
}

type MiniStatProps = {
  label: string;
  value: string;
};

function MiniStat({ label, value }: MiniStatProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

type FormFieldProps = {
  label: string;
  children: React.ReactNode;
};

function FormField({ label, children }: FormFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

type AnalysisCardProps = {
  title: string;
  icon: React.ReactNode;
  emptyText: string;
  children: React.ReactNode;
};

function AnalysisCard({ title, icon, emptyText, children }: AnalysisCardProps) {
  const hasChildren = Boolean(children);

  return (
    <section className="glass-panel rounded-[2.35rem] p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-slate-950">{title}</h2>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl">
          {icon}
        </div>
      </div>

      <div className="space-y-3">
        {hasChildren ? (
          children
        ) : (
          <div className="rounded-3xl bg-white/75 p-5 text-sm font-bold text-slate-500">
            {emptyText}
          </div>
        )}
      </div>
    </section>
  );
}

type ListRowProps = {
  title: string;
  subtitle: string;
  value: string;
};

function ListRow({ title, subtitle, value }: ListRowProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-sm font-bold text-slate-500">{subtitle}</p>
        </div>
        <p className="text-sm font-black text-slate-950">{value}</p>
      </div>
    </div>
  );
}