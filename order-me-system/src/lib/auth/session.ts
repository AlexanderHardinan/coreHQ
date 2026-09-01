import { createHmac, timingSafeEqual } from "node:crypto";

export const ORDER_ME_SESSION_COOKIE = "order_me_session";

export const ORDER_ME_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

const SESSION_VERSION = 1;
const CLOCK_TOLERANCE_SECONDS = 60 * 5;

export type OrderMeSessionPayload = {
  v: 1;
  iat: number;
  exp: number;
};

function getSessionSecret(): string {
  const secret = process.env.ORDER_ME_SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "Missing ORDER_ME_SESSION_SECRET environment variable."
    );
  }

  if (secret.length < 32) {
    throw new Error(
      "ORDER_ME_SESSION_SECRET must contain at least 32 characters."
    );
  }

  return secret;
}

function encodePayload(payload: OrderMeSessionPayload): string {
  return Buffer.from(
    JSON.stringify(payload),
    "utf8"
  ).toString("base64url");
}

function decodePayload(
  encodedPayload: string
): OrderMeSessionPayload | null {
  try {
    const raw = Buffer.from(
      encodedPayload,
      "base64url"
    ).toString("utf8");

    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed !== "object" ||
      parsed === null
    ) {
      return null;
    }

    const candidate = parsed as Partial<OrderMeSessionPayload>;

    if (candidate.v !== SESSION_VERSION) {
      return null;
    }

    if (
      typeof candidate.iat !== "number" ||
      !Number.isInteger(candidate.iat)
    ) {
      return null;
    }

    if (
      typeof candidate.exp !== "number" ||
      !Number.isInteger(candidate.exp)
    ) {
      return null;
    }

    if (candidate.exp <= candidate.iat) {
      return null;
    }

    return {
      v: SESSION_VERSION,
      iat: candidate.iat,
      exp: candidate.exp,
    };
  } catch {
    return null;
  }
}

function createSignature(encodedPayload: string): string {
  return createHmac(
    "sha256",
    getSessionSecret()
  )
    .update(encodedPayload)
    .digest("base64url");
}

function signaturesMatch(
  receivedSignature: string,
  expectedSignature: string
): boolean {
  try {
    const received = Buffer.from(
      receivedSignature,
      "base64url"
    );

    const expected = Buffer.from(
      expectedSignature,
      "base64url"
    );

    if (received.length !== expected.length) {
      return false;
    }

    return timingSafeEqual(
      received,
      expected
    );
  } catch {
    return false;
  }
}

export function createSessionToken(): string {
  const now = Math.floor(Date.now() / 1000);

  const payload: OrderMeSessionPayload = {
    v: SESSION_VERSION,
    iat: now,
    exp:
      now +
      ORDER_ME_SESSION_MAX_AGE_SECONDS,
  };

  const encodedPayload = encodePayload(payload);
  const signature = createSignature(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(
  token: string | null | undefined
): OrderMeSessionPayload | null {
  if (!token) {
    return null;
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, receivedSignature] = parts;

  if (
    !encodedPayload ||
    !receivedSignature
  ) {
    return null;
  }

  const expectedSignature =
    createSignature(encodedPayload);

  if (
    !signaturesMatch(
      receivedSignature,
      expectedSignature
    )
  ) {
    return null;
  }

  const payload =
    decodePayload(encodedPayload);

  if (!payload) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);

  if (payload.exp <= now) {
    return null;
  }

  if (
    payload.iat >
    now + CLOCK_TOLERANCE_SECONDS
  ) {
    return null;
  }

  return payload;
}

export function isSessionTokenValid(
  token: string | null | undefined
): boolean {
  return verifySessionToken(token) !== null;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: ORDER_ME_SESSION_MAX_AGE_SECONDS,
  };
}