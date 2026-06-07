// File name: src/app/sales-performance/page.tsx

import type { ComponentType } from "react";
import { redirect } from "next/navigation";
import {
  DashboardShell,
  type DashboardBrand,
} from "@/components/layout/dashboard-shell";
import {
  SalesPerformancePanel,
  type SalesRevenueRecord,
  type SalesUnit,
} from "@/components/sales/sales-performance-panel";
import { getAllowedModules, type UserRole } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type SalesPerformancePageProps = {
  searchParams?: Promise<{
    brand?: string;
  }>;
};

type SalesOpsArea = "kitchen" | "bar" | "global";

type SalesRecipe = {
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

type SalesRecipeItem = {
  id: string;
  recipe_id: string;
  product_id: string;
  quantity: number;
  unit: string;
  unit_cost_snapshot: number;
  total_cost: number;
};

type SalesProduct = {
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

type RecipeSaleRecord = {
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

function normalizeBrandCode(value: string | undefined) {
  const brand = String(value || "FORZA").trim().toUpperCase();

  if (brand === "FUSION") {
    return "FUSION";
  }

  return "FORZA";
}

export default async function SalesPerformancePage({
  searchParams,
}: SalesPerformancePageProps) {
  const resolvedSearchParams = await searchParams;
  const requestedBrandCode = normalizeBrandCode(resolvedSearchParams?.brand);

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.is_active === false) {
    redirect("/sign-in");
  }

  const role = profile.role as UserRole;
  const modules = getAllowedModules(role);

  const { data: brandsData } = await supabase
    .from("brands")
    .select("id, name, code, description, icon")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const brands = ((brandsData || []) as DashboardBrand[]).sort((a, b) => {
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

  const selectedBrand =
    brands.find((brand) => brand.code === requestedBrandCode) ||
    brands.find((brand) => brand.code === "FORZA") ||
    brands[0] ||
    null;

  const selectedBrandId = selectedBrand?.id || "";

  const { data: unitsData } = await supabase
    .from("brand_units")
    .select("id, brand_id, name, code, is_active")
    .eq("brand_id", selectedBrandId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  const { data: salesRevenueData } = await supabase
    .from("sales_revenue")
    .select(
      "id, brand_id, brand_unit_id, revenue_date, revenue_month, sales_channel, category, product_name, gross_sales, discount_amount, service_charge, tax_amount, net_revenue, notes, source_reference, is_active, created_by, created_at, updated_at",
    )
    .eq("brand_id", selectedBrandId)
    .eq("is_active", true)
    .order("revenue_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);

  const { data: recipesData } = selectedBrandId
    ? await supabase
        .from("recipes")
        .select(
          "id, brand_id, brand_unit_id, ops_area, recipe_name, recipe_category, batch_yield, portion_yield, selling_price, food_cost_percent, total_recipe_cost, cost_per_portion, is_active",
        )
        .eq("brand_id", selectedBrandId)
        .eq("is_active", true)
        .order("recipe_name", { ascending: true })
    : { data: [] };

  const recipes = (recipesData || []) as SalesRecipe[];
  const recipeIds = recipes.map((recipe) => recipe.id);

  const { data: recipeItemsData } =
    recipeIds.length > 0
      ? await supabase
          .from("recipe_items")
          .select(
            "id, recipe_id, product_id, quantity, unit, unit_cost_snapshot, total_cost",
          )
          .in("recipe_id", recipeIds)
      : { data: [] };

  const { data: productsData } = selectedBrandId
    ? await supabase
        .from("products")
        .select(
          "id, brand_id, brand_unit_id, ops_area, product_name, sku, unit, unit_cost, current_stock, is_active",
        )
        .eq("brand_id", selectedBrandId)
        .eq("is_active", true)
        .order("product_name", { ascending: true })
    : { data: [] };

  const { data: recipeSalesData } = selectedBrandId
    ? await supabase
        .from("recipe_sales")
        .select(
          "id, brand_id, brand_unit_id, recipe_id, ops_area, quantity, selling_price, gross_sales, discount_amount, net_sales, sold_date, source, source_reference, notes, is_active, created_by, created_at, updated_at",
        )
        .eq("brand_id", selectedBrandId)
        .eq("is_active", true)
        .order("sold_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500)
    : { data: [] };

  const SalesPanel = SalesPerformancePanel as ComponentType<{
    userId: string;
    role: UserRole;
    selectedBrand: {
      id: string;
      name: string;
      code: string;
    } | null;
    units: SalesUnit[];
    salesRevenue: SalesRevenueRecord[];
    recipes: SalesRecipe[];
    recipeItems: SalesRecipeItem[];
    products: SalesProduct[];
    recipeSales: RecipeSaleRecord[];
  }>;

  return (
    <DashboardShell
      fullName={profile.full_name || user.email || "Forza User"}
      avatarUrl={profile.avatar_url || null}
      role={role}
      modules={modules}
      brands={brands}
      selectedBrand={selectedBrand}
    >
      <SalesPanel
        key={`${selectedBrandId}-${requestedBrandCode}`}
        userId={user.id}
        role={role}
        selectedBrand={
          selectedBrand
            ? {
                id: selectedBrand.id,
                name: selectedBrand.name,
                code: selectedBrand.code,
              }
            : null
        }
        units={(unitsData || []) as SalesUnit[]}
        salesRevenue={(salesRevenueData || []) as SalesRevenueRecord[]}
        recipes={recipes}
        recipeItems={(recipeItemsData || []) as SalesRecipeItem[]}
        products={(productsData || []) as SalesProduct[]}
        recipeSales={(recipeSalesData || []) as RecipeSaleRecord[]}
      />
    </DashboardShell>
  );
}