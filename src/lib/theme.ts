export type Theme = "dark" | "light";

export const DAY_START_HOUR = 7;
export const NIGHT_START_HOUR = 20;
export const CLINIC_CHROME_COLOR = "#1b1d1e";
export const THEME_COLORS = { light: "#f4f1eb", dark: "#1a1714" } as const;

export function themeForHour(hour: number): Theme {
  return hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR ? "light" : "dark";
}

function hourInChita(now: Date): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Chita",
    hour: "2-digit",
    hourCycle: "h23"
  })
    .formatToParts(now)
    .find((part) => part.type === "hour")?.value;
  return Number(hour);
}

export function getAutomaticTheme(now = new Date()): Theme {
  const localHour = now.getHours();
  return themeForHour(Number.isFinite(localHour) ? localHour : hourInChita(now));
}
