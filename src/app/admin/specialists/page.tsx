import { Stethoscope } from "lucide-react";
import { permissions } from "@/config/permissions";
import { SpecialistManager } from "@/components/admin/specialist-manager";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { prisma } from "@/lib/prisma";

export default async function AdminSpecialistsPage() {
  const user = await getCurrentUser();
  assertPermission(user, permissions.contentRead);
  const canWrite = Boolean(user?.permissions.includes(permissions.contentWrite));

  const [specialists, services, users] = await Promise.all([
    prisma.specialist.findMany({
      where: { deletedAt: null },
      include: {
        services: { include: { service: true } },
        user: { select: { id: true, email: true, name: true } }
      },
      orderBy: [{ sortOrder: "asc" }, { lastName: "asc" }]
    }),
    prisma.service.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    }),
    prisma.user.findMany({
      where: { status: { not: "DELETED" } },
      select: { id: true, email: true, name: true },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <div>
      <PageHeader
        icon={Stethoscope}
        title="Врачи и специалисты"
        description="Добавляйте врачей, назначайте им услуги, привязывайте учетную запись и управляйте публикацией."
      />

      {canWrite ? (
        <div className="mt-6">
          <SpecialistManager services={services} specialists={specialists} users={users} />
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {specialists.map((specialist) => (
            <Card key={specialist.id} className="p-5">
              <div className="flex flex-col justify-between gap-3 md:flex-row">
                <div>
                  <h2 className="text-xl font-semibold">
                    {specialist.firstName} {specialist.lastName}
                  </h2>
                  <p className="mt-1 text-sm text-primary">{specialist.position}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{specialist.description}</p>
                </div>
                <Badge>{specialist.isActive ? "Активен" : "Скрыт"}</Badge>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Услуги: {specialist.services.map((item) => item.service.name).join(", ")}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
