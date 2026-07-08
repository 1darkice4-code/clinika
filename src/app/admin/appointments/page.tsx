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
import { appointmentStatusClasses, appointmentStatusLabels } from "@/domain/crm/status-labels";
import { formatClinicDateTime } from "@/lib/date-time";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

type AppointmentRow = Prisma.AppointmentGetPayload<{
  include: { client: true; service: true; specialist: true };
}>;

export default async function AppointmentsPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  assertPermission(user, permissions.appointmentsRead);
  const canWrite = Boolean(user?.permissions.includes(permissions.appointmentsWrite));

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.AppointmentWhereInput = {
    deletedAt: null,
    ...(user?.roles.includes("SPECIALIST") && !user.permissions.includes(permissions.appointmentsWrite)
      ? { specialistId: user.specialistId ?? "__none__" }
      : {})
  };

  const [appointments, total, settings] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy: { startsAtUtc: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { client: true, service: true, specialist: true }
    }),
    prisma.appointment.count({ where }),
    prisma.clinicSettings.findFirst({ select: { timezone: true } })
  ]);

  const timezone = settings?.timezone ?? "Asia/Chita";

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
      key: "specialist",
      header: "Специалист",
      cell: (appointment) => `${appointment.specialist.firstName} ${appointment.specialist.lastName}`
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
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/appointments" />
        </>
      )}
    </div>
  );
}
