import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission, hasPermission } from "@/domain/auth/rbac";
import {
  appointmentStatusClasses,
  appointmentStatusLabels,
  leadStatusClasses,
  leadStatusLabels
} from "@/domain/crm/status-labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { ClientNotes } from "@/components/admin/client-notes";
import { formatClinicDateTime } from "@/lib/date-time";
import { prisma } from "@/lib/prisma";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  assertPermission(user, permissions.clientsRead);
  const canWrite = hasPermission(user, permissions.clientsWrite);

  const settings = await prisma.clinicSettings.findFirst({ select: { timezone: true } });
  const timezone = settings?.timezone ?? "Asia/Chita";

  const { id } = await params;
  const client = await prisma.client.findFirst({
    where: { id, deletedAt: null },
    include: {
      tags: { include: { tag: true } },
      assignedUser: true,
      notes: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: { author: true }
      },
      leads: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { service: true }
      },
      appointments: {
        where: { deletedAt: null },
        orderBy: { startsAtUtc: "desc" },
        take: 10,
        include: { service: true, specialist: true }
      },
      consents: {
        orderBy: { acceptedAt: "desc" },
        include: { legalDocument: true }
      }
    }
  });

  if (!client) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/clients" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" />
        К списку клиентов
      </Link>

      <PageHeader
        title={`${client.firstName} ${client.lastName ?? ""}`.trim()}
        description={
          client.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {client.tags.map((item) => (
                <Badge key={item.tag.id}>{item.tag.name}</Badge>
              ))}
            </div>
          ) : undefined
        }
      />

      <Card>
        <CardContent>
          <dl className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Телефон</dt>
              <dd className="mt-1 font-medium">
                <a className="text-primary hover:underline" href={`tel:${client.phone}`}>
                  {client.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="mt-1 font-medium">{client.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Дата рождения</dt>
              <dd className="mt-1 font-medium">
                {client.birthDate ? client.birthDate.toLocaleDateString("ru-RU") : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ответственный</dt>
              <dd className="mt-1 font-medium">{client.assignedUser?.name ?? "Не назначен"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Согласие на обработку ПДн</dt>
              <dd className="mt-1 font-medium">
                {client.personalDataConsentAt
                  ? client.personalDataConsentAt.toLocaleDateString("ru-RU")
                  : "Нет"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Маркетинговое согласие</dt>
              <dd className="mt-1 font-medium">
                {client.marketingConsentAt ? client.marketingConsentAt.toLocaleDateString("ru-RU") : "Нет"}
              </dd>
            </div>
          </dl>
          {client.internalComment && (
            <p className="mt-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              {client.internalComment}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Заявки</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {client.leads.length === 0 && <p className="text-sm text-muted-foreground">Заявок нет.</p>}
            {client.leads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                <div>
                  <p className="font-medium">{lead.service?.name ?? "Услуга не выбрана"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    №{lead.publicNumber} · {lead.createdAt.toLocaleDateString("ru-RU")}
                  </p>
                </div>
                <Badge className={leadStatusClasses[lead.status]}>{leadStatusLabels[lead.status]}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Записи</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {client.appointments.length === 0 && (
              <p className="text-sm text-muted-foreground">Записей нет.</p>
            )}
            {client.appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{appointment.service.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatClinicDateTime(appointment.startsAtUtc, timezone)} · {appointment.specialist.firstName}{" "}
                    {appointment.specialist.lastName}
                  </p>
                </div>
                <Badge className={appointmentStatusClasses[appointment.status]}>
                  {appointmentStatusLabels[appointment.status]}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {client.consents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Согласия</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {client.consents.map((consent) => (
              <div key={consent.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <span>{consent.legalDocument.title}</span>
                <span className="text-muted-foreground">
                  {consent.acceptedAt.toLocaleDateString("ru-RU")}
                  {consent.revokedAt ? " · отозвано" : ""}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Заметки</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientNotes
            clientId={client.id}
            canWrite={canWrite}
            notes={client.notes.map((note) => ({
              id: note.id,
              body: note.body,
              authorName: note.author.name,
              createdAt: formatClinicDateTime(note.createdAt, timezone)
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
