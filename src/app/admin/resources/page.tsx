import { Zap } from "lucide-react";
import { permissions } from "@/config/permissions";
import { ResourceManager } from "@/components/admin/resource-manager";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { prisma } from "@/lib/prisma";

export default async function AdminResourcesPage() {
  const user = await getCurrentUser();
  assertPermission(user, permissions.contentRead);
  const canWrite = Boolean(user?.permissions.includes(permissions.contentWrite));

  const [resources, operators] = await Promise.all([
    prisma.resource.findMany({
      where: { deletedAt: null },
      include: { operators: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    }),
    prisma.specialist.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ sortOrder: "asc" }, { lastName: "asc" }]
    })
  ]);

  return (
    <div>
      <PageHeader
        icon={Zap}
        title="Аппараты и ресурсы"
        description="Общее оборудование с единой очередью (например, лазерный аппарат). Записи на такой ресурс не могут пересекаться, даже если их ведут разные операторы."
      />

      {canWrite ? (
        <div className="mt-6">
          <ResourceManager resources={resources} operators={operators} />
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {resources.map((resource) => (
            <Card key={resource.id} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">{resource.name}</h2>
                <Badge>{resource.isActive ? "Активен" : "Скрыт"}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Операторов: {resource.operators.length}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
