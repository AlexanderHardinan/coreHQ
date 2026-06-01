import { redirect } from "next/navigation";
import {
  DashboardShell,
  type DashboardBrand,
} from "@/components/layout/dashboard-shell";
import {
  RecipeMakerPanel,
  type RecipeItemRecord,
  type RecipeProduct,
  type RecipeRecord,
  type RecipeUnit,
} from "@/components/recipe/recipe-maker-panel";
import { getAllowedModules, type UserRole } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type RecipeMakerPageProps = {
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

export default async function RecipeMakerPage({
  searchParams,
}: RecipeMakerPageProps) {
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
      "id, brand_id, brand_unit_id, ops_area, product_name, sku, unit, unit_cost, current_stock, is_active",
    )
    .eq("brand_id", selectedBrandId)
    .eq("is_active", true)
    .order("product_name", { ascending: true });

  const { data: recipesData } = await supabase
    .from("recipes")
    .select(
      "id, brand_id, brand_unit_id, ops_area, recipe_name, recipe_category, cuisine, calories, allergen, procedure, batch_yield, portion_yield, selling_price, food_cost_percent, total_recipe_cost, cost_per_portion, is_active",
    )
    .eq("brand_id", selectedBrandId)
    .eq("is_active", true)
    .order("recipe_name", { ascending: true });

  const recipeIds = ((recipesData || []) as RecipeRecord[]).map(
    (recipe) => recipe.id,
  );

  const { data: recipeItemsData } =
    recipeIds.length > 0
      ? await supabase
          .from("recipe_items")
          .select(
            "id, recipe_id, product_id, quantity, unit, waste_shrinkage_percent, unit_cost_snapshot, total_cost",
          )
          .in("recipe_id", recipeIds)
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
      <RecipeMakerPanel
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
        units={(unitsData || []) as RecipeUnit[]}
        products={(productsData || []) as RecipeProduct[]}
        recipes={(recipesData || []) as RecipeRecord[]}
        recipeItems={(recipeItemsData || []) as RecipeItemRecord[]}
      />
    </DashboardShell>
  );
}