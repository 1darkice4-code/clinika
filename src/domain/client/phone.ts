import { ValidationError } from "@/lib/errors";

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("8")) {
    return `+7${digits.slice(1)}`;
  }

  if (digits.length === 11 && digits.startsWith("7")) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+7${digits}`;
  }

  if (phone.trim().startsWith("+") && digits.length >= 11 && digits.length <= 15) {
    return `+${digits}`;
  }

  throw new ValidationError("Укажите корректный телефон");
}

export function maskPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  return `${normalized.slice(0, 3)}***${normalized.slice(-2)}`;
}
