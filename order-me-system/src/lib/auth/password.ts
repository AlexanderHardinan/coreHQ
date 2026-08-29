import { timingSafeEqual } from "node:crypto";

function getConfiguredPassword(): string {
  const password = process.env.ORDER_ME_PASSWORD;

  if (!password) {
    throw new Error(
      "Missing ORDER_ME_PASSWORD environment variable."
    );
  }

  return password;
}

function toBuffer(value: string): Buffer {
  return Buffer.from(value, "utf8");
}

export function verifyOrderMePassword(
  submittedPassword: string
): boolean {
  if (
    typeof submittedPassword !== "string" ||
    submittedPassword.length === 0
  ) {
    return false;
  }

  const configuredPassword =
    getConfiguredPassword();

  const submittedBuffer =
    toBuffer(submittedPassword);

  const configuredBuffer =
    toBuffer(configuredPassword);

  if (
    submittedBuffer.length !==
    configuredBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    submittedBuffer,
    configuredBuffer
  );
}