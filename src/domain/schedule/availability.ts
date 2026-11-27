import { addMinutes, localDateTimeToUtc } from "@/lib/date-time";

export type LocalBreak = {
  startsAtLocalTime: string;
  endsAtLocalTime: string;
};

export type WorkScheduleInput = {
  weekday: number;
  startsAtLocalTime: string;
  endsAtLocalTime: string;
  breaks: LocalBreak[];
};

export type ScheduleExceptionInput = {
  date: string;
  type: "DAY_OFF" | "VACATION" | "SICK_LEAVE" | "CUSTOM_WORKDAY";
  startsAtLocalTime?: string | null;
  endsAtLocalTime?: string | null;
};

export type BusyInterval = {
  startsAtUtc: Date;
  endsAtUtc: Date;
};

export type SlotCalculationInput = {
  dateFrom: string;
  dateTo: string;
  timezone: string;
  workSchedules: WorkScheduleInput[];
  exceptions: ScheduleExceptionInput[];
  busyIntervals: BusyInterval[];
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minLeadMinutes: number;
  maxHorizonDays: number;
  slotStepMinutes?: number;
  now?: Date;
};

export type AvailableSlot = {
  startsAtUtc: Date;
  endsAtUtc: Date;
};

/** A slot in the full day grid, including ones that are already taken. */
export type GridSlot = {
  startsAtUtc: Date;
  endsAtUtc: Date;
  /** false when the slot is busy, in the past, before the lead time, or beyond the horizon. */
  available: boolean;
};

export type SlotGridInput = {
  dateFrom: string;
  dateTo: string;
  timezone: string;
  workSchedules: WorkScheduleInput[];
  exceptions: ScheduleExceptionInput[];
  busyIntervals: BusyInterval[];
  minLeadMinutes: number;
  maxHorizonDays: number;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  now?: Date;
};

/** Minimal shape needed to resolve a day's open intervals. */
type ScheduleShape = {
  timezone: string;
  workSchedules: WorkScheduleInput[];
  exceptions: ScheduleExceptionInput[];
};

type Interval = {
  start: Date;
  end: Date;
};

function weekdayFromDate(date: Date): number {
  const weekday = date.getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

function eachDate(from: string, to: string): string[] {
  const result: string[] = [];
  const cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);

  while (cursor <= end) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

function subtractInterval(source: Interval, blocker: Interval): Interval[] {
  if (!overlaps(source, blocker)) return [source];

  const result: Interval[] = [];
  if (blocker.start > source.start) {
    result.push({ start: source.start, end: new Date(Math.min(blocker.start.getTime(), source.end.getTime())) });
  }
  if (blocker.end < source.end) {
    result.push({ start: new Date(Math.max(blocker.end.getTime(), source.start.getTime())), end: source.end });
  }
  return result.filter((interval) => interval.start < interval.end);
}

function subtractMany(intervals: Interval[], blockers: Interval[]): Interval[] {
  return blockers.reduce(
    (available, blocker) => available.flatMap((interval) => subtractInterval(interval, blocker)),
    intervals
  );
}

function getDayIntervals(input: ScheduleShape, date: string): Interval[] {
  const localDate = new Date(`${date}T00:00:00.000Z`);
  const exception = input.exceptions.find((item) => item.date === date);

  if (exception && ["DAY_OFF", "VACATION", "SICK_LEAVE"].includes(exception.type)) {
    return [];
  }

  const schedule =
    exception?.type === "CUSTOM_WORKDAY"
      ? {
          startsAtLocalTime: exception.startsAtLocalTime,
          endsAtLocalTime: exception.endsAtLocalTime,
          breaks: []
        }
      : input.workSchedules.find((item) => item.weekday === weekdayFromDate(localDate));

  if (!schedule?.startsAtLocalTime || !schedule.endsAtLocalTime) return [];

  const working: Interval = {
    start: localDateTimeToUtc(date, schedule.startsAtLocalTime, input.timezone),
    end: localDateTimeToUtc(date, schedule.endsAtLocalTime, input.timezone)
  };

  const breaks = (schedule.breaks ?? []).map((item) => ({
    start: localDateTimeToUtc(date, item.startsAtLocalTime, input.timezone),
    end: localDateTimeToUtc(date, item.endsAtLocalTime, input.timezone)
  }));

  return subtractMany([working], breaks);
}

export function calculateAvailableSlots(input: SlotCalculationInput): AvailableSlot[] {
  const now = input.now ?? new Date();
  const minStart = addMinutes(now, input.minLeadMinutes);
  const maxStart = addMinutes(now, input.maxHorizonDays * 24 * 60);
  const step = input.slotStepMinutes ?? 15;
  const slots: AvailableSlot[] = [];

  for (const date of eachDate(input.dateFrom, input.dateTo)) {
    const baseIntervals = getDayIntervals(input, date);
    const availableIntervals = subtractMany(
      baseIntervals,
      input.busyIntervals.map((item) => ({
        start: item.startsAtUtc,
        end: item.endsAtUtc
      }))
    );

    for (const interval of availableIntervals) {
      let serviceStart = addMinutes(interval.start, input.bufferBeforeMinutes);
      const latestStart = addMinutes(interval.end, -input.durationMinutes - input.bufferAfterMinutes);

      while (serviceStart <= latestStart) {
        const serviceEnd = addMinutes(serviceStart, input.durationMinutes);
        const guardedStart = addMinutes(serviceStart, -input.bufferBeforeMinutes);
        const guardedEnd = addMinutes(serviceEnd, input.bufferAfterMinutes);

        if (guardedStart >= interval.start && guardedEnd <= interval.end && serviceStart >= minStart && serviceStart <= maxStart) {
          slots.push({ startsAtUtc: serviceStart, endsAtUtc: serviceEnd });
        }

        serviceStart = addMinutes(serviceStart, step);
      }
    }
  }

  return slots;
}

/**
 * Builds the day grid for a given service and marks every slot available or not.
 * Slot length is the service `durationMinutes`; consecutive starts are spaced by
 * `duration + bufferBefore + bufferAfter` so each visit keeps its prep/cleanup gap.
 * `endsAtUtc` is the honest visit end (`start + duration`, buffers excluded) — the
 * value stored on the appointment. Unlike {@link calculateAvailableSlots}, taken
 * slots are kept (with `available: false`) so the UI can show them disabled.
 */
export function calculateSlotGrid(input: SlotGridInput): GridSlot[] {
  const now = input.now ?? new Date();
  const minStart = addMinutes(now, input.minLeadMinutes);
  const maxStart = addMinutes(now, input.maxHorizonDays * 24 * 60);
  const { durationMinutes, bufferBeforeMinutes, bufferAfterMinutes } = input;
  const step = durationMinutes + bufferBeforeMinutes + bufferAfterMinutes;
  const busy: Interval[] = input.busyIntervals.map((item) => ({
    start: item.startsAtUtc,
    end: item.endsAtUtc
  }));

  const grid: GridSlot[] = [];
  if (durationMinutes <= 0 || step <= 0) return grid;

  for (const date of eachDate(input.dateFrom, input.dateTo)) {
    for (const interval of getDayIntervals(input, date)) {
      // First start leaves room for the prep buffer; loop while the visit plus its
      // cleanup buffer still fits inside the working interval.
      let start = addMinutes(interval.start, bufferBeforeMinutes);
      while (addMinutes(start, durationMinutes + bufferAfterMinutes) <= interval.end) {
        const end = addMinutes(start, durationMinutes);
        // Guarded span (prep..cleanup) must be clear of existing appointments/blocks.
        const guarded = {
          start: addMinutes(start, -bufferBeforeMinutes),
          end: addMinutes(end, bufferAfterMinutes)
        };
        const withinBounds = start >= minStart && start <= maxStart;
        const isBusy = busy.some((blocker) => overlaps(guarded, blocker));
        grid.push({ startsAtUtc: start, endsAtUtc: end, available: withinBounds && !isBusy });
        start = addMinutes(start, step);
      }
    }
  }

  return grid;
}
