import { redirect } from "next/navigation";
import {
  DashboardShell,
  type DashboardBrand,
} from "@/components/layout/dashboard-shell";
import {
  BrandManagementPanel,
  type BrandCategoryRecord,
  type BrandGroupRecord,
  type BrandRecord,
  type BrandUnitRecord,
} from "@/components/settings/brand-management-panel";
import { getAllowedModules, type UserRole } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type BrandManagementPageProps = {
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

export default async function BrandManagementPage({
  searchParams,
}: BrandManagementPageProps) {
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

  if (profile.role !== "super_admin") {
    redirect(`/dashboard?brand=${requestedBrandCode}`);
  }

  const role = profile.role as UserRole;
  const modules = getAllowedModules(role);

  const { data: brandsData } = await supabase
    .from("brands")
    .select("id, name, code, description, icon, is_active")
    .order("name", { ascending: true });

  const brands = ((brandsData || []) as BrandRecord[]).sort((a, b) => {
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

  const { data: groupsData } = await supabase
    .from("brand_groups")
    .select("id, brand_id, name, code, description, icon, sort_order, is_active")
    .order("sort_order", { ascending: true });

  const { data: categoriesData } = await supabase
    .from("brand_categories")
    .select(
      "id, brand_id, brand_group_id, name, code, description, icon, sort_order, is_active",
    )
    .order("sort_order", { ascending: true });

  const { data: unitsData } = await supabase
    .from("brand_units")
    .select("id, brand_id, name, code, address, city, country, is_active")
    .order("name", { ascending: true });

  return (
    <DashboardShell
      fullName={profile.full_name || user.email || "Super Admin"}
      avatarUrl={profile.avatar_url || null}
      role={role}
      modules={modules}
      brands={brands as DashboardBrand[]}
      selectedBrand={selectedBrand as DashboardBrand | null}
    >
      <BrandManagementPanel
        brands={brands}
        groups={(groupsData || []) as BrandGroupRecord[]}
        categories={(categoriesData || []) as BrandCategoryRecord[]}
        units={(unitsData || []) as BrandUnitRecord[]}
        selectedBrandCode={selectedBrand?.code || requestedBrandCode}
      />
    </DashboardShell>
  );
}