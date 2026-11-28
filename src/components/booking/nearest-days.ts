/** Сводка свободного времени по дням для быстрого выбора даты в записи. */
export type DaySummary = { date: string; free: number };

export function dateKeyInTimezone(date: Date, timezone: string) {
  // en-CA даёт формат YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function summarizeDays(
  slots: readonly { startsAtUtc: string; available: boolean }[],
  timezone: string,
  from: string,
  days: number
): DaySummary[] {
  const free = new Map<string, number>();
  for (const slot of slots) {
    if (!slot.available) continue;
    const key = dateKeyInTimezone(new Date(slot.startsAtUtc), timezone);
    free.set(key, (free.get(key) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(from, index);
    return { date, free: free.get(date) ?? 0 };
  });
}

export function firstFreeDay(summary: readonly DaySummary[]) {
  return summary.find((day) => day.free > 0)?.date ?? null;
}

const weekday = new Intl.DateTimeFormat("ru-RU", { weekday: "short", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" });

/** «пт», «29 нояб.» — для подписи кнопки дня. */
export function dayLabel(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  return { weekday: weekday.format(date).replace(".", ""), date: dayMonth.format(date).replace(".", "") };
}

export function freeLabel(count: number) {
  if (count === 0) return "нет мест";
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word = mod10 === 1 && mod100 !== 11 ? "окно" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "окна" : "окон";
  return `${count} ${word}`;
}
