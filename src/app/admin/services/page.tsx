import { Sparkles } from "lucide-react";
import { permissions } from "@/config/permissions";
import { ServiceManager } from "@/components/admin/service-manager";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

export default async function AdminServicesPage() {
  const user = await getCurrentUser();
  assertPermission(user, permissions.contentRead);
  const canWrite = Boolean(user?.permissions.includes(permissions.contentWrite));

  const [categories, services, resources] = await Promise.all([
    prisma.serviceCategory.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" } }),
    prisma.service.findMany({
      where: { deletedAt: null },
      include: { category: true, specialistServices: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    }),
    prisma.resource.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    })
  ]);

  return (
    <div>
      <PageHeader
        icon={Sparkles}
        title="Услуги и цены"
        description="Создавайте услуги, меняйте цены, длительность, описание и видимость на сайте."
      />

      {canWrite ? (
        <div className="mt-6">
          <ServiceManager categories={categories} services={services} resources={resources} />
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {services.map((service) => (
            <Card key={service.id} className="p-5">
              <div className="flex flex-col justify-between gap-3 md:flex-row">
                <div>
                  <h2 className="text-xl font-semibold">{service.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{service.category.name}</p>
                </div>
                <Badge>{service.isActive ? "Активна" : "Скрыта"}</Badge>
              </div>
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                <span>{formatPrice(service.priceFrom, service.priceExact)}</span>
                <span>{service.durationMinutes} мин</span>
                <span>{service.specialistServices.length} специалистов</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
