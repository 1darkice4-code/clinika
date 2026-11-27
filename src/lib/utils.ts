import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(priceFrom?: number | null, priceExact?: number | null): string {
  if (priceExact === 0) return "Бесплатно";
  if (priceExact != null) return `${priceExact.toLocaleString("ru-RU")} ₽`;
  if (priceFrom != null) return `от ${priceFrom.toLocaleString("ru-RU")} ₽`;
  return "Цена по запросу";
}
