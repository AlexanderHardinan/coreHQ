import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  isSessionTokenValid,
  ORDER_ME_SESSION_COOKIE,
} from "@/lib/auth/session";

import {
  ORDER_ME_LOCATION_COOKIE,
  type OrderMeLocation,
  verifyLocationToken,
} from "@/lib/location/session";

export async function requireOperationalSession(): Promise<OrderMeLocation> {
  const cookieStore = await cookies();

  // =======================================================
  // VERIFY APPLICATION SESSION
  // =======================================================

  const sessionToken =
    cookieStore.get(
      ORDER_ME_SESSION_COOKIE
    )?.value;

  const hasValidSession =
    isSessionTokenValid(
      sessionToken
    );

  if (!hasValidSession) {
    redirect("/login");
  }

  // =======================================================
  // VERIFY ACTIVE LOCATION
  // =======================================================

  const locationToken =
    cookieStore.get(
      ORDER_ME_LOCATION_COOKIE
    )?.value;

  const activeLocation =
    verifyLocationToken(
      locationToken
    );

  if (!activeLocation) {
    redirect("/");
  }

  // =======================================================
  // AUTHORIZED OPERATIONAL CONTEXT
  // =======================================================

  return activeLocation;
}