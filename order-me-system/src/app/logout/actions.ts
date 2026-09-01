"use server";

import { cookies } from "next/headers";

import {
  ORDER_ME_SESSION_COOKIE,
} from "@/lib/auth/session";

import {
  ORDER_ME_LOCATION_COOKIE,
} from "@/lib/location/session";

export type LogoutActionResult = {
  success: boolean;
  message: string;
};

export async function logoutAction(): Promise<LogoutActionResult> {
  try {
    const cookieStore = await cookies();

    // =====================================================
    // CLEAR ACTIVE LOCATION
    // =====================================================

    cookieStore.delete(
      ORDER_ME_LOCATION_COOKIE
    );

    // =====================================================
    // CLEAR MAIN APPLICATION SESSION
    // =====================================================

    cookieStore.delete(
      ORDER_ME_SESSION_COOKIE
    );

    // =====================================================
    // SUCCESS
    // =====================================================

    return {
      success: true,
      message: "Session Locked",
    };
  } catch (error) {
    console.error(
      "Order Me logout failed:",
      error instanceof Error
        ? error.message
        : "Unknown logout error"
    );

    return {
      success: false,
      message:
        "Unable to log out. Please try again.",
    };
  }
}