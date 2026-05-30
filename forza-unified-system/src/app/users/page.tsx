import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { UsersAdminPanel } from "@/components/users/users-admin-panel";
import { getAllowedModules, type UserRole } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function UsersPage() {
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
    redirect("/dashboard");
  }

  const role = profile.role as UserRole;
  const modules = getAllowedModules(role);

  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .order("created_at", { ascending: false });

  return (
    <DashboardShell
      fullName={profile.full_name || user.email || "Super Admin"}
      avatarUrl={profile.avatar_url || null}
      role={role}
      modules={modules}
    >
      <UsersAdminPanel users={(users || []) as never} />
    </DashboardShell>
  );
}