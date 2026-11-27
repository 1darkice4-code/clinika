import { fromZonedTime, toZonedTime } from "date-fns-tz";

export function localDateTimeToUtc(date: string, time: string, timezone: string): Date {
  return fromZonedTime(`${date}T${time}:00`, timezone);
}

export function utcToClinicDate(date: Date, timezone: string): Date {
  return toZonedTime(date, timezone);
}

export function formatDateInTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const part = (type: "year" | "month" | "day") => parts.find((item) => item.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");

  if (!year || !month || !day) {
    throw new Error(`Не удалось отформатировать дату для часового пояса ${timezone}`);
  }

  return `${year}-${month}-${day}`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) throw new Error(`Некорректная дата ${dateKey}`);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function nextDateInTimezone(now: Date, timezone: string): string {
  return addDaysToDateKey(formatDateInTimezone(now, timezone), 1);
}

/** Дата и время в часовом поясе клиники, напр. "07.07.2026, 16:00". */
export function formatClinicDateTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

/** Только дата в часовом поясе клиники, напр. "07.07.2026". */
export function formatClinicDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

export function minutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}
