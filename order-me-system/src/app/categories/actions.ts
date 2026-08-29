"use server";

import { revalidatePath } from "next/cache";

import {
  requireDatabaseLocation,
} from "@/lib/location/database-location";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

export type CategoryRecord = {
  id: string;
  location_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CategoryActionResult = {
  success: boolean;
  message: string;
  category?: CategoryRecord;
};

const MAX_CATEGORY_NAME_LENGTH = 100;

// =========================================================
// HELPERS
// =========================================================

function normalizeCategoryName(
  value: FormDataEntryValue | null
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .replace(/\s+/g, " ");

  if (
    normalized.length === 0 ||
    normalized.length >
      MAX_CATEGORY_NAME_LENGTH
  ) {
    return null;
  }

  return normalized;
}

function normalizeCategoryId(
  value: FormDataEntryValue | null
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value.trim();

  if (!normalized) {
    return null;
  }

  return normalized;
}

function isUniqueViolation(
  code: string | undefined
): boolean {
  return code === "23505";
}

function isForeignKeyViolation(
  code: string | undefined
): boolean {
  return code === "23503";
}

function revalidateCategoryPages() {
  revalidatePath(
    "/categories"
  );

  revalidatePath(
    "/products"
  );

  revalidatePath(
    "/products/new"
  );
}

// =========================================================
// LIST CATEGORIES
// =========================================================

export async function getCategories(): Promise<
  CategoryRecord[]
> {
  const location =
    await requireDatabaseLocation();

  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from("categories")
    .select(
      `
        id,
        location_id,
        name,
        is_active,
        created_at,
        updated_at
      `
    )
    .eq(
      "location_id",
      location.id
    )
    .order(
      "name",
      {
        ascending: true,
      }
    );

  if (error) {
    console.error(
      "Order Me category list failed:",
      error.message
    );

    throw new Error(
      "Unable to load categories."
    );
  }

  return (
    data ??
    []
  ) as CategoryRecord[];
}

// =========================================================
// GET SINGLE CATEGORY
// =========================================================

export async function getCategoryById(
  categoryId: string
): Promise<CategoryRecord | null> {
  const location =
    await requireDatabaseLocation();

  const normalizedId =
    categoryId.trim();

  if (!normalizedId) {
    return null;
  }

  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from("categories")
    .select(
      `
        id,
        location_id,
        name,
        is_active,
        created_at,
        updated_at
      `
    )
    .eq(
      "id",
      normalizedId
    )
    .eq(
      "location_id",
      location.id
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Order Me category lookup failed:",
      error.message
    );

    throw new Error(
      "Unable to load category."
    );
  }

  return (
    data as CategoryRecord | null
  );
}

// =========================================================
// CREATE CATEGORY
// =========================================================

export async function createCategoryAction(
  _previousState: CategoryActionResult | null,
  formData: FormData
): Promise<CategoryActionResult> {
  try {
    const location =
      await requireDatabaseLocation();

    const categoryName =
      normalizeCategoryName(
        formData.get("name")
      );

    if (!categoryName) {
      return {
        success: false,
        message:
          "Enter a valid category name.",
      };
    }

    const supabase =
      createAdminClient();

    const {
      data,
      error,
    } = await supabase
      .from("categories")
      .insert({
        location_id:
          location.id,
        name:
          categoryName,
        is_active: true,
      })
      .select(
        `
          id,
          location_id,
          name,
          is_active,
          created_at,
          updated_at
        `
      )
      .single();

    if (error) {
      if (
        isUniqueViolation(
          error.code
        )
      ) {
        return {
          success: false,
          message:
            "This category already exists for the current location.",
        };
      }

      console.error(
        "Order Me category creation failed:",
        error.message
      );

      return {
        success: false,
        message:
          "Unable to create category. Please try again.",
      };
    }

    revalidateCategoryPages();

    return {
      success: true,
      message:
        "Category saved successfully.",
      category:
        data as CategoryRecord,
    };
  } catch (error) {
    console.error(
      "Order Me category creation failed:",
      error instanceof Error
        ? error.message
        : "Unknown category creation error"
    );

    return {
      success: false,
      message:
        "Unable to create category. Please try again.",
    };
  }
}

// =========================================================
// UPDATE CATEGORY
// =========================================================

export async function updateCategoryAction(
  _previousState: CategoryActionResult | null,
  formData: FormData
): Promise<CategoryActionResult> {
  try {
    const location =
      await requireDatabaseLocation();

    const categoryId =
      normalizeCategoryId(
        formData.get(
          "categoryId"
        )
      );

    const categoryName =
      normalizeCategoryName(
        formData.get("name")
      );

    if (!categoryId) {
      return {
        success: false,
        message:
          "Invalid category.",
      };
    }

    if (!categoryName) {
      return {
        success: false,
        message:
          "Enter a valid category name.",
      };
    }

    const supabase =
      createAdminClient();

    // =====================================================
    // VERIFY CATEGORY BELONGS TO ACTIVE LOCATION
    // =====================================================

    const {
      data:
        existingCategory,
      error:
        lookupError,
    } = await supabase
      .from("categories")
      .select(
        "id, location_id"
      )
      .eq(
        "id",
        categoryId
      )
      .eq(
        "location_id",
        location.id
      )
      .maybeSingle();

    if (lookupError) {
      console.error(
        "Order Me category update lookup failed:",
        lookupError.message
      );

      return {
        success: false,
        message:
          "Unable to update category. Please try again.",
      };
    }

    if (!existingCategory) {
      return {
        success: false,
        message:
          "Category was not found for the current location.",
      };
    }

    // =====================================================
    // UPDATE
    // =====================================================

    const {
      data,
      error,
    } = await supabase
      .from("categories")
      .update({
        name:
          categoryName,
      })
      .eq(
        "id",
        categoryId
      )
      .eq(
        "location_id",
        location.id
      )
      .select(
        `
          id,
          location_id,
          name,
          is_active,
          created_at,
          updated_at
        `
      )
      .single();

    if (error) {
      if (
        isUniqueViolation(
          error.code
        )
      ) {
        return {
          success: false,
          message:
            "This category name already exists for the current location.",
        };
      }

      console.error(
        "Order Me category update failed:",
        error.message
      );

      return {
        success: false,
        message:
          "Unable to update category. Please try again.",
      };
    }

    revalidateCategoryPages();

    return {
      success: true,
      message:
        "Category updated successfully.",
      category:
        data as CategoryRecord,
    };
  } catch (error) {
    console.error(
      "Order Me category update failed:",
      error instanceof Error
        ? error.message
        : "Unknown category update error"
    );

    return {
      success: false,
      message:
        "Unable to update category. Please try again.",
    };
  }
}

// =========================================================
// DELETE CATEGORY
// =========================================================

export async function deleteCategoryAction(
  categoryId: string
): Promise<CategoryActionResult> {
  try {
    const location =
      await requireDatabaseLocation();

    const normalizedId =
      categoryId.trim();

    if (!normalizedId) {
      return {
        success: false,
        message:
          "Invalid category.",
      };
    }

    const supabase =
      createAdminClient();

    // =====================================================
    // VERIFY CATEGORY BELONGS TO ACTIVE LOCATION
    // =====================================================

    const {
      data:
        existingCategory,
      error:
        lookupError,
    } = await supabase
      .from("categories")
      .select(
        `
          id,
          location_id,
          name
        `
      )
      .eq(
        "id",
        normalizedId
      )
      .eq(
        "location_id",
        location.id
      )
      .maybeSingle();

    if (lookupError) {
      console.error(
        "Order Me category delete lookup failed:",
        lookupError.message
      );

      return {
        success: false,
        message:
          "Unable to delete category. Please try again.",
      };
    }

    if (!existingCategory) {
      return {
        success: false,
        message:
          "Category was not found for the current location.",
      };
    }

    // =====================================================
    // DELETE
    // =====================================================

    const {
      error,
    } = await supabase
      .from("categories")
      .delete()
      .eq(
        "id",
        normalizedId
      )
      .eq(
        "location_id",
        location.id
      );

    if (error) {
      if (
        isForeignKeyViolation(
          error.code
        )
      ) {
        return {
          success: false,
          message:
            "This category cannot be deleted because it is currently used by one or more products.",
        };
      }

      console.error(
        "Order Me category deletion failed:",
        error.message
      );

      return {
        success: false,
        message:
          "Unable to delete category. Please try again.",
      };
    }

    revalidateCategoryPages();

    return {
      success: true,
      message: `"${existingCategory.name}" deleted successfully.`,
    };
  } catch (error) {
    console.error(
      "Order Me category deletion failed:",
      error instanceof Error
        ? error.message
        : "Unknown category deletion error"
    );

    return {
      success: false,
      message:
        "Unable to delete category. Please try again.",
    };
  }
}