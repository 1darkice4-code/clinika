import { Bell } from "lucide-react";
import type { NotificationStatus, Prisma } from "@prisma/client/index";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission, hasPermission } from "@/domain/auth/rbac";
import {
  channelLabels,
  notificationEventLabel,
  notificationStatusClasses,
  notificationStatusLabels,
  notificationStatusOptions
} from "@/domain/notification/labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { NotificationActions } from "@/components/admin/notification-actions";
import { Pagination } from "@/components/admin/pagination";
import { formatClinicDateTime } from "@/lib/date-time";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

function isStatus(value: string | undefined): value is NotificationStatus {
  return Boolean(value) && notificationStatusOptions.includes(value as NotificationStatus);
}

const tabClass = "inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium transition";

export default async function NotificationsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  assertPermission(user, permissions.notificationsRead);
  const canWrite = hasPermission(user, permissions.notificationsWrite);

  const { status, page: pageParam } = await searchParams;
  const activeStatus = isStatus(status) ? status : undefined;
  const page = Math.max(1, Number(pageParam) || 1);
  const where: Prisma.NotificationWhereInput = activeStatus ? { status: activeStatus } : {};

  const [notifications, total, settings] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.notification.count({ where }),
    prisma.clinicSettings.findFirst({ select: { timezone: true } })
  ]);

  const timezone = settings?.timezone ?? "Asia/Chita";

  return (
    <div className="space-y-6">
      <PageHeader icon={Bell} title="Уведомления" description={`Всего: ${total}`} />

      <div className="flex flex-wrap gap-2">
        <a
          href="/admin/notifications"
          className={cn(
            tabClass,
            activeStatus
              ? "border-border bg-card text-muted-foreground hover:bg-muted"
              : "border-primary bg-primary text-primary-foreground"
          )}
        >
          Все
        </a>
        {notificationStatusOptions.map((option) => (
          <a
            key={option}
            href={`/admin/notifications?status=${option}`}
            className={cn(
              tabClass,
              activeStatus === option
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            {notificationStatusLabels[option]}
          </a>
        ))}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Уведомлений нет"
          description={activeStatus ? "Нет уведомлений с этим статусом." : "Они появятся по мере работы CRM."}
        />
      ) : (
        <>
          <div className="grid gap-3">
            {notifications.map((notification) => (
              <Card key={notification.id}>
                <CardContent className="py-4">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div className="min-w-0">
                      <p className="font-medium">{notificationEventLabel(notification.eventType)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {channelLabels[notification.channel]}
                        {notification.recipient ? ` · ${notification.recipient}` : ""} ·{" "}
                        {formatClinicDateTime(notification.createdAt, timezone)}
                      </p>
                      {notification.lastError && (
                        <p className="mt-1 text-sm text-destructive">{notification.lastError}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge className={notificationStatusClasses[notification.status]}>
                        {notificationStatusLabels[notification.status]}
                      </Badge>
                      {canWrite && <NotificationActions notificationId={notification.id} />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            basePath="/admin/notifications"
            params={{ status: activeStatus }}
          />
        </>
      )}
    </div>
  );
}
