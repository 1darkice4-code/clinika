import { ClipboardList } from "lucide-react";
import { permissions } from "@/config/permissions";
import { LeadStatusControl } from "@/components/admin/lead-status-control";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { leadStatusClasses, leadStatusLabels } from "@/domain/crm/status-labels";
import { formatClinicDateTime } from "@/lib/date-time";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

type LeadRow = Awaited<ReturnType<typeof loadLeads>>["leads"][number];

async function loadLeads(page: number) {
  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { client: true, service: true, preferredSpecialist: true, assignedUser: true }
    }),
    prisma.lead.count()
  ]);
  return { leads, total };
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await getCurrentUser();
  assertPermission(user, permissions.leadsRead);
  const canWrite = Boolean(user?.permissions.includes(permissions.leadsWrite));

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [{ leads, total }, settings] = await Promise.all([
    loadLeads(page),
    prisma.clinicSettings.findFirst({ select: { timezone: true } })
  ]);

  const timezone = settings?.timezone ?? "Asia/Chita";

  const columns: Column<LeadRow>[] = [
    {
      key: "number",
      header: "Номер",
      className: "font-medium tabular-nums",
      cell: (lead) => lead.publicNumber
    },
    {
      key: "client",
      header: "Клиент",
      cell: (lead) => (
        <div>
          <span className="font-medium">{lead.client.firstName}</span>
          <a className="mt-0.5 block text-muted-foreground hover:text-foreground" href={`tel:${lead.client.phone}`}>
            {lead.client.phone}
          </a>
        </div>
      )
    },
    { key: "service", header: "Услуга", cell: (lead) => lead.service?.name ?? "Не указана" },
    {
      key: "status",
      header: "Статус",
      cell: (lead) => <Badge className={leadStatusClasses[lead.status]}>{leadStatusLabels[lead.status]}</Badge>
    },
    {
      key: "assignee",
      header: "Ответственный",
      cell: (lead) => lead.assignedUser?.name ?? <span className="text-muted-foreground">Не назначен</span>
    },
    {
      key: "created",
      header: "Создана",
      className: "whitespace-nowrap text-muted-foreground",
      cell: (lead) => formatClinicDateTime(lead.createdAt, timezone)
    },
    {
      key: "actions",
      header: "Действия",
      hidden: !canWrite,
      cell: (lead) => <LeadStatusControl currentStatus={lead.status} leadId={lead.id} />
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardList}
        title="Заявки"
        description="Обрабатывайте обращения, меняйте статус и фиксируйте причину перехода."
      />
      {leads.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Заявок пока нет" description="Новые обращения появятся здесь." />
      ) : (
        <>
          <DataTable columns={columns} rows={leads} getRowKey={(lead) => lead.id} minWidth={900} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/leads" />
        </>
      )}
    </div>
  );
}
