import Link from "next/link";
import { CalendarDays, CalendarOff, ChevronLeft, ChevronRight } from "lucide-react";
import type { Prisma } from "@prisma/client/index";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission, hasPermission } from "@/domain/auth/rbac";
import { performerLabel } from "@/domain/appointment/appointment-labels";
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

function calendarHref(week: string, owner?: string) {
  const params = new URLSearchParams({ week });
  if (owner) params.set("owner", owner);
  return `/admin/calendar?${params.toString()}`;
}

export default async function CalendarPage({
  searchParams
}: {
  searchParams: Promise<{ week?: string | string[]; owner?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  assertPermission(user, permissions.scheduleRead);
  if (!user) return null;

  const settings = await prisma.clinicSettings.findFirst();
  const timezone = settings?.timezone ?? "Asia/Chita";

  const params = await searchParams;
  // Дублированный query-параметр приходит массивом — берём первую строку.
  const firstString = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const week = firstString(params.week);
  const owner = firstString(params.owner);
  // Владелец календаря: "s:<id>" — специалист, "r:<id>" — аппарат (ресурс).
  const ownerResourceId = owner?.startsWith("r:") ? owner.slice(2) : undefined;
  const ownerSpecialistId = owner?.startsWith("s:") ? owner.slice(2) : undefined;
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

  // Manager can filter by specialist or by shared resource; a specialist login is
  // always scoped to themselves.
  const [specialists, resources] = specialistScoped
    ? [[], []]
    : await Promise.all([
        prisma.specialist.findMany({
          where: { deletedAt: null },
          orderBy: [{ sortOrder: "asc" }, { lastName: "asc" }],
          select: { id: true, firstName: true, lastName: true }
        }),
        prisma.resource.findMany({
          where: { deletedAt: null },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true }
        })
      ]);

  const selectedResourceId =
    !specialistScoped && ownerResourceId && resources.some((item) => item.id === ownerResourceId)
      ? ownerResourceId
      : undefined;

  const selectedSpecialistId = specialistScoped
    ? user.specialistId!
    : !selectedResourceId && ownerSpecialistId && specialists.some((item) => item.id === ownerSpecialistId)
      ? ownerSpecialistId
      : undefined;

  // Значение выбранного владельца для селекта и ссылок навигации.
  const selectedOwnerValue = selectedResourceId
    ? `r:${selectedResourceId}`
    : selectedSpecialistId
      ? `s:${selectedSpecialistId}`
      : undefined;

  const scopeFilter: Prisma.AppointmentWhereInput = selectedResourceId
    ? { resourceId: selectedResourceId }
    : selectedSpecialistId
      ? { specialistId: selectedSpecialistId }
      : {};

  const [appointments, timeBlocks, resourceBlocks, workSchedules] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        ...scopeFilter,
        deletedAt: null,
        startsAtUtc: { gte: rangeStart, lt: rangeEnd },
        status: { notIn: ["CANCELLED_BY_CLIENT", "CANCELLED_BY_CLINIC"] }
      },
      orderBy: { startsAtUtc: "asc" },
      include: { client: true, service: true, specialist: true, resource: true }
    }),
    // Specialist blocks: skip entirely when viewing a resource calendar.
    selectedResourceId
      ? Promise.resolve([])
      : prisma.timeBlock.findMany({
          where: {
            ...(selectedSpecialistId ? { specialistId: selectedSpecialistId } : {}),
            startsAtUtc: { lt: rangeEnd },
            endsAtUtc: { gt: rangeStart }
          },
          include: { specialist: true }
        }),
    // Resource blocks: only when viewing a specific resource calendar.
    selectedResourceId
      ? prisma.resourceTimeBlock.findMany({
          where: {
            resourceId: selectedResourceId,
            startsAtUtc: { lt: rangeEnd },
            endsAtUtc: { gt: rangeStart }
          }
        })
      : Promise.resolve([]),
    // Work-hours shading only makes sense for a single owner.
    selectedResourceId
      ? prisma.resourceWorkSchedule.findMany({ where: { resourceId: selectedResourceId, isActive: true } })
      : selectedSpecialistId
        ? prisma.workSchedule.findMany({ where: { specialistId: selectedSpecialistId, isActive: true } })
        : Promise.resolve([])
  ]);

  const showSpecialistInEvent = !selectedSpecialistId && !selectedResourceId;

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
        ? `${appointment.service.name} · ${performerLabel(appointment)}`
        : appointment.service.name,
      meta: `${performerLabel(appointment)} · ${appointment.client.phone}`,
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

  for (const block of resourceBlocks) {
    const startDayKey = zonedDayKey(block.startsAtUtc, timezone);
    const endDayKey = zonedDayKey(block.endsAtUtc, timezone);
    for (const dayKey of dayKeys) {
      if (dayKey < startDayKey || dayKey > endDayKey) continue;
      events.push({
        id: `rblock-${block.id}-${dayKey}`,
        dayKey,
        startMinutes: dayKey === startDayKey ? zonedMinutes(block.startsAtUtc, timezone) : 0,
        endMinutes: dayKey === endDayKey ? zonedMinutes(block.endsAtUtc, timezone) : 24 * 60,
        title: "Занято",
        subtitle: block.reason,
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

  const prevHref = calendarHref(addDaysKey(mondayKey, -7), selectedOwnerValue);
  const nextHref = calendarHref(addDaysKey(mondayKey, 7), selectedOwnerValue);
  const todayHref = calendarHref(resolveWeekMonday(todayKey, timezone), selectedOwnerValue);

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
                name="owner"
                aria-label="Специалист или аппарат"
                defaultValue={selectedOwnerValue ?? ""}
                className="w-56"
              >
                <option value="">Все</option>
                <optgroup label="Специалисты">
                  {specialists.map((specialist) => (
                    <option key={specialist.id} value={`s:${specialist.id}`}>
                      {specialist.firstName} {specialist.lastName}
                    </option>
                  ))}
                </optgroup>
                {resources.length > 0 && (
                  <optgroup label="Аппараты">
                    {resources.map((resource) => (
                      <option key={resource.id} value={`r:${resource.id}`}>
                        {resource.name}
                      </option>
                    ))}
                  </optgroup>
                )}
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
