import { describe, expect, it } from "vitest";
import { formatDateInTimezone } from "@/lib/date-time";

describe("formatDateInTimezone", () => {
  it("uses the clinic timezone date instead of the UTC date", () => {
    const date = new Date("2026-07-05T17:30:00.000Z");

    expect(formatDateInTimezone(date, "Asia/Chita")).toBe("2026-07-06");
    expect(formatDateInTimezone(date, "Europe/Moscow")).toBe("2026-07-05");
  });
});
