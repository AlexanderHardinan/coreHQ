import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { UserRole } from "@/lib/auth/permissions";

const allowedRoles: UserRole[] = [
  "boh_staff",
  "foh_staff",
  "manager",
  "super_admin",
];

type UpdateUserBody = {
  userId?: string;
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
  brandId?: string;
  unitIds?: string[];
};

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !currentProfile ||
    currentProfile.role !== "super_admin" ||
    currentProfile.is_active === false
  ) {
    return NextResponse.json(
      { message: "Only Super Admin can update users." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as UpdateUserBody;

  const targetUserId = String(body.userId || "").trim();
  const fullName = String(body.fullName || "").trim();
  const role = String(body.role || "manager") as UserRole;
  const isActive = Boolean(body.isActive);
  const unitIds = Array.isArray(body.unitIds) ? body.unitIds : [];

  if (!targetUserId || !fullName || !allowedRoles.includes(role)) {
    return NextResponse.json(
      { message: "User, full name, and valid role are required." },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: fullName,
      role,
      is_active: isActive,
    })
    .eq("id", targetUserId);

  if (profileError) {
    return NextResponse.json({ message: profileError.message }, { status: 400 });
  }

  const { error: deleteAccessError } = await admin
    .from("user_unit_access")
    .delete()
    .eq("user_id", targetUserId);

  if (deleteAccessError) {
    return NextResponse.json(
      { message: deleteAccessError.message },
      { status: 400 },
    );
  }

  if (unitIds.length > 0) {
    const accessRows = unitIds.map((unitId) => ({
      user_id: targetUserId,
      brand_unit_id: unitId,
    }));

    const { error: accessError } = await admin
      .from("user_unit_access")
      .upsert(accessRows, {
        onConflict: "user_id,brand_unit_id",
      });

    if (accessError) {
      return NextResponse.json(
        { message: accessError.message },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({
    message: "User updated successfully.",
    userId: targetUserId,
  });
}