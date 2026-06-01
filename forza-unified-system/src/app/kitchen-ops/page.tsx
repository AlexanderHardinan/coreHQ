import { redirect } from "next/navigation";
import {
  DashboardShell,
  type DashboardBrand,
} from "@/components/layout/dashboard-shell";
import {
  KitchenOpsPanel,
  type KitchenMovement,
  type KitchenProduct,
  type KitchenUnit,
} from "@/components/kitchen/kitchen-ops-panel";
import { getAllowedModules, type UserRole } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type KitchenOpsPageProps = {
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

export default async function KitchenOpsPage({
  searchParams,
}: KitchenOpsPageProps) {
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

  const { data: productsData } = await supabase
    .from("products")
    .select(
      "id, brand_id, brand_unit_id, category_id, ops_area, product_name, sku, unit, supplier_name, current_stock, minimum_stock, maximum_stock, unit_cost, expiry_date, is_active",
    )
    .eq("brand_id", selectedBrandId)
    .eq("ops_area", "kitchen")
    .eq("is_active", true)
    .order("product_name", { ascending: true });

  const products = (productsData || []) as KitchenProduct[];
  const productIds = products.map((product) => product.id);

  const { data: movementsData } =
    selectedBrandId && productIds.length > 0
      ? await supabase
          .from("inventory_movements")
          .select(
            "id, brand_id, brand_unit_id, product_id, ops_area, movement_type, quantity, unit_cost, reference_code, notes, movement_date, system_balance_after, physical_count_qty, discrepancy_qty, created_at",
          )
          .eq("brand_id", selectedBrandId)
          .eq("ops_area", "kitchen")
          .in("product_id", productIds)
          .order("movement_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(150)
      : { data: [] };

  return (
    <DashboardShell
      fullName={profile.full_name || user.email || "Forza User"}
      avatarUrl={profile.avatar_url || null}
      role={role}
      modules={modules}
      brands={brands}
      selectedBrand={selectedBrand}
    >
      <KitchenOpsPanel
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
        units={(unitsData || []) as KitchenUnit[]}
        products={products}
        movements={(movementsData || []) as KitchenMovement[]}
      />
    </DashboardShell>
  );
}