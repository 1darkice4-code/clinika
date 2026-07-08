import Link from "next/link";
import {
  BellRing,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Inbox,
  ListChecks,
  Phone,
  WandSparkles,
  type LucideIcon
} from "lucide-react";
import { permissions } from "@/config/permissions";
import { assertPermission, hasPermission } from "@/domain/auth/rbac";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import {
  appointmentStatusClasses,
  appointmentStatusLabels,
  leadStatusClasses,
  leadStatusLabels,
  taskStatusClasses,
  taskStatusLabels
} from "@/domain/crm/status-labels";
import { prisma } from "@/lib/prisma";
import { localDateTimeToUtc } from "@/lib/date-time";

function clinicDateKey(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function formatTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatDayTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatHeaderDate(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone,
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(date);
}

const quickActionClass =
  "inline-flex h-10 items-center gap-2 rounded-md border bg-card px-3.5 text-sm font-medium transition hover:bg-muted";

type Metric = {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  tone: "default" | "primary" | "success" | "warning" | "danger";
  href?: string;
};

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  assertPermission(user, permissions.dashboardRead);
  if (!user) return null;

  const settings = await prisma.clinicSettings.findFirst();
  const timezone = settings?.timezone ?? "Asia/Chita";
  const todayKey = clinicDateKey(new Date(), timezone);
  const tomorrowKey = addDays(todayKey, 1);
  const afterTomorrowKey = addDays(todayKey, 2);
  const weekEndKey = addDays(todayKey, 8);
  const todayStart = localDateTimeToUtc(todayKey, "00:00", timezone);
  const tomorrowStart = localDateTimeToUtc(tomorrowKey, "00:00", timezone);
  const afterTomorrowStart = localDateTimeToUtc(afterTomorrowKey, "00:00", timezone);
  const weekEnd = localDateTimeToUtc(weekEndKey, "00:00", timezone);

  const canReadLeads = hasPermission(user, permissions.leadsRead);
  const canReadAppointments = hasPermission(user, permissions.appointmentsRead);
  const canReadContent = hasPermission(user, permissions.contentRead);
  const specialistScoped =
    user.roles.includes("SPECIALIST") && !hasPermission(user, permissions.appointmentsWrite);
  const appointmentScope = specialistScoped
    ? { specialistId: user.specialistId ?? "__none__" }
    : {};
  const taskScope = specialistScoped ? { assignedUserId: user.id } : {};

  const [
    newLeads,
    inProgressLeads,
    todayAppointments,
    tomorrowAppointments,
    pendingAppointments,
    openTasks,
    leadList,
    todayAppointmentList,
    upcomingAppointmentList,
    taskList
  ] = await Promise.all([
    canReadLeads ? prisma.lead.count({ where: { status: "NEW" } }) : Promise.resolve(0),
    canReadLeads ? prisma.lead.count({ where: { status: "IN_PROGRESS" } }) : Promise.resolve(0),
    canReadAppointments
      ? prisma.appointment.count({
          where: {
            ...appointmentScope,
            deletedAt: null,
            startsAtUtc: { gte: todayStart, lt: tomorrowStart },
            status: { notIn: ["CANCELLED_BY_CLIENT", "CANCELLED_BY_CLINIC"] }
          }
        })
      : Promise.resolve(0),
    canReadAppointments
      ? prisma.appointment.count({
          where: {
            ...appointmentScope,
            deletedAt: null,
            startsAtUtc: { gte: tomorrowStart, lt: afterTomorrowStart },
            status: { notIn: ["CANCELLED_BY_CLIENT", "CANCELLED_BY_CLINIC"] }
          }
        })
      : Promise.resolve(0),
    canReadAppointments
      ? prisma.appointment.count({
          where: {
            ...appointmentScope,
            deletedAt: null,
            status: "PENDING_CONFIRMATION",
            startsAtUtc: { gte: todayStart, lt: weekEnd }
          }
        })
      : Promise.resolve(0),
    canReadAppointments || canReadLeads
      ? prisma.task.count({ where: { ...taskScope, status: "OPEN" } })
      : Promise.resolve(0),
    canReadLeads
      ? prisma.lead.findMany({
          where: { status: { in: ["NEW", "IN_PROGRESS", "NO_CONTACT", "WAITING_FOR_CLIENT"] } },
          orderBy: { createdAt: "desc" },
          take: 6,
          include: { client: true, service: true, preferredSpecialist: true, assignedUser: true }
        })
      : Promise.resolve([]),
    canReadAppointments
      ? prisma.appointment.findMany({
          where: {
            ...appointmentScope,
            deletedAt: null,
            startsAtUtc: { gte: todayStart, lt: tomorrowStart },
            status: { notIn: ["CANCELLED_BY_CLIENT", "CANCELLED_BY_CLINIC"] }
          },
          orderBy: { startsAtUtc: "asc" },
          include: { client: true, service: true, specialist: true }
        })
      : Promise.resolve([]),
    canReadAppointments
      ? prisma.appointment.findMany({
          where: {
            ...appointmentScope,
            deletedAt: null,
            startsAtUtc: { gte: tomorrowStart, lt: weekEnd },
            status: { in: ["PENDING_CONFIRMATION", "CONFIRMED", "ARRIVED"] }
          },
          orderBy: { startsAtUtc: "asc" },
          take: 6,
          include: { client: true, service: true, specialist: true }
        })
      : Promise.resolve([]),
    canReadAppointments || canReadLeads
      ? prisma.task.findMany({
          where: { ...taskScope, status: "OPEN" },
          orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
          take: 6,
          include: { assignedUser: true, client: true, lead: true, appointment: true }
        })
      : Promise.resolve([])
  ]);

  const needsAttention = newLeads + pendingAppointments;

  const metrics: Metric[] = [
    {
      label: "Нужно обработать",
      value: needsAttention,
      hint: "новые заявки и записи без подтверждения",
      icon: Inbox,
      tone: needsAttention > 0 ? "warning" : "default",
      href: canReadLeads ? "/admin/leads" : undefined
    },
    {
      label: "Записи сегодня",
      value: todayAppointments,
      hint: "по рабочему дню клиники",
      icon: CalendarDays,
      tone: "primary",
      href: canReadAppointments ? "/admin/calendar" : undefined
    },
    {
      label: "Записи завтра",
      value: tomorrowAppointments,
      hint: "для подготовки смены",
      icon: CalendarClock,
      tone: "default",
      href: canReadAppointments ? "/admin/calendar" : undefined
    },
    {
      label: "Заявки в работе",
      value: inProgressLeads,
      hint: "ожидают следующего контакта",
      icon: ClipboardList,
      tone: "default",
      href: canReadLeads ? "/admin/leads" : undefined
    },
    {
      label: "Подтверждение",
      value: pendingAppointments,
      hint: "записи на ближайшие дни",
      icon: BellRing,
      tone: pendingAppointments > 0 ? "warning" : "default",
      href: canReadAppointments ? "/admin/appointments" : undefined
    },
    {
      label: "Открытые задачи",
      value: openTasks,
      hint: "звонки и внутренние напоминания",
      icon: ListChecks,
      tone: "default"
    }
  ];

  return (
    <>
      <PageHeader
        eyebrow="Рабочий день"
        title={settings?.clinicName ?? "Клиника"}
        description={<span className="capitalize">{formatHeaderDate(new Date(), timezone)}</span>}
        actions={
          <>
            {canReadLeads && (
              <Link className={quickActionClass} href="/admin/leads">
                <ClipboardList className="h-4 w-4" />
                Заявки
              </Link>
            )}
            {canReadAppointments && (
              <Link className={quickActionClass} href="/admin/calendar">
                <CalendarDays className="h-4 w-4" />
                {specialistScoped ? "Мой календарь" : "Календарь"}
              </Link>
            )}
            {canReadContent && (
              <Link className={quickActionClass} href="/admin/content">
                <WandSparkles className="h-4 w-4" />
                Контент
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <StatCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            hint={metric.hint}
            icon={metric.icon}
            tone={metric.tone}
            href={metric.href}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {canReadAppointments && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Сегодня</h2>
              <Link className="text-sm font-medium text-primary hover:underline" href="/admin/appointments">
                Все записи
              </Link>
            </div>
            <div className="grid gap-3">
              {todayAppointmentList.length === 0 && (
                <Card>
                  <CardContent className="text-sm text-muted-foreground">На сегодня записей нет.</CardContent>
                </Card>
              )}
              {todayAppointmentList.map((appointment) => (
                <Card key={appointment.id}>
                  <CardContent>
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <p className="text-lg font-semibold tabular-nums">
                          {formatTime(appointment.startsAtUtc, timezone)} –{" "}
                          {formatTime(appointment.endsAtUtc, timezone)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">{appointment.service.name}</p>
                      </div>
                      <Badge className={appointmentStatusClasses[appointment.status]}>
                        {appointmentStatusLabels[appointment.status]}
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Клиент</p>
                        <p className="mt-1 font-medium">
                          {appointment.client.firstName} {appointment.client.lastName ?? ""}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Телефон</p>
                        <a
                          className="mt-1 inline-flex items-center gap-1 font-medium text-primary hover:underline"
                          href={`tel:${appointment.client.phone}`}
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {appointment.client.phone}
                        </a>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Специалист</p>
                        <p className="mt-1 font-medium">
                          {appointment.specialist.firstName} {appointment.specialist.lastName}
                        </p>
                      </div>
                    </div>
                    {appointment.clientComment && (
                      <p className="mt-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                        {appointment.clientComment}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-6">
          {canReadLeads && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Заявки</h2>
                <Link className="text-sm font-medium text-primary hover:underline" href="/admin/leads">
                  Все заявки
                </Link>
              </div>
              <div className="grid gap-3">
                {leadList.length === 0 && (
                  <Card>
                    <CardContent className="text-sm text-muted-foreground">
                      Нет заявок, требующих внимания.
                    </CardContent>
                  </Card>
                )}
                {leadList.map((lead) => (
                  <Card key={lead.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {lead.client.firstName} {lead.client.lastName ?? ""}
                          </p>
                          <a
                            className="mt-1 block text-sm text-muted-foreground hover:text-foreground"
                            href={`tel:${lead.client.phone}`}
                          >
                            {lead.client.phone}
                          </a>
                        </div>
                        <Badge className={leadStatusClasses[lead.status]}>
                          {leadStatusLabels[lead.status]}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm">{lead.service?.name ?? "Услуга не выбрана"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {lead.source ?? "Источник не указан"} · {formatDayTime(lead.createdAt, timezone)}
                      </p>
                      {lead.comment && (
                        <p className="mt-3 text-sm text-muted-foreground">{lead.comment}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {canReadAppointments && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Ближайшие</h2>
                <Link className="text-sm font-medium text-primary hover:underline" href="/admin/calendar">
                  Календарь
                </Link>
              </div>
              <div className="grid gap-3">
                {upcomingAppointmentList.length === 0 && (
                  <Card>
                    <CardContent className="text-sm text-muted-foreground">Ближайших записей нет.</CardContent>
                  </Card>
                )}
                {upcomingAppointmentList.map((appointment) => (
                  <Card key={appointment.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold tabular-nums">
                            {formatDayTime(appointment.startsAtUtc, timezone)}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">{appointment.service.name}</p>
                        </div>
                        <Badge className={appointmentStatusClasses[appointment.status]}>
                          {appointmentStatusLabels[appointment.status]}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm">
                        {appointment.client.firstName} · {appointment.specialist.firstName}{" "}
                        {appointment.specialist.lastName}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {(canReadAppointments || canReadLeads) && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Задачи</h2>
              <div className="grid gap-3">
                {taskList.length === 0 && (
                  <Card>
                    <CardContent className="text-sm text-muted-foreground">Открытых задач нет.</CardContent>
                  </Card>
                )}
                {taskList.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{task.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {task.dueAt ? formatDayTime(task.dueAt, timezone) : "Без срока"} ·{" "}
                            {task.assignedUser.name}
                          </p>
                        </div>
                        <Badge className={taskStatusClasses[task.status]}>
                          {taskStatusLabels[task.status]}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="mt-3 text-sm text-muted-foreground">{task.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
