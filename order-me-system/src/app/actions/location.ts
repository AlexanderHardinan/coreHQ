"use server";

import { cookies } from "next/headers";

import {
  isSessionTokenValid,
  ORDER_ME_SESSION_COOKIE,
} from "@/lib/auth/session";

import {
  createLocationToken,
  getLocationByCode,
  getLocationCookieOptions,
  ORDER_ME_LOCATION_COOKIE,
} from "@/lib/location/session";

export type SelectLocationActionResult = {
  success: boolean;
  message: string;
  locationCode?: "FOR" | "FUS";
  locationName?: "Forza" | "Fusion";
};

export async function selectLocationAction(
  _previousState: SelectLocationActionResult | null,
  formData: FormData
): Promise<SelectLocationActionResult> {
  try {
    const cookieStore = await cookies();

    // =====================================================
    // VERIFY MAIN APPLICATION SESSION
    // =====================================================

    const sessionToken =
      cookieStore.get(
        ORDER_ME_SESSION_COOKIE
      )?.value;

    if (
      !isSessionTokenValid(
        sessionToken
      )
    ) {
      cookieStore.delete(
        ORDER_ME_LOCATION_COOKIE
      );

      return {
        success: false,
        message:
          "Your session has expired. Please sign in again.",
      };
    }

    // =====================================================
    // READ LOCATION
    // =====================================================

    const rawLocationCode =
      formData.get("locationCode");

    if (
      typeof rawLocationCode !==
      "string"
    ) {
      return {
        success: false,
        message:
          "Invalid location selection.",
      };
    }

    const locationCode =
      rawLocationCode
        .trim()
        .toUpperCase();

    // =====================================================
    // VALIDATE LOCATION
    // =====================================================

    const location =
      getLocationByCode(
        locationCode
      );

    if (!location) {
      return {
        success: false,
        message:
          "Invalid location selection.",
      };
    }

    // =====================================================
    // CREATE SIGNED LOCATION SESSION
    // =====================================================

    const locationToken =
      createLocationToken(
        location.code
      );

    cookieStore.set(
      ORDER_ME_LOCATION_COOKIE,
      locationToken,
      getLocationCookieOptions()
    );

    // =====================================================
    // SUCCESS
    // =====================================================

    return {
      success: true,
      message: `${location.name} selected.`,
      locationCode:
        location.code,
      locationName:
        location.name,
    };
  } catch (error) {
    console.error(
      "Order Me location selection failed:",
      error instanceof Error
        ? error.message
        : "Unknown location selection error"
    );

    return {
      success: false,
      message:
        "Unable to select location. Please try again.",
    };
  }
}