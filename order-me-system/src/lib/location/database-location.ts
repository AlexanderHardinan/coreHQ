import "server-only";

import {
  requireOperationalSession,
} from "@/lib/auth/require-operational-session";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import type {
  OrderMeLocationCode,
} from "@/lib/location/session";

export type DatabaseLocation = {
  id: string;
  code: OrderMeLocationCode;
  name: "Forza" | "Fusion";
};

type LocationDatabaseRow = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
};

function normalizeDatabaseLocation(
  row: LocationDatabaseRow
): DatabaseLocation {
  if (
    row.code === "FOR" &&
    row.name === "Forza"
  ) {
    return {
      id: row.id,
      code: "FOR",
      name: "Forza",
    };
  }

  if (
    row.code === "FUS" &&
    row.name === "Fusion"
  ) {
    return {
      id: row.id,
      code: "FUS",
      name: "Fusion",
    };
  }

  throw new Error(
    "Database location does not match an authorized Order Me location."
  );
}

export async function requireDatabaseLocation(): Promise<DatabaseLocation> {
  // =======================================================
  // VERIFY APPLICATION + LOCATION SESSION
  // =======================================================

  const operationalLocation =
    await requireOperationalSession();

  // =======================================================
  // SERVER-ONLY SUPABASE CLIENT
  // =======================================================

  const supabase =
    createAdminClient();

  // =======================================================
  // RESOLVE TRUSTED LOCATION UUID
  // =======================================================

  const {
    data,
    error,
  } = await supabase
    .from("locations")
    .select(
      "id, code, name, is_active"
    )
    .eq(
      "code",
      operationalLocation.code
    )
    .eq(
      "is_active",
      true
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Order Me database location lookup failed:",
      error.message
    );

    throw new Error(
      "Unable to resolve the active operational location."
    );
  }

  if (!data) {
    throw new Error(
      `Active location ${operationalLocation.code} was not found in the database.`
    );
  }

  const location =
    normalizeDatabaseLocation(
      data as LocationDatabaseRow
    );

  // =======================================================
  // DEFENSIVE SESSION / DATABASE CONSISTENCY CHECK
  // =======================================================

  if (
    location.code !==
      operationalLocation.code ||
    location.name !==
      operationalLocation.name
  ) {
    throw new Error(
      "Operational location session does not match the database location."
    );
  }

  return location;
}