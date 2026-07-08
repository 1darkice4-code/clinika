import { createHash, randomBytes } from "crypto";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashNullable(value: string | null | undefined): string | null {
  return value ? sha256(value) : null;
}
