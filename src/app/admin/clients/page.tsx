import Link from "next/link";
import { Download, Users } from "lucide-react";
import type { Prisma } from "@prisma/client/index";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission, hasPermission } from "@/domain/auth/rbac";
import { normalizePhone } from "@/domain/client/phone";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
import { SearchForm } from "@/components/admin/search-form";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

type ClientRow = Prisma.ClientGetPayload<{
  include: { tags: { include: { tag: true } }; _count: { select: { leads: true; appointments: true } } };
}>;

function buildWhere(query: string): Prisma.ClientWhereInput {
  const base: Prisma.ClientWhereInput = { deletedAt: null };
  if (!query) return base;

  const or: Prisma.ClientWhereInput[] = [
    { firstName: { contains: query, mode: "insensitive" } },
    { lastName: { contains: query, mode: "insensitive" } },
    { email: { contains: query, mode: "insensitive" } }
  ];

  // If the query looks like a phone, match against the normalized form too.
  try {
    or.push({ normalizedPhone: { contains: normalizePhone(query) } });
  } catch {
    const digits = query.replace(/\D/g, "");
    if (digits.length >= 3) or.push({ normalizedPhone: { contains: digits } });
  }

  return { ...base, OR: or };
}

export default async function ClientsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  assertPermission(user, permissions.clientsRead);
  const canExport = hasPermission(user, permissions.clientsExport);

  const { q, page: pageParam } = await searchParams;
  const query = (q ?? "").trim();
  const page = Math.max(1, Number(pageParam) || 1);
  const where = buildWhere(query);

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { tags: { include: { tag: true } }, _count: { select: { leads: true, appointments: true } } }
    }),
    prisma.client.count({ where })
  ]);

  const columns: Column<ClientRow>[] = [
    {
      key: "name",
      header: "Имя",
      className: "font-medium",
      cell: (client) => (
        <Link href={`/admin/clients/${client.id}`} className="text-primary hover:underline">
          {client.firstName} {client.lastName ?? ""}
        </Link>
      )
    },
    { key: "phone", header: "Телефон", className: "whitespace-nowrap", cell: (client) => client.phone },
    {
      key: "email",
      header: "Email",
      cell: (client) => client.email ?? <span className="text-muted-foreground">—</span>
    },
    {
      key: "tags",
      header: "Теги",
      cell: (client) => (
        <div className="flex flex-wrap gap-1">
          {client.tags.length === 0 && <span className="text-muted-foreground">—</span>}
          {client.tags.map((item) => (
            <Badge key={item.tag.id}>{item.tag.name}</Badge>
          ))}
        </div>
      )
    },
    { key: "leads", header: "Заявки", align: "right", className: "tabular-nums", cell: (client) => client._count.leads },
    {
      key: "appointments",
      header: "Записи",
      align: "right",
      className: "tabular-nums",
      cell: (client) => client._count.appointments
    },
    {
      key: "created",
      header: "Создан",
      className: "whitespace-nowrap text-muted-foreground",
      cell: (client) => client.createdAt.toLocaleDateString("ru-RU")
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Клиенты"
        description={`Всего: ${total}`}
        actions={
          canExport && (
            <a
              href="/api/admin/export/clients"
              className="inline-flex h-10 items-center gap-2 rounded-md border bg-card px-3.5 text-sm font-medium transition hover:bg-muted"
            >
              <Download className="h-4 w-4" />
              Экспорт CSV
            </a>
          )
        }
      />

      <SearchForm action="/admin/clients" defaultValue={query} placeholder="Имя, телефон или email" />

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={query ? "Ничего не найдено" : "Клиентов пока нет"}
          description={query ? "Измените запрос поиска." : "Они появятся после первой заявки или записи."}
        />
      ) : (
        <>
          <DataTable columns={columns} rows={clients} getRowKey={(client) => client.id} minWidth={900} />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            basePath="/admin/clients"
            params={{ q: query }}
          />
        </>
      )}
    </div>
  );
}
