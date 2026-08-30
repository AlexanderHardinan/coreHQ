"use server";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  requireDatabaseLocation,
} from "@/lib/location/database-location";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

// =========================================================
// TYPES
// =========================================================

export type DashboardMetrics = {
  products: number;
  recipes: number;
  normalOrders: number;
  productionOrders: number;
  updatedAt: string;
};

// =========================================================
// COUNT LOCATION-SCOPED ROWS
// =========================================================

async function countLocationRows(
  supabase: SupabaseClient,
  table:
    | "products"
    | "production_recipes"
    | "normal_orders"
    | "production_orders",
  locationId: string
): Promise<number> {
  const {
    count,
    error,
  } = await supabase
    .from(table)
    .select(
      "id",
      {
        count:
          "exact",

        head:
          true,
      }
    )
    .eq(
      "location_id",
      locationId
    );

  if (error) {
    console.error(
      `Order Me dashboard count failed for ${table}:`,
      error.message
    );

    throw new Error(
      "Unable to load dashboard operational data."
    );
  }

  return count ?? 0;
}

// =========================================================
// GET DASHBOARD METRICS
// =========================================================
//
// SECURITY:
//
// The active database location is resolved from the signed
// operational session.
//
// The browser does not provide or control location_id.
//
// All database access uses the trusted server-side Supabase
// admin client and remains explicitly location scoped.
// =========================================================

export async function getDashboardMetricsAction():
  Promise<DashboardMetrics> {
  const location =
    await requireDatabaseLocation();

  const supabase =
    createAdminClient();

  const [
    products,
    recipes,
    normalOrders,
    productionOrders,
  ] =
    await Promise.all([
      countLocationRows(
        supabase,
        "products",
        location.id
      ),

      countLocationRows(
        supabase,
        "production_recipes",
        location.id
      ),

      countLocationRows(
        supabase,
        "normal_orders",
        location.id
      ),

      countLocationRows(
        supabase,
        "production_orders",
        location.id
      ),
    ]);

  return {
    products,
    recipes,
    normalOrders,
    productionOrders,

    updatedAt:
      new Date().toISOString(),
  };
}