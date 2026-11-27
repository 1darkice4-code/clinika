import type { Prisma } from "@prisma/client/index";
import { calculateSlotGrid, type GridSlot, type LocalBreak } from "@/domain/schedule/availability";
import { formatDateInTimezone } from "@/lib/date-time";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

type ScheduleDb = Prisma.TransactionClient;

type SlotLookupInput = {
  serviceId: string;
  /** Omitted for resource-bound services; owner is derived from the service. */
  specialistId?: string;
  dateFrom: string;
  dateTo: string;
  excludeAppointmentId?: string;
};

type SlotAssertInput = {
  serviceId: string;
  specialistId?: string;
  startsAtUtc: string;
  excludeAppointmentId?: string;
};

/** Appointment statuses that occupy a slot (shared by specialist + resource). */
const ACTIVE_APPOINTMENT_STATUSES = [
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "ARRIVED"
] as const;

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
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
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
 * service, work schedules, exceptions and busy intervals for the requested range.
 *
 * Two calendar owners are supported. For a specialist-bound service the owner is
 * one specialist (schedule + only that specialist's appointments/blocks). For a
 * resource-bound service (e.g. the shared laser machine) the owner is the
 * resource: the schedule comes from the resource, and busy time is the UNION of
 * EVERY appointment on that resource regardless of which operator is assigned —
 * this is what collapses the operators into one queue with capacity one.
 */
async function loadScheduleInputs(
  input: SlotLookupInput,
  options: SlotLookupOptions = {}
): Promise<ScheduleInputs> {
  const db = options.tx ?? prisma;
  const [settings, service] = await Promise.all([
    options.settings ? Promise.resolve(options.settings) : db.clinicSettings.findFirst(),
    db.service.findFirst({ where: { id: input.serviceId, isActive: true, deletedAt: null } })
  ]);

  if (!settings) throw new NotFoundError("Настройки клиники не найдены");
  if (!service) throw new NotFoundError("Услуга не найдена");

  const dateFromUtc = new Date(`${input.dateFrom}T00:00:00.000Z`);
  const dateToUtc = new Date(`${input.dateTo}T23:59:59.999Z`);

  const base = {
    timezone: settings.timezone,
    minLeadMinutes: settings.bookingMinLeadMinutes,
    maxHorizonDays: settings.bookingMaxHorizonDays,
    bufferBeforeMinutes: service.bufferBeforeMinutes,
    bufferAfterMinutes: service.bufferAfterMinutes
  };

  if (service.requiresResourceId) {
    const resourceId = service.requiresResourceId;
    const resource = await db.resource.findFirst({
      where: { id: resourceId, isActive: true, deletedAt: null }
    });
    if (!resource) throw new ConflictError("Аппарат для услуги недоступен");

    const [workSchedules, appointments, blocks] = await Promise.all([
      db.resourceWorkSchedule.findMany({ where: { resourceId, isActive: true } }),
      db.appointment.findMany({
        where: {
          ...(input.excludeAppointmentId ? { id: { not: input.excludeAppointmentId } } : {}),
          resourceId,
          deletedAt: null,
          status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
          startsAtUtc: { lte: dateToUtc },
          endsAtUtc: { gte: dateFromUtc }
        }
      }),
      db.resourceTimeBlock.findMany({
        where: { resourceId, startsAtUtc: { lte: dateToUtc }, endsAtUtc: { gte: dateFromUtc } }
      })
    ]);

    return {
      ...base,
      durationMinutes: service.durationMinutes,
      workSchedules: workSchedules.map((schedule) => ({
        weekday: schedule.weekday,
        startsAtLocalTime: schedule.startsAtLocalTime,
        endsAtLocalTime: schedule.endsAtLocalTime,
        breaks: parseBreaks(schedule.breaksJson)
      })),
      exceptions: [],
      busyIntervals: [
        ...appointments.map((appointment) => ({
          startsAtUtc: appointment.startsAtUtc,
          endsAtUtc: appointment.endsAtUtc
        })),
        ...blocks.map((block) => ({ startsAtUtc: block.startsAtUtc, endsAtUtc: block.endsAtUtc }))
      ]
    };
  }

  if (!input.specialistId) throw new ConflictError("Специалист не указан");
  const specialistId = input.specialistId;
  const specialistService = await db.specialistService.findFirst({
    where: {
      specialistId,
      serviceId: input.serviceId,
      isActive: true,
      specialist: { isActive: true, deletedAt: null }
    }
  });
  if (!specialistService) throw new ConflictError("Специалист не оказывает выбранную услугу");

  const [workSchedules, exceptions, appointments, blocks] = await Promise.all([
    db.workSchedule.findMany({
      where: { specialistId, isActive: true }
    }),
    db.scheduleException.findMany({
      where: {
        specialistId,
        date: { gte: dateFromUtc, lte: dateToUtc }
      }
    }),
    db.appointment.findMany({
      where: {
        ...(input.excludeAppointmentId ? { id: { not: input.excludeAppointmentId } } : {}),
        specialistId,
        deletedAt: null,
        status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
        startsAtUtc: { lte: dateToUtc },
        endsAtUtc: { gte: dateFromUtc }
      }
    }),
    db.timeBlock.findMany({
      where: {
        specialistId,
        startsAtUtc: { lte: dateToUtc },
        endsAtUtc: { gte: dateFromUtc }
      }
    })
  ]);

  return {
    ...base,
    durationMinutes: specialistService.customDurationMinutes ?? service.durationMinutes,
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
    ]
  };
}

/**
 * Full slot grid (slot length = service duration) for the requested range,
 * including taken slots marked `available: false`. Single source of truth for
 * both the public booking UI and server-side validation.
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
    durationMinutes: data.durationMinutes,
    bufferBeforeMinutes: data.bufferBeforeMinutes,
    bufferAfterMinutes: data.bufferAfterMinutes,
    now: options.now
  });

  return { timezone: data.timezone, slots };
}

/**
 * Validates that a chosen start matches an available slot and returns the
 * resolved slot (start, end = start + service duration, clinic timezone). Throws
 * if the slot was taken in the meantime.
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
