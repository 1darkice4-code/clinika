import { describe, expect, it } from "vitest";
import { addDays, dayLabel, firstFreeDay, freeLabel, summarizeDays } from "@/components/booking/nearest-days";

describe("nearest free days", () => {
  it("counts free slots per clinic day, ignoring taken ones", () => {
    const slots = [
      // 29 ноября 10:00 и 11:00 по Чите (UTC+9), одно занято
      { startsAtUtc: "2026-11-29T01:00:00.000Z", available: true },
      { startsAtUtc: "2026-11-29T02:00:00.000Z", available: false },
      // 30 ноября 08:30 по Чите — это ещё 29 ноября по UTC
      { startsAtUtc: "2026-11-29T23:30:00.000Z", available: true },
      { startsAtUtc: "2026-11-30T03:00:00.000Z", available: true }
    ];
    expect(summarizeDays(slots, "Asia/Chita", "2026-11-28", 4)).toEqual([
      { date: "2026-11-28", free: 0 },
      { date: "2026-11-29", free: 1 },
      { date: "2026-11-30", free: 2 },
      { date: "2026-12-01", free: 0 }
    ]);
  });

  it("finds the first day with free time", () => {
    expect(firstFreeDay([{ date: "2026-11-28", free: 0 }, { date: "2026-11-29", free: 3 }])).toBe("2026-11-29");
    expect(firstFreeDay([{ date: "2026-11-28", free: 0 }])).toBeNull();
  });

  it("formats labels in Russian", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(freeLabel(1)).toBe("1 окно");
    expect(freeLabel(3)).toBe("3 окна");
    expect(freeLabel(5)).toBe("5 окон");
    expect(freeLabel(12)).toBe("12 окон");
    expect(freeLabel(22)).toBe("22 окна");
    expect(freeLabel(0)).toBe("нет мест");
    expect(dayLabel("2026-11-29").weekday).toBe("вс");
  });
});
