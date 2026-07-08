import { BarChart3 } from "lucide-react";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { prisma } from "@/lib/prisma";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  assertPermission(user, permissions.analyticsRead);

  const [leads, appointments, completed, cancelled, noShows, clients, sources] = await Promise.all([
    prisma.lead.count(),
    prisma.appointment.count({ where: { deletedAt: null } }),
    prisma.appointment.count({ where: { deletedAt: null, status: "COMPLETED" } }),
    prisma.appointment.count({
      where: { deletedAt: null, status: { in: ["CANCELLED_BY_CLIENT", "CANCELLED_BY_CLINIC"] } }
    }),
    prisma.appointment.count({ where: { deletedAt: null, status: "NO_SHOW" } }),
    prisma.client.count({ where: { deletedAt: null } }),
    prisma.uTMAttribution.groupBy({
      by: ["source"],
      _count: true,
      orderBy: { _count: { source: "desc" } },
      take: 10
    })
  ]);

  const conversion = leads > 0 ? Math.round((appointments / leads) * 100) : 0;
  const noShowRate = appointments > 0 ? Math.round((noShows / appointments) * 100) : 0;
  const maxSource = Math.max(1, ...sources.map((source) => source._count));

  const stats: { label: string; value: number | string; tone?: "primary" | "success" | "warning" }[] = [
    { label: "Заявки", value: leads },
    { label: "Записи", value: appointments },
    { label: "Конверсия", value: `${conversion}%`, tone: "primary" },
    { label: "Клиенты", value: clients },
    { label: "Состоялись", value: completed, tone: "success" },
    { label: "Отмены", value: cancelled },
    { label: "Неявки", value: noShows },
    { label: "Доля неявок", value: `${noShowRate}%`, tone: "warning" }
  ];

  return (
    <div className="space-y-6">
      <PageHeader icon={BarChart3} title="Аналитика" description="Ключевые показатели воронки и источники обращений." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} tone={stat.tone ?? "default"} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Источники</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {sources.length === 0 && (
            <p className="text-sm text-muted-foreground">Данных об источниках пока нет.</p>
          )}
          {sources.map((source) => (
            <div key={source.source ?? "direct"} className="grid gap-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{source.source ?? "direct"}</span>
                <span className="tabular-nums text-muted-foreground">{source._count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round((source._count / maxSource) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
