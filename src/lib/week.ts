// Helpers for the weekly calendar. Calendar dates are handled as `YYYY-MM-DD`
// keys in the clinic timezone; times are projected from UTC into that timezone.

/** Today's calendar date (YYYY-MM-DD) in the given timezone. */
export function clinicTodayKey(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

/** Calendar date (YYYY-MM-DD) of a UTC instant in the given timezone. */
export function zonedDayKey(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

/** Minutes since local midnight of a UTC instant in the given timezone. */
export function zonedMinutes(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Weekday of a calendar date key: Monday = 1 … Sunday = 7. */
export function weekdayOfKey(key: string): number {
  const weekday = new Date(`${key}T12:00:00.000Z`).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

/** Shift a calendar date key by `days` (can be negative). */
export function addDaysKey(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Monday of the week containing the given date key. */
export function mondayOfWeek(key: string): string {
  return addDaysKey(key, -(weekdayOfKey(key) - 1));
}

/** The 7 date keys Monday…Sunday for a week identified by its Monday. */
export function weekDateKeys(mondayKey: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDaysKey(mondayKey, index));
}

/**
 * Resolve the `week` query param to the Monday of the target week.
 * Falls back to the current week in the clinic timezone.
 */
export function resolveWeekMonday(weekParam: string | undefined, timezone: string): string {
  const base = weekParam && isDateKey(weekParam) ? weekParam : clinicTodayKey(timezone);
  return mondayOfWeek(base);
}

/** Short day heading, e.g. "пн, 7 июл". */
export function formatDayHeading(key: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(new Date(`${key}T12:00:00.000Z`));
}

/** Human week range for the header, e.g. "7 – 13 июля 2026". */
export function formatWeekRange(mondayKey: string, sundayKey: string): string {
  const monday = new Date(`${mondayKey}T12:00:00.000Z`);
  const sunday = new Date(`${sundayKey}T12:00:00.000Z`);
  const dayMonth = new Intl.DateTimeFormat("ru-RU", { timeZone: "UTC", day: "numeric", month: "long" });
  const withYear = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  return `${dayMonth.format(monday)} – ${withYear.format(sunday)}`;
}

/** Format minutes-since-midnight as HH:MM. */
export function formatMinutes(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
