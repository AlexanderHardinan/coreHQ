"use server";

import { cookies } from "next/headers";

import {
  createSessionToken,
  getSessionCookieOptions,
  ORDER_ME_SESSION_COOKIE,
} from "@/lib/auth/session";

import { verifyOrderMePassword } from "@/lib/auth/password";

const MINIMUM_RESPONSE_TIME_MS = 500;

type LoginActionResult = {
  success: boolean;
  message: string;
};

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export async function loginAction(
  _previousState: LoginActionResult | null,
  formData: FormData
): Promise<LoginActionResult> {
  const startedAt = Date.now();

  try {
    const rawPassword = formData.get("password");

    if (typeof rawPassword !== "string") {
      await ensureMinimumResponseTime(startedAt);

      return {
        success: false,
        message: "Invalid password.",
      };
    }

    const password = rawPassword.trim();

    if (
      password.length === 0 ||
      password.length > 256
    ) {
      await ensureMinimumResponseTime(startedAt);

      return {
        success: false,
        message: "Invalid password.",
      };
    }

    const isValid =
      verifyOrderMePassword(password);

    if (!isValid) {
      await ensureMinimumResponseTime(startedAt);

      return {
        success: false,
        message: "Invalid password.",
      };
    }

    const sessionToken =
      createSessionToken();

    const cookieStore =
      await cookies();

    cookieStore.set(
      ORDER_ME_SESSION_COOKIE,
      sessionToken,
      getSessionCookieOptions()
    );

    await ensureMinimumResponseTime(startedAt);

    return {
      success: true,
      message: "Access Granted",
    };
  } catch (error) {
    console.error(
      "Order Me login action failed:",
      error instanceof Error
        ? error.message
        : "Unknown login error"
    );

    await ensureMinimumResponseTime(startedAt);

    return {
      success: false,
      message: "Unable to sign in. Please try again.",
    };
  }
}

async function ensureMinimumResponseTime(
  startedAt: number
): Promise<void> {
  const elapsed =
    Date.now() - startedAt;

  const remaining =
    MINIMUM_RESPONSE_TIME_MS - elapsed;

  if (remaining > 0) {
    await wait(remaining);
  }
}