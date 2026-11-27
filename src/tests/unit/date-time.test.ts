import { describe, expect, it } from "vitest";
import { addDaysToDateKey, formatDateInTimezone, nextDateInTimezone } from "@/lib/date-time";

describe("formatDateInTimezone", () => {
  it("uses the clinic timezone date instead of the UTC date", () => {
    const date = new Date("2026-07-05T17:30:00.000Z");

    expect(formatDateInTimezone(date, "Asia/Chita")).toBe("2026-07-06");
    expect(formatDateInTimezone(date, "Europe/Moscow")).toBe("2026-07-05");
  });
});

describe("nextDateInTimezone", () => {
  it("returns the next clinic calendar day across UTC and month boundaries", () => {
    const now = new Date("2026-07-31T16:30:00.000Z");

    expect(nextDateInTimezone(now, "Asia/Chita")).toBe("2026-08-02");
    expect(nextDateInTimezone(now, "Europe/Moscow")).toBe("2026-08-01");
    expect(addDaysToDateKey("2026-12-31", 1)).toBe("2027-01-01");
  });
});
