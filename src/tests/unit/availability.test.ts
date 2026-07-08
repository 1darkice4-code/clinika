import { describe, expect, it } from "vitest";
import { calculateAvailableSlots, calculateSlotGrid } from "@/domain/schedule/availability";

describe("calculateAvailableSlots", () => {
  it("returns slots respecting breaks and busy intervals", () => {
    const slots = calculateAvailableSlots({
      dateFrom: "2026-07-06",
      dateTo: "2026-07-06",
      timezone: "Europe/Moscow",
      workSchedules: [
        {
          weekday: 1,
          startsAtLocalTime: "09:00",
          endsAtLocalTime: "12:00",
          breaks: [{ startsAtLocalTime: "10:00", endsAtLocalTime: "10:30" }]
        }
      ],
      exceptions: [],
      busyIntervals: [
        {
          startsAtUtc: new Date("2026-07-06T08:00:00.000Z"),
          endsAtUtc: new Date("2026-07-06T08:45:00.000Z")
        }
      ],
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      minLeadMinutes: 0,
      maxHorizonDays: 60,
      now: new Date("2026-07-01T00:00:00.000Z"),
      slotStepMinutes: 30
    });

    const iso = slots.map((slot) => slot.startsAtUtc.toISOString());
    expect(iso).toContain("2026-07-06T06:00:00.000Z");
    expect(iso).not.toContain("2026-07-06T07:00:00.000Z");
    expect(iso).not.toContain("2026-07-06T08:00:00.000Z");
  });

  it("uses day off exceptions", () => {
    const slots = calculateAvailableSlots({
      dateFrom: "2026-07-06",
      dateTo: "2026-07-06",
      timezone: "Europe/Moscow",
      workSchedules: [
        {
          weekday: 1,
          startsAtLocalTime: "09:00",
          endsAtLocalTime: "18:00",
          breaks: []
        }
      ],
      exceptions: [{ date: "2026-07-06", type: "VACATION" }],
      busyIntervals: [],
      durationMinutes: 60,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      minLeadMinutes: 0,
      maxHorizonDays: 60,
      now: new Date("2026-07-01T00:00:00.000Z")
    });

    expect(slots).toHaveLength(0);
  });
});

describe("calculateSlotGrid", () => {
  const workday = {
    weekday: 1,
    startsAtLocalTime: "09:00",
    endsAtLocalTime: "18:00",
    breaks: [{ startsAtLocalTime: "13:00", endsAtLocalTime: "14:00" }]
  };

  it("builds the hourly grid, skips lunch and disables busy slots", () => {
    const grid = calculateSlotGrid({
      dateFrom: "2026-07-06",
      dateTo: "2026-07-06",
      timezone: "Europe/Moscow",
      workSchedules: [workday],
      exceptions: [],
      busyIntervals: [
        {
          startsAtUtc: new Date("2026-07-06T07:00:00.000Z"),
          endsAtUtc: new Date("2026-07-06T07:45:00.000Z")
        }
      ],
      minLeadMinutes: 0,
      maxHorizonDays: 60,
      now: new Date("2026-07-01T00:00:00.000Z")
    });

    const at = (iso: string) => grid.find((slot) => slot.startsAtUtc.toISOString() === iso);

    // 09,10,11,12 + 14,15,16,17 local = 8 one-hour slots (13:00 is lunch).
    expect(grid).toHaveLength(8);
    expect(at("2026-07-06T10:00:00.000Z")).toBeUndefined(); // 13:00 local — closed for lunch
    expect(at("2026-07-06T06:00:00.000Z")?.available).toBe(true); // 09:00 local — free
    expect(at("2026-07-06T07:00:00.000Z")?.available).toBe(false); // 10:00 local — busy
    expect(at("2026-07-06T11:00:00.000Z")?.available).toBe(true); // 14:00 local — free
  });

  it("disables slots before the minimum lead time", () => {
    const grid = calculateSlotGrid({
      dateFrom: "2026-07-06",
      dateTo: "2026-07-06",
      timezone: "Europe/Moscow",
      workSchedules: [{ ...workday, breaks: [] }],
      exceptions: [],
      busyIntervals: [],
      minLeadMinutes: 120,
      maxHorizonDays: 60,
      now: new Date("2026-07-06T06:00:00.000Z") // 09:00 local; lead pushes first free slot to 11:00
    });

    const at = (iso: string) => grid.find((slot) => slot.startsAtUtc.toISOString() === iso);
    expect(at("2026-07-06T06:00:00.000Z")?.available).toBe(false); // 09:00 local — too soon
    expect(at("2026-07-06T08:00:00.000Z")?.available).toBe(true); // 11:00 local — beyond lead time
  });

  it("returns an empty grid on a day off", () => {
    const grid = calculateSlotGrid({
      dateFrom: "2026-07-06",
      dateTo: "2026-07-06",
      timezone: "Europe/Moscow",
      workSchedules: [{ ...workday, breaks: [] }],
      exceptions: [{ date: "2026-07-06", type: "VACATION" }],
      busyIntervals: [],
      minLeadMinutes: 0,
      maxHorizonDays: 60,
      now: new Date("2026-07-01T00:00:00.000Z")
    });

    expect(grid).toHaveLength(0);
  });
});
