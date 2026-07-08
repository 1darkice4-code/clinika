import type { Prisma } from "@prisma/client/index";
import {
  calculateSlotGrid,
  STANDARD_SLOT_MINUTES,
  type GridSlot,
  type LocalBreak
} from "@/domain/schedule/availability";
import { formatDateInTimezone } from "@/lib/date-time";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

type ScheduleDb = Prisma.TransactionClient;

type SlotLookupInput = {
  serviceId: string;
  specialistId: string;
  dateFrom: string;
  dateTo: string;
  excludeAppointmentId?: string;
};

type SlotAssertInput = {
  serviceId: string;
  specialistId: string;
  startsAtUtc: string;
  excludeAppointmentId?: string;
};

type ClinicScheduleSettings = {
  timezone: string;
  bookingMinLeadMinutes: number;
  bookingMaxHorizonDays: number;
};

type SlotLookupOptions = {
  tx?: ScheduleDb;
  now?: Date;
  settings?: ClinicScheduleSettings;
};

type ScheduleInputs = {
  timezone: string;
  workSchedules: {
    weekday: number;
    startsAtLocalTime: string;
    endsAtLocalTime: string;
    breaks: LocalBreak[];
  }[];
  exceptions: {
    date: string;
    type: "DAY_OFF" | "VACATION" | "SICK_LEAVE" | "CUSTOM_WORKDAY";
    startsAtLocalTime?: string | null;
    endsAtLocalTime?: string | null;
  }[];
  busyIntervals: { startsAtUtc: Date; endsAtUtc: Date }[];
  minLeadMinutes: number;
  maxHorizonDays: number;
};

function parseBreaks(value: Prisma.JsonValue | null): LocalBreak[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (
      item &&
      typeof item === "object" &&
      "startsAtLocalTime" in item &&
      "endsAtLocalTime" in item &&
      typeof item.startsAtLocalTime === "string" &&
      typeof item.endsAtLocalTime === "string"
    ) {
      return [{ startsAtLocalTime: item.startsAtLocalTime, endsAtLocalTime: item.endsAtLocalTime }];
    }
    return [];
  });
}

/**
 * Loads and validates everything the slot math needs: clinic settings, the
 * service, the specialist's offer, work schedules, exceptions and busy intervals
 * (existing appointments + manual blocks) for the requested date range.
 */
async function loadScheduleInputs(
  input: SlotLookupInput,
  options: SlotLookupOptions = {}
): Promise<ScheduleInputs> {
  const db = options.tx ?? prisma;
  const [settings, service, specialistService] = await Promise.all([
    options.settings ? Promise.resolve(options.settings) : db.clinicSettings.findFirst(),
    db.service.findFirst({ where: { id: input.serviceId, isActive: true, deletedAt: null } }),
    db.specialistService.findFirst({
      where: {
        specialistId: input.specialistId,
        serviceId: input.serviceId,
        isActive: true,
        specialist: { isActive: true, deletedAt: null }
      },
      include: { specialist: true }
    })
  ]);

  if (!settings) throw new NotFoundError("Настройки клиники не найдены");
  if (!service) throw new NotFoundError("Услуга не найдена");
  if (!specialistService) throw new ConflictError("Специалист не оказывает выбранную услугу");

  const dateFromUtc = new Date(`${input.dateFrom}T00:00:00.000Z`);
  const dateToUtc = new Date(`${input.dateTo}T23:59:59.999Z`);

  const [workSchedules, exceptions, appointments, blocks] = await Promise.all([
    db.workSchedule.findMany({
      where: { specialistId: input.specialistId, isActive: true }
    }),
    db.scheduleException.findMany({
      where: {
        specialistId: input.specialistId,
        date: { gte: dateFromUtc, lte: dateToUtc }
      }
    }),
    db.appointment.findMany({
      where: {
        ...(input.excludeAppointmentId ? { id: { not: input.excludeAppointmentId } } : {}),
        specialistId: input.specialistId,
        deletedAt: null,
        status: { in: ["PENDING_CONFIRMATION", "CONFIRMED", "ARRIVED"] },
        startsAtUtc: { lte: dateToUtc },
        endsAtUtc: { gte: dateFromUtc }
      }
    }),
    db.timeBlock.findMany({
      where: {
        specialistId: input.specialistId,
        startsAtUtc: { lte: dateToUtc },
        endsAtUtc: { gte: dateFromUtc }
      }
    })
  ]);

  return {
    timezone: settings.timezone,
    workSchedules: workSchedules.map((schedule) => ({
      weekday: schedule.weekday,
      startsAtLocalTime: schedule.startsAtLocalTime,
      endsAtLocalTime: schedule.endsAtLocalTime,
      breaks: parseBreaks(schedule.breaksJson)
    })),
    exceptions: exceptions.map((exception) => ({
      date: exception.date.toISOString().slice(0, 10),
      type: exception.type,
      startsAtLocalTime: exception.startsAtLocalTime,
      endsAtLocalTime: exception.endsAtLocalTime
    })),
    busyIntervals: [
      ...appointments.map((appointment) => ({
        startsAtUtc: appointment.startsAtUtc,
        endsAtUtc: appointment.endsAtUtc
      })),
      ...blocks.map((block) => ({
        startsAtUtc: block.startsAtUtc,
        endsAtUtc: block.endsAtUtc
      }))
    ],
    minLeadMinutes: settings.bookingMinLeadMinutes,
    maxHorizonDays: settings.bookingMaxHorizonDays
  };
}

/**
 * Full one-hour slot grid for the requested range, including taken slots marked
 * `available: false`. This is the single source of truth for both the public
 * booking UI and server-side validation.
 */
export async function getSlotGrid(
  input: SlotLookupInput,
  options: SlotLookupOptions = {}
): Promise<{ timezone: string; slots: GridSlot[] }> {
  const data = await loadScheduleInputs(input, options);
  const slots = calculateSlotGrid({
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    timezone: data.timezone,
    workSchedules: data.workSchedules,
    exceptions: data.exceptions,
    busyIntervals: data.busyIntervals,
    minLeadMinutes: data.minLeadMinutes,
    maxHorizonDays: data.maxHorizonDays,
    slotMinutes: STANDARD_SLOT_MINUTES,
    now: options.now
  });

  return { timezone: data.timezone, slots };
}

/**
 * Validates that a chosen start matches an available one-hour slot and returns
 * the resolved slot (start, end = start + one hour, clinic timezone). Throws if
 * the slot was taken in the meantime.
 */
export async function getAvailableSlotOrThrow(input: SlotAssertInput, options: SlotLookupOptions = {}) {
  const db = options.tx ?? prisma;
  const settings = options.settings ?? (await db.clinicSettings.findFirst());
  if (!settings) throw new NotFoundError("Настройки клиники не найдены");

  const startsAtUtc = new Date(input.startsAtUtc);
  const clinicDate = formatDateInTimezone(startsAtUtc, settings.timezone);
  const { timezone, slots } = await getSlotGrid(
    {
      serviceId: input.serviceId,
      specialistId: input.specialistId,
      dateFrom: clinicDate,
      dateTo: clinicDate,
      excludeAppointmentId: input.excludeAppointmentId
    },
    { ...options, settings }
  );

  const matchingSlot = slots.find(
    (slot) => slot.available && slot.startsAtUtc.getTime() === startsAtUtc.getTime()
  );
  if (!matchingSlot) {
    throw new ConflictError("Выбранное время уже недоступно. Обновите свободные окна.");
  }

  return {
    startsAtUtc: matchingSlot.startsAtUtc,
    endsAtUtc: matchingSlot.endsAtUtc,
    clinicTimezone: timezone
  };
}
