import Link from "next/link";
import { CalendarDays, CalendarOff, ChevronLeft, ChevronRight } from "lucide-react";
import type { Prisma } from "@prisma/client/index";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission, hasPermission } from "@/domain/auth/rbac";
import { appointmentStatusClasses, appointmentStatusLabels } from "@/domain/crm/status-labels";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { WeekCalendar, type CalendarDay, type CalendarEvent } from "@/components/admin/week-calendar";
import { localDateTimeToUtc } from "@/lib/date-time";
import { prisma } from "@/lib/prisma";
import {
  addDaysKey,
  clinicTodayKey,
  formatDayHeading,
  formatWeekRange,
  resolveWeekMonday,
  weekDateKeys,
  weekdayOfKey,
  zonedDayKey,
  zonedMinutes
} from "@/lib/week";

type Break = { startsAtLocalTime: string; endsAtLocalTime: string };

function parseBreaks(value: Prisma.JsonValue | null): Break[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) =>
    item &&
    typeof item === "object" &&
    "startsAtLocalTime" in item &&
    "endsAtLocalTime" in item &&
    typeof item.startsAtLocalTime === "string" &&
    typeof item.endsAtLocalTime === "string"
      ? [{ startsAtLocalTime: item.startsAtLocalTime, endsAtLocalTime: item.endsAtLocalTime }]
      : []
  );
}

function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return (hour || 0) * 60 + (minute || 0);
}

/** Work interval minus its breaks → one or more shaded ranges. */
function workRangesFor(start: string, end: string, breaks: Break[]): { start: number; end: number }[] {
  const dayStart = timeToMinutes(start);
  const dayEnd = timeToMinutes(end);
  const sorted = breaks
    .map((item) => ({ start: timeToMinutes(item.startsAtLocalTime), end: timeToMinutes(item.endsAtLocalTime) }))
    .sort((a, b) => a.start - b.start);

  const ranges: { start: number; end: number }[] = [];
  let cursor = dayStart;
  for (const brk of sorted) {
    if (brk.start > cursor) ranges.push({ start: cursor, end: Math.min(brk.start, dayEnd) });
    cursor = Math.max(cursor, brk.end);
  }
  if (cursor < dayEnd) ranges.push({ start: cursor, end: dayEnd });
  return ranges;
}

function calendarHref(week: string, specialistId?: string) {
  const params = new URLSearchParams({ week });
  if (specialistId) params.set("specialistId", specialistId);
  return `/admin/calendar?${params.toString()}`;
}

export default async function CalendarPage({
  searchParams
}: {
  searchParams: Promise<{ week?: string; specialistId?: string }>;
}) {
  const user = await getCurrentUser();
  assertPermission(user, permissions.scheduleRead);
  if (!user) return null;

  const settings = await prisma.clinicSettings.findFirst();
  const timezone = settings?.timezone ?? "Asia/Chita";

  const { week, specialistId } = await searchParams;
  const mondayKey = resolveWeekMonday(week, timezone);
  const dayKeys = weekDateKeys(mondayKey);
  const weekEndKey = addDaysKey(mondayKey, 7);
  const rangeStart = localDateTimeToUtc(mondayKey, "00:00", timezone);
  const rangeEnd = localDateTimeToUtc(weekEndKey, "00:00", timezone);
  const todayKey = clinicTodayKey(timezone);

  const specialistScoped = user.roles.includes("SPECIALIST") && !hasPermission(user, permissions.appointmentsWrite);

  // A specialist login that isn't linked to a specialist profile has nothing to show.
  if (specialistScoped && !user.specialistId) {
    return (
      <div>
        <PageHeader icon={CalendarDays} title="Календарь" />
        <div className="mt-6">
          <EmptyState
            icon={CalendarOff}
            title="Учётная запись не привязана к специалисту"
            description="Попросите управляющего связать ваш аккаунт с карточкой специалиста в разделе «Врачи»."
          />
        </div>
      </div>
    );
  }

  // Manager can filter by specialist; a specialist is always scoped to themselves.
  const specialists = specialistScoped
    ? []
    : await prisma.specialist.findMany({
        where: { deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { lastName: "asc" }],
        select: { id: true, firstName: true, lastName: true }
      });

  const selectedSpecialistId = specialistScoped
    ? user.specialistId!
    : specialistId && specialists.some((item) => item.id === specialistId)
      ? specialistId
      : undefined;

  const scopeFilter: Prisma.AppointmentWhereInput = selectedSpecialistId
    ? { specialistId: selectedSpecialistId }
    : {};

  const [appointments, timeBlocks, workSchedules] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        ...scopeFilter,
        deletedAt: null,
        startsAtUtc: { gte: rangeStart, lt: rangeEnd },
        status: { notIn: ["CANCELLED_BY_CLIENT", "CANCELLED_BY_CLINIC"] }
      },
      orderBy: { startsAtUtc: "asc" },
      include: { client: true, service: true, specialist: true }
    }),
    prisma.timeBlock.findMany({
      where: {
        ...(selectedSpecialistId ? { specialistId: selectedSpecialistId } : {}),
        startsAtUtc: { lt: rangeEnd },
        endsAtUtc: { gt: rangeStart }
      },
      include: { specialist: true }
    }),
    // Work-hours shading only makes sense for a single specialist.
    selectedSpecialistId
      ? prisma.workSchedule.findMany({ where: { specialistId: selectedSpecialistId, isActive: true } })
      : Promise.resolve([])
  ]);

  const showSpecialistInEvent = !selectedSpecialistId;

  const events: CalendarEvent[] = [];
  for (const appointment of appointments) {
    const dayKey = zonedDayKey(appointment.startsAtUtc, timezone);
    const startMinutes = zonedMinutes(appointment.startsAtUtc, timezone);
    const endDayKey = zonedDayKey(appointment.endsAtUtc, timezone);
    const endMinutes = endDayKey === dayKey ? zonedMinutes(appointment.endsAtUtc, timezone) : 24 * 60;
    events.push({
      id: appointment.id,
      dayKey,
      startMinutes,
      endMinutes,
      title: `${appointment.client.firstName} ${appointment.client.lastName ?? ""}`.trim(),
      subtitle: showSpecialistInEvent
        ? `${appointment.service.name} · ${appointment.specialist.firstName} ${appointment.specialist.lastName}`
        : appointment.service.name,
      meta: `${appointment.specialist.firstName} ${appointment.specialist.lastName} · ${appointment.client.phone}`,
      statusLabel: appointmentStatusLabels[appointment.status],
      statusClass: appointmentStatusClasses[appointment.status],
      kind: "appointment",
      href: hasPermission(user, permissions.appointmentsWrite) ? "/admin/appointments" : undefined
    });
  }

  for (const block of timeBlocks) {
    // A block can span several days (e.g. a vacation) or start before the visible
    // week — render a segment on every visible day it overlaps.
    const startDayKey = zonedDayKey(block.startsAtUtc, timezone);
    const endDayKey = zonedDayKey(block.endsAtUtc, timezone);
    for (const dayKey of dayKeys) {
      if (dayKey < startDayKey || dayKey > endDayKey) continue;
      events.push({
        id: `block-${block.id}-${dayKey}`,
        dayKey,
        startMinutes: dayKey === startDayKey ? zonedMinutes(block.startsAtUtc, timezone) : 0,
        endMinutes: dayKey === endDayKey ? zonedMinutes(block.endsAtUtc, timezone) : 24 * 60,
        title: "Занято",
        subtitle: block.reason,
        meta: showSpecialistInEvent ? `${block.specialist.firstName} ${block.specialist.lastName}` : undefined,
        statusLabel: "Блокировка",
        statusClass: "",
        kind: "block"
      });
    }
  }

  const days: CalendarDay[] = dayKeys.map((key) => {
    const weekday = weekdayOfKey(key);
    const workRanges = workSchedules
      .filter((schedule) => schedule.weekday === weekday)
      .flatMap((schedule) =>
        workRangesFor(schedule.startsAtLocalTime, schedule.endsAtLocalTime, parseBreaks(schedule.breaksJson))
      );
    return { key, heading: formatDayHeading(key), isToday: key === todayKey, workRanges };
  });

  // Grid bounds: cover 08:00–20:00 plus any earlier/later work or events.
  const starts = [
    8 * 60,
    ...days.flatMap((day) => day.workRanges.map((range) => range.start)),
    ...events.map((event) => event.startMinutes)
  ];
  const ends = [
    20 * 60,
    ...days.flatMap((day) => day.workRanges.map((range) => range.end)),
    ...events.map((event) => event.endMinutes)
  ];
  const dayStartMinutes = Math.max(0, Math.min(...starts));
  const dayEndMinutes = Math.min(24 * 60, Math.max(...ends));

  const prevHref = calendarHref(addDaysKey(mondayKey, -7), selectedSpecialistId);
  const nextHref = calendarHref(addDaysKey(mondayKey, 7), selectedSpecialistId);
  const todayHref = calendarHref(resolveWeekMonday(todayKey, timezone), selectedSpecialistId);

  return (
    <div>
      <PageHeader
        icon={CalendarDays}
        title="Календарь"
        description={`${formatWeekRange(mondayKey, addDaysKey(mondayKey, 6))}${
          specialistScoped ? " · только ваши записи" : ""
        }`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
          {!specialistScoped && (
            <form method="get" className="flex items-center gap-2">
              <input type="hidden" name="week" value={mondayKey} />
              <Select
                name="specialistId"
                aria-label="Специалист"
                defaultValue={selectedSpecialistId ?? ""}
                className="w-56"
              >
                <option value="">Все специалисты</option>
                {specialists.map((specialist) => (
                  <option key={specialist.id} value={specialist.id}>
                    {specialist.firstName} {specialist.lastName}
                  </option>
                ))}
              </Select>
              <button type="submit" className="h-11 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted">
                Показать
              </button>
            </form>
          )}
          <div className="flex items-center gap-1">
            <Link
              href={prevHref}
              aria-label="Предыдущая неделя"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border bg-card hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link href={todayHref} className="h-11 rounded-md border bg-card px-3 text-sm font-medium leading-[44px] hover:bg-muted">
              Сегодня
            </Link>
            <Link
              href={nextHref}
              aria-label="Следующая неделя"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border bg-card hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          </div>
        }
      />

      <div className="mt-6">
        {events.length === 0 && (
          <Card className="mb-3 p-4 text-sm text-muted-foreground">На эту неделю записей нет.</Card>
        )}
        <WeekCalendar
          days={days}
          events={events}
          dayStartMinutes={dayStartMinutes}
          dayEndMinutes={dayEndMinutes}
        />
      </div>
    </div>
  );
}
