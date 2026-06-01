import { redirect } from "next/navigation";
import {
  DashboardShell,
  type DashboardBrand,
} from "@/components/layout/dashboard-shell";
import {
  SalesPerformancePanel,
  type SalesRecipe,
  type SalesUnit,
  type SoldItemRecord,
} from "@/components/sales/sales-performance-panel";
import { getAllowedModules, type UserRole } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type SalesPerformancePageProps = {
  searchParams?: Promise<{
    brand?: string;
  }>;
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

  const { data: recipesData } = await supabase
    .from("recipes")
    .select(
      "id, brand_id, brand_unit_id, ops_area, recipe_name, recipe_category, selling_price, cost_per_portion, is_active",
    )
    .eq("brand_id", selectedBrandId)
    .eq("is_active", true)
    .order("recipe_name", { ascending: true });

  const { data: soldItemsData } = await supabase
    .from("sold_items")
    .select(
      "id, sale_id, brand_id, brand_unit_id, recipe_id, product_id, ops_area, item_name, quantity, selling_price, total_sales, sold_date, created_by, created_at",
    )
    .eq("brand_id", selectedBrandId)
    .order("sold_date", { ascending: false })
    .limit(500);

  return (
    <DashboardShell
      fullName={profile.full_name || user.email || "Forza User"}
      avatarUrl={profile.avatar_url || null}
      role={role}
      modules={modules}
      brands={brands}
      selectedBrand={selectedBrand}
    >
      <SalesPerformancePanel
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
        recipes={(recipesData || []) as SalesRecipe[]}
        soldItems={(soldItemsData || []) as SoldItemRecord[]}
      />
    </DashboardShell>
  );
}