import { CalendarClock } from "lucide-react";
import type { Prisma } from "@prisma/client/index";
import { permissions } from "@/config/permissions";
import { AppointmentControls } from "@/components/admin/appointment-controls";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { performerLabel } from "@/domain/appointment/appointment-labels";
import { appointmentStatusClasses, appointmentStatusLabels } from "@/domain/crm/status-labels";
import { LASER_COMBO } from "@/domain/service/laser-combo";
import { formatClinicDateTime } from "@/lib/date-time";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const PAGE_SIZE = 50;

type AppointmentRow = Prisma.AppointmentGetPayload<{
  include: { client: true; service: true; specialist: true; resource: true };
}>;

export default async function AppointmentsPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; campaign?: string }>;
}) {
  const user = await getCurrentUser();
  assertPermission(user, permissions.appointmentsRead);
  const canWrite = Boolean(user?.permissions.includes(permissions.appointmentsWrite));

  const { page: pageParam, campaign } = await searchParams;
  const pilot = campaign === LASER_COMBO.campaign;
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.AppointmentWhereInput = {
    deletedAt: null,
    ...(pilot ? { service: { slug: LASER_COMBO.slug }, attribution: { utmCampaign: campaign } } : {}),
    ...(user?.roles.includes("SPECIALIST") && !user.permissions.includes(permissions.appointmentsWrite)
      ? { specialistId: user.specialistId ?? "__none__" }
      : {})
  };

  const [appointments, total, settings, resourcesWithOperators, served] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy: { startsAtUtc: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { client: true, service: true, specialist: true, resource: true }
    }),
    prisma.appointment.count({ where }),
    prisma.clinicSettings.findFirst({ select: { timezone: true } }),
    prisma.resource.findMany({
      where: { deletedAt: null },
      include: {
        operators: {
          where: { isActive: true, specialist: { isActive: true, deletedAt: null } },
          include: { specialist: { select: { id: true, firstName: true, lastName: true } } }
        }
      }
    }),
    pilot
      ? prisma.appointment.count({ where: { ...where, status: { in: ["ARRIVED", "COMPLETED"] } } })
      : null
  ]);

  const timezone = settings?.timezone ?? "Asia/Chita";

  // Кандидаты в операторы по каждому аппарату — для выпадашки назначения в записи.
  const operatorsByResource = new Map(
    resourcesWithOperators.map((resource) => [
      resource.id,
      resource.operators.map((operator) => ({
        id: operator.specialistId,
        label: `${operator.specialist.firstName} ${operator.specialist.lastName}`
      }))
    ])
  );

  const columns: Column<AppointmentRow>[] = [
    {
      key: "number",
      header: "Номер",
      className: "font-medium tabular-nums",
      cell: (appointment) => appointment.publicNumber
    },
    { key: "client", header: "Клиент", cell: (appointment) => appointment.client.firstName },
    { key: "service", header: "Услуга", cell: (appointment) => appointment.service.name },
    {
      key: "source",
      header: "Источник",
      className: "max-w-40 break-words",
      cell: (appointment) => appointment.source ?? "—"
    },
    {
      key: "specialist",
      header: "Исполнитель",
      cell: (appointment) => performerLabel(appointment)
    },
    {
      key: "time",
      header: "Время",
      className: "whitespace-nowrap tabular-nums",
      cell: (appointment) => formatClinicDateTime(appointment.startsAtUtc, timezone)
    },
    {
      key: "status",
      header: "Статус",
      cell: (appointment) => (
        <Badge className={appointmentStatusClasses[appointment.status]}>
          {appointmentStatusLabels[appointment.status]}
        </Badge>
      )
    },
    {
      key: "actions",
      header: "Действия",
      hidden: !canWrite,
      cell: (appointment) => (
        <AppointmentControls
          appointmentId={appointment.id}
          currentStatus={appointment.status}
          startsAtUtc={appointment.startsAtUtc.toISOString()}
          timezone={appointment.clinicTimezone}
          operatorOptions={
            appointment.resourceId ? operatorsByResource.get(appointment.resourceId) ?? [] : undefined
          }
          currentOperatorId={appointment.specialistId}
        />
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarClock}
        title="Записи"
        description="Подтверждайте визиты, отмечайте результат и переносите запись на свободный слот."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={pilot ? "/admin/appointments" : `/admin/appointments?campaign=${LASER_COMBO.campaign}`}
          className="rounded-md border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          {pilot ? "Все записи" : "Записи по комплексу из кампании"}
        </Link>
        {served !== null && (
          <p className="text-sm text-muted-foreground">
            Записей по кампании — {total}. Пришли на визит — {served}.
          </p>
        )}
      </div>
      {appointments.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Записей пока нет" description="Подтверждённые визиты появятся здесь." />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={appointments}
            getRowKey={(appointment) => appointment.id}
            minWidth={1040}
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            basePath="/admin/appointments"
            params={pilot ? { campaign } : undefined}
          />
        </>
      )}
    </div>
  );
}
