import { redirect } from "next/navigation";
import {
  DashboardShell,
  type DashboardBrand,
} from "@/components/layout/dashboard-shell";
import {
  UsersAdminPanel,
  type BrandUnitOption,
  type ExistingUser,
  type UserUnitAccessRecord,
} from "@/components/users/users-admin-panel";
import { getAllowedModules, type UserRole } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type UsersPageProps = {
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

export default async function UsersPage({ searchParams }: UsersPageProps) {
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

  if (
    !profile ||
    profile.is_active === false ||
    profile.role !== "super_admin"
  ) {
    redirect(`/dashboard?brand=${requestedBrandCode}`);
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

  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active")
    .order("created_at", { ascending: false });

  const { data: units } = await supabase
    .from("brand_units")
    .select("id, brand_id, name, code, city, country, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const { data: access } = await supabase
    .from("user_unit_access")
    .select("id, user_id, brand_unit_id");

  return (
    <DashboardShell
      fullName={profile.full_name || user.email || "Super Admin"}
      avatarUrl={profile.avatar_url || null}
      role={role}
      modules={modules}
      brands={brands}
      selectedBrand={selectedBrand}
    >
      <UsersAdminPanel
        users={(users || []) as ExistingUser[]}
        brands={brands}
        units={(units || []) as BrandUnitOption[]}
        userUnitAccess={(access || []) as UserUnitAccessRecord[]}
        selectedBrandCode={selectedBrand?.code || requestedBrandCode}
      />
    </DashboardShell>
  );
}