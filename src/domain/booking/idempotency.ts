import { sha256 } from "@/lib/crypto";
import { ValidationError } from "@/lib/errors";

export function hashIdempotencyKey(key: string): string {
  const normalized = key.trim();
  if (normalized.length < 12 || normalized.length > 120) {
    throw new ValidationError("Некорректный ключ идемпотентности");
  }
  return sha256(normalized);
}
