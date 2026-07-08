import { WandSparkles } from "lucide-react";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/page-header";
import { ContentQuickEditor } from "@/components/admin/content-quick-editor";
import {
  contentStatusClasses,
  contentStatusLabels,
  reviewStatusClasses,
  reviewStatusLabels
} from "@/domain/crm/content-labels";
import { prisma } from "@/lib/prisma";

export default async function ContentPage() {
  const user = await getCurrentUser();
  assertPermission(user, permissions.contentRead);

  const [pages, services, specialists, reviews] = await Promise.all([
    prisma.page.findMany({ include: { sections: true }, orderBy: { updatedAt: "desc" } }),
    prisma.service.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: "asc" },
      include: { category: true }
    }),
    prisma.specialist.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" } }),
    prisma.review.findMany({ orderBy: { reviewDate: "desc" } })
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={WandSparkles}
        title="Контент"
        description="Управляйте секциями лендинга, услугами, специалистами и отзывами."
      />

      <ContentQuickEditor
        sections={pages.flatMap((page) =>
          page.sections.map((section) => ({
            id: section.id,
            type: section.type,
            title: section.title,
            subtitle: section.subtitle,
            isVisible: section.isVisible
          }))
        )}
        services={services.map((service) => ({
          id: service.id,
          name: service.name,
          priceFrom: service.priceFrom,
          priceExact: service.priceExact,
          durationMinutes: service.durationMinutes,
          isActive: service.isActive
        }))}
        reviews={reviews.map((review) => ({
          id: review.id,
          clientDisplayName: review.clientDisplayName,
          status: review.status
        }))}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Страницы и секции</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {pages.map((page) => (
              <div key={page.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{page.title}</p>
                  <Badge className={contentStatusClasses[page.status]}>{contentStatusLabels[page.status]}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{page.sections.length} секций</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Услуги</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {services.map((service) => (
              <div key={service.id} className="flex justify-between gap-2 rounded-md border p-3">
                <span>{service.name}</span>
                <span className="text-muted-foreground">{service.category.name}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Специалисты</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {specialists.map((specialist) => (
              <div key={specialist.id} className="rounded-md border p-3">
                {specialist.firstName} {specialist.lastName}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Отзывы</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {reviews.map((review) => (
              <div key={review.id} className="flex justify-between gap-2 rounded-md border p-3">
                <span>{review.clientDisplayName}</span>
                <Badge className={reviewStatusClasses[review.status]}>{reviewStatusLabels[review.status]}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
