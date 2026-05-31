import { redirect } from "next/navigation";
import {
  DashboardShell,
  type DashboardBrand,
} from "@/components/layout/dashboard-shell";
import {
  InventoryPanel,
  type InventoryCategory,
  type InventoryProduct,
  type InventoryUnit,
  type OpsArea,
} from "@/components/inventory/inventory-panel";
import { getAllowedModules, type UserRole } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type InventoryPageProps = {
  searchParams?: Promise<{
    brand?: string;
    unit?: string;
    area?: string;
  }>;
};

function normalizeBrandCode(value: string | undefined) {
  const brand = String(value || "FORZA").trim().toUpperCase();

  if (brand === "FUSION") {
    return "FUSION";
  }

  return "FORZA";
}

function normalizeOpsArea(value: string | undefined, role: UserRole): OpsArea {
  const area = String(value || "").trim().toLowerCase();

  if (role === "boh_staff") {
    return "kitchen";
  }

  if (role === "foh_staff") {
    return "bar";
  }

  if (area === "bar") {
    return "bar";
  }

  if (area === "global") {
    return "global";
  }

  return "kitchen";
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
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
  const requestedArea = normalizeOpsArea(resolvedSearchParams?.area, role);

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
    .select("id, brand_id, name, code, city, country, is_active")
    .eq("brand_id", selectedBrandId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  const units = (unitsData || []) as InventoryUnit[];

  const requestedUnitId = String(resolvedSearchParams?.unit || "").trim();

  const selectedUnit =
    units.find((unit) => unit.id === requestedUnitId) || units[0] || null;

  const { data: categoriesData } = await supabase
    .from("product_categories")
    .select("id, brand_id, brand_unit_id, ops_area, name, icon, is_active")
    .eq("brand_id", selectedBrandId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  const { data: productsData } = await supabase
    .from("products")
    .select(
      "id, brand_id, brand_unit_id, category_id, ops_area, product_name, sku, unit, supplier_name, opening_stock, current_stock, minimum_stock, maximum_stock, unit_cost, expiry_date, storage_area, is_active",
    )
    .eq("brand_id", selectedBrandId)
    .eq("is_active", true)
    .order("product_name", { ascending: true });

  return (
    <DashboardShell
      fullName={profile.full_name || user.email || "Forza User"}
      avatarUrl={profile.avatar_url || null}
      role={role}
      modules={modules}
      brands={brands}
      selectedBrand={selectedBrand}
    >
      <InventoryPanel
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
        units={units}
        categories={(categoriesData || []) as InventoryCategory[]}
        products={(productsData || []) as InventoryProduct[]}
        initialUnitId={selectedUnit?.id || ""}
        initialOpsArea={requestedArea}
      />
    </DashboardShell>
  );
}