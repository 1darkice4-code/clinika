import { ScrollText } from "lucide-react";
import type { Prisma } from "@prisma/client/index";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
import { formatClinicDateTime } from "@/lib/date-time";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

type AuditRow = Prisma.AuditLogGetPayload<{ include: { user: true } }>;

export default async function AuditPage({
  searchParams
}: {
  searchParams: Promise<{ action?: string; entityType?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  assertPermission(user, permissions.auditRead);

  const { action, entityType, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {})
  };

  const [logs, total, actions, entityTypes, settings] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    prisma.auditLog.findMany({
      distinct: ["entityType"],
      select: { entityType: true },
      orderBy: { entityType: "asc" }
    }),
    prisma.clinicSettings.findFirst({ select: { timezone: true } })
  ]);

  const timezone = settings?.timezone ?? "Asia/Chita";

  const columns: Column<AuditRow>[] = [
    {
      key: "date",
      header: "Дата",
      className: "whitespace-nowrap tabular-nums text-muted-foreground",
      cell: (log) => formatClinicDateTime(log.createdAt, timezone)
    },
    { key: "user", header: "Пользователь", cell: (log) => log.user?.name ?? "system" },
    { key: "action", header: "Действие", className: "font-medium", cell: (log) => log.action },
    { key: "entity", header: "Сущность", cell: (log) => log.entityType },
    {
      key: "id",
      header: "ID",
      className: "font-mono text-xs text-muted-foreground",
      cell: (log) => log.entityId ?? "—"
    },
    { key: "description", header: "Описание", cell: (log) => log.description }
  ];

  return (
    <div className="space-y-6">
      <PageHeader icon={ScrollText} title="Журнал действий" description={`Всего: ${total}`} />

      <form action="/admin/audit" method="get" className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Действие</span>
          <Select name="action" defaultValue={action ?? ""} className="w-56">
            <option value="">Все</option>
            {actions.map((item) => (
              <option key={item.action} value={item.action}>
                {item.action}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Сущность</span>
          <Select name="entityType" defaultValue={entityType ?? ""} className="w-56">
            <option value="">Все</option>
            {entityTypes.map((item) => (
              <option key={item.entityType} value={item.entityType}>
                {item.entityType}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" variant="secondary">
          Применить
        </Button>
      </form>

      {logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="Записей нет" description="По выбранным фильтрам ничего не найдено." />
      ) : (
        <>
          <DataTable columns={columns} rows={logs} getRowKey={(log) => log.id} minWidth={960} />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            basePath="/admin/audit"
            params={{ action, entityType }}
          />
        </>
      )}
    </div>
  );
}
