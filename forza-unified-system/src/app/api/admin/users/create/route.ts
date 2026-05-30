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

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { message: "Unauthorized." },
      { status: 401 },
    );
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
      { message: "Only Super Admin can create users." },
      { status: 403 },
    );
  }

  const body = await request.json();

  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const role = String(body.role || "manager") as UserRole;

  if (!fullName || !email || !password || !allowedRoles.includes(role)) {
    return NextResponse.json(
      { message: "Full name, email, password, and valid role are required." },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { message: "Password must be at least 6 characters." },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();

  const { data: createdUser, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

  if (createError || !createdUser.user) {
    return NextResponse.json(
      { message: createError?.message || "Failed to create user." },
      { status: 400 },
    );
  }

  const { data: mainUnit } = await admin
    .from("brand_units")
    .select("id")
    .eq("code", "MAIN")
    .maybeSingle();

  const { error: profileError } = await admin.from("profiles").upsert({
    id: createdUser.user.id,
    full_name: fullName,
    avatar_url: null,
    role,
    is_active: true,
  });

  if (profileError) {
    return NextResponse.json(
      { message: profileError.message },
      { status: 400 },
    );
  }

  if (mainUnit?.id) {
    const { error: accessError } = await admin
      .from("user_unit_access")
      .upsert({
        user_id: createdUser.user.id,
        brand_unit_id: mainUnit.id,
      });

    if (accessError) {
      return NextResponse.json(
        { message: accessError.message },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({
    message: "User created successfully.",
    userId: createdUser.user.id,
  });
}