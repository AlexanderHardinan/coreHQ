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

type CreateUserBody = {
  fullName?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  brandId?: string;
  unitIds?: string[];
};

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      message,
    },
    {
      status,
    },
  );
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function readBody(request: NextRequest): Promise<CreateUserBody | null> {
  try {
    return (await request.json()) as CreateUserBody;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonError("Unauthorized. Please sign in again.", 401);
    }

    const { data: currentProfile, error: profileLookupError } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profileLookupError) {
      return jsonError(profileLookupError.message, 400);
    }

    if (
      !currentProfile ||
      currentProfile.role !== "super_admin" ||
      currentProfile.is_active === false
    ) {
      return jsonError("Only Super Admin can create users.", 403);
    }

    const body = await readBody(request);

    if (!body) {
      return jsonError("Invalid request body.", 400);
    }

    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const role = String(body.role || "manager") as UserRole;
    const brandId = String(body.brandId || "").trim();
    const unitIds = Array.isArray(body.unitIds)
      ? body.unitIds.map((unitId) => String(unitId).trim()).filter(Boolean)
      : [];

    if (!fullName) {
      return jsonError("Full name is required.", 400);
    }

    if (!email || !isValidEmail(email)) {
      return jsonError("A valid email is required.", 400);
    }

    if (!password || password.length < 6) {
      return jsonError("Password must be at least 6 characters.", 400);
    }

    if (!allowedRoles.includes(role)) {
      return jsonError("A valid role is required.", 400);
    }

    if (!brandId) {
      return jsonError("Brand assignment is required.", 400);
    }

    if (unitIds.length === 0) {
      return jsonError("At least one branch unit access is required.", 400);
    }

    const admin = createSupabaseAdminClient();

    const { data: selectedBrand, error: brandError } = await admin
      .from("brands")
      .select("id, name, is_active")
      .eq("id", brandId)
      .eq("is_active", true)
      .maybeSingle();

    if (brandError) {
      return jsonError(brandError.message, 400);
    }

    if (!selectedBrand) {
      return jsonError("Selected brand was not found or is inactive.", 400);
    }

    const { data: selectedUnits, error: unitsError } = await admin
      .from("brand_units")
      .select("id, brand_id, name, is_active")
      .eq("brand_id", brandId)
      .eq("is_active", true)
      .in("id", unitIds);

    if (unitsError) {
      return jsonError(unitsError.message, 400);
    }

    if (!selectedUnits || selectedUnits.length !== unitIds.length) {
      return jsonError(
        "One or more selected branch units are invalid for this brand.",
        400,
      );
    }

    const { data: existingProfile, error: existingProfileError } = await admin
      .from("profiles")
      .select("id, email")
      .ilike("email", email)
      .maybeSingle();

    if (existingProfileError) {
      return jsonError(existingProfileError.message, 400);
    }

    if (existingProfile) {
      return jsonError("A user profile with this email already exists.", 409);
    }

    const { data: createdUser, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role,
        },
      });

    if (createError || !createdUser.user) {
      const message = createError?.message || "Failed to create auth user.";

      if (
        message.toLowerCase().includes("already") ||
        message.toLowerCase().includes("registered")
      ) {
        return jsonError(
          "This email already exists in Supabase Auth. Use another email or reset the existing user's password.",
          409,
        );
      }

      return jsonError(message, 400);
    }

    const createdUserId = createdUser.user.id;

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: createdUserId,
        full_name: fullName,
        email,
        avatar_url: null,
        role,
        is_active: true,
      },
      {
        onConflict: "id",
      },
    );

    if (profileError) {
      await admin.auth.admin.deleteUser(createdUserId);

      return jsonError(
        `Auth user was created, but profile creation failed: ${profileError.message}`,
        400,
      );
    }

    const accessRows = unitIds.map((unitId) => ({
      user_id: createdUserId,
      brand_unit_id: unitId,
    }));

    const { error: accessError } = await admin
      .from("user_unit_access")
      .upsert(accessRows, {
        onConflict: "user_id,brand_unit_id",
      });

    if (accessError) {
      await admin.from("profiles").delete().eq("id", createdUserId);
      await admin.auth.admin.deleteUser(createdUserId);

      return jsonError(
        `Auth user and profile were created, but branch access failed: ${accessError.message}`,
        400,
      );
    }

    return NextResponse.json({
      message: "User created successfully.",
      userId: createdUserId,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Unexpected server error while creating user.",
      500,
    );
  }
}